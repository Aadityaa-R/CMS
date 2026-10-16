import assert from 'node:assert';
import {
  formatCurrency,
  dollarsToCents,
  centsToDollars,
  generateNextInvoiceNumber,
  generateNextReceiptNumber,
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
  calculateDailyCollections,
  DEFAULT_CONSULTATION_FEE_CENTS,
} from '../src/lib/billing';
import {
  canViewBilling,
  canRecordPayment,
  canPayOwnInvoice,
  canVoidInvoice,
  canApplyDiscount,
  canReversePayment,
  canAddCharge,
} from '../src/lib/permissions';
import { getScopedInvoices, getScopedPayments } from '../src/lib/selectors';
import { Invoice, Payment, User } from '../src/types';

console.log('[TEST] Running Billing and Payments Engine test suite (M6)...');

// ---------------------------------------------------------------------------
// 1. Currency & Integer Minor Units
// ---------------------------------------------------------------------------
console.log('  1. Minor unit conversions and formatting...');
assert.strictEqual(dollarsToCents(100), 10000);
assert.strictEqual(dollarsToCents(120.50), 12050);
assert.strictEqual(dollarsToCents(0.99), 99);
assert.strictEqual(centsToDollars(10000), 100);
assert.strictEqual(centsToDollars(12050), 120.50);

assert.strictEqual(formatCurrency(10000), '$100.00');
assert.strictEqual(formatCurrency(0), '$0.00');
assert.strictEqual(formatCurrency(12550), '$125.50');
assert.strictEqual(formatCurrency(49), '$0.49');

// ---------------------------------------------------------------------------
// 2. Invoice Totals and Status Derivation
// ---------------------------------------------------------------------------
console.log('  2. Invoice totals, payments, and status derivation...');
const mockInvoice: any = {
  id: 'inv-test-1',
  number: 'INV-2026-0001',
  patientId: 'pat-1',
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

assert.strictEqual(invoiceTotal(mockInvoice), 13000); // 10000 + 5000 - 2000 = 13000 ($130.00)

const emptyPayments: any[] = [];
assert.strictEqual(amountPaid(emptyPayments, mockInvoice.id), 0);
assert.strictEqual(balanceDue(mockInvoice, emptyPayments), 13000);
assert.strictEqual(deriveStatus(mockInvoice, emptyPayments), 'unpaid');

const partialPayments: any[] = [
  {
    id: 'pay-1',
    invoiceId: 'inv-test-1',
    amount: 5000,
    method: 'card',
    kind: 'payment',
    receivedAt: '2026-10-16T10:15:00Z',
    receivedBy: 'Cashier',
    receiptNumber: 'RCT-2026-0001',
  },
];
assert.strictEqual(amountPaid(partialPayments, mockInvoice.id), 5000);
assert.strictEqual(balanceDue(mockInvoice, partialPayments), 8000);
assert.strictEqual(deriveStatus(mockInvoice, partialPayments), 'partially_paid');

const fullPayments: any[] = [
  ...partialPayments,
  {
    id: 'pay-2',
    invoiceId: 'inv-test-1',
    amount: 8000,
    method: 'cash',
    kind: 'payment',
    receivedAt: '2026-10-16T10:30:00Z',
    receivedBy: 'Cashier',
    receiptNumber: 'RCT-2026-0002',
  },
];
assert.strictEqual(amountPaid(fullPayments, mockInvoice.id), 13000);
assert.strictEqual(balanceDue(mockInvoice, fullPayments), 0);
assert.strictEqual(deriveStatus(mockInvoice, fullPayments), 'paid');

// Void invoice has zero balance
const voidInvoiceMock = { ...mockInvoice, status: 'void' };
assert.strictEqual(balanceDue(voidInvoiceMock, emptyPayments), 0);
assert.strictEqual(deriveStatus(voidInvoiceMock, emptyPayments), 'void');

// ---------------------------------------------------------------------------
// 3. Conclude Visit Auto-Invoice Building
// ---------------------------------------------------------------------------
console.log('  3. Visit conclusion auto-invoice generation and idempotency...');
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
  consultationFee: 120, // $120.00
};

const fixedNow = new Date('2026-10-16T11:00:00Z');
const generatedInvoice = buildInvoiceForVisit(mockAppointment, mockDoctor, [], fixedNow);
assert.strictEqual(generatedInvoice.visitId, 'apt-v1');
assert.strictEqual(generatedInvoice.patientId, 'pat-10');
assert.strictEqual(generatedInvoice.doctorId, 'doc-2');
assert.strictEqual(generatedInvoice.status, 'unpaid');
assert.strictEqual(invoiceTotal(generatedInvoice), 12000);

