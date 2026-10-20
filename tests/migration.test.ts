import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateInvoices,
  migratePayments,
  migratePrescriptions,
  migrateStaff,
  migrateAppointments,
  runStorageMigrations,
  importBackupData,
  getRepository,
  getStorageSettings,
  SCHEMA_VERSION,
} from '../src/data/storage';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { BackupData } from '../src/types/storage';

describe('Storage Schema Version 1 to 2 Migration Tests (M9.5 / fix-payments-blank)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const v1InvoiceFixture = [
    {
      id: 'inv-legacy-1',
      invoiceNumber: 'INV-2025-0099',
      patientId: 'pat-1',
      patientName: 'Eleanor Wright',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      date: '2025-12-01T10:00:00.000Z',
      items: [
        {
          id: 'item-1',
          description: 'Initial Specialist Consultation',
          amount: 120, // legacy dollars
          kind: 'consultation',
        },
        {
          id: 'item-2',
          description: 'ECG Screening',
          price: 53.25, // legacy dollars with cents
          kind: 'charge',
        },
      ],
      status: 'paid',
      createdBy: 'Dr. Marcus Vance', // string actor
    },
  ];

  const v1PaymentFixture = [
    {
      id: 'pay-legacy-1',
      invoiceId: 'inv-legacy-1',
      amount: 173.25, // legacy dollars
      method: 'cash',
      date: '2025-12-01T10:30:00.000Z',
      receivedBy: 'Priya Sharma', // string actor
    },
  ];

  const v1PrescriptionFixture = [
    {
      id: 'rx-legacy-1',
      prescriptionNumber: 'RX-2025-001',
      patientId: 'pat-1',
      patientName: 'Eleanor Wright',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      date: '2025-12-01',
      diagnosis: 'Hypertension',
      medicines: ['Amlodipine Besylate 5 mg tablet'],
      status: 'cancelled',
      cancelledBy: 'Administrator', // string actor
    },
  ];

  const v1StaffFixture = [
    {
      id: 'doc-1',
      name: 'Dr. Marcus Vance',
      role: 'doctor',
      consultationFee: 120, // legacy dollars
    },
  ];

  const v1AppointmentFixture = [
    {
      id: 'apt-legacy-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      dateTime: '2025-12-01T10:00:00.000Z',
      status: 'completed',
      checkedInBy: 'David Kim', // string actor
      bookedBy: 'Priya Sharma', // string actor
    },
  ];

  it('migrateInvoices normalizes legacy dollars to integer cents and string actors to objects', () => {
    const migrated = migrateInvoices(v1InvoiceFixture);
    expect(migrated.length).toBe(1);

    const inv = migrated[0];
    expect(inv.number).toBe('INV-2025-0099');
    expect(inv.issuedAt).toBe('2025-12-01T10:00:00.000Z');
    expect(inv.createdBy).toEqual({ id: 'doc-1', name: 'Dr. Marcus Vance' });

    // Item 1: 120 dollars -> 12000 cents
    expect(inv.items[0].amount).toBe(12000);
    // Item 2: 53.25 dollars -> 5325 cents
    expect(inv.items[1].amount).toBe(5325);
  });

  it('migratePayments normalizes legacy dates, amounts, actors, and receipt numbers', () => {
    const migrated = migratePayments(v1PaymentFixture);
    expect(migrated.length).toBe(1);

    const p = migrated[0];
    expect(p.amount).toBe(17325); // 173.25 * 100 = 17325 cents
    expect(p.receivedAt).toBe('2025-12-01T10:30:00.000Z');
    expect(p.receivedBy).toEqual({ id: 'unknown', name: 'Priya Sharma' });
    expect(p.kind).toBe('payment');
    expect(p.receiptNumber).toBe('RCT-pay-legacy-1');
  });

  it('migratePrescriptions upgrades legacy text items and normalizes cancelledBy', () => {
    const migrated = migratePrescriptions(v1PrescriptionFixture, INITIAL_FORMULARY);
    expect(migrated.length).toBe(1);

    const rx = migrated[0];
    expect(rx.items.length).toBe(1);
    expect(rx.items[0].medicineName).toBe('Amlodipine Besylate');
    expect(rx.cancelledBy).toEqual({ id: 'unknown', name: 'Administrator' });
  });

  it('migrateStaff strips leftover capabilities while converting consultationFee to cents', () => {
    const staffWithCapabilities = [
      {
        id: 'doc-legacy',
        name: 'Dr. Nathan Hayes',
        role: 'doctor',
        consultationFee: 90,
        capabilities: ['consultationWorkstation', 'emrRecordsAccess'],
      },
    ];
    const migrated = migrateStaff(staffWithCapabilities);
    expect(migrated[0].consultationFee).toBe(9000);
    expect((migrated[0] as any).capabilities).toBeUndefined();
  });

  it('migrateStaff converts consultationFee from legacy dollars to cents', () => {
    const migrated = migrateStaff(v1StaffFixture);
    expect(migrated[0].consultationFee).toBe(12000);
  });

  it('migrateAppointments converts string actors to { id, name }', () => {
    const migrated = migrateAppointments(v1AppointmentFixture);
    expect(migrated[0].checkedInBy).toEqual({ id: 'unknown', name: 'David Kim' });
    expect(migrated[0].bookedBy).toEqual({ id: 'unknown', name: 'Priya Sharma' });
  });

  it('importBackupData imports a complete version-1 backup file and upgrades to version 2', async () => {
    const v1Backup: BackupData = {
      schemaVersion: 1,
      SCHEMA_VERSION: 1,
      appVersion: '1.0.0',
      exportedAt: '2025-12-31T23:59:59.000Z',
      collections: {
        accounts: [],
        staff: v1StaffFixture as any,
        patients: [],
        assignments: [],
        appointments: v1AppointmentFixture as any,
        visits: [],
        prescriptions: v1PrescriptionFixture as any,
        invoices: v1InvoiceFixture as any,
        payments: v1PaymentFixture as any,
        attendance: [],
        leave: [],
        shifts: [],
        roles: [],
        approvals: [],
        claimRequests: [],
        ledger: [],
        notifications: [],
        formulary: INITIAL_FORMULARY as any,
        settings: {
          mode: 'browser',
          schemaVersion: 1,
          lastSaved: '2025-12-31T23:59:59.000Z',
        },
      },
    };

    await importBackupData(v1Backup, 'Administrator');

    // Storage settings must now report SCHEMA_VERSION 2
    const settings = getStorageSettings();
    expect(settings.schemaVersion).toBe(SCHEMA_VERSION);
    expect(settings.schemaVersion).toBe(2);

    // Persisted collections must contain upgraded records
    const repoInvoices = getRepository<any>('invoices');
    const invoices = await repoInvoices.list();
    expect(invoices.length).toBe(1);
    expect(invoices[0].number).toBe('INV-2025-0099');
    expect(invoices[0].items[0].amount).toBe(12000);

    const repoPayments = getRepository<any>('payments');
    const payments = await repoPayments.list();
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(17325);
    expect(payments[0].receivedBy).toEqual({ id: 'unknown', name: 'Priya Sharma' });
  });

  it('runStorageMigrations upgrades older data already saved in localStorage without wiping', async () => {
    // Populate localStorage with unmigrated v1 records directly
    const repoInvoices = getRepository<any>('invoices');
    await repoInvoices.replaceAll(v1InvoiceFixture);

    const repoPayments = getRepository<any>('payments');
    await repoPayments.replaceAll(v1PaymentFixture);

    // Run migration from version 1 to 2
    await runStorageMigrations(1, 2);

    const updatedInvoices = await repoInvoices.list();
    expect(updatedInvoices[0].items[0].amount).toBe(12000);
    expect(updatedInvoices[0].createdBy).toEqual({ id: 'doc-1', name: 'Dr. Marcus Vance' });

    const updatedPayments = await repoPayments.list();
    expect(updatedPayments[0].amount).toBe(17325);
    expect(updatedPayments[0].receivedBy).toEqual({ id: 'unknown', name: 'Priya Sharma' });

    const settings = getStorageSettings();
    expect(settings.schemaVersion).toBe(2);
  });
});
