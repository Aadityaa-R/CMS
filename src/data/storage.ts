import {
  SCHEMA_VERSION,
  STORAGE_KEY_PREFIX,
  STORAGE_SETTINGS_KEY,
  STORAGE_BACKUP_UNDO_KEY,
} from '../lib/authConstants';

export { SCHEMA_VERSION };
import {
  CollectionName,
  StorageSettings,
  BackupData,
  Account,
  ClaimRequest,
} from '../types/storage';
import { BrowserRepository, MemoryRepository, Repository } from './repository';
import { hashPassword } from '../lib/auth';
import { normalizeActor } from '../lib/billing';
import { migrateConsultationFee } from '../lib/money';
import { migrateLegacyPrescription } from '../lib/prescribing';
import { Medicine } from '../types/prescribing';
import {
  ROLE_CREDENTIALS,
  INITIAL_STAFF_ACCESS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_MODULES,
  INITIAL_PENDING_APPROVALS,
  INITIAL_PATIENT_ASSIGNMENTS,
  INITIAL_ACCESS_AUDIT_LOG,
} from './mockData';
import { INITIAL_SHIFTS, INITIAL_ATTENDANCE_RECORDS, INITIAL_LEAVE_REQUESTS } from './attendanceSeed';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from './billingSeed';
import { INITIAL_FORMULARY } from './formularySeed';
import { InAppNotification } from '../types';

export const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-1',
    recipientId: 'pat-1',
    title: 'Welcome to Patient Portal',
    message: 'Welcome to Beacon Health Clinic. You can view your upcoming appointments, medical records, and settle invoices online.',
    type: 'general',
    read: false,
    createdAt: '2026-10-16T08:00:00.000Z',
    linkTab: 'appointments',
  },
];

// Active in-memory registry of repositories per collection
const repositories: Partial<Record<CollectionName, Repository<any>>> = {};

export function getRepository<T extends { id: string }>(collection: CollectionName): Repository<T> {
  if (!repositories[collection]) {
    const settings = getStorageSettings();
    if (settings.mode === 'memory') {
      repositories[collection] = new MemoryRepository<T>();
    } else {
      repositories[collection] = new BrowserRepository<T>(collection);
    }
  }
  return repositories[collection] as Repository<T>;
}

export function getStorageSettings(): StorageSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      mode: 'memory',
      schemaVersion: SCHEMA_VERSION,
      lastSaved: new Date().toISOString(),
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.mode === 'browser' || parsed.mode === 'memory')) {
        return {
          ...parsed,
          schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
        };
      }
    }
  } catch {
    // Fallback
  }
  return {
    mode: 'browser',
    schemaVersion: isStorageEmpty() ? SCHEMA_VERSION : 1,
    lastSaved: new Date().toISOString(),
  };
}

export function setStorageSettings(settings: Partial<StorageSettings>): void {
  const current = getStorageSettings();
  const next: StorageSettings = {
    ...current,
    ...settings,
    lastSaved: new Date().toISOString(),
  };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }
}

export function switchStorageMode(newMode: 'browser' | 'memory'): void {
  const current = getStorageSettings();
  if (current.mode === newMode) return;
  setStorageSettings({ mode: newMode });
  // Clear repo cache so next getRepository instantiates the chosen type
  Object.keys(repositories).forEach((key) => {
    delete repositories[key as CollectionName];
  });
}

const SEED_ACCOUNT_HASHES: Record<string, { hash: string; salt: string; iterations: number }> = {
  md: {
    hash: 'd0bc09d4a015a6767fbf1d89f4422d920272cdb39b908f2188b9fc2d812f9762',
    salt: '0999a0ef8f7235d088c383097bacad09',
    iterations: 100000,
  },
  doctor: {
    hash: 'ff7f3630859cccb7c74d210401e1c4f0036e61f246949cd889dae44ee54e3ac4',
    salt: '07578474b57bf6f4105beebedc476d9e',
    iterations: 100000,
  },
  receptionist: {
    hash: '6823bfb05eba6bb3b53fd61c8889da29f9b92d345d5193c90c2c8cca1a68c945',
    salt: 'a5037347f90e2e93a8ef52a8147abd9f',
    iterations: 100000,
  },
  receptionist2: {
    hash: 'cb4bf9598405cc18d84dab71bc9cb32b51c587c634ae971982f7010f92a163b7',
    salt: '45888ce2d2445d39a471861614dcde59',
    iterations: 100000,
  },
  patient: {
    hash: '246d36bcaf1032247ea27338b72c345ee9734111499f4e44d7b164563a73ed2e',
    salt: 'e3a24c1910e202db3fc2225405273592',
    iterations: 100000,
  },
};

