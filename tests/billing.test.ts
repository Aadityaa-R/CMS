import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  dollarsToCents,
  centsToDollars,
  invoiceTotal,
  amountPaid,
  balanceDue,
  deriveStatus,
  buildInvoiceForVisit,
  validatePayment,
  applyPayment,
  reversePayment,
  addCharge,
  applyDiscount,
  voidInvoice,
  makeReceipt,
  DEFAULT_CONSULTATION_FEE_CENTS,
} from '../src/lib/billing';
import {
  canViewBilling,
  canRecordPayment,
  canPayOwnInvoice,
  canVoidInvoice,
  canApplyDiscount,
  canReversePayment,
} from '../src/lib/permissions';
import { getScopedInvoices, getScopedPayments } from '../src/lib/selectors';
import { User } from '../src/types';
import { Invoice, Payment } from '../src/types/billing';
import { INITIAL_MODULES } from '../src/data/mockData';

describe('Billing and Payments Engine (M6 & M9.5 Hardening)', () => {
  const fixedNow = new Date('2026-10-16T11:00:00Z');

  describe('Minor Unit Conversions and Formatting', () => {
    it('converts dollars to integer minor cents and vice versa', () => {
      expect(dollarsToCents(100)).toBe(10000);
      expect(dollarsToCents(120.5)).toBe(12050);
      expect(dollarsToCents(0.99)).toBe(99);
      expect(centsToDollars(10000)).toBe(100);
      expect(centsToDollars(12050)).toBe(120.5);
    });

    it('formats cents into standard currency strings', () => {
      expect(formatCurrency(10000)).toBe('₹100.00');
      expect(formatCurrency(0)).toBe('₹0.00');
      expect(formatCurrency(12550)).toBe('₹125.50');
      expect(formatCurrency(49)).toBe('₹0.49');
    });
  });

  describe('Invoice Totals and Status Derivation', () => {
    const mockInvoice: Invoice = {
      id: 'inv-test-1',
      number: 'INV-2026-0001',
      patientId: 'pat-1',
      patientName: 'Eleanor Vance',
      doctorId: 'doc-1',
      issuedAt: '2026-10-16T10:00:00Z',
      status: 'unpaid',
      createdBy: { id: 'usr-1', name: 'Admin' },
      items: [
        { id: 'i1', description: 'Consultation', amount: 10000, kind: 'consultation' },
        { id: 'i2', description: 'Lab panel', amount: 5000, kind: 'charge' },
        { id: 'i3', description: 'Concession', amount: 2000, kind: 'discount' },
      ],
    };

    it('computes net total subtracting discounts', () => {
      expect(invoiceTotal(mockInvoice)).toBe(13000); // 10000 + 5000 - 2000
    });

    it('computes amountPaid, balanceDue, and derives status properly', () => {
      expect(amountPaid([], mockInvoice.id)).toBe(0);
      expect(balanceDue(mockInvoice, [])).toBe(13000);
      expect(deriveStatus(mockInvoice, [])).toBe('unpaid');

      const partialPayments: Payment[] = [
        {
          id: 'pay-1',
          invoiceId: 'inv-test-1',
          amount: 5000,
          method: 'card',
          kind: 'payment',
          receivedAt: '2026-10-16T10:15:00Z',
          receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
          receiptNumber: 'RCT-2026-0001',
        },
      ];
      expect(amountPaid(partialPayments, mockInvoice.id)).toBe(5000);
      expect(balanceDue(mockInvoice, partialPayments)).toBe(8000);
      expect(deriveStatus(mockInvoice, partialPayments)).toBe('partially_paid');

      const fullPayments: Payment[] = [
        ...partialPayments,
        {
          id: 'pay-2',
          invoiceId: 'inv-test-1',
          amount: 8000,
          method: 'cash',
          kind: 'payment',
          receivedAt: '2026-10-16T10:30:00Z',
          receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
          receiptNumber: 'RCT-2026-0002',
        },
      ];
      expect(amountPaid(fullPayments, mockInvoice.id)).toBe(13000);
      expect(balanceDue(mockInvoice, fullPayments)).toBe(0);
      expect(deriveStatus(mockInvoice, fullPayments)).toBe('paid');

      const voidInv: Invoice = { ...mockInvoice, status: 'void' };
      expect(balanceDue(voidInv, [])).toBe(0);
      expect(deriveStatus(voidInv, [])).toBe('void');
    });
  });

  describe('Conclude Visit Auto-Invoice Building', () => {
    const mockAppointment = {
      id: 'apt-v1',
      patientId: 'pat-10',
      patientName: 'Jane Doe',
      doctorId: 'doc-2',
      doctorName: 'Dr. Sarah Lin',
    };
    const mockDoctor = {
      id: 'doc-2',
      name: 'Dr. Sarah Lin',
      consultationFee: 12000, // In cents
    };

    it('builds an invoice with doctor fee migrated and enforces idempotency', () => {
      const generated = buildInvoiceForVisit(mockAppointment, mockDoctor, [], fixedNow);
      expect(generated.visitId).toBe('apt-v1');
      expect(generated.patientId).toBe('pat-10');
      expect(generated.doctorId).toBe('doc-2');
      expect(invoiceTotal(generated)).toBe(12000);

      // Re-running returns same invoice
      const rerun = buildInvoiceForVisit(mockAppointment, mockDoctor, [generated], fixedNow);
      expect(rerun.id).toBe(generated.id);
      expect(rerun.number).toBe(generated.number);
    });

    it('falls back to default fee when doctor consultationFee is missing', () => {
      const fallback = buildInvoiceForVisit(
        { ...mockAppointment, id: 'apt-v2', doctorId: 'doc-3' },
        { id: 'doc-3', name: 'Dr. John Doe' },
        [],
        fixedNow
      );
      expect(invoiceTotal(fallback)).toBe(DEFAULT_CONSULTATION_FEE_CENTS);
    });
  });

  describe('Payment Application and Idempotency', () => {
    const mockInvoice: Invoice = {
      id: 'inv-pay-test',
      number: 'INV-2026-0002',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      issuedAt: '2026-10-16T10:00:00Z',
      status: 'unpaid',
      createdBy: 'Receptionist',
      items: [{ id: 'i1', description: 'Consultation', amount: 10000, kind: 'consultation' }],
    };

    it('validates payment amount against remaining balance', () => {
      expect(validatePayment(mockInvoice, [], 20000).valid).toBe(false);
      expect(validatePayment(mockInvoice, [], 0).valid).toBe(false);
      expect(validatePayment(mockInvoice, [], 8000).valid).toBe(true);
    });

    it('applies payment and prevents duplicate submissions using idempotency key', () => {
      const processedKeys = new Set<string>();
      const key = 'IDEMP-12345';

      const res1 = applyPayment(
        mockInvoice,
        [],
        {
          amount: 5000,
          method: 'card',
          reference: 'CARD-AUTH-9999',
          receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
          idempotencyKey: key,
        },
        processedKeys,
        fixedNow
      );

      expect(res1).not.toBeNull();
      expect(res1?.payment.amount).toBe(5000);
      expect(processedKeys.has(key)).toBe(true);

      // Duplicate submission rejected
      const res2 = applyPayment(
        mockInvoice,
        [],
        {
          amount: 5000,
          method: 'card',
          reference: 'CARD-AUTH-9999',
          receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
          idempotencyKey: key,
        },
        processedKeys,
        fixedNow
      );
      expect(res2).toBeNull();
    });
  });

  describe('Payment Reversals', () => {
    const originalPayment: Payment = {
      id: 'pay-orig-1',
      invoiceId: 'inv-test-1',
      amount: 5000,
      method: 'upi',
      kind: 'payment',
      receivedAt: '2026-10-16T12:00:00Z',
      receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      receiptNumber: 'RCT-2026-0001',
    };

    it('requires a non-empty reason for payment reversal', () => {
      expect(() => {
        reversePayment(originalPayment, [originalPayment], '', { id: 'usr-admin', name: 'Admin' }, fixedNow);
      }).toThrow(/reason.*required/i);
    });

    it('creates reversal record and prevents duplicate reversal', () => {
      const rev = reversePayment(
        originalPayment,
        [originalPayment],
        'Duplicate entry in error',
        { id: 'usr-admin', name: 'Admin' },
        fixedNow
      );
      expect(rev.reversal.kind).toBe('reversal');
      expect(rev.reversal.reversesPaymentId).toBe('pay-orig-1');
      expect(rev.reversal.amount).toBe(5000);

      expect(() => {
        reversePayment(
          originalPayment,
          [originalPayment, rev.reversal],
          'Attempting second reversal',
          { id: 'usr-admin', name: 'Admin' },
          fixedNow
        );
      }).toThrow(/already been.*reversed/i);
    });
  });

  describe('Invoice Line Charges, Discounts, and Voiding', () => {
    const baseInvoice: Invoice = {
      id: 'inv-base',
      number: 'INV-2026-0005',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      issuedAt: '2026-10-16T12:00:00Z',
      status: 'unpaid',
      createdBy: 'Receptionist',
      items: [{ id: 'i1', description: 'Consultation', amount: 10000, kind: 'consultation' }],
    };

    it('adds line charges and applies discounts with limit checks', () => {
      const charged = addCharge(baseInvoice, 'Dressing fee', 2500, { id: 'usr-admin', name: 'Admin' }, fixedNow);
      expect(invoiceTotal(charged)).toBe(12500);

      const discounted = applyDiscount(charged, [], 1500, 'Director concession', { id: 'usr-admin', name: 'Admin' }, fixedNow);
      expect(invoiceTotal(discounted)).toBe(11000);

      // Discount cannot exceed balance
      expect(() => {
        applyDiscount(discounted, [], 20000, 'Excessive discount', { id: 'usr-admin', name: 'Admin' }, fixedNow);
      }).toThrow(/cannot exceed/i);
    });

    it('voids invoice without payments and rejects voiding invoice with payments', () => {
      const voided = voidInvoice(baseInvoice, [], 'Visit canceled', { id: 'usr-admin', name: 'Admin' }, fixedNow);
      expect(voided.status).toBe('void');
      expect(balanceDue(voided, [])).toBe(0);

      expect(() => {
        voidInvoice(
          baseInvoice,
          [{
            id: 'p1',
            invoiceId: 'inv-base',
            amount: 5000,
            method: 'card',
            kind: 'payment',
            receivedAt: '2026-10-16',
            receivedBy: 'Cashier',
            receiptNumber: 'RCT-1',
          }],
          'Cannot void settled',
          { id: 'usr-admin', name: 'Admin' },
          fixedNow
        );
      }).toThrow(/cannot be voided/i);
    });
  });

  describe('Receipt Generation and Strict Clinical Isolation', () => {
    const samplePayment: Payment = {
      id: 'pay-receipt-1',
      invoiceId: 'inv-base',
      amount: 7500,
      method: 'card',
      kind: 'payment',
      receivedAt: '2026-10-16T14:30:00Z',
      receivedBy: { id: 'usr-cashier', name: 'Front Desk Cashier' },
      receiptNumber: 'RCT-2026-0088',
    };
    const baseInvoice: Invoice = {
      id: 'inv-base',
      number: 'INV-2026-0005',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      issuedAt: '2026-10-16T12:00:00Z',
      status: 'paid',
      createdBy: 'Receptionist',
      items: [],
    };
    const samplePatient = {
      firstName: 'Eleanor',
      lastName: 'Wright',
      mrn: 'MRN-84291',
    };

    it('generates receipt with strictly zero clinical fields', () => {
      const receipt = makeReceipt(samplePayment, baseInvoice, samplePatient, 'Front Desk');
      expect(receipt.receiptNumber).toBe('RCT-2026-0088');
      expect(receipt.patientName).toBe('Eleanor Wright');
      expect(receipt.patientMrn).toBe('MRN-84291');
      expect(receipt.invoiceNumber).toBe('INV-2026-0005');
      expect(receipt.formattedAmount).toBe('₹75.00');

      const keys = Object.keys(receipt);
      expect(keys.includes('diagnosis')).toBe(false);
      expect(keys.includes('vitals')).toBe(false);
      expect(keys.includes('clinicalNotes')).toBe(false);
    });
  });

  describe('Billing Scoping and Permissions Across Roles', () => {
    const adminUser: User = {
      id: 'acc-doc-1',
      name: 'Dr. Marcus Vance',
      email: 'm.vance@beaconclinic.com',
      role: 'doctor',
      moduleIds: ['mod-clinical', 'mod-management'],
      status: 'active',
    };
    const doctorUser: User = {
      id: 'acc-doc-2',
      name: 'Dr. Nathan Hayes',
      email: 'n.hayes@beaconclinic.com',
      role: 'doctor',
      moduleIds: ['mod-clinical'],
      status: 'active',
    };
    const receptionistUser: User = {
      id: 'acc-rec-1',
      name: 'Priya Sharma',
      email: 'p.sharma@beaconclinic.com',
      role: 'receptionist',
      moduleIds: ['mod-front-desk', 'mod-billing'],
      status: 'active',
    };
    const patientUser: User = {
      id: 'usr-pat-1',
      name: 'Eleanor Vance',
      email: 'e.vance@example.com',
      role: 'patient',
      patientId: 'pat-1',
    };

    const testInvoices = [
      { id: 'inv-1', number: 'INV-1', patientId: 'pat-1', doctorId: 'doc-1', issuedAt: '2026-10-16', status: 'unpaid' as const, createdBy: 'Admin', items: [] },
      { id: 'inv-2', number: 'INV-2', patientId: 'pat-2', doctorId: 'doc-2', issuedAt: '2026-10-16', status: 'unpaid' as const, createdBy: 'Admin', items: [] },
    ];
    const testPayments = [
      { id: 'pay-1', invoiceId: 'inv-1', amount: 5000, method: 'card' as const, kind: 'payment' as const, receivedAt: '2026-10-16', receivedBy: 'Cashier', receiptNumber: 'RCT-1' },
      { id: 'pay-2', invoiceId: 'inv-2', amount: 6000, method: 'cash' as const, kind: 'payment' as const, receivedAt: '2026-10-16', receivedBy: 'Cashier', receiptNumber: 'RCT-2' },
    ];

    it('verifies permission functions for billing actions', () => {
      expect(canViewBilling(adminUser, INITIAL_MODULES)).toBe(true);
      expect(canViewBilling(receptionistUser, INITIAL_MODULES)).toBe(true);
      expect(canViewBilling(doctorUser, INITIAL_MODULES)).toBe(false);

      expect(canRecordPayment(receptionistUser, INITIAL_MODULES)).toBe(true);
      expect(canRecordPayment(doctorUser, INITIAL_MODULES)).toBe(false);

      expect(canVoidInvoice(adminUser, INITIAL_MODULES)).toBe(true);
      expect(canVoidInvoice(receptionistUser, INITIAL_MODULES)).toBe(false);

      expect(canApplyDiscount(adminUser, INITIAL_MODULES)).toBe(true);
      expect(canApplyDiscount(receptionistUser, INITIAL_MODULES)).toBe(false);

      expect(canReversePayment(adminUser, INITIAL_MODULES)).toBe(true);
      expect(canReversePayment(receptionistUser, INITIAL_MODULES)).toBe(false);

      expect(canPayOwnInvoice(patientUser, 'pat-1')).toBe(true);
      expect(canPayOwnInvoice(patientUser, 'pat-2')).toBe(false);
      expect(canPayOwnInvoice(doctorUser, 'pat-1')).toBe(false);
    });

    it('doctors receive strictly zero invoices and zero payments', () => {
      expect(getScopedInvoices(doctorUser, testInvoices, INITIAL_MODULES)).toEqual([]);
      expect(getScopedPayments(doctorUser, testPayments, testInvoices, INITIAL_MODULES)).toEqual([]);
    });

    it('patients see only their own invoices and payments', () => {
      const pInvs = getScopedInvoices(patientUser, testInvoices, INITIAL_MODULES);
      expect(pInvs.map((i) => i.id)).toEqual(['inv-1']);
      const pPays = getScopedPayments(patientUser, testPayments, testInvoices, INITIAL_MODULES);
      expect(pPays.map((p) => p.id)).toEqual(['pay-1']);
    });

    it('admin sees clinic-wide invoices and payments', () => {
      const aInvs = getScopedInvoices(adminUser, testInvoices, INITIAL_MODULES);
      expect(aInvs.length).toBe(2);
      const aPays = getScopedPayments(adminUser, testPayments, testInvoices, INITIAL_MODULES);
      expect(aPays.length).toBe(2);
    });
  });
});

