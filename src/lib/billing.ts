// Pure Billing and Payment Calculation Engine (Milestone M6)
// Deterministic business logic operating on integer minor units (cents).
// 'now' is always accepted as an explicit parameter for pure evaluation and testing.

import {
  Invoice,
  InvoiceItem,
  Payment,
  Receipt,
  PaymentMethod,
  InvoiceStatus,
  PaymentValidationResult,
  DailyCollectionsSummary,
} from '@/types/billing';

export const DEFAULT_CONSULTATION_FEE_CENTS = 10000; // $100.00
export const CLINIC_NAME = 'Beacon Health Clinic';

import { formatCurrency, migrateConsultationFee } from '@/lib/money';
import { formatDoctorName } from '@/lib/doctorNames';

export { formatCurrency, migrateConsultationFee };

/**
 * Formats an actor (createdBy, receivedBy, cancelledBy, etc.) safely into a display string.
 * Accepts both a string and an object ({ id?: string; name?: string }).
 * Returns fallback (default "Unknown") if null, undefined, empty, or unresolvable.
 */
export function formatActor(
  actor: { id?: string; name?: string } | string | null | undefined,
  fallback = 'Unknown'
): string {
  if (!actor) return fallback;
  if (typeof actor === 'string') {
    const trimmed = actor.trim();
    return trimmed || fallback;
  }
  if (typeof actor === 'object') {
    if (actor.name && typeof actor.name === 'string' && actor.name.trim()) {
      return actor.name.trim();
    }
    if (actor.id && typeof actor.id === 'string' && actor.id.trim()) {
      return actor.id.trim();
    }
  }
  return fallback;
}

/**
 * Resolves the actor identifier safely from string or object.
 */
export function getActorId(
  actor: { id?: string; name?: string } | string | null | undefined
): string | undefined {
  if (!actor) return undefined;
  if (typeof actor === 'string') return actor.trim() || undefined;
  if (typeof actor === 'object' && actor.id) return String(actor.id).trim() || undefined;
  return undefined;
}

/**
 * Normalizes an actor representation into a canonical { id, name } structure.
 */
export function normalizeActor(
  actor: { id?: string; name?: string } | string | null | undefined,
  defaultId = 'unknown',
  defaultName = 'Unknown'
): { id: string; name: string } {
  if (!actor) return { id: defaultId, name: defaultName };
  if (typeof actor === 'string') {
    const trimmed = actor.trim() || defaultName;
    return { id: defaultId, name: trimmed };
  }
  if (typeof actor === 'object') {
    return {
      id: (actor.id && String(actor.id).trim()) || defaultId,
      name: (actor.name && String(actor.name).trim()) || defaultName,
    };
  }
  return { id: defaultId, name: defaultName };
}

/**
 * Converts dollars to integer minor units (cents).
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Converts minor units (cents) to fractional dollars.
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Generates the next sequential invoice number for a given calendar year.
 * Format: INV-YYYY-0001
 */
