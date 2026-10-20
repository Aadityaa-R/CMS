import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillingView } from '../src/views/BillingView';
import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { BillingContext } from '../src/context/BillingContext';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from '../src/data/billingSeed';
import { INITIAL_MODULES } from '../src/data/mockData';
import { Invoice, Payment } from '../src/types/billing';
import { User } from '../src/types';

const mdUser: User = {
  id: 'usr-md-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  role: 'md',
  badgeNumber: 'DOC-101',
};

const receptionistUser: User = {
  id: 'usr-rec-1',
  name: 'Priya Sharma',
  email: 'p.sharma@beaconclinic.com',
  role: 'receptionist',
  badgeNumber: 'REC-201',
};

function renderBillingWithCustomData({
  user = mdUser,
  invoices = INITIAL_SEED_INVOICES,
  payments = INITIAL_SEED_PAYMENTS,
}: {
  user?: User;
  invoices?: Invoice[];
  payments?: Payment[];
}) {
  const authValue: any = {
    currentUser: user,
    currentRole: user.role,
    isAuthenticated: true,
  };

  const clinicValue: any = {
    modules: INITIAL_MODULES,
    patients: [
      { id: 'pat-1', firstName: 'Eleanor', lastName: 'Wright', mrn: 'MRN-1001' },
      { id: 'pat-2', firstName: 'James', lastName: 'Miller', mrn: 'MRN-1002' },
    ],
  };

  const billingValue: any = {
    invoices,
    payments,
    recordPayment: async () => ({ success: true }),
    reversePayment: async () => ({ success: true }),
    addCharge: async () => ({ success: true }),
    applyDiscount: async () => ({ success: true }),
    voidInvoice: async () => ({ success: true }),
    getReceipt: () => null,
    getDailyCollections: () => ({
      cash: 1000,
      card: 2000,
      upi: 0,
      portal: 0,
      total: 3000,
    }),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <ClinicContext.Provider value={clinicValue}>
        <BillingContext.Provider value={billingValue}>
          <BillingView initialTab="payments" />
        </BillingContext.Provider>
      </ClinicContext.Provider>
    </AuthContext.Provider>
  );
}

describe('Payments Tab Hardening (M9.5 / fix-payments-blank)', () => {
  it('renders Payments tab with seed data without throwing', () => {
    expect(() => {
      renderBillingWithCustomData({ user: mdUser });
    }).not.toThrow();

    expect(screen.getByText(/Payments Recorded/i)).toBeDefined();
    expect(screen.getByText('RCT-2026-0001')).toBeDefined();
  });

  it('renders a payment with no matching invoice showing plain text "Unknown"', () => {
    const orphanPayment: Payment = {
      id: 'pay-orphan-1',
      invoiceId: 'non-existent-invoice-id',
      amount: 5000,
      method: 'cash',
      kind: 'payment',
      receivedAt: '2026-10-16T10:00:00.000Z',
      receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      receiptNumber: 'RCT-ORPHAN-001',
    };

    expect(() => {
      renderBillingWithCustomData({
        user: mdUser,
        payments: [orphanPayment],
      });
    }).not.toThrow();

    expect(screen.getByText('RCT-ORPHAN-001')).toBeDefined();
    // The missing invoice cell displays "Unknown"
    const unknownCells = screen.getAllByText('Unknown');
    expect(unknownCells.length).toBeGreaterThan(0);
  });

  it('renders string, object, and null receivedBy values without throwing', () => {
    const polymorphicPayments: Payment[] = [
      {
        id: 'pay-str-1',
        invoiceId: 'inv-2026-0002',
        amount: 2500,
        method: 'card',
        kind: 'payment',
        receivedAt: '2026-10-16T11:00:00.000Z',
        receivedBy: 'Card Terminal Front Desk' as any,
        receiptNumber: 'RCT-STR-001',
      },
      {
        id: 'pay-obj-1',
        invoiceId: 'inv-2026-0002',
        amount: 3500,
        method: 'cash',
        kind: 'payment',
        receivedAt: '2026-10-16T12:00:00.000Z',
        receivedBy: { id: 'usr-rec-2', name: 'David Kim' },
        receiptNumber: 'RCT-OBJ-001',
      },
      {
        id: 'pay-null-1',
        invoiceId: 'inv-2026-0002',
        amount: 1500,
        method: 'cash',
        kind: 'payment',
        receivedAt: '2026-10-16T13:00:00.000Z',
        receivedBy: null as any,
        receiptNumber: 'RCT-NULL-001',
      },
    ];

    expect(() => {
      renderBillingWithCustomData({
        user: mdUser,
        payments: polymorphicPayments,
      });
    }).not.toThrow();

    expect(screen.getByText('RCT-STR-001')).toBeDefined();
    expect(screen.getByText('Card Terminal Front Desk')).toBeDefined();
    expect(screen.getByText('RCT-OBJ-001')).toBeDefined();
    expect(screen.getByText('David Kim')).toBeDefined();
    expect(screen.getByText('RCT-NULL-001')).toBeDefined();
  });

  it('renders cleanly with an empty payments list', () => {
    expect(() => {
      renderBillingWithCustomData({
        user: mdUser,
        payments: [],
      });
    }).not.toThrow();

    expect(screen.getByText('0 Payments Recorded')).toBeDefined();
    expect(
      screen.getByText('No payments found matching criteria.')
    ).toBeDefined();
  });

  it('renders data from before the migration without throwing', () => {
    const legacyInvoices: any[] = [
      {
        id: 'inv-v1-001',
        invoiceNumber: 'INV-OLD-001',
        patientId: 'pat-1',
        patientName: 'Eleanor Wright',
        doctorId: 'doc-1',
        doctorName: 'Dr. Marcus Vance',
        date: '2026-10-10',
        items: [
          { id: 'item-1', description: 'Consultation', amount: 120, kind: 'consultation' },
        ],
        status: 'paid',
        createdBy: 'Dr. Marcus Vance',
      },
    ];

    const legacyPayments: any[] = [
      {
        id: 'pay-v1-001',
        invoiceId: 'inv-v1-001',
        amount: 120,
        method: 'cash',
        date: '2026-10-10',
        receivedBy: 'Reception Desk',
        receiptNumber: 'RCT-OLD-001',
      },
    ];

    expect(() => {
      renderBillingWithCustomData({
        user: mdUser,
        invoices: legacyInvoices,
        payments: legacyPayments,
      });
    }).not.toThrow();

    expect(screen.getByText('RCT-OLD-001')).toBeDefined();
    expect(screen.getByText('Reception Desk')).toBeDefined();
  });

  it('renders Payments tab for a receptionist with paymentRecording access', () => {
    expect(() => {
      renderBillingWithCustomData({ user: receptionistUser });
    }).not.toThrow();

    expect(screen.getByText(/Payments Recorded/i)).toBeDefined();
  });
});