// Default fallback fee when doctor has no fee set
const mockDoctorNoFee = { id: 'doc-3', name: 'Dr. John Doe' };
const fallbackInvoice = buildInvoiceForVisit(
  { ...mockAppointment, id: 'apt-v2', doctorId: 'doc-3' },
  mockDoctorNoFee,
  [generatedInvoice],
  fixedNow
);
assert.strictEqual(invoiceTotal(fallbackInvoice), DEFAULT_CONSULTATION_FEE_CENTS); // 10000 ($100.00)

// Idempotency: concluding the same visit returns the exact same invoice without creating duplicates
const existingInvoices = [generatedInvoice];
const reRunInvoice = buildInvoiceForVisit(mockAppointment, mockDoctor, existingInvoices, fixedNow);
assert.strictEqual(reRunInvoice.id, generatedInvoice.id);
assert.strictEqual(reRunInvoice.number, generatedInvoice.number);

// ---------------------------------------------------------------------------
// 4. Payment Application & Idempotency Key Validation
// ---------------------------------------------------------------------------
console.log('  4. Payment recording, boundary checks, and idempotency keys...');
const validationOverpay = validatePayment(mockInvoice, partialPayments, 20000);
assert.strictEqual(validationOverpay.valid, false);

const validationZero = validatePayment(mockInvoice, partialPayments, 0);
assert.strictEqual(validationZero.valid, false);

const validationValid = validatePayment(mockInvoice, partialPayments, 8000);
assert.strictEqual(validationValid.valid, true);

const processedKeys = new Set<string>();
const idempotencyKey = 'PAY-KEY-12345';
const payResult1 = applyPayment(
  mockInvoice,
  partialPayments,
  {
    amount: 5000,
    method: 'card',
    receivedBy: { id: 'usr-rec', name: 'Receptionist' },
    reference: 'CARD-AUTH-9999',
    idempotencyKey,
  },
  processedKeys,
  fixedNow
);
assert(payResult1 !== null);
assert.strictEqual(payResult1.payment.amount, 5000);
assert.strictEqual(payResult1.payment.receiptNumber, 'RCT-2026-0002');
assert.strictEqual(processedKeys.has(idempotencyKey), true);

// Duplicate submission with same key is rejected
const payResultDuplicate = applyPayment(
  mockInvoice,
  partialPayments,
  {
    amount: 5000,
    method: 'card',
    receivedBy: { id: 'usr-rec', name: 'Receptionist' },
    reference: 'CARD-AUTH-9999',
    idempotencyKey,
  },
  processedKeys,
  fixedNow
);
assert.strictEqual(payResultDuplicate, null);

// ---------------------------------------------------------------------------
// 5. Payment Reversals
// ---------------------------------------------------------------------------
console.log('  5. Payment reversals with mandatory reason...');
const paymentsWithPay1: any[] = [
  {
    id: 'pay-orig-1',
    invoiceId: 'inv-test-1',
    amount: 5000,
    method: 'upi',
    kind: 'payment',
    receivedAt: '2026-10-16T12:00:00Z',
    receivedBy: 'Receptionist',
    receiptNumber: 'RCT-2026-0001',
  },
];

assert.throws(() => {
  reversePayment(
    paymentsWithPay1[0],
    paymentsWithPay1,
    '', // Empty reason should fail
    { id: 'usr-admin', name: 'Admin' },
    fixedNow
  );
});

const reversalResult = reversePayment(
  paymentsWithPay1[0],
  paymentsWithPay1,
  'Duplicate payment recorded at intake in error',
  { id: 'usr-admin', name: 'Admin' },
  fixedNow
);
assert.strictEqual(reversalResult.reversal.kind, 'reversal');
assert.strictEqual(reversalResult.reversal.reversesPaymentId, 'pay-orig-1');
assert.strictEqual(reversalResult.reversal.amount, 5000);

// Cannot reverse an already reversed payment
const paymentsAfterReversal = [reversalResult.reversal, ...paymentsWithPay1];
assert.throws(() => {
  reversePayment(
    paymentsWithPay1[0],
    paymentsAfterReversal,
    'Attempting duplicate reversal',
    { id: 'usr-admin', name: 'Admin' },
    fixedNow
  );
});

// ---------------------------------------------------------------------------
// 6. Invoice Line Charges, Discounts, and Voiding
// ---------------------------------------------------------------------------
console.log('  6. Invoice line charges, discounts, and voiding...');
const baseInvoice: any = {
  id: 'inv-base',
  number: 'INV-2026-0005',
  patientId: 'pat-1',
  doctorId: 'doc-1',
  issuedAt: '2026-10-16T12:00:00Z',
  status: 'unpaid',
  createdBy: 'Receptionist',
  items: [{ id: 'i1', description: 'Consultation', amount: 10000, kind: 'consultation' }],
};

