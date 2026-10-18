import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  isAccountLocked,
  registerFailedLogin,
  resetFailedLogin,
  createSession,
  isSessionValid,
} from '../src/lib/auth';
import {
  SESSION_STANDARD_DURATION_MS,
  SESSION_REMEMBER_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '../src/lib/authConstants';
import { BrowserRepository } from '../src/data/repository';
import {
  SCHEMA_VERSION,
  exportBackupData,
  importBackupData,
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
      window.localStorage.setItem('cms_storage_accounts', 'NOT_VALID_JSON{[');
      const repo = new BrowserRepository<TestItem>('accounts' as any, 0);
      const items = await repo.list();
      expect(items).toEqual([]);
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
});