export function generateNextInvoiceNumber(existingInvoices: Invoice[], now: Date = new Date()): string {
  const year = now.getFullYear();
  const prefix = `INV-${year}-`;
  let maxSeq = 0;

  for (const inv of existingInvoices) {
    const num = inv.number || '';
    if (num.startsWith(prefix)) {
      const part = num.slice(prefix.length);
      const parsed = parseInt(part, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generates the next sequential receipt number for a given calendar year.
 * Format: RCT-YYYY-0001
 */
export function generateNextReceiptNumber(existingPayments: Payment[], now: Date = new Date()): string {
  const year = now.getFullYear();
  const prefix = `RCT-${year}-`;
  let maxSeq = 0;

  for (const p of existingPayments) {
    const num = p.receiptNumber || '';
    if (num.startsWith(prefix)) {
      const part = num.slice(prefix.length);
      const parsed = parseInt(part, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Calculates the total net amount for an invoice in cents.
 * sum(consultation + charge items) - sum(discount items). Clamped to >= 0.
 */
export function invoiceTotal(invoice: Invoice): number {
  let total = 0;
  for (const item of invoice.items) {
    if (item.kind === 'consultation' || item.kind === 'charge') {
      total += item.amount;
    } else if (item.kind === 'discount') {
      total -= item.amount;
    }
  }
  return Math.max(0, total);
}

/**
 * Calculates total settled payments minus reversals for a given invoice in cents.
 */
export function amountPaid(payments: Payment[], invoiceId: string): number {
  let paid = 0;
  for (const p of payments) {
    if (p.invoiceId === invoiceId) {
      if (p.kind === 'payment') {
        paid += p.amount;
      } else if (p.kind === 'reversal') {
        paid -= p.amount;
      }
    }
  }
  return Math.max(0, paid);
}

/**
 * Calculates outstanding balance due for an invoice in cents.
 * If invoice is void, balance is 0.
 */
export function balanceDue(invoice: Invoice, payments: Payment[]): number {
  if (invoice.status === 'void') {
    return 0;
  }
  const total = invoiceTotal(invoice);
  const paid = amountPaid(payments, invoice.id);
  return Math.max(0, total - paid);
}

/**
 * Derives the active status of an invoice based on items and payments.
 */
export function deriveStatus(invoice: Invoice, payments: Payment[]): InvoiceStatus {
  if (invoice.status === 'void') {
    return 'void';
  }
  const total = invoiceTotal(invoice);
  const paid = amountPaid(payments, invoice.id);

  if (total === 0 && paid === 0) {
    return 'paid';
  }
  if (paid >= total && total > 0) {
    return 'paid';
  }
  if (paid > 0 && paid < total) {
    return 'partially_paid';
  }
  return 'unpaid';
}

/**
 * Idempotently builds or returns an invoice for a concluded visit.
 */
export function buildInvoiceForVisit(
  appointment: {
    id: string;
    patientId: string;
    patientName?: string;
    doctorId: string;
    doctorName?: string;
  },
  doctor?: { id: string; name: string; consultationFee?: number } | null,
  existingInvoices: Invoice[] = [],
  now: Date = new Date()
): Invoice {
  // Idempotency: return existing invoice if already built for this visit/appointment
  const existing = existingInvoices.find(
    (inv) => inv.visitId === appointment.id || inv.appointmentId === appointment.id
  );
  if (existing) {
    return existing;
  }

  const feeCents =
    typeof doctor?.consultationFee === 'number' && doctor.consultationFee > 0
      ? migrateConsultationFee(doctor.consultationFee)
      : DEFAULT_CONSULTATION_FEE_CENTS;

  const invoiceNumber = generateNextInvoiceNumber(existingInvoices, now);
  const invoiceId = `inv-${now.getFullYear()}-${String(existingInvoices.length + 1).padStart(4, '0')}`;

  const rawDoctorName = doctor?.name || appointment.doctorName;
  const doctorLabel = rawDoctorName ? formatDoctorName(rawDoctorName) : 'Attending Physician';
  const initialItem: InvoiceItem = {
    id: `item-${invoiceId}-1`,
    description: `Specialist Consultation (${doctorLabel})`,
    amount: feeCents,
    kind: 'consultation',
  };

  const newInvoice: Invoice = {
    id: invoiceId,
    number: invoiceNumber,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    visitId: appointment.id,
    appointmentId: appointment.id,
    doctorId: appointment.doctorId,
    doctorName: rawDoctorName ? formatDoctorName(rawDoctorName) : undefined,
    issuedAt: now.toISOString(),
    items: [initialItem],
    status: 'unpaid',
    createdBy: {
      id: appointment.doctorId,
      name: doctorLabel,
    },
  };

  return newInvoice;
}

/**
 * Validates a proposed payment against business rules.
 */
export function validatePayment(
  invoice: Invoice,
  payments: Payment[],
  amount: number,
  method: PaymentMethod = 'cash',
  receivedBy: { id: string; name: string } | string | null | undefined = { id: 'usr-1', name: 'Cashier' },
  reference?: string
): PaymentValidationResult {
  if (invoice.status === 'void') {
    return { valid: false, error: 'Cannot record payment on a void invoice.' };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than zero.' };
  }
  const balance = balanceDue(invoice, payments);
  if (amount > balance) {
    return {
      valid: false,
      error: `Payment amount (${formatCurrency(amount)}) exceeds outstanding balance (${formatCurrency(balance)}).`,
    };
  }

  const validMethods: PaymentMethod[] = ['cash', 'card', 'upi', 'portal'];
  if (!validMethods.includes(method)) {
    return { valid: false, error: 'Invalid payment method selected.' };
  }

  if (method !== 'portal') {
    if (!receivedBy) {
      return { valid: false, error: 'Receiving staff member is required.' };
    }
    if (typeof receivedBy === 'object' && (!receivedBy.id || !receivedBy.name)) {
      return { valid: false, error: 'Receiving staff member identifier is required.' };
    }
  }

  if (method === 'card' || method === 'upi') {
    if (!reference || !reference.trim()) {
      return {
        valid: false,
        error: `Transaction reference is required for ${method.toUpperCase()} payments.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Applies a payment against an invoice with idempotency enforcement.
 */
export function applyPayment(
  invoice: Invoice,
  payments: Payment[],
  params: {
    amount: number;
    method: PaymentMethod;
    receivedBy: { id: string; name: string } | string;
    reference?: string;
    note?: string;
    idempotencyKey?: string;
  },
  processedKeys: Set<string>,
  now: Date = new Date()
): { payment: Payment; updatedStatus: InvoiceStatus } | null {
  if (params.idempotencyKey && processedKeys.has(params.idempotencyKey)) {
    return null;
  }

  const validation = validatePayment(
    invoice,
    payments,
    params.amount,
    params.method,
    params.receivedBy,
    params.reference
  );
  if (!validation.valid) {
    throw new Error(validation.error || 'Payment validation failed.');
  }

  if (params.idempotencyKey) {
    processedKeys.add(params.idempotencyKey);
  }

  const receiptNumber = generateNextReceiptNumber(payments, now);
  const paymentId = `pay-${now.getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`;

  const payment: Payment = {
    id: paymentId,
    invoiceId: invoice.id,
    amount: params.amount,
    method: params.method,
    kind: 'payment',
    receivedAt: now.toISOString(),
    receivedBy: params.receivedBy,
    reference: params.reference?.trim() || undefined,
    note: params.note?.trim() || undefined,
    receiptNumber,
  };

  const nextPayments = [...payments, payment];
  const updatedStatus = deriveStatus(invoice, nextPayments);

  return { payment, updatedStatus };
}

/**
 * Reverses a previously recorded payment.
 * Requires administrator authority and mandatory reason.
 */
export function reversePayment(
  paymentToReverse: Payment,
  payments: Payment[],
  reason: string,
  actor: { id: string; name: string } | string,
  now: Date = new Date()
): { reversal: Payment } {
  if (paymentToReverse.kind === 'reversal') {
    throw new Error('Cannot reverse a reversal transaction.');
  }
  if (!reason || !reason.trim()) {
    throw new Error('Reversal reason is required.');
  }

  // Calculate previously reversed amount for this payment
  const alreadyReversed = payments
    .filter((p) => p.kind === 'reversal' && p.reversesPaymentId === paymentToReverse.id)
    .reduce((sum, p) => sum + p.amount, 0);

  const availableToReverse = paymentToReverse.amount - alreadyReversed;
  if (availableToReverse <= 0) {
    throw new Error('Payment has already been fully reversed.');
  }

  const receiptNumber = generateNextReceiptNumber(payments, now);
  const reversalId = `rev-${now.getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`;

  const reversal: Payment = {
    id: reversalId,
    invoiceId: paymentToReverse.invoiceId,
    amount: paymentToReverse.amount,
    method: paymentToReverse.method,
    kind: 'reversal',
    reversesPaymentId: paymentToReverse.id,
    receivedAt: now.toISOString(),
    receivedBy: actor,
    reason: reason.trim(),
    receiptNumber,
  };

  return { reversal };
}

/**
 * Adds an extra charge line item to an unpaid or partially paid invoice.
 */
export function addCharge(
  invoice: Invoice,
  description: string,
  amount: number,
  _actor: { id: string; name: string } | string,
  _now: Date = new Date()
): Invoice {
  if (invoice.status === 'void' || invoice.status === 'paid') {
    throw new Error('Charges can only be added to unpaid or partially paid invoices.');
  }
  if (!description || !description.trim()) {
    throw new Error('Charge description is required.');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Charge amount must be an integer greater than zero.');
  }

  const newItem: InvoiceItem = {
    id: `item-${invoice.id}-${invoice.items.length + 1}`,
    description: description.trim(),
    amount,
    kind: 'charge',
  };

  return {
    ...invoice,
    items: [...invoice.items, newItem],
  };
}

/**
 * Applies an administrative discount line item to an invoice.
 * Cannot exceed remaining balance due.
 */
export function applyDiscount(
  invoice: Invoice,
  payments: Payment[],
  amount: number,
  reason: string,
  _actor: { id: string; name: string } | string,
  _now: Date = new Date()
): Invoice {
  if (invoice.status === 'void' || invoice.status === 'paid') {
    throw new Error('Discounts can only be applied to unpaid or partially paid invoices.');
  }
  if (!reason || !reason.trim()) {
    throw new Error('Discount reason is required.');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Discount amount must be an integer greater than zero.');
  }

  const balance = balanceDue(invoice, payments);
  if (amount > balance) {
    throw new Error(
      `Discount amount (${formatCurrency(amount)}) cannot exceed remaining balance due (${formatCurrency(balance)}).`
    );
  }

  const newItem: InvoiceItem = {
    id: `disc-${invoice.id}-${invoice.items.length + 1}`,
    description: `Discount: ${reason.trim()}`,
    amount,
    kind: 'discount',
  };

  return {
    ...invoice,
    items: [...invoice.items, newItem],
  };
}

/**
 * Voids an invoice. Only allowed when zero payments have been recorded.
 */
export function voidInvoice(
  invoice: Invoice,
  payments: Payment[],
  reason: string,
  _actor: { id: string; name: string } | string,
  _now: Date = new Date()
): Invoice {
  if (invoice.status === 'void') {
    throw new Error('Invoice is already void.');
  }
  if (!reason || !reason.trim()) {
    throw new Error('Void reason is required.');
  }
  const paid = amountPaid(payments, invoice.id);
  if (paid > 0) {
    throw new Error('Invoices with recorded payments cannot be voided.');
  }

  return {
    ...invoice,
    status: 'void',
  };
}

/**
 * Generates a clean patient billing receipt. Contains strictly zero clinical data.
 */
export function makeReceipt(
  payment: Payment,
  invoice: Invoice,
  patient: { firstName?: string; lastName?: string; name?: string; mrn: string },
  receiverName: string
): Receipt {
  const patientFullName =
    patient.name ||
    [patient.firstName, patient.lastName].filter(Boolean).join(' ') ||
    'Registered Patient';

  return {
    clinicName: CLINIC_NAME,
    receiptNumber: payment.receiptNumber,
    patientName: patientFullName,
    patientMrn: patient.mrn,
    invoiceNumber: invoice.number,
    amount: payment.amount,
    formattedAmount: formatCurrency(payment.amount),
    method: payment.method,
    receivedAt: payment.receivedAt,
    receivedBy: receiverName,
  };
}

/**
 * Calculates daily collections by payment method.
 */
export function calculateDailyCollections(
  payments: Payment[],
  actorId?: string,
  targetDateStr?: string
): DailyCollectionsSummary {
  const summary: DailyCollectionsSummary = {
    cash: 0,
    card: 0,
    upi: 0,
    portal: 0,
    total: 0,
  };

  if (!Array.isArray(payments)) {
    return summary;
  }

  for (const p of payments) {
    if (!p) continue;

    if (targetDateStr) {
      const rawDate = p.receivedAt || (p as any).date || '';
      const pDate = rawDate ? rawDate.split('T')[0] : '';
      if (pDate !== targetDateStr) continue;
    }

    if (actorId) {
      const recId = getActorId(p.receivedBy);
      if (recId !== actorId) continue;
    }

    const amount = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
    const netAmount = p.kind === 'reversal' ? -amount : amount;

    if (p.method === 'cash') summary.cash += netAmount;
    else if (p.method === 'card') summary.card += netAmount;
    else if (p.method === 'upi') summary.upi += netAmount;
    else if (p.method === 'portal') summary.portal += netAmount;

    summary.total += netAmount;
  }

  summary.cash = Math.max(0, summary.cash);
  summary.card = Math.max(0, summary.card);
  summary.upi = Math.max(0, summary.upi);
  summary.portal = Math.max(0, summary.portal);
  summary.total = Math.max(0, summary.total);

  return summary;
}
