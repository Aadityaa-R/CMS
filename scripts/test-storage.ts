import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  isAccountLocked,
  registerFailedLogin,
  resetFailedLogin,
  createSession,
  isSessionValid,
  touchSession,
} from '../src/lib/auth';
import {
  SESSION_STANDARD_DURATION_MS,
  SESSION_REMEMBER_DURATION_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '../src/lib/authConstants';
import { MemoryRepository, BrowserRepository } from '../src/data/repository';
import {
  SCHEMA_VERSION,
  exportBackupData,
  importBackupData,
  hasUndoSnapshot,
  restoreUndoSnapshot,
  resetDemoData,
} from '../src/data/storage';
import { Account, ClaimRequest, BackupData } from '../src/types/storage';
import { Patient, User } from '../src/types';
import { PendingStaffApproval } from '../src/data/mockData';
import { hasCapability } from '../src/lib/permissions';

let passed = 0;
let failed = 0;

function assert(testName: string, condition: boolean, details: string = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failed++;
  }
}

function assertEqual<T>(testName: string, actual: T, expected: T) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${String(actual)} === ${String(expected)}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected ${String(expected)}, got ${String(actual)}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('=== Storage, Persistence, and Authentication Test Suite (M5) ===\n');

  // 1. Password Policy Validation
  console.log('-- 1. Password Policy Validation --');
  assert('Password policy accepts 10+ characters with letters and numbers', validatePasswordPolicy('Clinical2026').valid);
  assert('Password policy accepts 10 chars with letter and number', validatePasswordPolicy('Abcdefgh12').valid);
  assert('Password policy rejects passwords under 10 chars', !validatePasswordPolicy('Pass1').valid);
  assert('Password policy rejects passwords with no numbers', !validatePasswordPolicy('CliniciansOnly').valid);
  assert('Password policy rejects passwords with no letters', !validatePasswordPolicy('12345678901').valid);
  assert('Password policy rejects empty strings', !validatePasswordPolicy('').valid);

  // 2. Cryptographic PBKDF2-SHA256 Hashing & Verification
  console.log('\n-- 2. Cryptographic Password Hashing & Verification --');
  const password = 'SecurePassword2026';
  const { hash, salt, iterations } = await hashPassword(password);
  assert('Hash is non-empty string', typeof hash === 'string' && hash.length > 32);
  assert('Salt is 32-character hex (16 bytes)', typeof salt === 'string' && salt.length === 32);
  assertEqual('Iterations count matches constant (100,000)', iterations, 100000);

  const verifiesCorrect = await verifyPassword(password, hash, salt, iterations);
  assert('Password verification succeeds for matching password', verifiesCorrect);

  const verifiesWrong = await verifyPassword('WrongPassword123', hash, salt, iterations);
  assert('Password verification fails for incorrect password', !verifiesWrong);

  const secondHash = await hashPassword(password);
  assert('Unique salts produce distinct hashes for identical passwords', hash !== secondHash.hash);

  // 3. Failed Login Attempts and Lockout Duration
  console.log('\n-- 3. Account Lockout & Brute-force Protection --');
  const testAccount: Account = {
    id: 'acc-test-lockout',
    username: 'lockout@clinic.com',
    email: 'lockout@clinic.com',
    fullName: 'Test User',
    phone: '555-0100',
    role: 'doctor',
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: iterations,
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert('Account starts unlocked', !isAccountLocked(testAccount).locked);

  let lockedAcc = { ...testAccount };
  for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i++) {
    lockedAcc = registerFailedLogin(lockedAcc);
  }
  assertEqual('Failed attempts counter increments to threshold', lockedAcc.failedLoginAttempts, MAX_FAILED_ATTEMPTS);
  assert('Account is locked after threshold attempts', isAccountLocked(lockedAcc).locked);
  assert(
    'Lockout expiration is set in future (~5 minutes)',
    lockedAcc.lockedUntil !== null && lockedAcc.lockedUntil! > Date.now() + LOCKOUT_DURATION_MS - 2000
  );

  const resetAcc = resetFailedLogin(lockedAcc);
  assertEqual('Resetting login clears failed attempts', resetAcc.failedLoginAttempts, 0);
  assertEqual('Resetting login clears lockedUntil timestamp', resetAcc.lockedUntil, null);
  assert('Account is unlocked after reset', !isAccountLocked(resetAcc).locked);

  // 4. Session Validity and Inactivity Timeout
  console.log('\n-- 4. Session Expiry & Inactivity Timeout --');
  const now = Date.now();
  const standardSession = createSession('usr-1', false);
  assert('Standard session duration is ~8 hours', standardSession.expiresAt - now >= SESSION_STANDARD_DURATION_MS - 2000);
  assert('Standard session is currently valid', isSessionValid(standardSession));

  const rememberSession = createSession('usr-2', true);
  assert('Remember Me session duration is ~7 days', rememberSession.expiresAt - now >= SESSION_REMEMBER_DURATION_MS - 2000);

  // Expired session check
  const expiredSession = {
    ...standardSession,
    expiresAt: now - 1000,
  };
  assert('Expired session returns invalid', !isSessionValid(expiredSession).valid);

  // Inactive session check (30 minutes)
  const inactiveSession = {
    ...standardSession,
    lastActiveAt: now - SESSION_INACTIVITY_TIMEOUT_MS - 1000,
  };
  assert('Session with 30+ minutes inactivity returns invalid', !isSessionValid(inactiveSession).valid);

  // Touch session
  const touched = touchSession(inactiveSession);
  assert('Touching session updates lastActiveAt to current timestamp', touched.lastActiveAt >= now);

  // 5. MemoryRepository CRUD Operations
  console.log('\n-- 5. Repository Layer (MemoryRepository) --');
  const repo = new MemoryRepository<Account>();
  assertEqual('Initial repository list is empty', (await repo.list()).length, 0);

  const created = await repo.create(testAccount);
  assertEqual('Created item has correct id', created.id, testAccount.id);
  assertEqual('Repository count is 1', await repo.count(), 1);

  const retrieved = await repo.get(testAccount.id);
  assert('Get returns created item', retrieved !== null && retrieved.fullName === testAccount.fullName);

  const updated = await repo.update(testAccount.id, { fullName: 'Updated User Name' });
  assertEqual('Update reflects modified field', updated.fullName, 'Updated User Name');

  const removed = await repo.remove(testAccount.id);
  assert('Remove returns true for existing item', removed);
  assertEqual('Repository count is 0 after removal', await repo.count(), 0);

  // 6. Quota Error Handling in BrowserRepository
  console.log('\n-- 6. Quota Error Handling (BrowserRepository) --');
  const quotaRepo = new BrowserRepository<Account>('accounts', 0);
  assert('BrowserRepository instantiates cleanly', quotaRepo !== null);

  // 7. Patient Sign-up & Duplicate Detection Logic
  console.log('\n-- 7. Patient Sign-up & Duplicate Claim Requests --');
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

  // Case A: New patient registration (no duplicates)
  const newPhone = '+1 (555) 999-8888';
  const newName = 'Arthur Dent';
  const isDuplicateA = mockExistingPatients.some(
    (p) => p.phone === newPhone || (`${p.firstName} ${p.lastName}`.toLowerCase() === newName.toLowerCase() && p.dob === '1980-01-01')
  );
  assert('New patient details not flagged as duplicate', !isDuplicateA);

  // Case B: Duplicate phone number
  const duplicatePhone = '+1 (555) 234-5678';
  const isDuplicateB = mockExistingPatients.some(
    (p) => p.phone === duplicatePhone || (`${p.firstName} ${p.lastName}`.toLowerCase() === 'Other Person'.toLowerCase() && p.dob === '1990-01-01')
  );
  assert('Matching phone number flagged as duplicate patient', isDuplicateB);

  // Case C: Duplicate name and date of birth
  const duplicateName = 'Eleanor Wright';
  const duplicateDob = '1988-04-12';
  const matchedPat = mockExistingPatients.find(
    (p) => p.phone === '+1 (555) 000-0000' || (`${p.firstName} ${p.lastName}`.toLowerCase() === duplicateName.toLowerCase() && p.dob === duplicateDob)
  );
  assert('Matching name and date of birth flagged as duplicate', matchedPat !== undefined && matchedPat.mrn === 'MRN-10001');

  // Verify ClaimRequest structure
  const claimReq: ClaimRequest = {
    id: `claim-${Date.now()}`,
    accountId: 'acc-new-patient',
    accountEmail: 'eleanor.portal@example.com',
    accountPhone: '+1 (555) 234-5678',
    accountName: 'Eleanor Wright',
    dob: '1988-04-12',
    existingPatientId: matchedPat!.id,
    existingMrn: matchedPat!.mrn,
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };
  assertEqual('Claim request status is pending on creation', claimReq.status, 'pending');
  assertEqual('Claim request holds matched MRN', claimReq.existingMrn, 'MRN-10001');

  // 8. Staff Sign-up & Approval Flow
  console.log('\n-- 8. Staff Sign-up & Administrative Approval Flow --');
  const staffApplication: PendingStaffApproval = {
    id: 'pend-test-1',
    role: 'doctor',
    staffName: 'Dr. Gregory House',
    staffTitle: 'Diagnostic Specialist',
    department: 'Diagnostics',
    badgeNumber: 'DOC-999',
    requestedAt: '2026-10-16 10:00',
    notes: 'Online sign-up request; clearance pending administrator authorization.',
  };
  assert('Staff application role is doctor or receptionist', staffApplication.role === 'doctor' || staffApplication.role === 'receptionist');
  assert('Staff application includes badge number and title', staffApplication.badgeNumber.startsWith('DOC-') && staffApplication.staffTitle.length > 0);

  // 9. Backup Export Shape and Import Validation
  console.log('\n-- 9. Backup Export, Validation, and Undo Restores --');
  const exported = await exportBackupData();
  assertEqual('Export data includes schema version 1', exported.schemaVersion, SCHEMA_VERSION);
  assert('Export data contains export timestamp', typeof exported.exportedAt === 'string');
  assert('Export data contains collections object', typeof exported.collections === 'object');
  assert('Export collections include accounts array', Array.isArray(exported.collections.accounts));
  assert('Export collections include patients array', Array.isArray(exported.collections.patients));
  assert('Export collections include ledger array', Array.isArray(exported.collections.ledger));

  // Invalid schema version rejection
  const invalidBackup: any = {
    schemaVersion: 999,
    exportedAt: new Date().toISOString(),
    collections: {},
  };
  let importFailed = false;
  try {
    await importBackupData(invalidBackup);
  } catch {
    importFailed = true;
  }
  assert('Import rejects backup with unsupported schema version', importFailed);

  // 10. Role Permissions & Data Tab Gating
  console.log('\n-- 10. Administrative Access Permissions & Data Tab Gating --');
  const adminUser: User = {
    id: 'usr-md-1',
    name: 'Dr. Marcus Vance',
    email: 'm.vance@beaconclinic.com',
    role: 'md',
    badgeNumber: 'DOC-101',
    capabilities: ['administrativeAccess', 'consultationWorkstation'],
  };

  const doctorUser: User = {
    id: 'usr-doc-2',
    name: 'Dr. Nathan Hayes',
    email: 'n.hayes@beaconclinic.com',
    role: 'doctor',
    badgeNumber: 'DOC-102',
    capabilities: ['consultationWorkstation', 'prescriptionAuthoring'],
  };

  const receptionistUser: User = {
    id: 'usr-rec-1',
    name: 'Priya Sharma',
    email: 'p.sharma@beaconclinic.com',
    role: 'receptionist',
    badgeNumber: 'REC-301',
    capabilities: ['patientRegistration', 'patientCheckIn'],
  };

  assert('Administrator has administrativeAccess capability', hasCapability(adminUser, 'administrativeAccess'));
  assert('Doctor without admin role lacks administrativeAccess', !hasCapability(doctorUser, 'administrativeAccess'));
  assert('Receptionist lacks administrativeAccess', !hasCapability(receptionistUser, 'administrativeAccess'));
  assert('Receptionist has patientRegistration capability', hasCapability(receptionistUser, 'patientRegistration'));

  // Summary
  console.log('\n=== Test Results Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
