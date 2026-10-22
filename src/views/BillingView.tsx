import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { useBilling } from '@/context/BillingContext';
import {
  formatCurrency,
  CURRENCY_SYMBOL,
  dollarsToCents,
  centsToDollars,
  invoiceTotal,
  amountPaid,
  balanceDue,
  deriveStatus,
  formatActor,
} from '@/lib/billing';
import {
  canRecordPayment,
  canVoidInvoice,
  canApplyDiscount,
  canReversePayment,
  canAddCharge,
  isAdmin,
} from '@/lib/permissions';
import { getScopedInvoices, getScopedPayments } from '@/lib/selectors';
import { formatLocalDate, formatDate, formatTime } from '@/lib/time';
import { DetailList, DetailItem } from '@/components/ui/DetailList';
import { Invoice, Payment, PaymentMethod, Receipt } from '@/types/billing';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableTruncate,
} from '@/components/ui/Table';
import { RowActions } from '@/components/ui/RowActions';
import { Printer } from 'lucide-react';

export interface BillingViewProps {
  initialTab?: 'invoices' | 'payments';
}

export const BillingView: React.FC<BillingViewProps> = ({ initialTab = 'invoices' }) => {
  const { currentUser } = useAuth();
  const { modules, patients } = useClinic();
  const {
    invoices: allInvoices,
    payments: allPayments,
    recordPayment,
    reversePayment,
    addCharge,
    applyDiscount,
    voidInvoice,
    getReceipt,
    getDailyCollections,
  } = useBilling();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>(initialTab);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Scope invoices and payments based on user permissions
  const scopedInvoices = useMemo(() => {
    return getScopedInvoices(currentUser, allInvoices, modules);
  }, [currentUser, allInvoices, modules]);

  const scopedPayments = useMemo(() => {
    return getScopedPayments(currentUser, allPayments, allInvoices, modules);
  }, [currentUser, allPayments, allInvoices, modules]);

  // Daily collections summary
  const todayStr = useMemo(() => formatLocalDate(), []);
  const isAdministrator = isAdmin(currentUser, modules);
  const collectionsSummary = useMemo(() => {
    return isAdministrator
      ? getDailyCollections(undefined, todayStr)
      : getDailyCollections(currentUser?.id, todayStr);
  }, [isAdministrator, getDailyCollections, currentUser?.id, todayStr, allPayments]);

  // =========================================================================
  // INVOICES TAB STATE & FILTERS
  // =========================================================================
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [invoicesPage, setInvoicesPage] = useState(1);
  const pageSize = 10;

  const invoiceSuggestions = useMemo<SearchSuggestion[]>(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    scopedInvoices.forEach((inv) => {
      const invNum = inv.number || (inv as any).invoiceNumber || inv.id || '';
      if (inv.patientName && !seen.has(inv.patientName.toLowerCase())) {
        seen.add(inv.patientName.toLowerCase());
        list.push({
          label: inv.patientName,
          category: 'Patient',
          sublabel: `Invoice ${invNum || 'Unknown'}`,
        });
      }
      if (invNum && !seen.has(invNum.toLowerCase())) {
        seen.add(invNum.toLowerCase());
        list.push({
          label: invNum,
          category: 'Invoice',
          sublabel: inv.patientName || 'Patient invoice',
        });
      }
    });
    return list;
  }, [scopedInvoices]);

  const filteredInvoices = useMemo(() => {
    const query = invoiceSearchTerm.toLowerCase().trim();
    return scopedInvoices.filter((inv) => {
      const currentStatus = deriveStatus(inv, allPayments);
      if (invoiceStatusFilter && currentStatus !== invoiceStatusFilter) {
        return false;
      }
      if (!query) return true;
      const invNum = inv.number || (inv as any).invoiceNumber || inv.id || '';
      const matchNumber = invNum.toLowerCase().includes(query);
      const matchPatient = (inv.patientName || '').toLowerCase().includes(query);
      const matchPatientId = (inv.patientId || '').toLowerCase().includes(query);
      return matchNumber || matchPatient || matchPatientId;
    });
  }, [scopedInvoices, invoiceSearchTerm, invoiceStatusFilter, allPayments]);

  const paginatedInvoices = useMemo(() => {
    const start = (invoicesPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, invoicesPage, pageSize]);

  // =========================================================================
  // PAYMENTS TAB STATE & FILTERS
  // =========================================================================
  const [paymentDateFilter, setPaymentDateFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentsPage, setPaymentsPage] = useState(1);

  const filteredPayments = useMemo(() => {
    return scopedPayments.filter((p) => {
      if (!p) return false;
      if (paymentDateFilter) {
        const rawDate = p.receivedAt || (p as any).date || '';
        const paymentDate = rawDate ? rawDate.split('T')[0] : '';
        if (paymentDate !== paymentDateFilter) return false;
      }
      if (paymentMethodFilter && p.method !== paymentMethodFilter) {
        return false;
      }
      return true;
    });
  }, [scopedPayments, paymentDateFilter, paymentMethodFilter]);

  const paginatedPayments = useMemo(() => {
    const start = (paymentsPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, paymentsPage, pageSize]);

  // =========================================================================
  // MODAL 1: RECORD PAYMENT
  // =========================================================================
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
  const [paymentAmountDollars, setPaymentAmountDollars] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const openRecordPaymentModal = (inv: Invoice) => {
    const due = balanceDue(inv, allPayments);
    setPaymentTargetInvoice(inv);
    setPaymentAmountDollars(centsToDollars(due).toFixed(2));
    setPaymentMethod('card');
    setPaymentReference('');
    setPaymentNote('');
    setPaymentError('');
    setPaymentConfirming(false);
  };

  const closeRecordPaymentModal = () => {
    setPaymentTargetInvoice(null);
    setPaymentConfirming(false);
    setPaymentError('');
  };

  const handleProceedToConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!paymentTargetInvoice) return;

    const parsedDollars = parseFloat(paymentAmountDollars);
    if (isNaN(parsedDollars) || parsedDollars <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    const amountInCents = dollarsToCents(parsedDollars);
    const due = balanceDue(paymentTargetInvoice, allPayments);
    if (amountInCents > due) {
      setPaymentError(`Payment amount cannot exceed balance due (${formatCurrency(due)}).`);
      return;
    }

    setPaymentConfirming(true);
  };

  const handleExecutePayment = async () => {
    if (!paymentTargetInvoice) return;
    setIsSubmittingPayment(true);
    setPaymentError('');

    const parsedDollars = parseFloat(paymentAmountDollars);
    const amountInCents = dollarsToCents(parsedDollars);
    const idempotencyKey = `PAY-${paymentTargetInvoice.id}-${Date.now()}`;

    const res = await recordPayment({
      invoiceId: paymentTargetInvoice.id,
      amount: amountInCents,
      method: paymentMethod,
      reference: paymentReference.trim() || undefined,
      note: paymentNote.trim() || undefined,
      idempotencyKey,
    });

    setIsSubmittingPayment(false);

    if (!res.success || !res.data) {
      setPaymentError(res.error || 'Failed to record payment.');
      setPaymentConfirming(false);
      return;
    }

    const recordedPayment = res.data;
    showNotification(
      `Payment of ${formatCurrency(amountInCents)} recorded. Receipt #${recordedPayment.receiptNumber} generated.`
    );
    closeRecordPaymentModal();
    // Open receipt modal immediately
    handleOpenReceipt(recordedPayment.id);
  };

  // =========================================================================
  // MODAL 2: VIEW INVOICE & ADMINISTRATIVE ACTIONS
  // =========================================================================
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Administrative sub-forms on View Invoice
  const [isAddingCharge, setIsAddingCharge] = useState(false);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmountDollars, setChargeAmountDollars] = useState('');
  const [chargeError, setChargeError] = useState('');

  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountAmountDollars, setDiscountAmountDollars] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountError, setDiscountError] = useState('');

  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  const activeViewingInvoice = useMemo(() => {
    if (!viewingInvoice) return null;
    return allInvoices.find((i) => i.id === viewingInvoice.id) || viewingInvoice;
  }, [viewingInvoice, allInvoices]);

  const viewingInvoicePayments = useMemo(() => {
    if (!activeViewingInvoice) return [];
    return allPayments.filter((p) => p.invoiceId === activeViewingInvoice.id);
  }, [activeViewingInvoice, allPayments]);

  const handleOpenViewInvoice = (inv: Invoice) => {
    setViewingInvoice(inv);
    setIsAddingCharge(false);
    setIsApplyingDiscount(false);
    setIsVoidingInvoice(false);
    setChargeError('');
    setDiscountError('');
    setVoidError('');
  };

  const handleAddChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeViewingInvoice) return;
    setChargeError('');

    if (!chargeDescription.trim()) {
      setChargeError('Description is required.');
      return;
    }

    const parsedDollars = parseFloat(chargeAmountDollars);
    if (isNaN(parsedDollars) || parsedDollars <= 0) {
      setChargeError('Charge amount must be greater than zero.');
      return;
    }

    const cents = dollarsToCents(parsedDollars);
    const res = await addCharge(activeViewingInvoice.id, chargeDescription.trim(), cents);
    if (!res.success) {
      setChargeError(res.error || 'Failed to add charge.');
      return;
    }

    showNotification(`Charge of ${formatCurrency(cents)} added to Invoice ${activeViewingInvoice.number}.`);
    setIsAddingCharge(false);
    setChargeDescription('');
    setChargeAmountDollars('');
  };

  const handleApplyDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeViewingInvoice) return;
    setDiscountError('');

    if (!discountReason.trim()) {
      setDiscountError('Mandatory reason required for discounts.');
      return;
    }

    const parsedDollars = parseFloat(discountAmountDollars);
    if (isNaN(parsedDollars) || parsedDollars <= 0) {
      setDiscountError('Discount amount must be greater than zero.');
      return;
    }

    const cents = dollarsToCents(parsedDollars);
    const res = await applyDiscount(activeViewingInvoice.id, cents, discountReason.trim());
    if (!res.success) {
      setDiscountError(res.error || 'Failed to apply discount.');
      return;
    }

    showNotification(`Discount of ${formatCurrency(cents)} applied to Invoice ${activeViewingInvoice.number}.`);
    setIsApplyingDiscount(false);
    setDiscountAmountDollars('');
    setDiscountReason('');
  };

  const handleVoidInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeViewingInvoice) return;
    setVoidError('');

    if (!voidReason.trim()) {
      setVoidError('Mandatory reason required for voiding an invoice.');
      return;
    }

    const res = await voidInvoice(activeViewingInvoice.id, voidReason.trim());
    if (!res.success) {
      setVoidError(res.error || 'Failed to void invoice.');
      return;
    }

    showNotification(`Invoice ${activeViewingInvoice.number} has been voided.`);
    setIsVoidingInvoice(false);
    setVoidReason('');
  };

  // =========================================================================
  // MODAL 3: PAYMENT REVERSAL (ADMINISTRATIVE ONLY)
  // =========================================================================
  const [reversalTargetPayment, setReversalTargetPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  const openReversalModal = (p: Payment) => {
    setReversalTargetPayment(p);
    setReversalReason('');
    setReversalError('');
  };

  const closeReversalModal = () => {
    setReversalTargetPayment(null);
    setReversalReason('');
    setReversalError('');
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTargetPayment) return;
    setReversalError('');

    if (!reversalReason.trim()) {
      setReversalError('Mandatory administrative reason required for payment reversals.');
      return;
    }

    setIsSubmittingReversal(true);
    const res = await reversePayment(reversalTargetPayment.id, reversalReason.trim());
    setIsSubmittingReversal(false);

    if (!res.success) {
      setReversalError(res.error || 'Failed to reverse payment.');
      return;
    }

    showNotification(`Payment ${reversalTargetPayment.receiptNumber} successfully reversed.`);
    closeReversalModal();
  };

  // =========================================================================
  // MODAL 4: RECEIPT VIEW & PRINT
  // =========================================================================
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);

  const handleOpenReceipt = (paymentId: string) => {
    const rc = getReceipt(paymentId);
    if (rc) {
      setViewingReceipt(rc);
    } else {
      showNotification('Receipt record could not be loaded.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div role="status" aria-live="polite" className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 transition-all animate-fadeIn">
          {notification}
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Billing
          </h1>
        </div>
      </div>

      {/* Sub-Workstation Navigation Tabs */}
      <div role="tablist" aria-label="Billing Tabs" className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('invoices');
            setInvoicesPage(1);
            document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
          }}
          role="tab"
          aria-selected={activeTab === 'invoices'}
          aria-current={activeTab === 'invoices' ? 'page' : undefined}
          className={`pb-2.5 pt-1 text-xs font-semibold cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-colors ${
            activeTab === 'invoices'
              ? 'text-slate-900 dark:text-slate-100 border-teal-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Invoices ({scopedInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('payments');
            setPaymentsPage(1);
            document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
          }}
          role="tab"
          aria-selected={activeTab === 'payments'}
          aria-current={activeTab === 'payments' ? 'page' : undefined}
          className={`pb-2.5 pt-1 text-xs font-semibold cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-colors ${
            activeTab === 'payments'
              ? 'text-slate-900 dark:text-slate-100 border-teal-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Payments ({scopedPayments.length})
        </button>
      </div>

      {/* Daily Collections Plain-Text Summary Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {isAdministrator
                  ? "Today's Clinic-Wide Collections"
                  : `Today's Shift Collections (${currentUser?.name || 'Operator'})`}
                :
              </span>{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(collectionsSummary.total)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
              <span>Cash: {formatCurrency(collectionsSummary.cash)}</span>
              <span>Card: {formatCurrency(collectionsSummary.card)}</span>
              <span>UPI: {formatCurrency(collectionsSummary.upi)}</span>
              {isAdministrator && <span>Portal: {formatCurrency(collectionsSummary.portal)}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* TAB 1: INVOICES                                                           */}
      {/* ========================================================================= */}
      <ErrorBoundary key="invoices-tab">
        {activeTab === 'invoices' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredInvoices.length} Invoices Listed
              </span>
            }
          >
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3.5 space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <InteractiveSearchBar
                  value={invoiceSearchTerm}
                  onChange={(val) => {
                    setInvoiceSearchTerm(val);
                    setInvoicesPage(1);
                  }}
                  suggestions={invoiceSuggestions}
                  placeholder="Search by invoice number or patient name..."
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={invoiceStatusFilter}
                  onChange={(e) => {
                    setInvoiceStatusFilter(e.target.value);
                    setInvoicesPage(1);
                  }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'partially_paid', label: 'Partially Paid' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'void', label: 'Void' },
                  ]}
                />
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto overflow-y-hidden max-w-full">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Invoice #</TableHead>
                    <TableHead kind="short" priority={8} hideBelow="sm">Date</TableHead>
                    <TableHead kind="short" priority={2}>Patient</TableHead>
                    <TableHead kind="short" priority={6} hideBelow="md" className="text-right">Total</TableHead>
                    <TableHead kind="short" priority={7} hideBelow="md" className="text-right">Paid</TableHead>
                    <TableHead kind="short" priority={3} className="text-right">Balance</TableHead>
                    <TableHead kind="short" priority={4}>Status</TableHead>
                    <TableHead kind="short" priority={5} isActions className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.length > 0 ? (
                    paginatedInvoices.map((inv) => {
                      const total = invoiceTotal(inv);
                      const paid = amountPaid(allPayments, inv.id);
                      const due = balanceDue(inv, allPayments);
                      const currentStatus = deriveStatus(inv, allPayments);
                      const matchedPatient = patients.find((p) => p.id === inv.patientId);
                      const mrn = matchedPatient?.mrn || inv.patientId;

                      const statusLabel =
                        currentStatus === 'paid'
                           ? 'Paid'
                          : currentStatus === 'partially_paid'
                          ? 'Partially Paid'
                          : currentStatus === 'void'
                          ? 'Void'
                          : 'Unpaid';

                      const canRecord =
                        canRecordPayment(currentUser, modules) &&
                        due > 0 &&
                        currentStatus !== 'void';

                      return (
                        <TableRow key={inv.id}>
                          <TableCell kind="short" priority={1} isPrimary label="Invoice #">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {inv.number || (inv as any).invoiceNumber || 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell kind="short" priority={8} hideBelow="sm" label="Date" className="text-slate-600 dark:text-slate-400">
                            {inv.issuedAt ? formatDate(inv.issuedAt.split('T')[0]) : (inv as any).date ? formatDate((inv as any).date.split('T')[0]) : '—'}
                          </TableCell>
                          <TableCell kind="short" priority={2} label="Patient">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {inv.patientName || 'Registered Patient'}
                            </div>
                            <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                              {mrn}
                            </div>
                          </TableCell>
                          <TableCell kind="short" priority={6} hideBelow="md" label="Total" className="text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(total)}
                          </TableCell>
                          <TableCell kind="short" priority={7} hideBelow="md" label="Paid" className="text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(paid)}
                          </TableCell>
                          <TableCell kind="short" priority={3} label="Balance" className="text-right font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(due)}
                          </TableCell>
                          <TableCell kind="short" priority={4} label="Status">
                            <span
                              className={
                                currentStatus === 'paid'
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : currentStatus === 'void'
                                  ? 'text-slate-500 dark:text-slate-400 line-through'
                                  : currentStatus === 'partially_paid'
                                  ? 'text-slate-700 dark:text-slate-300 font-medium'
                                  : 'text-slate-700 dark:text-slate-300 font-medium'
                              }
                            >
                              {statusLabel}
                            </span>
                          </TableCell>
                          <TableCell kind="short" priority={5} isActions label="Actions" className="text-right">
                            <RowActions
                              actions={[
                                {
                                  label: 'View',
                                  onClick: () => handleOpenViewInvoice(inv),
                                  ariaLabel: `View invoice ${inv.number}`,
                                },
                                ...(canRecord
                                  ? [
                                      {
                                        label: 'Record Payment',
                                        variant: 'primary' as const,
                                        onClick: () => openRecordPaymentModal(inv),
                                        ariaLabel: `Record payment for invoice ${inv.number}`,
                                      },
                                    ]
                                  : []),
                              ]}
                              subject={inv.number}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        No invoices found matching criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={invoicesPage}
              totalItems={filteredInvoices.length}
              pageSize={pageSize}
              onPageChange={setInvoicesPage}
            />
          </CardContent>
        </Card>
      )}
      </ErrorBoundary>

      {/* ========================================================================= */}
      {/* TAB 2: PAYMENTS                                                           */}
      {/* ========================================================================= */}
      <ErrorBoundary key="payments-tab">
        {activeTab === 'payments' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredPayments.length} Payments Recorded
              </span>
            }
          >
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3.5 space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-60">
                <DatePicker
                  value={paymentDateFilter}
                  onChange={(val) => {
                    setPaymentDateFilter(val);
                    setPaymentsPage(1);
                  }}
                  placeholder="Filter by date..."
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setPaymentsPage(1);
                  }}
                  options={[
                    { value: '', label: 'All Methods' },
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'upi', label: 'UPI' },
                    { value: 'portal', label: 'Portal' },
                  ]}
                />
              </div>
              {paymentDateFilter && (
                <div className="flex items-center">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setPaymentDateFilter('')}
                  >
                    Clear Date
                  </Button>
                </div>
              )}
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto overflow-y-hidden max-w-full">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Receipt #</TableHead>
                    <TableHead kind="short" priority={7} hideBelow="sm">Date & Time</TableHead>
                    <TableHead kind="short" priority={4}>Invoice #</TableHead>
                    <TableHead kind="short" priority={2}>Patient</TableHead>
                    <TableHead kind="short" priority={6} hideBelow="md">Method</TableHead>
                    <TableHead kind="short" priority={3} className="text-right">Amount</TableHead>
                    <TableHead kind="short" priority={8} hideBelow="md">Type</TableHead>
                    <TableHead kind="short" priority={9} hideBelow="lg">Received By</TableHead>
                    <TableHead kind="short" priority={5} isActions className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.length > 0 ? (
                    paginatedPayments.map((p) => {
                      const matchedInvoice = allInvoices.find((i) => i.id === p.invoiceId);
                      const invoiceNumberDisplay = matchedInvoice?.number || 'Unknown';
                      const patientNameDisplay = (matchedInvoice?.patientName && matchedInvoice.patientName.trim()) || 'Unknown';
                      const receiver = formatActor(p.receivedBy, 'Unknown');

                      const isReversed =
                        p.kind === 'reversal' ||
                        allPayments.some((other) => other.reversesPaymentId === p.id);

                      const canReverse =
                        canReversePayment(currentUser, modules) &&
                        p.kind === 'payment' &&
                        !isReversed;

                      const displayDate = p.receivedAt
                        ? `${formatDate(p.receivedAt.slice(0, 10))} ${formatTime(p.receivedAt.slice(11, 16))}`
                        : (p as any).date
                        ? `${formatDate((p as any).date.slice(0, 10))} ${formatTime((p as any).date.slice(11, 16))}`
                        : '—';

                      return (
                        <TableRow key={p.id}>
                          <TableCell kind="short" priority={1} isPrimary label="Receipt #">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {p.receiptNumber || p.id || 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell kind="short" priority={7} hideBelow="sm" label="Date & Time" className="text-slate-600 dark:text-slate-400">
                            {displayDate}
                          </TableCell>
                          <TableCell kind="short" priority={4} label="Invoice #" className="text-slate-700 dark:text-slate-300">
                            {invoiceNumberDisplay}
                          </TableCell>
                          <TableCell kind="short" priority={2} label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {patientNameDisplay}
                          </TableCell>
                          <TableCell kind="short" priority={6} hideBelow="md" label="Method" className="uppercase text-slate-600 dark:text-slate-400">
                            {p.method || 'Unknown'}
                          </TableCell>
                          <TableCell kind="short" priority={3} label="Amount" className="text-right font-medium text-slate-900 dark:text-slate-100">
                            <span className={p.kind === 'reversal' ? 'text-rose-600 dark:text-rose-400' : ''}>
                              {p.kind === 'reversal' ? `-${formatCurrency(p.amount)}` : formatCurrency(p.amount)}
                            </span>
                          </TableCell>
                          <TableCell kind="short" priority={8} hideBelow="md" label="Type">
                            <span
                              className={
                                p.kind === 'reversal'
                                  ? 'text-rose-600 dark:text-rose-400 font-medium'
                                  : isReversed
                                  ? 'text-slate-500 dark:text-slate-400 line-through'
                                  : 'text-slate-700 dark:text-slate-300'
                              }
                            >
                              {p.kind === 'reversal' ? 'Reversal' : isReversed ? 'Reversed' : 'Payment'}
                            </span>
                          </TableCell>
                          <TableCell kind="short" priority={9} hideBelow="lg" label="Received By" className="text-slate-600 dark:text-slate-400">
                            <TableTruncate>{receiver}</TableTruncate>
                          </TableCell>
                          <TableCell kind="short" priority={5} isActions label="Actions" className="text-right">
                            <RowActions
                              actions={[
                                {
                                  label: 'View Receipt',
                                  onClick: () => handleOpenReceipt(p.id),
                                  ariaLabel: `View receipt for ${p.receiptNumber}`,
                                },
                                ...(canReverse
                                  ? [
                                      {
                                        label: 'Reverse',
                                        onClick: () => openReversalModal(p),
                                        ariaLabel: `Reverse payment ${p.receiptNumber}`,
                                      },
                                    ]
                                  : []),
                              ]}
                              subject={p.receiptNumber}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        No payments found matching criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={paymentsPage}
              totalItems={filteredPayments.length}
              pageSize={pageSize}
              onPageChange={setPaymentsPage}
            />
          </CardContent>
        </Card>
      )}
      </ErrorBoundary>

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PAYMENT                                                   */}
      {/* ========================================================================= */}
      {paymentTargetInvoice && (
        <Modal
          isOpen={Boolean(paymentTargetInvoice)}
          onClose={closeRecordPaymentModal}
          title={`Record Payment: ${paymentTargetInvoice.number}`}
          description={`Record settlement for ${paymentTargetInvoice.patientName || 'Registered Patient'}.`}
          maxWidth="md"
          footer={
            paymentConfirming ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentConfirming(false)}
                  disabled={isSubmittingPayment}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecutePayment}
                  disabled={isSubmittingPayment}
                >
                  {isSubmittingPayment ? 'Processing...' : 'Confirm and Record Payment'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeRecordPaymentModal}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProceedToConfirmPayment}
                >
                  Continue
                </Button>
              </>
            )
          }
        >
          {paymentError && (
            <div className="p-3 mb-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
              {paymentError}
            </div>
          )}

          {/* Invoice Summary */}
          <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <DetailList dense>
              <DetailItem label="Patient" value={paymentTargetInvoice.patientName || 'Registered Patient'} />
              <DetailItem label="Total Amount" value={formatCurrency(invoiceTotal(paymentTargetInvoice))} />
              <DetailItem label="Balance Due" value={<span className="font-bold">{formatCurrency(balanceDue(paymentTargetInvoice, allPayments))}</span>} />
            </DetailList>
          </div>

          {paymentConfirming ? (
            <div className="space-y-3 py-2 text-xs text-slate-700 dark:text-slate-300">
              <p>
                Please verify payment details before recording. This entry will be permanently logged.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1">
                <div>
                  <strong>Amount:</strong> {formatCurrency(Math.round(Number(paymentAmountDollars || 0) * 100))}
                </div>
                <div>
                  <strong>Method:</strong> {paymentMethod.toUpperCase()}
                </div>
                {paymentReference && (
                  <div>
                    <strong>Reference:</strong> {paymentReference}
                  </div>
                )}
                <div>
                  <strong>Received By:</strong> {currentUser?.name || 'Front Desk Staff'}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProceedToConfirmPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount ({CURRENCY_SYMBOL})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmountDollars}
                  onChange={(e) => setPaymentAmountDollars(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'upi', label: 'UPI' },
                ]}
              />

              <Input
                label="Transaction / Reference ID (Optional for Cash)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. TXN-984210 or UPI-Ref"
              />

              <Input
                label="Notes (Optional)"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Front desk intake comments..."
              />

              <div className="pt-1 text-[0.6875rem] text-slate-500 dark:text-slate-400">
                Operator: <strong>{currentUser?.name || 'Front Desk Staff'}</strong> ({currentUser?.role || 'Staff'})
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW INVOICE                                                     */}
      {/* ========================================================================= */}
      {activeViewingInvoice && (
        <Modal
          isOpen={Boolean(activeViewingInvoice)}
          onClose={() => setViewingInvoice(null)}
          title={`Invoice ${activeViewingInvoice.number || (activeViewingInvoice as any).invoiceNumber || 'Details'}`}
          description={`Issued on ${activeViewingInvoice.issuedAt ? activeViewingInvoice.issuedAt.split('T')[0] : (activeViewingInvoice as any).date ? (activeViewingInvoice as any).date.split('T')[0] : 'Unknown'}`}
          maxWidth="lg"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingInvoice(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <DetailList dense>
                <DetailItem
                  label="Patient"
                  value={activeViewingInvoice.patientName || 'Registered Patient'}
                  subtitle={`ID: ${activeViewingInvoice.patientId}`}
                />
                <DetailItem
                  label="Attending"
                  value={activeViewingInvoice.doctorName || 'Consulting Physician'}
                  subtitle={`Status: ${deriveStatus(activeViewingInvoice, allPayments).toUpperCase()}`}
                />
              </DetailList>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[0.6875rem]">
                Line Items
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 w-24">Kind</th>
                      <th className="p-2.5 w-28 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {activeViewingInvoice.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 text-slate-900 dark:text-slate-100">{it.description}</td>
                        <td className="p-2.5 uppercase text-[0.625rem] text-slate-500 dark:text-slate-400">{it.kind}</td>
                        <td className="p-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          {it.kind === 'discount' ? `-${formatCurrency(it.amount)}` : formatCurrency(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total breakdown */}
            <div className="flex justify-end pt-1">
              <div className="w-64 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Amount:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(invoiceTotal(activeViewingInvoice))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Settled Payments:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(amountPaid(allPayments, activeViewingInvoice.id))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span>Outstanding Due:</span>
                  <span>{formatCurrency(balanceDue(activeViewingInvoice, allPayments))}</span>
                </div>
              </div>
            </div>

            {/* Administrative Mutations (Add Charge / Apply Discount / Void) */}
            {isAdministrator && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Administrative Controls
                  </span>
                  <div className="flex space-x-2">
                    {canAddCharge(currentUser, modules) &&
                      activeViewingInvoice.status !== 'void' &&
                      balanceDue(activeViewingInvoice, allPayments) > 0 && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setIsAddingCharge((prev) => !prev);
                            setIsApplyingDiscount(false);
                            setIsVoidingInvoice(false);
                          }}
                        >
                          Add Charge
                        </Button>
                      )}

                    {canApplyDiscount(currentUser, modules) &&
                      activeViewingInvoice.status !== 'void' &&
                      balanceDue(activeViewingInvoice, allPayments) > 0 && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setIsApplyingDiscount((prev) => !prev);
                            setIsAddingCharge(false);
                            setIsVoidingInvoice(false);
                          }}
                        >
                          Apply Discount
                        </Button>
                      )}

                    {canVoidInvoice(currentUser, modules) &&
                      activeViewingInvoice.status !== 'void' &&
                      amountPaid(allPayments, activeViewingInvoice.id) === 0 && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setIsVoidingInvoice((prev) => !prev);
                            setIsAddingCharge(false);
                            setIsApplyingDiscount(false);
                          }}
                        >
                          Void Invoice
                        </Button>
                      )}
                  </div>
                </div>

                {/* Subform: Add Charge */}
                {isAddingCharge && (
                  <form
                    onSubmit={handleAddChargeSubmit}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Add Line Charge</div>
                    {chargeError && (
                      <div className="p-2 text-xs bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded">
                        {chargeError}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          label="Description"
                          value={chargeDescription}
                          onChange={(e) => setChargeDescription(e.target.value)}
                          placeholder="e.g. Specialized Dressing or Procedure Fee"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Amount ({CURRENCY_SYMBOL})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={chargeAmountDollars}
                          onChange={(e) => setChargeAmountDollars(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <Button size="xs" variant="outline" onClick={() => setIsAddingCharge(false)}>
                        Cancel
                      </Button>
                      <Button size="xs" variant="primary" type="submit">
                        Save Charge
                      </Button>
                    </div>
                  </form>
                )}

                {/* Subform: Apply Discount */}
                {isApplyingDiscount && (
                  <form
                    onSubmit={handleApplyDiscountSubmit}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Apply Administrative Discount</div>
                    {discountError && (
                      <div className="p-2 text-xs bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded">
                        {discountError}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Amount ({CURRENCY_SYMBOL})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={discountAmountDollars}
                          onChange={(e) => setDiscountAmountDollars(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Reason (Mandatory)"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="e.g. Senior citizen concession or clinical waiver"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <Button size="xs" variant="outline" onClick={() => setIsApplyingDiscount(false)}>
                        Cancel
                      </Button>
                      <Button size="xs" variant="primary" type="submit">
                        Apply Discount
                      </Button>
                    </div>
                  </form>
                )}

                {/* Subform: Void Invoice */}
                {isVoidingInvoice && (
                  <form
                    onSubmit={handleVoidInvoiceSubmit}
                    className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2.5"
                  >
                    <div className="font-semibold text-rose-800 dark:text-rose-300">Void Invoice Confirmation</div>
                    <p className="text-xs text-rose-700 dark:text-rose-400">
                      Voiding marks this invoice as cancelled and permanently clears any outstanding balance.
                    </p>
                    {voidError && (
                      <div className="p-2 text-xs bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 rounded">
                        {voidError}
                      </div>
                    )}
                    <Input
                      label="Mandatory Reason"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="e.g. Visit created in error / duplicate booking"
                    />
                    <div className="flex justify-end space-x-2 pt-1">
                      <Button size="xs" variant="outline" onClick={() => setIsVoidingInvoice(false)}>
                        Cancel
                      </Button>
                      <Button size="xs" variant="primary" type="submit">
                        Confirm Void
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Payments list for this invoice */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[0.6875rem]">
                Payment History ({viewingInvoicePayments.length})
              </div>
              {viewingInvoicePayments.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Receipt #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Method</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {viewingInvoicePayments.map((p) => {
                        const isReversed =
                          p.kind === 'reversal' ||
                          allPayments.some((o) => o.reversesPaymentId === p.id);
                        return (
                          <tr key={p.id}>
                            <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{p.receiptNumber || 'Receipt'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-400">
                              {p.receivedAt ? p.receivedAt.split('T')[0] : (p as any).date ? (p as any).date.split('T')[0] : 'Unknown'}
                            </td>
                            <td className="p-2 uppercase text-slate-600 dark:text-slate-400">{p.method}</td>
                            <td className="p-2 text-right font-medium text-slate-900 dark:text-slate-100">
                              {p.kind === 'reversal' ? `-${formatCurrency(p.amount)}` : formatCurrency(p.amount)}
                            </td>
                            <td className="p-2">
                              <span
                                className={
                                  p.kind === 'reversal'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : isReversed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }
                              >
                                {p.kind === 'reversal' ? 'Reversal' : isReversed ? 'Reversed' : 'Settled'}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleOpenReceipt(p.id)}
                                >
                                  Receipt
                                </Button>
                                {canReversePayment(currentUser, modules) &&
                                  p.kind === 'payment' &&
                                  !isReversed && (
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => openReversalModal(p)}
                                    >
                                      Reverse
                                    </Button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-xs py-2">
                  No payments recorded for this invoice yet.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAYMENT REVERSAL                                                 */}
      {/* ========================================================================= */}
      {reversalTargetPayment && (
        <Modal
          isOpen={Boolean(reversalTargetPayment)}
          onClose={closeReversalModal}
          title={`Reverse Payment: ${reversalTargetPayment.receiptNumber}`}
          description="Administrative payment reversal. This entry will be logged to security audit ledger."
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={closeReversalModal}
                disabled={isSubmittingReversal}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteReversal}
                disabled={isSubmittingReversal}
              >
                {isSubmittingReversal ? 'Processing...' : 'Confirm Reversal'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleExecuteReversal} className="space-y-3 text-xs">
            {reversalError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg">
                {reversalError}
              </div>
            )}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div>
                <strong>Amount:</strong> {formatCurrency(reversalTargetPayment.amount)}
              </div>
              <div>
                <strong>Original Method:</strong> {reversalTargetPayment.method.toUpperCase()}
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Reversing this payment restores the invoice balance and creates an official negative payment entry.
            </p>
            <Textarea
              label="Mandatory Reason for Reversal"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Card entered twice in error by front desk cashier"
              rows={3}
              required
            />
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: OFFICIAL RECEIPT (DEMOGRAPHICS ONLY, ZERO CLINICAL DATA)         */}
      {/* ========================================================================= */}
      {viewingReceipt && (
        <Modal
          isOpen={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          title="Payment Receipt"
          description={viewingReceipt.receiptNumber}
          maxWidth="sm"
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrintReceipt}
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setViewingReceipt(null)}
              >
                Done
              </Button>
            </div>
          }
        >
          {/* Printable Receipt Card */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
            <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {viewingReceipt.clinicName}
              </div>
              <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                Official Payment Receipt
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {viewingReceipt.receiptNumber}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <DetailList dense>
                <DetailItem
                  label="Date & Time"
                  value={`${formatDate(viewingReceipt.receivedAt.slice(0, 10))} ${formatTime(viewingReceipt.receivedAt.slice(11, 16))}`}
                />
                <DetailItem label="Patient Name" value={viewingReceipt.patientName} />
                <DetailItem label="MRN" value={viewingReceipt.patientMrn} />
                <DetailItem label="Invoice #" value={viewingReceipt.invoiceNumber} />
                <DetailItem
                  label="Payment Method"
                  value={<span className="uppercase">{viewingReceipt.method}</span>}
                />
                <DetailItem label="Cashier" value={viewingReceipt.receivedBy} />
                <DetailItem
                  label="Total Settled"
                  value={<span className="font-bold">{viewingReceipt.formattedAmount}</span>}
                />
              </DetailList>
            </div>

            <div className="text-center pt-2 text-[0.625rem] text-slate-500 dark:text-slate-400">
              Demographic and payment settlement record only.
              <br />
              No clinical diagnosis, prescription, or vitals are disclosed on receipts.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