// Add charge
const chargedInvoice = addCharge(
  baseInvoice,
  'Specialist Dressing Fee',
  2500,
  { id: 'usr-admin', name: 'Admin' },
  fixedNow
);
assert.strictEqual(invoiceTotal(chargedInvoice), 12500); // $125.00
assert.strictEqual(chargedInvoice.items.length, 2);

// Apply discount
const discountedInvoice = applyDiscount(
  chargedInvoice,
  [],
  1500,
  'Concessionary rate approved by medical director',
  { id: 'usr-admin', name: 'Admin' },
  fixedNow
);
assert.strictEqual(invoiceTotal(discountedInvoice), 11000); // $110.00
assert.strictEqual(discountedInvoice.items.length, 3);

// Discount cannot exceed balance
assert.throws(() => {
  applyDiscount(
    discountedInvoice,
    [],
    20000,
    'Excessive discount',
    { id: 'usr-admin', name: 'Admin' },
    fixedNow
  );
});

// Void invoice
const voidedInv = voidInvoice(
  discountedInvoice,
  [],
  'Consultation canceled by physician prior to examination',
  { id: 'usr-admin', name: 'Admin' },
  fixedNow
);
assert.strictEqual(voidedInv.status, 'void');
assert.strictEqual(balanceDue(voidedInv, []), 0);

// Cannot void an invoice with recorded payments
assert.throws(() => {
  voidInvoice(
    baseInvoice,
    [{ id: 'p1', invoiceId: 'inv-base', amount: 5000, kind: 'payment' } as any],
    'Attempting to void settled invoice',
    { id: 'usr-admin', name: 'Admin' },
    fixedNow
  );
});

// ---------------------------------------------------------------------------
// 7. Receipt Generation & Demographics-Only Verification
// ---------------------------------------------------------------------------
console.log('  7. Receipt generation and strict clinical isolation...');
const samplePayment: any = {
  id: 'pay-receipt-1',
  invoiceId: 'inv-base',
  amount: 7500,
  method: 'card',
  kind: 'payment',
  receivedAt: '2026-10-16T14:30:00Z',
  receivedBy: { id: 'usr-cashier', name: 'Front Desk Cashier' },
  receiptNumber: 'RCT-2026-0088',
};
const samplePatient = {
  firstName: 'Eleanor',
  lastName: 'Wright',
  mrn: 'MRN-84291',
};

const receipt = makeReceipt(samplePayment, baseInvoice, samplePatient, 'Front Desk Cashier');
assert.strictEqual(receipt.receiptNumber, 'RCT-2026-0088');
assert.strictEqual(receipt.patientName, 'Eleanor Wright');
assert.strictEqual(receipt.patientMrn, 'MRN-84291');
assert.strictEqual(receipt.invoiceNumber, 'INV-2026-0005');
assert.strictEqual(receipt.formattedAmount, '$75.00');
assert.strictEqual(receipt.method, 'card');

// Verify zero clinical fields exist on receipt
const receiptKeys = Object.keys(receipt);
assert.strictEqual(receiptKeys.includes('diagnosis'), false);
assert.strictEqual(receiptKeys.includes('vitals'), false);
assert.strictEqual(receiptKeys.includes('prescription'), false);
assert.strictEqual(receiptKeys.includes('clinicalNotes'), false);

// ---------------------------------------------------------------------------
// 8. Daily Collections Summary
// ---------------------------------------------------------------------------
console.log('  8. Daily collections calculation and operator scoping...');
const todayPayments: any[] = [
  { id: 'p1', amount: 5000, method: 'cash', kind: 'payment', receivedAt: '2026-10-16T09:00:00Z', receivedBy: { id: 'usr-1', name: 'Alice' } },
  { id: 'p2', amount: 8000, method: 'card', kind: 'payment', receivedAt: '2026-10-16T10:00:00Z', receivedBy: { id: 'usr-1', name: 'Alice' } },
  { id: 'p3', amount: 3000, method: 'upi', kind: 'payment', receivedAt: '2026-10-16T11:00:00Z', receivedBy: { id: 'usr-2', name: 'Bob' } },
  { id: 'p4', amount: 10000, method: 'portal', kind: 'payment', receivedAt: '2026-10-16T12:00:00Z', receivedBy: 'Patient portal' },
  { id: 'p5', amount: 2000, method: 'card', kind: 'reversal', receivedAt: '2026-10-16T13:00:00Z', receivedBy: { id: 'usr-1', name: 'Alice' } },
  // Yesterday payment: should be excluded from today
  { id: 'p6', amount: 4000, method: 'cash', kind: 'payment', receivedAt: '2026-10-15T09:00:00Z', receivedBy: { id: 'usr-1', name: 'Alice' } },
];

