import React, { useState, useEffect } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { Filter } from 'lucide-react';
import { Invoice, PaymentMethod } from '@/types';

interface AdminViewProps {
  activeTab?: string;
}

export const AdminView: React.FC<AdminViewProps> = () => {
  const { invoices, recordPayment } = useClinic();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState('');

  // Real-time Feedback Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Payment Recording Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentError, setPaymentError] = useState('');

  // Billing KPIs
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const pendingRevenue = invoices.reduce(
    (acc, inv) => acc + (inv.totalAmount - inv.paidAmount),
    0
  );
  const paidInvoicesCount = invoices.filter((i) => i.status === 'paid').length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === 'unpaid').length;
  const partiallyPaidInvoicesCount = invoices.filter((i) => i.status === 'partially_paid').length;
  const settlementRate =
    invoices.length > 0 ? Math.round((paidInvoicesCount / invoices.length) * 100) : 0;

  // Unsettled invoices requiring attention
  const unsettledInvoices = invoices.filter(
    (i) => i.status === 'unpaid' || i.status === 'partially_paid'
  );

  // Handlers
  const handleOpenPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
    setPaymentAmount(balance);
    setPaymentMethod(inv.paymentMethod || 'card');
    setPaymentError('');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (paymentAmount <= 0 || isNaN(paymentAmount)) {
      setPaymentError('Payment amount must be greater than $0.00.');
      return;
    }

    recordPayment(selectedInvoice.id, paymentAmount, paymentMethod);
    showNotification(
      `Payment of $${paymentAmount.toFixed(2)} recorded for Invoice ${selectedInvoice.invoiceNumber} via ${paymentMethod.replace('_', ' ').toUpperCase()}.`
    );

    setSelectedInvoice(null);
    setPaymentAmount(0);
    setPaymentError('');
  };

  // Generic Search Query
  const query = searchTerm.toLowerCase().trim();

  // Filtered Invoices
  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      query === '' ||
      i.invoiceNumber.toLowerCase().includes(query) ||
      i.patientName.toLowerCase().includes(query) ||
      i.status.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (billingStatusFilter !== '') {
      return i.status === billingStatusFilter;
    }
    return true;
  });

  // Pagination State (10 records per page)
  const [billingPage, setBillingPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setBillingPage(1);
  }, [searchTerm, billingStatusFilter]);

  const paginatedInvoices = filteredInvoices.slice(
    (billingPage - 1) * pageSize,
    billingPage * pageSize
  );

  const billingSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.patientName && !seen.has(inv.patientName.toLowerCase())) {
        seen.add(inv.patientName.toLowerCase());
        list.push({
          label: inv.patientName,
          category: 'Patient',
          sublabel: `Invoice ${inv.invoiceNumber} • $${inv.totalAmount}`,
        });
      }
    });
    return list;
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Real-time Feedback Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span className="font-semibold text-teal-950 dark:text-teal-100">
              Managing Director Directive:
            </span>
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Executive Workstation Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-teal-300 font-medium">
            Financial Audit & Invoicing Ledger
          </div>
          <h2 className="text-xl font-bold mt-1 text-slate-100 tracking-tight">
            Clinic Financial Audit & Invoicing Ledger
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-xs text-slate-200">
            <span>Direct Settlement Authority</span>
          </div>
        </div>
      </div>

      {/* Dedicated Billing KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Revenue Collected"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          unit="USD"
          subtitle="Settled patient payments"
          colorScheme="teal"
        />
        <StatCard
          title="Pending Revenue Balance"
          value={`$${pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          unit="USD"
          subtitle="Unsettled patient fees"
          colorScheme={pendingRevenue > 0 ? 'rose' : 'teal'}
        />
        <StatCard
          title="Total Invoices Issued"
          value={invoices.length}
          unit="Invoices"
          subtitle={`${paidInvoicesCount} settled in full`}
          colorScheme="slate"
        />
        <StatCard
          title="Accounts Settlement Rate"
          value={`${settlementRate}%`}
          unit="Rate"
          subtitle="Discharge payment clearance"
          colorScheme="slate"
        />
      </div>

      {/* Financial Ledger Governance Bar: Side-by-Side Search & Settlement Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Financial Ledger Governance
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Search invoices or filter settlement status to inspect financial records:
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl lg:justify-end">
            {/* Search Input with Interactive Dropdown and Autofill */}
            <div className="relative flex-1 min-w-[200px]">
              <InteractiveSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                suggestions={billingSuggestions}
                placeholder="Search by patient name or invoice number..."
              />
            </div>

            {/* Status Filter Dropdown using custom Select with Filter icon */}
            <div className="w-full sm:w-60 shrink-0">
              <Select
                icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                value={billingStatusFilter}
                placeholder="Select Settlement Status"
                onChange={(e) => setBillingStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Settlement Statuses' },
                  { value: 'unpaid', label: `Unpaid Invoices (${unpaidInvoicesCount})` },
                  { value: 'partially_paid', label: `Partially Paid (${partiallyPaidInvoicesCount})` },
                  { value: 'paid', label: `Paid In Full (${paidInvoicesCount})` },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table Card with 10 records per page Pagination */}
      <Card className="animate-fadeIn">
        <CardHeader
          action={
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredInvoices.length} Invoices Listed
            </span>
          }
        >
          <CardTitle>Invoicing & Patient Payment Ledger</CardTitle>
          <CardDescription>
            Executive oversight of patient fee collections, insurance claims, and outstanding balances
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 align-middle">Invoice #</th>
                  <th className="px-4 py-3.5 align-middle">Patient Name</th>
                  <th className="px-4 py-3.5 align-middle">Issue Date</th>
                  <th className="px-4 py-3.5 align-middle">Total Billed</th>
                  <th className="px-4 py-3.5 align-middle">Amount Settled</th>
                  <th className="px-4 py-3.5 align-middle">Balance Due</th>
                  <th className="px-4 py-3.5 align-middle">Method</th>
                  <th className="px-4 py-3.5 align-middle">Settlement Status</th>
                  <th className="px-4 py-3.5 text-right align-middle">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.length > 0 ? (
                  paginatedInvoices.map((inv) => {
                    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 dark:text-slate-100">
                          {inv.patientName}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {inv.date}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                          ${inv.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-mono text-teal-700 dark:text-teal-400">
                          ${inv.paidAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-mono text-rose-600 dark:text-rose-400">
                          ${balance.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 align-middle capitalize text-slate-600 dark:text-slate-400">
                          {inv.paymentMethod ? inv.paymentMethod.replace('_', ' ') : 'Unspecified'}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                inv.status === 'paid' ? 'bg-teal-500' : 'bg-rose-500'
                              }`}
                            />
                            <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                              {inv.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle">
                          {balance > 0 ? (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handleOpenPaymentModal(inv)}
                            >
                              Record Payment
                            </Button>
                          ) : (
                            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                              Fully Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs"
                    >
                      No invoices found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={billingPage}
            totalItems={filteredInvoices.length}
            pageSize={pageSize}
            onPageChange={setBillingPage}
          />
        </CardContent>
      </Card>

      {/* Persistent Box: Outstanding Unsettled Balances & Fee Clearance */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                ${pendingRevenue.toFixed(2)} Pending Balance
              </span>
            </div>
          }
        >
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Outstanding Unsettled Balances & Fee Clearance Box
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Patient invoices with pending balances requiring payment recording, insurance reconciliation, or Managing Director settlement.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {unsettledInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                All Patient Accounts Settled in Full
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                No outstanding fees or claims pending. Select a settlement status filter above to inspect historical invoices.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unsettledInvoices.map((inv) => {
                const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {inv.patientName}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          (Invoice #{inv.invoiceNumber})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Total Billed: <span className="font-mono">${inv.totalAmount.toFixed(2)}</span> • Paid:{' '}
                        <span className="font-mono text-teal-600 dark:text-teal-400">
                          ${inv.paidAmount.toFixed(2)}
                        </span>{' '}
                        • Balance Due:{' '}
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          ${balance.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Issued: {inv.date} — Method:{' '}
                        {inv.paymentMethod ? inv.paymentMethod.replace('_', ' ') : 'Unspecified'} — Status:{' '}
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                          {inv.status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenPaymentModal(inv)}
                      >
                        Record Payment
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Record Payment: Invoice ${selectedInvoice?.invoiceNumber}`}
        description={`Record direct patient payment or insurance settlement for ${selectedInvoice?.patientName}.`}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedInvoice(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordPayment}
            >
              Confirm Settlement
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4" noValidate>
            {paymentError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
                {paymentError}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                  Patient
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedInvoice.patientName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                  Total Billed
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  ${selectedInvoice.totalAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                  Previously Paid
                </span>
                <span className="font-mono text-teal-600 dark:text-teal-400">
                  ${selectedInvoice.paidAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                  Remaining Balance
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  ${Math.max(0, selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(Number(e.target.value));
                if (paymentError) setPaymentError('');
              }}
              error={paymentError || undefined}
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'card', label: 'Credit / Debit Card' },
                { value: 'cash', label: 'Cash at Front Desk' },
                { value: 'insurance', label: 'Insurance Direct Claim' },
                { value: 'bank_transfer', label: 'Bank Wire / Transfer' },
                { value: 'upi', label: 'Digital Transfer / UPI' },
              ]}
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
