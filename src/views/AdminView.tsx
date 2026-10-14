import React, { useState, useRef, useEffect } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import {
  CreditCard,
  Package,
  Search,
  CheckCircle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Invoice, InventoryItem, PaymentMethod } from '@/types';

interface AdminViewProps {
  activeTab?: string;
}

export const AdminView: React.FC<AdminViewProps> = ({ activeTab = 'overview' }) => {
  const { currentUser } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'billing' | 'inventory'>(
    (activeTab === 'billing' || activeTab === 'inventory') ? activeTab : 'overview'
  );

  useEffect(() => {
    if (activeTab === 'billing' || activeTab === 'inventory' || activeTab === 'overview') {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);

  const {
    patients,
    doctors,
    appointments,
    invoices,
    inventory,
    updateAppointmentStatus,
    recordPayment,
    adjustInventoryStock,
  } = useClinic();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'alerts'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Real-time Feedback Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Modals State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockUnits, setRestockUnits] = useState<number>(25);

  // KPI Calculations
  const totalPatients = patients.length;
  const activeDoctors = doctors.filter((d) => d.status === 'active').length;
  const todayAppointments = appointments.length;
  const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const pendingRevenue = invoices.reduce(
    (acc, inv) => acc + (inv.totalAmount - inv.paidAmount),
    0
  );
  const lowStockItems = inventory.filter((i) => i.currentStock <= i.minStockLevel);

  // Handlers
  const handleCompleteAppointment = (aptId: string, patientName: string) => {
    updateAppointmentStatus(aptId, 'completed');
    showNotification(`Appointment for ${patientName} marked as completed.`);
  };

  const handleOpenPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
    setPaymentAmount(balance);
    setPaymentMethod(inv.paymentMethod || 'card');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentAmount <= 0) return;

    recordPayment(selectedInvoice.id, paymentAmount, paymentMethod);
    showNotification(
      `Payment of $${paymentAmount.toFixed(2)} recorded for Invoice ${selectedInvoice.invoiceNumber} via ${paymentMethod.replace('_', ' ').toUpperCase()}.`
    );

    setSelectedInvoice(null);
    setPaymentAmount(0);
  };

  const handleOpenRestockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockUnits(Math.max(10, item.minStockLevel * 2));
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || restockUnits <= 0) return;

    adjustInventoryStock(selectedItem.id, restockUnits);
    showNotification(
      `Restocked ${restockUnits} units for ${selectedItem.name}. New quantity: ${selectedItem.currentStock + restockUnits} ${selectedItem.unit}.`
    );

    setSelectedItem(null);
    setRestockUnits(25);
  };

  // Generic Search & Mode Filters
  const query = searchTerm.toLowerCase();

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(query) ||
      a.doctorName.toLowerCase().includes(query) ||
      a.department.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return a.status === 'in_consultation' || a.status === 'checked_in';
    if (filterMode === 'alerts') return a.status === 'scheduled';
    return true;
  });

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.invoiceNumber.toLowerCase().includes(query) ||
      i.patientName.toLowerCase().includes(query) ||
      i.status.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return i.status === 'paid';
    if (filterMode === 'alerts') return i.status === 'unpaid' || i.status === 'partially_paid';
    return true;
  });

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return item.currentStock > item.minStockLevel;
    if (filterMode === 'alerts') return item.currentStock <= item.minStockLevel;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Executive Administration & Governance Desk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lead Administrator: {currentUser.name} • Clinical Operations, Financial Audit & Inventory Control
          </p>
        </div>
      </div>

      {/* Sub-Workstation Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Executive Overview' },
          { id: 'billing', label: 'Revenue & Billing' },
          { id: 'inventory', label: 'Stock & Inventory' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              selectedTab === tab.id
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Real-time Feedback Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Patients"
          value={totalPatients}
          unit="Records"
          subtitle="Electronic Medical Records"
          colorScheme="teal"
        />
        <StatCard
          title="Active Consulting Doctors"
          value={activeDoctors}
          unit={`/ ${doctors.length} Staff`}
          subtitle="Specialists on active roster"
          colorScheme="slate"
        />
        <StatCard
          title="Consultations Today"
          value={todayAppointments}
          unit="Visits"
          subtitle={`${completedAppointments} completed`}
          colorScheme="slate"
        />
        <StatCard
          title="Gross Revenue Collected"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          unit="USD"
          subtitle={`Pending: $${pendingRevenue.toFixed(2)}`}
          colorScheme="slate"
        />
      </div>

      {/* Reusable Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search across records, names, identifiers, or departments..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg !pl-11 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
          />
        </div>

        {/* Priority / Scope Filter Dropdown */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-teal-500"
            aria-label="Filter records"
            aria-expanded={isFilterDropdownOpen}
          >
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Scope:</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {filterMode === 'all'
                ? 'All Records'
                : filterMode === 'active'
                ? 'Active Only'
                : 'Attention Required'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Filter Records By Status
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Records</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('active');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'active'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  Active / In Service
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('alerts');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'alerts'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Attention Required
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: CLINIC OVERVIEW (`overview`)                                */}
      {/* ========================================================================= */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Consultations List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader
                action={
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {filteredAppointments.length} Consultations
                  </span>
                }
              >
                <CardTitle>Today's Consultation Schedule</CardTitle>
                <CardDescription>
                  Live queue across attending physicians and consultation desks
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5 align-middle">Token & ID</th>
                        <th className="px-4 py-3.5 align-middle">Patient</th>
                        <th className="px-4 py-3.5 align-middle">Attending Doctor</th>
                        <th className="px-4 py-3.5 align-middle">Time</th>
                        <th className="px-4 py-3.5 align-middle">Status</th>
                        <th className="px-4 py-3.5 text-right align-middle">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.slice(0, 6).map((apt) => (
                          <tr
                            key={apt.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                              #{apt.tokenNumber} • {apt.appointmentNumber}
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {apt.patientName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {apt.patientPhone}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {apt.doctorName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {apt.department}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {new Date(apt.dateTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    apt.status === 'completed'
                                      ? 'bg-teal-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                                  {apt.status.replace('_', ' ')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right align-middle">
                              {apt.status !== 'completed' ? (
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  onClick={() => handleCompleteAppointment(apt.id, apt.patientName)}
                                >
                                  Complete
                                </Button>
                              ) : (
                                <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                                  Concluded
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                            No appointments found matching current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operational Alerts & Department Health */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System & Operations Health</CardTitle>
                <CardDescription>Real-time clinic alerts and capacity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {lowStockItems.length > 0 ? (
                  <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-200/70 dark:border-rose-800/60 flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Buffer Stock Threshold Alert ({lowStockItems.length} items)
                      </div>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                        {lowStockItems[0].name} ({lowStockItems[0].currentStock} {lowStockItems[0].unit} left, min threshold: {lowStockItems[0].minStockLevel}).
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenRestockModal(lowStockItems[0])}
                        className="mt-2 text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        Restock {lowStockItems[0].name} now &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/40 rounded-xl border border-teal-200/70 dark:border-teal-800/60 flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-teal-900 dark:text-teal-200">
                        Supply Buffer Stock Optimal
                      </div>
                      <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-0.5">
                        All pharmaceutical products and diagnostic kits meet clinical reserve thresholds.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Average Outpatient Triage Time
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Front-desk intake to doctor consultation desk currently averages 12 minutes.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Accounts Settlement Rate
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {invoices.length > 0
                        ? `${Math.round((invoices.filter((i) => i.status === 'paid').length / invoices.length) * 100)}% of invoices paid upon patient discharge.`
                        : 'No bills generated.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}




      /* ========================================================================= */
      /* SUB-MODULE 2: REVENUE & BILLING (`billing`)                               */
      /* ========================================================================= */
      {selectedTab === 'billing' && (
        <Card>
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {filteredInvoices.length} Invoices Listed
                </span>
              </div>
            }
          >
            <CardTitle>Clinic Financial Audit & Invoicing Ledger</CardTitle>
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
                    filteredInvoices.map((inv) => {
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
                                  inv.status === 'paid'
                                    ? 'bg-teal-500'
                                    : 'bg-slate-400'
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
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                        No invoices found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 6: STOCK & INVENTORY (`inventory`)                             */}
      {/* ========================================================================= */}
      {selectedTab === 'inventory' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredInventory.length} Tracked Stock Items
              </span>
            }
          >
            <CardTitle>Pharmaceutical & Clinical Supply Inventory</CardTitle>
            <CardDescription>
              Essential consumable buffers, reorder thresholds, unit costs, and inventory replenishment
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Item Description</th>
                    <th className="px-4 py-3.5 align-middle">SKU / Code</th>
                    <th className="px-4 py-3.5 align-middle">Category</th>
                    <th className="px-4 py-3.5 align-middle">Current Stock</th>
                    <th className="px-4 py-3.5 align-middle">Min Safe Level</th>
                    <th className="px-4 py-3.5 align-middle">Unit Price</th>
                    <th className="px-4 py-3.5 align-middle">Inventory Status</th>
                    <th className="px-4 py-3.5 text-right align-middle">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map((item) => {
                      const isLow = item.currentStock <= item.minStockLevel;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                            isLow ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Batch: {item.batchNumber}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle font-mono text-slate-700 dark:text-slate-300">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300">
                            {item.category}
                          </td>
                          <td className="px-4 py-3.5 align-middle font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="px-4 py-3.5 align-middle font-mono text-slate-600 dark:text-slate-400">
                            {item.minStockLevel} {item.unit}
                          </td>
                          <td className="px-4 py-3.5 align-middle font-mono text-slate-800 dark:text-slate-200">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isLow ? 'bg-rose-500' : 'bg-teal-500'
                                }`}
                              />
                              <span
                                className={`text-xs font-semibold ${
                                  isLow
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-teal-700 dark:text-teal-300'
                                }`}
                              >
                                {isLow ? 'Low Buffer Alert' : 'Stock Optimal'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right align-middle">
                            <Button
                              size="xs"
                              variant={isLow ? 'primary' : 'secondary'}
                              onClick={() => handleOpenRestockModal(item)}
                            >
                              Restock Supply
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                        No inventory stock items matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PAYMENT                                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Record Payment for Invoice #${selectedInvoice?.invoiceNumber}`}
        description="Settle outstanding patient balances and issue certified payment receipts."
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
              icon={<CreditCard className="w-4 h-4" />}
              onClick={handleRecordPayment}
            >
              Settle Payment
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Patient</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedInvoice.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Total Billed</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Previously Paid</span>
                <span className="font-mono text-teal-600 dark:text-teal-400">${selectedInvoice.paidAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Remaining Balance</span>
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
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              required
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

      {/* ========================================================================= */}
      {/* MODAL 2: RESTOCK INVENTORY SUPPLY                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={`Restock Supply: ${selectedItem?.name}`}
        description="Increment inventory batch units and update automated buffer thresholds."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedItem(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Package className="w-4 h-4" />}
              onClick={handleAdjustStock}
            >
              Confirm Restock
            </Button>
          </>
        }
      >
        {selectedItem && (
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Item & SKU</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedItem.name} ({selectedItem.sku})</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Category</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedItem.category}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Current Stock</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{selectedItem.currentStock} {selectedItem.unit}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Minimum Buffer</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">{selectedItem.minStockLevel} {selectedItem.unit}</span>
              </div>
            </div>

            <Input
              label={`Quantity to Add (${selectedItem.unit})`}
              type="number"
              min="1"
              value={restockUnits}
              onChange={(e) => setRestockUnits(Number(e.target.value))}
              required
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
