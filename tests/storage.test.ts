import { Patient } from '../src/types';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  isAccountLocked,
  registerFailedLogin,
  resetFailedLogin,
  createSession,
  isSessionValid,
  findMatchingPatient,
  createStaffSignupRequest,
} from '../src/lib/auth';
import {
  SESSION_STANDARD_DURATION_MS,
  SESSION_REMEMBER_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  STORAGE_KEY_PREFIX,
} from '../src/lib/authConstants';
import { BrowserRepository } from '../src/data/repository';
import {
  SCHEMA_VERSION,
  exportBackupData,
  importBackupData,
  hasUndoSnapshot,
  restoreUndoSnapshot,
  resetDemoData,
} from '../src/data/storage';
import { Account } from '../src/types/storage';

interface TestItem {
  id: string;
  name: string;
}

describe('Storage, Persistence, and Authentication Engine (M9.5 Requirement H)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('Password Policy Validation', () => {
    it('enforces password complexity rules', () => {
      expect(validatePasswordPolicy('Clinical2026').valid).toBe(true);
      expect(validatePasswordPolicy('Abcdefgh12').valid).toBe(true);
      expect(validatePasswordPolicy('Pass1').valid).toBe(false);
      expect(validatePasswordPolicy('CliniciansOnly').valid).toBe(false);
      expect(validatePasswordPolicy('12345678901').valid).toBe(false);
      expect(validatePasswordPolicy('').valid).toBe(false);
    });
  });

  describe('Cryptographic PBKDF2 Password Hashing', () => {
    it('hashes and verifies passwords with unique salts', async () => {
      const password = 'SecurePassword2026';
      const { hash, salt, iterations } = await hashPassword(password);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(32);
      expect(salt.length).toBe(32);
      expect(iterations).toBe(100000);

      const isValid = await verifyPassword(password, hash, salt, iterations);
      expect(isValid).toBe(true);

      const isWrong = await verifyPassword('WrongPassword123', hash, salt, iterations);
      expect(isWrong).toBe(false);

      const secondHash = await hashPassword(password);
      expect(hash).not.toBe(secondHash.hash);
    });
  });

  describe('Account Lockout Protection', () => {
    it('locks accounts after MAX_FAILED_ATTEMPTS', () => {
      let testAccount: Account = {
        id: 'acc-test-lockout',
        username: 'lockout@clinic.com',
        email: 'lockout@clinic.com',
        fullName: 'Test User',
        phone: '555-0100',
        role: 'doctor',
        passwordHash: 'hash',
        passwordSalt: 'salt',
        passwordIterations: 100000,
        status: 'active',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(isAccountLocked(testAccount).locked).toBe(false);

      for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i++) {
        testAccount = { ...testAccount, ...registerFailedLogin(testAccount) };
      }

      expect(testAccount.failedLoginAttempts).toBe(MAX_FAILED_ATTEMPTS);
      expect(isAccountLocked(testAccount).locked).toBe(true);
      expect(testAccount.lockedUntil).toBeGreaterThan(Date.now() + LOCKOUT_DURATION_MS - 5000);

      testAccount = { ...testAccount, ...resetFailedLogin() };
      expect(testAccount.failedLoginAttempts).toBe(0);
      expect(testAccount.lockedUntil).toBeNull();
      expect(isAccountLocked(testAccount).locked).toBe(false);
    });
  });

  describe('Session Validity and Inactivity Timeout (Fixed Assertion)', () => {
    it('validates session duration and checks boolean valid flag correctly', () => {
      const now = Date.now();
      const standardSession = createSession('usr-1', false);
      expect(standardSession.expiresAt - now).toBeGreaterThanOrEqual(SESSION_STANDARD_DURATION_MS - 2000);

      // Fix: Asserting .valid boolean explicitly, not the session validity object
      const standardResult = isSessionValid(standardSession);
      expect(standardResult.valid).toBe(true);

      const rememberSession = createSession('usr-2', true);
      expect(rememberSession.expiresAt - now).toBeGreaterThanOrEqual(SESSION_REMEMBER_DURATION_MS - 2000);

      // Expired session
      const expiredSession = {
        ...standardSession,
        expiresAt: now - 1000,
      };
      expect(isSessionValid(expiredSession).valid).toBe(false);

      // Inactive session (lastActiveAt > 30 mins ago)
      const inactiveSession = {
        ...standardSession,
        lastActiveAt: now - 35 * 60 * 1000,
      };
      expect(isSessionValid(inactiveSession).valid).toBe(false);
    });
  });

  describe('BrowserRepository with LocalStorage', () => {
    it('performs CRUD operations with localStorage', async () => {
      const repo = new BrowserRepository<TestItem>('accounts' as any, 0);

      const item1: TestItem = { id: 'item-1', name: 'Item One' };
      const item2: TestItem = { id: 'item-2', name: 'Item Two' };

      // Create
      await repo.create(item1);
      await repo.create(item2);

      expect(await repo.count()).toBe(2);

      // Get
      const fetched = await repo.get('item-1');
      expect(fetched?.name).toBe('Item One');

      // Update
      await repo.update('item-1', { name: 'Item One Updated' });
      const updated = await repo.get('item-1');
      expect(updated?.name).toBe('Item One Updated');

      // Remove
      const removed = await repo.remove('item-2');
      expect(removed).toBe(true);
      expect(await repo.count()).toBe(1);

      // List
      const list = await repo.list();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('item-1');

      // Clear
      await repo.clear();
      expect(await repo.count()).toBe(0);
    });

    it('gracefully handles corrupted localStorage content', async () => {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}accounts`, 'NOT_VALID_JSON{[');
      const repo = new BrowserRepository<TestItem>('accounts' as any, 0);
      const items = await repo.list();
      expect(items).toEqual([]);
    });
    it('persists items to localStorage and reloads them in a new repository instance', async () => {
      const repo1 = new BrowserRepository<TestItem>('accounts' as any, 0);
      await repo1.create({ id: 'persisted-1', name: 'Persisted Entity' });

      // Second instance reads directly from storage
      const repo2 = new BrowserRepository<TestItem>('accounts' as any, 0);
      const items = await repo2.list();
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Persisted Entity');
    });

    it('throws descriptive error on localStorage quota exhaustion', async () => {
      const repo = new BrowserRepository<TestItem>('accounts' as any, 0);
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        throw err;
      });

      await expect(repo.create({ id: 'overflow-1', name: 'Overflow' })).rejects.toThrow('Could not save changes');
      spy.mockRestore();
    });

    it('supports cache invalidation on external cross-tab storage changes', async () => {
      const repo = new BrowserRepository<TestItem>('accounts' as any, 0);
      await repo.create({ id: 'init-1', name: 'Initial' });
      expect((await repo.list()).length).toBe(1);

      // Simulate external tab update
      window.localStorage.setItem(
        `${STORAGE_KEY_PREFIX}accounts`,
        JSON.stringify([
          { id: 'init-1', name: 'Initial' },
          { id: 'external-2', name: 'From Other Tab' },
        ])
      );

      // Invalidate cache as would occur on storage event
      repo.invalidateCache();
      const refreshed = await repo.list();
      expect(refreshed.length).toBe(2);
      expect(refreshed[1].name).toBe('From Other Tab');
    });

  });

  describe('Backup Export and Validation', () => {
    it('exports backup data with schema version and collections', async () => {
      const exported = await exportBackupData();
      expect(exported.schemaVersion).toBe(SCHEMA_VERSION);
      expect(typeof exported.exportedAt).toBe('string');
      expect(typeof exported.collections).toBe('object');
      expect(Array.isArray(exported.collections.accounts)).toBe(true);
      expect(Array.isArray(exported.collections.patients)).toBe(true);
      expect(Array.isArray(exported.collections.ledger)).toBe(true);
    });

    it('rejects backup with invalid schema version', async () => {
      const invalidBackup: any = {
        schemaVersion: 999,
        exportedAt: new Date().toISOString(),
        collections: {},
      };
      await expect(importBackupData(invalidBackup)).rejects.toThrow();
    });
  });

  describe('Duplicate Patient Detection and Staff Signup Application Functions', () => {
    const mockExistingPatients: Patient[] = [
      {
        id: 'pat-1',
        mrn: 'MRN-10001',
        firstName: 'Eleanor',
        lastName: 'Wright',
        gender: 'female',
        dob: '1988-04-12',
        age: 38,
        phone: '+1 (555) 234-5678',
        email: 'eleanor.wright@example.com',
        address: '124 Market Street, Seattle, WA',
        allergies: ['Penicillin'],
        chronicConditions: ['Hypertension'],
        emergencyContact: {
          name: 'Thomas Wright',
          relationship: 'Spouse',
          phone: '+1 (555) 234-5679',
        },
        registeredDate: '2026-01-10',
        status: 'active',
        source: 'reception',
      },
    ];

    it('detects duplicate patient by matching phone number using app function', () => {
      const duplicate = findMatchingPatient(mockExistingPatients, '+1 (555) 234-5678', 'Different Name', '1990-01-01');
      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe('pat-1');
      expect(duplicate?.mrn).toBe('MRN-10001');
    });

    it('detects duplicate patient by matching full name and date of birth using app function', () => {
      const duplicate = findMatchingPatient(mockExistingPatients, '+1 (555) 000-9999', 'Eleanor Wright', '1988-04-12');
      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe('pat-1');
      expect(duplicate?.mrn).toBe('MRN-10001');
    });

    it('returns undefined for non-duplicate registration using app function', () => {
      const nonDuplicate = findMatchingPatient(mockExistingPatients, '+1 (555) 999-8888', 'Arthur Dent', '1980-01-01');
      expect(nonDuplicate).toBeUndefined();
    });

    it('generates compliant pending staff clearance request with role badge using app function', () => {
      const doctorReq = createStaffSignupRequest({
        roleRequested: 'doctor',
        fullName: 'Dr. Gregory House',
        jobTitle: 'Diagnostic Specialist',
        department: 'Diagnostics',
      });
      expect(doctorReq.role).toBe('doctor');
      expect(doctorReq.badgeNumber).toMatch(/^DOC-\d{3}$/);
      expect(doctorReq.staffName).toBe('Dr. Gregory House');

      const recReq = createStaffSignupRequest({
        roleRequested: 'receptionist',
        fullName: 'Clara Oswald',
        jobTitle: 'Front Desk Associate',
        department: 'Reception',
      });
      expect(recReq.role).toBe('receptionist');
      expect(recReq.badgeNumber).toMatch(/^REC-\d{3}$/);
    });
  });

  describe('Reset Demo Data and Undo Snapshot Operations', () => {
    it('resets demo data to initial factory state', async () => {
      await resetDemoData('Test Runner');
      const exported = await exportBackupData();
      expect(exported.schemaVersion).toBe(SCHEMA_VERSION);
      expect(exported.collections.accounts.length).toBeGreaterThan(0);
      expect(exported.collections.staff.length).toBeGreaterThan(0);
    });

    it('manages undo snapshot state across backup and restore', async () => {
      expect(hasUndoSnapshot()).toBe(false);
      const backup = await exportBackupData();
      await importBackupData(backup, 'Test Runner');
      expect(hasUndoSnapshot()).toBe(true);

      const restored = await restoreUndoSnapshot();
      expect(restored).toBe(true);
      expect(hasUndoSnapshot()).toBe(false);
    });
  });

});