const clinicWideCollections = calculateDailyCollections(todayPayments, undefined, '2026-10-16');
assert.strictEqual(clinicWideCollections.cash, 5000);
assert.strictEqual(clinicWideCollections.card, 6000); // 8000 - 2000 reversal = 6000
assert.strictEqual(clinicWideCollections.upi, 3000);
assert.strictEqual(clinicWideCollections.portal, 10000);
assert.strictEqual(clinicWideCollections.total, 24000); // $240.00

const aliceCollections = calculateDailyCollections(todayPayments, 'usr-1', '2026-10-16');
assert.strictEqual(aliceCollections.cash, 5000);
assert.strictEqual(aliceCollections.card, 6000); // 8000 - 2000
assert.strictEqual(aliceCollections.upi, 0);
assert.strictEqual(aliceCollections.total, 11000);

// ---------------------------------------------------------------------------
// 9. Permissions & Access Control
// ---------------------------------------------------------------------------
console.log('  9. Billing permissions and capability gating...');
const adminUser: any = { id: 'usr-1', name: 'Dr. Marcus Vance', role: 'md', badgeNumber: 'MD-001' };
const receptionistUser: any = { id: 'usr-rec-1', name: 'Sarah Cashier', role: 'receptionist', badgeNumber: 'REC-301' };
const doctorUser: any = { id: 'usr-doc-2', name: 'Dr. Clara Oswald', role: 'doctor', badgeNumber: 'DOC-102' };
const patientUser: any = { id: 'usr-pat-1', name: 'Eleanor Wright', role: 'patient', patientId: 'pat-1' };

assert.strictEqual(canViewBilling(adminUser), true);
assert.strictEqual(canViewBilling(receptionistUser), true);
assert.strictEqual(canViewBilling(doctorUser), false);
assert.strictEqual(canViewBilling(patientUser), false);

assert.strictEqual(canRecordPayment(receptionistUser), true);
assert.strictEqual(canRecordPayment(doctorUser), false);
assert.strictEqual(canRecordPayment(patientUser), false);

assert.strictEqual(canVoidInvoice(adminUser), true);
assert.strictEqual(canVoidInvoice(receptionistUser), false);
assert.strictEqual(canVoidInvoice(doctorUser), false);

assert.strictEqual(canApplyDiscount(adminUser), true);
assert.strictEqual(canApplyDiscount(receptionistUser), false);

assert.strictEqual(canReversePayment(adminUser), true);
assert.strictEqual(canReversePayment(receptionistUser), false);

assert.strictEqual(canPayOwnInvoice(patientUser, 'pat-1'), true);
assert.strictEqual(canPayOwnInvoice(patientUser, 'pat-2'), false);
assert.strictEqual(canPayOwnInvoice(doctorUser, 'pat-1'), false);

// ---------------------------------------------------------------------------
// 10. Strict Doctor Billing Isolation & Patient Scoping
// ---------------------------------------------------------------------------
console.log('  10. Strict doctor billing isolation and patient invoice scoping...');
const testInvoices: any[] = [
  { id: 'inv-1', patientId: 'pat-1', number: 'INV-2026-0001', issuedAt: '2026-10-16T10:00:00Z' },
  { id: 'inv-2', patientId: 'pat-2', number: 'INV-2026-0002', issuedAt: '2026-10-16T11:00:00Z' },
];
const testPayments: any[] = [
  { id: 'pay-1', invoiceId: 'inv-1', amount: 5000, method: 'card', kind: 'payment', receivedAt: '2026-10-16T10:00:00Z' },
  { id: 'pay-2', invoiceId: 'inv-2', amount: 6000, method: 'cash', kind: 'payment', receivedAt: '2026-10-16T11:00:00Z' },
];

// Doctor sees strictly ZERO invoices and ZERO payments
const doctorInvoices = getScopedInvoices(doctorUser, testInvoices);
const doctorPayments = getScopedPayments(doctorUser, testPayments, testInvoices);
assert.strictEqual(doctorInvoices.length, 0);
assert.strictEqual(doctorPayments.length, 0);

// Patient sees only their own invoices and payments
const patientScopedInvs = getScopedInvoices(patientUser, testInvoices);
const patientScopedPays = getScopedPayments(patientUser, testPayments, testInvoices);
assert.strictEqual(patientScopedInvs.length, 1);
assert.strictEqual(patientScopedInvs[0].id, 'inv-1');
assert.strictEqual(patientScopedPays.length, 1);
assert.strictEqual(patientScopedPays[0].id, 'pay-1');

// Administrator sees all invoices and payments
const adminScopedInvs = getScopedInvoices(adminUser, testInvoices);
const adminScopedPays = getScopedPayments(adminUser, testPayments, testInvoices);
assert.strictEqual(adminScopedInvs.length, 2);
assert.strictEqual(adminScopedPays.length, 2);

console.log('[PASS] All Billing and Payments Engine test assertions passed cleanly.');