// Generate seeded accounts with hashed passwords
export async function generateSeedAccounts(): Promise<Account[]> {
  const accounts: Account[] = [];
  const now = new Date().toISOString();

  for (const cred of ROLE_CREDENTIALS) {
    const precomputed = SEED_ACCOUNT_HASHES[cred.username.toLowerCase()];
    const { hash, salt, iterations } = precomputed || (await hashPassword(cred.password));
    accounts.push({
      id: `acc-${cred.username}`,
      username: cred.username.toLowerCase(),
      email: cred.email.toLowerCase(),
      fullName: cred.fullName,
      phone: '+1 (555) 234-5678',
      role: cred.role,
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return accounts;
}

export function isStorageEmpty(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const accountsRaw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}accounts`);
    const patientsRaw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}patients`);
    return !accountsRaw && !patientsRaw;
  } catch {
    return true;
  }
}

export function isStorageCorrupted(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const item = window.localStorage.getItem(key);
        if (item) {
          JSON.parse(item);
        }
      }
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Normalizes an array of invoices from earlier schema versions to schema version 2.
 * Converts legacy dollar amounts to integer cents, ensures canonical { id, name } createdBy,
 * and standardizes field keys.
 */
export function migrateInvoices(invoices: any[]): any[] {
  if (!Array.isArray(invoices)) return [];
  return invoices.map((inv, idx) => {
    const rawItems = Array.isArray(inv.items) ? inv.items : [];
    const normalizedItems = rawItems.map((item: any, itemIdx: number) => {
      let amount = 0;
      if (typeof item.amount === 'number') {
        amount = item.amount > 0 && item.amount < 1000 ? Math.round(item.amount * 100) : Math.round(item.amount);
      } else if (typeof item.price === 'number') {
        amount = item.price > 0 && item.price < 1000 ? Math.round(item.price * 100) : Math.round(item.price);
      }
      return {
        id: item.id || `item-migrated-${idx}-${itemIdx + 1}`,
        description: item.description || 'Medical Service',
        amount,
        kind: (item.kind === 'consultation' || item.kind === 'charge' || item.kind === 'discount')
          ? item.kind
          : 'charge',
      };
    });

    const doctorId = inv.doctorId || 'unknown';
    const doctorName = inv.doctorName || 'Staff Doctor';

    return {
      ...inv,
      id: inv.id || `inv-${idx + 1}`,
      number: inv.number || inv.invoiceNumber || `INV-${inv.id || idx + 1}`,
      patientId: inv.patientId || '',
      patientName: inv.patientName || undefined,
      visitId: inv.visitId || inv.appointmentId || undefined,
      appointmentId: inv.appointmentId || inv.visitId || undefined,
      doctorId,
      doctorName,
      issuedAt: inv.issuedAt || inv.date || inv.createdAt || new Date().toISOString(),
      items: normalizedItems,
      status: ['unpaid', 'partially_paid', 'paid', 'void'].includes(inv.status) ? inv.status : 'unpaid',
      createdBy: normalizeActor(inv.createdBy, doctorId, doctorName),
    };
  });
}

/**
 * Normalizes an array of payments from earlier schema versions to schema version 2.
 * Converts legacy dollar amounts to integer cents, ensures canonical { id, name } receivedBy,
 * and sets default kind and sequential receipt number.
 */
export function migratePayments(payments: any[]): any[] {
  if (!Array.isArray(payments)) return [];
  return payments.map((p, idx) => {
    let amount = 0;
    if (typeof p.amount === 'number') {
      amount = p.amount > 0 && p.amount < 1000 ? Math.round(p.amount * 100) : Math.round(p.amount);
    }

    return {
      ...p,
      id: p.id || `pay-${idx + 1}`,
      invoiceId: p.invoiceId || '',
      amount,
      method: ['cash', 'card', 'upi', 'portal'].includes(p.method) ? p.method : 'cash',
      kind: p.kind === 'reversal' ? 'reversal' : 'payment',
      reversesPaymentId: p.reversesPaymentId || undefined,
      receivedAt: p.receivedAt || p.date || p.timestamp || p.createdAt || new Date().toISOString(),
      receivedBy: normalizeActor(p.receivedBy, 'unknown', 'Unknown'),
      reference: p.reference || undefined,
      note: p.note || undefined,
      reason: p.reason || undefined,
      receiptNumber: p.receiptNumber || `RCT-${p.id || idx + 1}`,
    };
  });
}

