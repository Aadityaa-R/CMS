import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Invoice,
  Payment,
  Receipt,
  PaymentMethod,
  InvoiceStatus,
  BillingMutationResult,
  DailyCollectionsSummary,
} from '@/types/billing';
import {
  buildInvoiceForVisit,
  invoiceTotal,
  balanceDue,
  deriveStatus,
  applyPayment as engineApplyPayment,
  reversePayment as engineReversePayment,
  addCharge as engineAddCharge,
  applyDiscount as engineApplyDiscount,
  voidInvoice as engineVoidInvoice,
  makeReceipt,
  formatCurrency,
  calculateDailyCollections,
  formatActor,
} from '@/lib/billing';
import {
  canRecordPayment,
  canPayOwnInvoice,
  canVoidInvoice,
  canApplyDiscount,
  canReversePayment,
  canAddCharge,
} from '@/lib/permissions';
import { getRepository } from '@/data/storage';
import { STORAGE_KEY_PREFIX } from '@/lib/authConstants';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from '@/data/billingSeed';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';

interface RecordPaymentParams {
  invoiceId: string;
  amount: number; // in cents
  method: PaymentMethod;
  reference?: string;
  note?: string;
  idempotencyKey?: string;
}

interface RecordPortalPaymentParams {
  invoiceId: string;
  amount: number; // in cents
  method: 'card' | 'upi';
  reference?: string;
  idempotencyKey?: string;
}

interface BillingContextType {
  invoices: Invoice[];
  payments: Payment[];
  isLoading: boolean;
  recordPayment: (params: RecordPaymentParams) => Promise<BillingMutationResult<Payment>>;
  recordPortalPayment: (params: RecordPortalPaymentParams) => Promise<BillingMutationResult<Payment>>;
  reversePayment: (paymentId: string, reason: string) => Promise<BillingMutationResult<Payment>>;
  addCharge: (invoiceId: string, description: string, amount: number) => Promise<BillingMutationResult<Invoice>>;
  applyDiscount: (invoiceId: string, amount: number, reason: string) => Promise<BillingMutationResult<Invoice>>;
  voidInvoice: (invoiceId: string, reason: string) => Promise<BillingMutationResult<Invoice>>;
  createInvoiceForVisit: (
    appointment: {
      id: string;
      patientId: string;
      patientName?: string;
      doctorId: string;
      doctorName?: string;
    },
    doctor?: { id: string; name: string; consultationFee?: number } | null
  ) => Promise<Invoice>;
  getReceipt: (paymentId: string) => Receipt | null;
  getInvoiceBalance: (invoiceId: string) => number;
  getInvoiceTotal: (invoiceId: string) => number;
  getInvoiceStatus: (invoiceId: string) => InvoiceStatus;
  getInvoicePayments: (invoiceId: string) => Payment[];
  getDailyCollections: (actorId?: string, targetDateStr?: string) => DailyCollectionsSummary;
}

