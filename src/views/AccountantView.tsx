import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import {
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { Invoice, PaymentMethod } from '@/types';

interface AccountantViewProps {
  activeTab: string;
}

export const AccountantView: React.FC<AccountantViewProps> = ({ activeTab: _activeTab }) => {
  const { currentUser } = useAuth();
  const { invoices, patients, recordPayment, createInvoice } = useClinic();

  // Payment Collection Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // New Invoice Modal State
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [newPatientId, setNewPatientId] = useState(patients[0]?.id || '');
  const [itemDescription, setItemDescription] = useState('Specialist Consultation Fee');
  const [itemAmount, setItemAmount] = useState('120');

  const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const outstanding = invoices.reduce(
    (acc, i) => acc + (i.totalAmount - i.paidAmount),
    0
  );

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount((inv.totalAmount - inv.paidAmount).toFixed(2));
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const parsedAmount = parseFloat(payAmount) || 0;
    recordPayment(selectedInvoice.id, parsedAmount, paymentMethod);
    setSelectedInvoice(null);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === newPatientId) || patients[0];
    const unitPrice = parseFloat(itemAmount) || 100;
    const tax = unitPrice * 0.05;
    const total = unitPrice + tax;

    createInvoice({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      items: [
        {
          id: `item-${Date.now()}`,
          description: itemDescription,
          category: 'consultation',
          unitPrice,
          quantity: 1,
          total: unitPrice,
        },
      ],
      subtotal: unitPrice,
      taxAmount: tax,
      discountAmount: 0,
      totalAmount: total,
      paidAmount: 0,
    });

    setIsNewInvoiceOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Clinic Billing & Revenue Accounting
          </h2>
          <p className="text-xs text-slate-500">
            Senior Billing Officer: {currentUser.name} • Financial Transactions & Invoices
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewInvoiceOpen(true)}
        >
          Create New Invoice
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Clinic Revenue Billed"
          value={`$${totalBilled.toFixed(2)}`}
          subtitle="All patient visits & procedures"
          icon={<DollarSign className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Collections Received"
          value={`$${totalCollected.toFixed(2)}`}
          subtitle="Processed via cash, card & insurance"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="blue"
        />
        <StatCard
          title="Outstanding Patient Balance"
          value={`$${outstanding.toFixed(2)}`}
          subtitle="Pending collections"
          icon={<Clock className="w-5 h-5" />}
          colorScheme="amber"
        />
      </div>

      {/* Invoices List Table */}
      <Card>
        <CardHeader
          action={
            <span className="text-xs font-semibold text-slate-500">
              {invoices.length} Total Invoices Generated
            </span>
          }
        >
          <CardTitle>Patient Billing Invoices & Receipts</CardTitle>
          <CardDescription>
            Audit consultation, laboratory, pharmacy, and diagnostic fees
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Patient Details</th>
                  <th className="px-4 py-3">Bill Date</th>
                  <th className="px-4 py-3">Line Items</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3 text-right">Accounting Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {inv.patientName}
                      </div>
                      {inv.doctorName && (
                        <div className="text-[11px] text-slate-500">
                          Dr. {inv.doctorName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {inv.items.map((it) => it.description).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ${inv.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">
                      ${inv.paidAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        size="sm"
                        variant={
                          inv.status === 'paid'
                            ? 'success'
                            : inv.status === 'partially_paid'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status !== 'paid' ? (
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => handleOpenPayment(inv)}
                        >
                          Collect Payment
                        </Button>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[11px]">
                          Settled via {inv.paymentMethod || 'Payment'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Collect Payment Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Process Payment for ${selectedInvoice?.invoiceNumber}`}
        description="Record payment receipt against outstanding patient account."
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
              onClick={handleProcessPayment}
            >
              Confirm & Issue Official Receipt
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <form onSubmit={handleProcessPayment} className="space-y-3.5">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-900">
                  {selectedInvoice.patientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoice Amount:</span>
                <span className="font-semibold text-slate-900">
                  ${selectedInvoice.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Previously Paid:</span>
                <span className="text-slate-700">
                  ${selectedInvoice.paidAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'card', label: 'Credit / Debit Card' },
                { value: 'cash', label: 'Cash Payment' },
                { value: 'insurance', label: 'Health Insurance Claim' },
                { value: 'upi', label: 'Instant Digital Transfer / UPI' },
                { value: 'bank_transfer', label: 'Direct Bank Transfer' },
              ]}
            />
          </form>
        )}
      </Modal>

      {/* Create New Invoice Modal */}
      <Modal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        title="Generate New Patient Invoice"
        description="Creates an itemized fee statement for patient services or consultations."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewInvoiceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateInvoice}
            >
              Generate Bill
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateInvoice} className="space-y-3.5">
          <Select
            label="Billable Patient"
            value={newPatientId}
            onChange={(e) => setNewPatientId(e.target.value)}
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName} (${p.mrn})`,
            }))}
          />

          <Input
            label="Service / Procedure Description"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            placeholder="e.g. Minor Surgical Dressing, Consultation"
            required
          />

          <Input
            label="Fee Amount ($)"
            type="number"
            value={itemAmount}
            onChange={(e) => setItemAmount(e.target.value)}
            placeholder="120"
            required
          />
        </form>
      </Modal>
    </div>
  );
};