/**
 * Normalizes an array of prescriptions from earlier schema versions to schema version 2.
 * Converts unstructured text prescriptions to structured items, resolves formulary medicines,
 * and standardizes actor fields.
 */
export function migratePrescriptions(prescriptions: any[], formulary: Medicine[] = []): any[] {
  if (!Array.isArray(prescriptions)) return [];
  return prescriptions.map((rx) => {
    const migrated = migrateLegacyPrescription(rx, formulary);
    if (rx.cancelledBy) {
      migrated.cancelledBy = normalizeActor(rx.cancelledBy, 'unknown', 'Unknown');
    }
    return migrated;
  });
}

/**
 * Normalizes staff members by converting consultationFee from legacy dollars to cents.
 */
export function migrateStaff(staffList: any[]): any[] {
  if (!Array.isArray(staffList)) return [];
  return staffList.map((s) => ({
    ...s,
    consultationFee: migrateConsultationFee(s.consultationFee),
  }));
}

/**
 * Normalizes appointments actor fields (checkedInBy, bookedBy, cancelledBy) to canonical objects.
 */
export function migrateAppointments(appointments: any[]): any[] {
  if (!Array.isArray(appointments)) return [];
  return appointments.map((a) => {
    const updated: any = { ...a };
    if (a.checkedInBy) {
      updated.checkedInBy = normalizeActor(a.checkedInBy, 'unknown', 'Staff');
    }
    if (a.bookedBy) {
      updated.bookedBy = normalizeActor(a.bookedBy, 'unknown', 'Staff');
    }
    if (a.cancelledBy) {
      updated.cancelledBy = normalizeActor(a.cancelledBy, 'unknown', 'Staff');
    }
    return updated;
  });
}

/**
 * Upgrades persisted storage collections across schema versions.
 * Safely normalizes in-place without losing or wiping existing user data.
 */