export const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, addAuditLogEntry } = useAuth();
  const { modules, patients } = useClinic();

  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_SEED_INVOICES);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_SEED_PAYMENTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const processedKeysRef = useRef<Set<string>>(new Set());

  // Load invoices and payments from persistent repository on startup
  useEffect(() => {
    let mounted = true;
    const loadFromRepo = async () => {
      try {
        const repoInvoices = getRepository<Invoice>('invoices');
        const repoPayments = getRepository<Payment>('payments');

        const [savedInvoices, savedPayments] = await Promise.all([
          repoInvoices.list(),
          repoPayments.list(),
        ]);

        if (mounted) {
          if (savedInvoices && savedInvoices.length > 0) {
            setInvoices(savedInvoices);
          } else {
            repoInvoices.replaceAll(INITIAL_SEED_INVOICES).catch(() => {});
            setInvoices(INITIAL_SEED_INVOICES);
          }

          if (savedPayments && savedPayments.length > 0) {
            setPayments(savedPayments);
          } else {
            repoPayments.replaceAll(INITIAL_SEED_PAYMENTS).catch(() => {});
            setPayments(INITIAL_SEED_PAYMENTS);
          }
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadFromRepo();

    return () => {
      mounted = false;
    };
  }, []);

  // Synchronize cross-tab mutations via storage events
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === `${STORAGE_KEY_PREFIX}invoices`) {
        const repo = getRepository<Invoice>('invoices');
        const latest = await repo.list();
        setInvoices(latest);
      }
      if (e.key === `${STORAGE_KEY_PREFIX}payments`) {
        const repo = getRepository<Payment>('payments');
        const latest = await repo.list();
        setPayments(latest);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save write-through helper
  const persistInvoices = (nextInvoices: Invoice[]) => {
    setInvoices(nextInvoices);
    const repo = getRepository<Invoice>('invoices');
    repo.replaceAll(nextInvoices).catch(() => {});
  };

  const persistPayments = (nextPayments: Payment[]) => {
    setPayments(nextPayments);
    const repo = getRepository<Payment>('payments');
    repo.replaceAll(nextPayments).catch(() => {});
  };

  const getInvoiceBalance = (invoiceId: string): number => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return 0;
    return balanceDue(inv, payments);
  };

  const getInvoiceTotal = (invoiceId: string): number => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return 0;
    return invoiceTotal(inv);
  };

  const getInvoiceStatus = (invoiceId: string): InvoiceStatus => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return 'unpaid';
    return deriveStatus(inv, payments);
  };

  const getInvoicePayments = (invoiceId: string): Payment[] => {
    return payments.filter((p) => p.invoiceId === invoiceId);
  };

  const getDailyCollections = (actorId?: string, targetDateStr?: string): DailyCollectionsSummary => {
    return calculateDailyCollections(payments, actorId, targetDateStr);
  };

  /**
   * Records a payment by a staff operator.
   * Gated by paymentRecording capability.
   */
  const recordPayment = async (params: RecordPaymentParams): Promise<BillingMutationResult<Payment>> => {
    if (!canRecordPayment(currentUser, modules)) {
      return { success: false, error: 'Unauthorized: payment recording permission required.' };
    }

    const targetInvoice = invoices.find((i) => i.id === params.invoiceId);
    if (!targetInvoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name }
      : { id: 'usr-rec-1', name: 'Front Desk Staff' };

    try {
      const result = engineApplyPayment(
        targetInvoice,
        payments,
        {
          amount: params.amount,
          method: params.method,
          receivedBy: actor,
          reference: params.reference,
          note: params.note,
          idempotencyKey: params.idempotencyKey,
        },
        processedKeysRef.current,
        new Date()
      );

      if (!result) {
        return { success: false, error: 'Duplicate payment request blocked by idempotency check.' };
      }

      const { payment, updatedStatus } = result;
      const nextPayments = [payment, ...payments];
      const nextInvoices = invoices.map((inv) =>
        inv.id === targetInvoice.id ? { ...inv, status: updatedStatus } : inv
      );

      persistPayments(nextPayments);
      persistInvoices(nextInvoices);

      addAuditLogEntry({
        action: 'payment_recorded',
        subject: `Invoice ${targetInvoice.number}`,
        role: currentUser?.role || 'receptionist',
        details: `Payment of ${formatCurrency(params.amount)} recorded via ${params.method.toUpperCase()} by ${actor.name}. Receipt: ${payment.receiptNumber}`,
        authorizedBy: actor.name,
      });

      return { success: true, data: payment };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not record payment.' };
    }
  };

  /**
   * Records an online payment simulated by a patient for their own invoice.
   */
  const recordPortalPayment = async (
    params: RecordPortalPaymentParams
  ): Promise<BillingMutationResult<Payment>> => {
    const targetInvoice = invoices.find((i) => i.id === params.invoiceId);
    if (!targetInvoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    if (!canPayOwnInvoice(currentUser, targetInvoice.patientId)) {
      return { success: false, error: 'Unauthorized: you can only settle your own invoices.' };
    }

    try {
      const generatedRef = params.reference || `PORTAL-SIM-${Date.now().toString().slice(-6)}`;
      const result = engineApplyPayment(
        targetInvoice,
        payments,
        {
          amount: params.amount,
          method: params.method,
          receivedBy: 'Patient portal',
          reference: generatedRef,
          note: 'Online patient portal payment',
          idempotencyKey: params.idempotencyKey,
        },
        processedKeysRef.current,
        new Date()
      );

      if (!result) {
        return { success: false, error: 'Duplicate payment request blocked by idempotency check.' };
      }

      const { payment, updatedStatus } = result;
      const nextPayments = [payment, ...payments];
      const nextInvoices = invoices.map((inv) =>
        inv.id === targetInvoice.id ? { ...inv, status: updatedStatus } : inv
      );

      persistPayments(nextPayments);
      persistInvoices(nextInvoices);

      addAuditLogEntry({
        action: 'portal_payment',
        subject: `Invoice ${targetInvoice.number}`,
        role: 'patient',
        details: `Patient portal payment of ${formatCurrency(params.amount)} settled via ${params.method.toUpperCase()} (${generatedRef}). Receipt: ${payment.receiptNumber}`,
        authorizedBy: 'Patient portal',
      });

      return { success: true, data: payment };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not record portal payment.' };
    }
  };

  /**
   * Reverses a previously recorded payment.
   * Restricted to administrators with administrativeAccess.
   */
  const reversePayment = async (
    paymentId: string,
    reason: string
  ): Promise<BillingMutationResult<Payment>> => {
    if (!canReversePayment(currentUser, modules)) {
      return { success: false, error: 'Unauthorized: only clinic administrators can reverse payments.' };
    }

    const targetPayment = payments.find((p) => p.id === paymentId);
    if (!targetPayment) {
      return { success: false, error: 'Payment not found.' };
    }

    const targetInvoice = invoices.find((i) => i.id === targetPayment.invoiceId);
    if (!targetInvoice) {
      return { success: false, error: 'Invoice associated with payment not found.' };
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name }
      : { id: 'usr-1', name: 'Dr. Marcus Vance (Managing Director)' };

    try {
      const { reversal } = engineReversePayment(
        targetPayment,
        payments,
        reason,
        actor,
        new Date()
      );

      const nextPayments = [reversal, ...payments];
      const nextStatus = deriveStatus(targetInvoice, nextPayments);
      const nextInvoices = invoices.map((inv) =>
        inv.id === targetInvoice.id ? { ...inv, status: nextStatus } : inv
      );

      persistPayments(nextPayments);
      persistInvoices(nextInvoices);

      addAuditLogEntry({
        action: 'payment_reversed',
        subject: `Receipt ${targetPayment.receiptNumber}`,
        role: currentUser?.role || 'admin',
        details: `Payment of ${formatCurrency(targetPayment.amount)} on Invoice ${targetInvoice.number} reversed by ${actor.name}. Reason: ${reason}`,
        authorizedBy: actor.name,
      });

      return { success: true, data: reversal };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not reverse payment.' };
    }
  };

  /**
   * Adds an extra charge line item to an unpaid or partially paid invoice.
   */
  const addCharge = async (
    invoiceId: string,
    description: string,
    amount: number
  ): Promise<BillingMutationResult<Invoice>> => {
    if (!canAddCharge(currentUser, modules)) {
      return { success: false, error: 'Unauthorized: payment recording permission required.' };
    }

    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    if (!targetInvoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name }
      : { id: 'usr-rec-1', name: 'Front Desk Coordinator' };

    try {
      const updatedInvoice = engineAddCharge(
        targetInvoice,
        description,
        amount,
        actor,
        new Date()
      );

      const nextStatus = deriveStatus(updatedInvoice, payments);
      const finalInvoice = { ...updatedInvoice, status: nextStatus };
      const nextInvoices = invoices.map((inv) =>
        inv.id === targetInvoice.id ? finalInvoice : inv
      );

      persistInvoices(nextInvoices);

      addAuditLogEntry({
        action: 'charge_added',
        subject: `Invoice ${targetInvoice.number}`,
        role: currentUser?.role || 'receptionist',
        details: `Charge added: "${description}" for ${formatCurrency(amount)} by ${actor.name}.`,
        authorizedBy: actor.name,
      });

      return { success: true, data: finalInvoice };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not add charge.' };
    }
  };

  /**
   * Applies an administrative discount to an invoice.
   */
  const applyDiscount = async (
    invoiceId: string,
    amount: number,
    reason: string
  ): Promise<BillingMutationResult<Invoice>> => {
    if (!canApplyDiscount(currentUser, modules)) {
      return { success: false, error: 'Unauthorized: only clinic administrators can apply discounts.' };
    }

    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    if (!targetInvoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name }
      : { id: 'usr-1', name: 'Dr. Marcus Vance (Managing Director)' };

    try {
      const updatedInvoice = engineApplyDiscount(
        targetInvoice,
        payments,
        amount,
        reason,
        actor,
        new Date()
      );

      const nextStatus = deriveStatus(updatedInvoice, payments);
      const finalInvoice = { ...updatedInvoice, status: nextStatus };
      const nextInvoices = invoices.map((inv) =>
        inv.id === targetInvoice.id ? finalInvoice : inv
      );

      persistInvoices(nextInvoices);

      addAuditLogEntry({
        action: 'discount_applied',
        subject: `Invoice ${targetInvoice.number}`,
        role: currentUser?.role || 'admin',
        details: `Discount of ${formatCurrency(amount)} applied to Invoice ${targetInvoice.number} by ${actor.name}. Reason: ${reason}`,
        authorizedBy: actor.name,
      });

      return { success: true, data: finalInvoice };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not apply discount.' };
    }
  };

  /**
   * Voids an invoice when zero payments have been recorded.
   */
  const voidInvoice = async (
    invoiceId: string,
    reason: string
  ): Promise<BillingMutationResult<Invoice>> => {
    if (!canVoidInvoice(currentUser, modules)) {
      return { success: false, error: 'Unauthorized: only clinic administrators can void invoices.' };
    }

    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    if (!targetInvoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name }
      : { id: 'usr-1', name: 'Dr. Marcus Vance (Managing Director)' };

    try {
      const updatedInvoice = engineVoidInvoice(
        targetInvoice,
        payments,
        reason,
        actor,
        new Date()
      );

      const nextInvoices = invoices.map((inv) =>
        inv.id === targetInvoice.id ? updatedInvoice : inv
      );

      persistInvoices(nextInvoices);

      addAuditLogEntry({
        action: 'invoice_voided',
        subject: `Invoice ${targetInvoice.number}`,
        role: currentUser?.role || 'admin',
        details: `Invoice ${targetInvoice.number} voided by ${actor.name}. Reason: ${reason}`,
        authorizedBy: actor.name,
      });

      return { success: true, data: updatedInvoice };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not void invoice.' };
    }
  };

  /**
   * Idempotently builds an invoice when a doctor concludes a visit.
   * Returns the invoice object without leaking billing data to physician UI.
   */
  const createInvoiceForVisit = async (
    appointment: {
      id: string;
      patientId: string;
      patientName?: string;
      doctorId: string;
      doctorName?: string;
    },
    doctor?: { id: string; name: string; consultationFee?: number } | null
  ): Promise<Invoice> => {
    const existing = invoices.find(
      (inv) => inv.visitId === appointment.id || inv.appointmentId === appointment.id
    );
    if (existing) {
      return existing;
    }

    const newInvoice = buildInvoiceForVisit(appointment, doctor, invoices, new Date());
    const nextInvoices = [newInvoice, ...invoices];
    persistInvoices(nextInvoices);

    return newInvoice;
  };

  /**
   * Generates a billing receipt object with patient demographics and operator info.
   * Strictly zero clinical data.
   */
  const getReceipt = (paymentId: string): Receipt | null => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return null;

    const invoice = invoices.find((i) => i.id === payment.invoiceId);
    if (!invoice) return null;

    const matchedPatient = patients.find((p) => p.id === invoice.patientId);
    const patientSummary = matchedPatient || {
      name: invoice.patientName || 'Registered Patient',
      mrn: 'MRN-84291',
    };

    const receiverName = formatActor(payment.receivedBy, 'Front Desk Cashier');

    return makeReceipt(payment, invoice, patientSummary, receiverName);
  };

  return (
    <BillingContext.Provider
      value={{
        invoices,
        payments,
        isLoading,
        recordPayment,
        recordPortalPayment,
        reversePayment,
        addCharge,
        applyDiscount,
        voidInvoice,
        createInvoiceForVisit,
        getReceipt,
        getInvoiceBalance,
        getInvoiceTotal,
        getInvoiceStatus,
        getInvoicePayments,
        getDailyCollections,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = (): BillingContextType => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
