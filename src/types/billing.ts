// Billing, Invoicing, and Payment Type Definitions (Milestone M6)
// All monetary values are represented strictly in integer minor units (cents).

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'void';
export type InvoiceItemKind = 'consultation' | 'charge' | 'discount';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'portal';
export type PaymentKind = 'payment' | 'reversal';

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number; // Integer minor units (cents)
  kind: InvoiceItemKind;
}

export interface Invoice {
  id: string;
  number: string; // Sequential format: INV-YYYY-0001
  patientId: string;
  patientName?: string;
  visitId?: string;
  appointmentId?: string;
  doctorId: string;
  doctorName?: string;
  issuedAt: string; // ISO 8601 timestamp
  items: InvoiceItem[];
  status: InvoiceStatus;
  createdBy: { id: string; name: string } | string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number; // Integer minor units (cents)
  method: PaymentMethod;
  kind: PaymentKind;
  reversesPaymentId?: string;
  receivedAt: string; // ISO 8601 timestamp
  receivedBy: { id: string; name: string } | string;
  reference?: string;
  note?: string;
  reason?: string; // Mandatory for reversals
  receiptNumber: string; // Sequential format: RCT-YYYY-0001
}

export interface Receipt {
  clinicName: string;
  receiptNumber: string;
  patientName: string;
  patientMrn: string;
  invoiceNumber: string;
  amount: number; // In cents
  formattedAmount: string;
  method: PaymentMethod;
  receivedAt: string;
  receivedBy: string;
}

export interface PaymentValidationResult {
  valid: boolean;
  error?: string;
}

export interface BillingMutationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DailyCollectionsSummary {
  cash: number;
  card: number;
  upi: number;
  portal: number;
  total: number;
}