export async function runStorageMigrations(fromVersion: number, toVersion: number): Promise<void> {
  if (fromVersion >= toVersion) return;

  if (fromVersion < 2) {
    // 1. Formulary (needed for prescription migration)
    const repoFormulary = getRepository<any>('formulary');
    let formulary = await repoFormulary.list();
    if (!formulary || formulary.length === 0) {
      formulary = INITIAL_FORMULARY;
    }

    // 2. Invoices
    const repoInvoices = getRepository<any>('invoices');
    const existingInvoices = await repoInvoices.list();
    if (existingInvoices && existingInvoices.length > 0) {
      const migratedInvoices = migrateInvoices(existingInvoices);
      await repoInvoices.replaceAll(migratedInvoices);
    }

    // 3. Payments
    const repoPayments = getRepository<any>('payments');
    const existingPayments = await repoPayments.list();
    if (existingPayments && existingPayments.length > 0) {
      const migratedPayments = migratePayments(existingPayments);
      await repoPayments.replaceAll(migratedPayments);
    }

    // 4. Prescriptions
    const repoPrescriptions = getRepository<any>('prescriptions');
    const existingPrescriptions = await repoPrescriptions.list();
    if (existingPrescriptions && existingPrescriptions.length > 0) {
      const migratedPrescriptions = migratePrescriptions(existingPrescriptions, formulary);
      await repoPrescriptions.replaceAll(migratedPrescriptions);
    }

    // 5. Staff
    const repoStaff = getRepository<any>('staff');
    const existingStaff = await repoStaff.list();
    if (existingStaff && existingStaff.length > 0) {
      const migratedStaff = migrateStaff(existingStaff);
      await repoStaff.replaceAll(migratedStaff);
    }

    // 6. Appointments
    const repoAppointments = getRepository<any>('appointments');
    const existingAppointments = await repoAppointments.list();
    if (existingAppointments && existingAppointments.length > 0) {
      const migratedAppointments = migrateAppointments(existingAppointments);
      await repoAppointments.replaceAll(migratedAppointments);
    }

    // Update settings schema version
    setStorageSettings({ schemaVersion: toVersion });

    // Record audit in ledger
    const repoLedger = getRepository<any>('ledger');
    await repoLedger.create({
      id: `audit-migration-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'schema_migration',
      subject: 'Storage Schema Migration',
      role: 'system',
      details: `Storage schema upgraded from version ${fromVersion} to version ${toVersion}.`,
      authorizedBy: 'System Migration',
    });
  }
}

export async function seedInitialData(force = false): Promise<void> {
  if (!force && !isStorageEmpty()) {
    const settings = getStorageSettings();
    const currentVersion = settings.schemaVersion || 1;
    if (currentVersion < SCHEMA_VERSION) {
      await runStorageMigrations(currentVersion, SCHEMA_VERSION);
    }
    return;
  }

  const seedAccounts = await generateSeedAccounts();
  const repoAccounts = getRepository<Account>('accounts');
  const repoStaff = getRepository<any>('staff');
  const repoPatients = getRepository<any>('patients');
  const repoAppointments = getRepository<any>('appointments');
  const repoPrescriptions = getRepository<any>('prescriptions');
  const repoInvoices = getRepository<any>('invoices');
  const repoAssignments = getRepository<any>('assignments');
  const repoRoles = getRepository<any>('roles');
  const repoApprovals = getRepository<any>('approvals');
  const repoClaimRequests = getRepository<ClaimRequest>('claimRequests');
  const repoAttendance = getRepository<any>('attendance');
  const repoLeave = getRepository<any>('leave');
  const repoShifts = getRepository<any>('shifts');
  const repoLedger = getRepository<any>('ledger');
  const repoVisits = getRepository<any>('visits');
  const repoPayments = getRepository<any>('payments');
  const repoNotifications = getRepository<InAppNotification>('notifications');
  const repoFormulary = getRepository<any>('formulary');

  await repoAccounts.replaceAll(seedAccounts);
  await repoStaff.replaceAll(INITIAL_STAFF_ACCESS);
  await repoPatients.replaceAll(INITIAL_PATIENTS);
  await repoAppointments.replaceAll(INITIAL_APPOINTMENTS);
  await repoPrescriptions.replaceAll(INITIAL_PRESCRIPTIONS);
  await repoInvoices.replaceAll(INITIAL_SEED_INVOICES);
  await repoAssignments.replaceAll(INITIAL_PATIENT_ASSIGNMENTS);
  await repoRoles.replaceAll(INITIAL_MODULES);
  await repoApprovals.replaceAll(INITIAL_PENDING_APPROVALS);
  await repoClaimRequests.replaceAll([]);
  await repoAttendance.replaceAll(INITIAL_ATTENDANCE_RECORDS);
  await repoLeave.replaceAll(INITIAL_LEAVE_REQUESTS);
  await repoShifts.replaceAll(INITIAL_SHIFTS);
  await repoLedger.replaceAll(INITIAL_ACCESS_AUDIT_LOG);
  await repoVisits.replaceAll([]);
  await repoPayments.replaceAll(INITIAL_SEED_PAYMENTS);
  await repoNotifications.replaceAll(INITIAL_NOTIFICATIONS);
  await repoFormulary.replaceAll(INITIAL_FORMULARY);

  setStorageSettings({
    mode: 'browser',
    schemaVersion: SCHEMA_VERSION,
    lastSaved: new Date().toISOString(),
  });
}

export async function resetDemoData(actingUser = 'Administrator'): Promise<void> {
  // Clear all collection storage keys
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // Fallback
    }
  }

  // Clear in-memory caches
  Object.values(repositories).forEach((r) => r?.clear());

  // Reseed
  await seedInitialData(true);

  // Add ledger entry
  const repoLedger = getRepository<any>('ledger');
  await repoLedger.create({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'demo_data_reset',
    subject: 'Demonstration System State',
    role: 'system',
    details: 'Demo data was restored to baseline factory state.',
    authorizedBy: actingUser,
  });
}

export async function exportBackupData(): Promise<BackupData> {
  const collections: any = {};
  const names: CollectionName[] = [
    'accounts',
    'staff',
    'patients',
    'assignments',
    'appointments',
    'visits',
    'prescriptions',
    'invoices',
    'payments',
    'attendance',
    'leave',
    'shifts',
    'roles',
    'approvals',
    'claimRequests',
    'ledger',
    'notifications',
    'formulary',
    'settings',
  ];

  for (const name of names) {
    if (name === 'settings') {
      collections.settings = getStorageSettings();
    } else {
      const repo = getRepository<any>(name);
      collections[name] = await repo.list();
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    SCHEMA_VERSION,
    appVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    collections,
  };
}

export async function importBackupData(backup: BackupData, actingUser = 'Administrator'): Promise<void> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup file: Not a valid JSON document.');
  }
  const version = backup.schemaVersion || backup.SCHEMA_VERSION || 1;
  if (!version || version > SCHEMA_VERSION) {
    throw new Error(`Incompatible schema version: file version ${version} is unsupported.`);
  }
  if (!backup.collections || typeof backup.collections !== 'object') {
    throw new Error('Invalid backup file: Missing collections container.');
  }

  // If importing older schema version, normalize collections before restoring
  if (version < 2 && backup.collections) {
    const formulary = backup.collections.formulary || INITIAL_FORMULARY;
    if (Array.isArray(backup.collections.invoices)) {
      backup.collections.invoices = migrateInvoices(backup.collections.invoices);
    }
    if (Array.isArray(backup.collections.payments)) {
      backup.collections.payments = migratePayments(backup.collections.payments);
    }
    if (Array.isArray(backup.collections.prescriptions)) {
      backup.collections.prescriptions = migratePrescriptions(backup.collections.prescriptions, formulary);
    }
    if (Array.isArray(backup.collections.staff)) {
      backup.collections.staff = migrateStaff(backup.collections.staff);
    }
    if (Array.isArray(backup.collections.appointments)) {
      backup.collections.appointments = migrateAppointments(backup.collections.appointments);
    }
  }

  // Save current data snapshot for undo
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const currentBackup = await exportBackupData();
      window.localStorage.setItem(STORAGE_BACKUP_UNDO_KEY, JSON.stringify(currentBackup));
    } catch {
      // Ignore snapshot failure
    }
  }

  // Restore each collection
  const entries = Object.entries(backup.collections);
  for (const [colName, items] of entries) {
    if (colName === 'settings') {
      setStorageSettings({ ...(items as StorageSettings), schemaVersion: SCHEMA_VERSION });
    } else if (Array.isArray(items)) {
      const repo = getRepository<any>(colName as CollectionName);
      await repo.replaceAll(items);
    }
  }

  setStorageSettings({ schemaVersion: SCHEMA_VERSION });

  // Log to ledger
  const repoLedger = getRepository<any>('ledger');
  await repoLedger.create({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'data_imported',
    subject: 'System Backup Restore',
    role: 'admin',
    details: `Backup from ${backup.exportedAt || 'unspecified date'} successfully restored.`,
    authorizedBy: actingUser,
  });
}

export async function restoreUndoSnapshot(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_BACKUP_UNDO_KEY);
    if (!raw) return false;
    const snapshot: BackupData = JSON.parse(raw);
    await importBackupData(snapshot, 'Administrator (Undo)');
    window.localStorage.removeItem(STORAGE_BACKUP_UNDO_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasUndoSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return Boolean(window.localStorage.getItem(STORAGE_BACKUP_UNDO_KEY));
  } catch {
    return false;
  }
}

export async function getStorageStats(): Promise<{
  mode: 'browser' | 'memory';
  lastSaved: string;
  totalBytes: number;
  totalSizeFormatted: string;
  isNearQuota: boolean;
  counts: Record<CollectionName, number>;
}> {
  const settings = getStorageSettings();
  const counts: Partial<Record<CollectionName, number>> = {};
  const names: CollectionName[] = [
    'accounts',
    'staff',
    'patients',
    'assignments',
    'appointments',
    'visits',
    'prescriptions',
    'invoices',
    'payments',
    'attendance',
    'leave',
    'shifts',
    'roles',
    'approvals',
    'claimRequests',
    'ledger',
    'notifications',
    'formulary',
    'settings',
  ];

  let totalBytes = 0;
  for (const name of names) {
    if (name === 'settings') {
      counts.settings = 1;
    } else {
      const repo = getRepository<any>(name);
      counts[name] = await repo.count();
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith(STORAGE_KEY_PREFIX) || k === STORAGE_SETTINGS_KEY)) {
          const v = window.localStorage.getItem(k) || '';
          totalBytes += k.length + v.length;
        }
      }
    } catch {
      // Fallback
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 5MB browser quota standard; 80% is 4MB = 4,194,304 bytes
  const isNearQuota = totalBytes > 4 * 1024 * 1024;

  return {
    mode: settings.mode,
    lastSaved: settings.lastSaved,
    totalBytes,
    totalSizeFormatted: formatSize(totalBytes),
    isNearQuota,
    counts: counts as Record<CollectionName, number>,
  };
}
