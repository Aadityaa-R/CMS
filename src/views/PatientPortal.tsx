import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';
import {
  getScopedPatients,
  getScopedAppointments,
  getScopedPrescriptions,
  getScopedInvoices,
} from '@/lib/selectors';
import { getStoredAttendanceData } from '@/lib/availability';
import {
  getAvailableSlots,
  CANCEL_CUTOFF_MINUTES,
  BOOKING_WINDOW_DAYS,
  MAX_ACTIVE_BOOKINGS,
} from '@/lib/scheduling';
import { formatRegimen, activeMedications } from '@/lib/prescribing';
import { getAssignedDoctorId } from '@/lib/permissions';
import { Appointment, Prescription } from '@/types';
import { formatDoctorName } from '@/lib/doctorNames';
import {
  Invoice as BillingInvoice,
  Receipt as BillingReceipt,
} from '@/types/billing';
import {
  formatCurrency,
  invoiceTotal,
  amountPaid,
  balanceDue,
  deriveStatus,
} from '@/lib/billing';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Pagination } from '@/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { RowActions, RowActionItem } from '@/components/ui/RowActions';
import { DetailList, DetailItem, DetailGrid } from '@/components/ui/DetailList';
import { formatDate, formatTime } from '@/lib/time';
import { Printer } from 'lucide-react';

interface PatientPortalProps {
  activeTab?: string;
}

type PortalTab = 'appointments' | 'records' | 'prescriptions' | 'invoices';

function formatTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMaxBookingDateString(): string {
  const d = new Date(Date.now() + BOOKING_WINDOW_DAYS * 24 * 3600 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAppointmentStatus(apt: Appointment): string {
  if (apt.needsReschedule) return 'Needs rescheduling';
  const today = formatTodayDateString();
  const aptDate = apt.dateTime.slice(0, 10);
  const isOpen = apt.status === 'scheduled' || apt.status === 'checked_in' || apt.status === 'in_consultation';
  if (isOpen && aptDate < today) {
    return 'Not concluded';
  }
  switch (apt.status) {
    case 'scheduled':
      return 'Scheduled';
    case 'checked_in':
      return 'Checked In';
    case 'in_consultation':
      return 'In Consultation';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'no_show':
      return 'Missed';
    default:
      return apt.status;
  }
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ activeTab: initialActiveTab = 'appointments' }) => {
  const { currentUser } = useAuth();
  const {
    doctors,
    patients: rawPatients,
    appointments: rawAppointments,
    prescriptions: rawPrescriptions,
    vitals: rawVitals = [],
    patientAssignments = [],
    modules = [],
    bookAppointment: clinicBookAppointment,
    cancelAppointmentAction,
    rescheduleAppointmentAction,
  } = useClinic();

  const {
    invoices: billingInvoices,
    payments: billingPayments,
    recordPortalPayment,
    getReceipt,
  } = useBilling();

  // Tab State
  const [activeTab, setActiveTab] = useState<PortalTab>(() => {
    if (initialActiveTab === 'records') return 'records';
    if (initialActiveTab === 'prescriptions') return 'prescriptions';
    if (initialActiveTab === 'invoices' || initialActiveTab === 'billing') return 'invoices';
    return 'appointments';
  });

  useEffect(() => {
    if (initialActiveTab === 'profile') {
      try {
        window.history.replaceState({}, '', '/profile');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {}
    } else if (initialActiveTab === 'records') {
      setActiveTab('records');
    } else if (initialActiveTab === 'prescriptions') {
      setActiveTab('prescriptions');
    } else if (initialActiveTab === 'invoices' || initialActiveTab === 'billing') {
      setActiveTab('invoices');
    } else if (
      initialActiveTab === 'appointments' ||
      initialActiveTab === 'overview' ||
      initialActiveTab === 'portal'
    ) {
      setActiveTab('appointments');
    }
  }, [initialActiveTab]);

  // Notifications
  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  // Scoped Data
  const scopedPatients = useMemo(() => {
    return getScopedPatients(currentUser, rawPatients, patientAssignments, null, modules);
  }, [currentUser, rawPatients, patientAssignments, modules]);

  const patient = scopedPatients.find(
    (p) => p.id === currentUser.patientId || p.mrn === currentUser.badgeNumber
  ) || scopedPatients[0];

  const scopedAppointments = useMemo(() => {
    return getScopedAppointments(currentUser, rawAppointments, patientAssignments, null, modules);
  }, [currentUser, rawAppointments, patientAssignments, modules]);

  const scopedPrescriptions = useMemo(() => {
    return getScopedPrescriptions(currentUser, rawPrescriptions, patientAssignments, null, modules);
  }, [currentUser, rawPrescriptions, patientAssignments, modules]);

  const scopedInvoices = useMemo(() => {
    return getScopedInvoices(currentUser, billingInvoices, modules);
  }, [currentUser, billingInvoices, modules]);

  // Attendance data for scheduling
  const { shifts, leaves } = useMemo(() => {
    return getStoredAttendanceData();
  }, [scopedAppointments]);

  // Assigned Doctor
  const assignedDoctorId = useMemo(() => {
    if (!patient) return null;
    return getAssignedDoctorId(patient.id, patientAssignments);
  }, [patient, patientAssignments]);

  // 1. APPOINTMENTS TAB STATE
  const upcomingAppointments = useMemo(() => {
    const today = formatTodayDateString();
    return scopedAppointments
      .filter((a) => {
        const aptDate = a.dateTime.slice(0, 10);
        const isOpen = a.status === 'scheduled' || a.status === 'checked_in' || a.status === 'in_consultation';
        return isOpen && aptDate >= today;
      })
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [scopedAppointments]);

  const pastAppointments = useMemo(() => {
    const today = formatTodayDateString();
    return scopedAppointments
      .filter((a) => {
        const aptDate = a.dateTime.slice(0, 10);
        const isClosed = a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show';
        const isPastOpen = (a.status === 'scheduled' || a.status === 'checked_in' || a.status === 'in_consultation') && aptDate < today;
        return isClosed || isPastOpen;
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [scopedAppointments]);

  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  const paginatedUpcoming = useMemo(() => {
    const start = (upcomingPage - 1) * 10;
    return upcomingAppointments.slice(start, start + 10);
  }, [upcomingAppointments, upcomingPage]);

  const paginatedPast = useMemo(() => {
    const start = (pastPage - 1) * 10;
    return pastAppointments.slice(start, start + 10);
  }, [pastAppointments, pastPage]);

  // BOOK APPOINTMENT MODAL & BUTTON STATE
  const bookButtonRef = useRef<HTMLButtonElement>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState(formatTodayDateString());
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  const activeBookingsCount = useMemo(() => {
    if (!patient) return 0;
    return scopedAppointments.filter((a) => {
      if (a.patientId !== patient.id) return false;
      return a.status === 'scheduled' || a.status === 'confirmed';
    }).length;
  }, [patient, scopedAppointments]);

  const isAtBookingLimit = activeBookingsCount >= MAX_ACTIVE_BOOKINGS;

  const handleCloseBookModal = () => {
    setIsBookModalOpen(false);
    setTimeout(() => {
      bookButtonRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (isBookModalOpen) {
      const defaultDocId = assignedDoctorId || (doctors.length > 0 ? doctors[0].id : '');
      setBookingDoctorId(defaultDocId);
      setBookingDate(formatTodayDateString());
      setBookingSlot('');
      setBookingReason('');
      setBookingError('');
    }
  }, [isBookModalOpen, assignedDoctorId, doctors]);

  const availableBookingSlots = useMemo(() => {
    if (!bookingDoctorId || !bookingDate) return [];
    return getAvailableSlots(bookingDoctorId, bookingDate, scopedAppointments, shifts, leaves, new Date());
  }, [bookingDoctorId, bookingDate, scopedAppointments, shifts, leaves]);

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    if (!bookingDoctorId) {
      setBookingError('Please select a consulting doctor.');
      return;
    }
    if (!bookingDate) {
      setBookingError('Please select an appointment date.');
      return;
    }
    if (!bookingSlot) {
      setBookingError('Please select a consultation time slot.');
      return;
    }
    const cleanReason = bookingReason.trim();
    if (cleanReason.length < 3 || cleanReason.length > 300) {
      setBookingError('Reason for visit must be between 3 and 300 characters.');
      return;
    }

    setIsSubmittingBooking(true);
    setBookingError('');

    const res = clinicBookAppointment(
      {
        patientId: patient.id,
        doctorId: bookingDoctorId,
        dateTime: `${bookingDate}T${bookingSlot}:00`,
        reasonForVisit: cleanReason,
        source: 'web',
      },
      currentUser
    );

    setIsSubmittingBooking(false);

    if (!res.success) {
      setBookingError(res.error || 'Failed to book appointment.');
      return;
    }

    setIsBookModalOpen(false);
    showNotice(`Appointment booked for ${bookingDate} at ${bookingSlot}.`);
    setTimeout(() => {
      bookButtonRef.current?.focus();
    }, 0);
  };

  // RESCHEDULE APPOINTMENT MODAL STATE
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(formatTodayDateString());
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const handleOpenReschedule = (apt: Appointment) => {
    setRescheduleTarget(apt);
    setRescheduleDate(formatTodayDateString());
    setRescheduleSlot('');
    setRescheduleError('');
  };

  const availableRescheduleSlots = useMemo(() => {
    if (!rescheduleTarget || !rescheduleDate) return [];
    const otherAppointments = scopedAppointments.filter((a) => a.id !== rescheduleTarget.id);
    return getAvailableSlots(rescheduleTarget.doctorId, rescheduleDate, otherAppointments, shifts, leaves, new Date());
  }, [rescheduleTarget, rescheduleDate, scopedAppointments, shifts, leaves]);

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    if (!rescheduleDate) {
      setRescheduleError('Please select a new appointment date.');
      return;
    }
    if (!rescheduleSlot) {
      setRescheduleError('Please select a new consultation time slot.');
      return;
    }

    setIsSubmittingReschedule(true);
    setRescheduleError('');

    const res = rescheduleAppointmentAction(
      rescheduleTarget.id,
      rescheduleDate,
      rescheduleSlot,
      currentUser
    );

    setIsSubmittingReschedule(false);

    if (!res.success) {
      setRescheduleError(res.error || 'Failed to reschedule appointment.');
      return;
    }

    setRescheduleTarget(null);
    showNotice(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleSlot}.`);
  };

  // CANCEL APPOINTMENT MODAL STATE
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const handleOpenCancel = (apt: Appointment) => {
    setCancelTarget(apt);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;

    setIsSubmittingCancel(true);
    setCancelError('');

    const res = cancelAppointmentAction(
      cancelTarget.id,
      currentUser,
      cancelReason.trim() || 'Cancelled by patient'
    );

    setIsSubmittingCancel(false);

    if (!res.success) {
      setCancelError(res.error || 'Failed to cancel appointment.');
      return;
    }

    setCancelTarget(null);
    showNotice('Appointment cancelled.');
  };

  // Helper checking 2-hour cutoff
  const canModifyAppointment = (apt: Appointment): boolean => {
    if (apt.status !== 'scheduled') return false;
    const aptTime = new Date(apt.dateTime).getTime();
    const diffMinutes = (aptTime - Date.now()) / (60 * 1000);
    return diffMinutes >= CANCEL_CUTOFF_MINUTES;
  };

  // 2. RECORDS TAB STATE & DATA
  const patientVitalsRecord = useMemo((): {
    recordedAt: string;
    systolicBp: number;
    diastolicBp: number;
    heartRateBpm: number;
    temperatureCelsius: number;
    oxygenSaturationPct: number;
    bmi: number;
  } | null => {
    if (!patient) return null;
    const found = rawVitals
      .filter((v) => v.patientId === patient.id)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    if (found.length > 0) {
      return {
        recordedAt: found[0].recordedAt,
        systolicBp: found[0].systolicBp,
        diastolicBp: found[0].diastolicBp,
        heartRateBpm: found[0].heartRateBpm,
        temperatureCelsius: found[0].temperatureCelsius,
        oxygenSaturationPct: found[0].oxygenSaturationPct,
        bmi: found[0].bmi || 23.0,
      };
    }

    if (patient.previousVitals) {
      return {
        recordedAt: patient.previousVitals.recordedAt,
        systolicBp: patient.previousVitals.systolicBp || 120,
        diastolicBp: patient.previousVitals.diastolicBp || 80,
        heartRateBpm: patient.previousVitals.heartRateBpm || 72,
        temperatureCelsius: patient.previousVitals.temperatureCelsius || 37.0,
        oxygenSaturationPct: patient.previousVitals.oxygenSaturationPct || 98,
        bmi: 23.0,
      };
    }
    return null;
  }, [patient, rawVitals]);

  const visitHistory = useMemo(() => {
    return scopedAppointments
      .filter((a) => a.status === 'completed' || a.status === 'in_consultation')
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [scopedAppointments]);

  const [visitHistoryPage, setVisitHistoryPage] = useState(1);
  const paginatedVisitHistory = useMemo(() => {
    const start = (visitHistoryPage - 1) * 10;
    return visitHistory.slice(start, start + 10);
  }, [visitHistory, visitHistoryPage]);

  // 3. PRESCRIPTIONS TAB STATE & MODAL
  const [prescriptionsPage, setPrescriptionsPage] = useState(1);
  const paginatedPrescriptions = useMemo(() => {
    const start = (prescriptionsPage - 1) * 10;
    return scopedPrescriptions.slice(start, start + 10);
  }, [scopedPrescriptions, prescriptionsPage]);

  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);

  // 4. INVOICES TAB STATE & MODALS
  const [invoicesPage, setInvoicesPage] = useState(1);
  const paginatedInvoices = useMemo(() => {
    const start = (invoicesPage - 1) * 10;
    return scopedInvoices.slice(start, start + 10);
  }, [scopedInvoices, invoicesPage]);

  const totalBalanceDue = useMemo(() => {
    return scopedInvoices.reduce((acc, inv) => acc + balanceDue(inv, billingPayments), 0);
  }, [scopedInvoices, billingPayments]);

  const oldestUnpaidInvoice = useMemo(() => {
    const unpaid = scopedInvoices
      .filter((inv) => balanceDue(inv, billingPayments) > 0)
      .sort((a, b) => {
        const timeA = new Date(a.issuedAt || (a as any).date || 0).getTime();
        const timeB = new Date(b.issuedAt || (b as any).date || 0).getTime();
        return timeA - timeB;
      });
    return unpaid.length > 0 ? unpaid[0] : null;
  }, [scopedInvoices, billingPayments]);

  const isUnlinked = Boolean(currentUser?.claimPending || !patient);
  const isBookingDisabled = isUnlinked || isAtBookingLimit;
  const bookingHelperText = isUnlinked
    ? 'Your account is waiting to be linked to your clinic record.'
    : isAtBookingLimit
    ? `You already have ${activeBookingsCount} upcoming appointments.`
    : null;

  const currentYear = new Date().getFullYear();
  const visitsThisYear = useMemo(() => {
    return scopedAppointments.filter((a) => {
      const yr = new Date(a.dateTime).getFullYear();
      return yr === currentYear && a.status === 'completed';
    }).length;
  }, [scopedAppointments, currentYear]);

  const activePrescriptionsCount = useMemo(() => {
    return scopedPrescriptions.filter((p) => p.status !== 'cancelled' && p.status !== 'dispensed').length;
  }, [scopedPrescriptions]);

  const [payTargetInvoice, setPayTargetInvoice] = useState<BillingInvoice | null>(null);
  const [payMethod, setPayMethod] = useState<'card' | 'upi'>('card');
  const [payCardRef, setPayCardRef] = useState('');
  const [payUpiId, setPayUpiId] = useState('');
  const [payError, setPayError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [patientReceipt, setPatientReceipt] = useState<BillingReceipt | null>(null);
  const [patientViewingInvoice, setPatientViewingInvoice] = useState<BillingInvoice | null>(null);

  const handleOpenPayModal = (inv: BillingInvoice) => {
    setPayTargetInvoice(inv);
    setPayMethod('card');
    setPayCardRef('');
    setPayUpiId('');
    setPayError('');
  };

  const handleExecutePortalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetInvoice) return;
    setIsPaying(true);
    setPayError('');

    const due = balanceDue(payTargetInvoice, billingPayments);
    const reference =
      payMethod === 'card'
        ? payCardRef.trim() || `CARD-SIM-${Date.now().toString().slice(-4)}`
        : payUpiId.trim() || `UPI-SIM-${Date.now().toString().slice(-6)}`;
    const idempotencyKey = `PORTAL-${payTargetInvoice.id}-${Date.now()}`;

    const res = await recordPortalPayment({
      invoiceId: payTargetInvoice.id,
      amount: due,
      method: payMethod,
      reference,
      idempotencyKey,
    });

    setIsPaying(false);

    if (!res.success || !res.data) {
      setPayError(res.error || 'Failed to process portal payment.');
      return;
    }

    const newPayment = res.data;
    showNotice(`Payment of ${formatCurrency(due)} recorded. Receipt #${newPayment.receiptNumber} generated.`);
    setPayTargetInvoice(null);
    const rc = getReceipt(newPayment.id);
    if (rc) setPatientReceipt(rc);
  };

  // Check account waiting to be linked (M5 / M10.2)
  if (isUnlinked) {
    return (
      <div className="space-y-6 pb-12">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h1 id="portal-heading" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            My Health Portal
          </h1>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <Button
              ref={bookButtonRef}
              variant="primary"
              disabled={true}
              className="min-h-[3.5rem] px-8 text-lg font-semibold w-full sm:w-auto text-center justify-center"
            >
              Book Appointment
            </Button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {bookingHelperText}
          </span>
        </div>

        <div className="p-8 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Your account is waiting to be linked to your clinic record.
          </p>
        </div>
      </div>
    );
  }

  const getTabTitle = (): string => {
    switch (activeTab) {
      case 'appointments':
        return 'My Health Portal';
      case 'records':
        return 'My Records';
      case 'prescriptions':
        return 'My Prescriptions';
      case 'invoices':
        return 'My Invoices';
      default:
        return 'My Health Portal';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {notice && (
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 id="portal-heading" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
          {getTabTitle()}
        </h1>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Prominent Action Row: Directly under page title, above summary figures */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <Button
                ref={bookButtonRef}
                variant="primary"
                disabled={isBookingDisabled}
                onClick={() => setIsBookModalOpen(true)}
                className="min-h-[3.5rem] px-8 text-lg font-semibold w-full sm:w-auto text-center justify-center"
              >
                Book Appointment
              </Button>
              {totalBalanceDue > 0 && oldestUnpaidInvoice && (
                <Button
                  variant="outline"
                  onClick={() => handleOpenPayModal(oldestUnpaidInvoice)}
                  className="min-h-[3.5rem] px-8 text-lg font-semibold w-full sm:w-auto text-center justify-center"
                >
                  Pay Balance
                </Button>
              )}
            </div>
            {bookingHelperText && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {bookingHelperText}
              </span>
            )}
          </div>
          {/* Patient Summary Metric Cards: Separate individual cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  {upcomingAppointments.length > 0
                    ? `${upcomingAppointments[0].dateTime.slice(0, 10)} ${upcomingAppointments[0].dateTime.slice(11, 16)}`
                    : 'None scheduled'}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">
                  Next Appointment
                </span>
              </div>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {formatCurrency(totalBalanceDue)}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">
                  Balance Due
                </span>
              </div>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {activePrescriptionsCount}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">
                  Active Prescriptions
                </span>
              </div>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {visitsThisYear}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">
                  Visits this year
                </span>
              </div>
            </Card>
          </div>

          {/* Upcoming Appointments Table */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-0">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Date</TableHead>
                    <TableHead kind="short" priority={5}>Time</TableHead>
                    <TableHead kind="short" priority={4}>Doctor</TableHead>
                    <TableHead kind="text" priority={6}>Reason</TableHead>
                    <TableHead kind="short" priority={2}>Status</TableHead>
                    <TableHead kind="short" priority={3} isActions className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUpcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                        No upcoming appointments scheduled.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUpcoming.map((apt) => {
                      const isScheduled = apt.status === 'scheduled';
                      const canModify = isScheduled && canModifyAppointment(apt);
                      const isPastCutoffScheduled = isScheduled && !canModifyAppointment(apt);
                      const appointmentActions: RowActionItem[] = canModify
                        ? [
                            {
                              label: 'Reschedule',
                              onClick: () => handleOpenReschedule(apt),
                              ariaLabel: `Reschedule appointment on ${formatDate(apt.dateTime.slice(0, 10))} at ${formatTime(apt.dateTime.slice(11, 16))}`,
                            },
                            {
                              label: 'Cancel',
                              onClick: () => handleOpenCancel(apt),
                              ariaLabel: `Cancel appointment on ${formatDate(apt.dateTime.slice(0, 10))} at ${formatTime(apt.dateTime.slice(11, 16))}`,
                            },
                          ]
                        : [];
                      return (
                        <TableRow key={apt.id}>
                          <TableCell kind="short" priority={1} label="Date" className="text-slate-600 dark:text-slate-300">
                            {formatDate(apt.dateTime.slice(0, 10))}
                          </TableCell>
                          <TableCell kind="short" priority={5} label="Time" className="text-slate-600 dark:text-slate-300">
                            {formatTime(apt.dateTime.slice(11, 16))}
                          </TableCell>
                          <TableCell kind="short" priority={4} label="Doctor" className="font-medium text-slate-900 dark:text-slate-100">
                            {formatDoctorName(apt.doctorName)}
                          </TableCell>
                          <TableCell kind="text" priority={6} label="Reason" className="text-slate-600 dark:text-slate-300">
                            {apt.reasonForVisit}
                          </TableCell>
                          <TableCell kind="short" priority={2} label="Status" id={`portal-apt-status-${apt.id}`} className="text-slate-600 dark:text-slate-300">
                            <div>
                              {apt.needsReschedule && (
                                <span className="text-xs text-amber-700 dark:text-amber-400 block mb-1">
                                  Doctor on leave - reschedule requested
                                </span>
                              )}
                              <span>{formatAppointmentStatus(apt)}</span>
                              {isPastCutoffScheduled && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                  Changes closed. Call the clinic.
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell kind="short" priority={3} isActions label="Actions" className="text-right whitespace-nowrap">
                            <RowActions
                              actions={appointmentActions}
                              subject={`appointment with ${apt.doctorName}`}
                              statusId={`portal-apt-status-${apt.id}`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {upcomingAppointments.length > 10 && (
              <Pagination
                currentPage={upcomingPage}
                totalItems={upcomingAppointments.length}
                pageSize={10}
                onPageChange={setUpcomingPage}
              />
            )}
          </Card>

          {/* Past Appointments Table */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-fit max-w-full min-w-[40rem]">
            <CardHeader>
              <CardTitle>Past Appointments</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-0">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Date</TableHead>
                    <TableHead kind="short" priority={4}>Time</TableHead>
                    <TableHead kind="short" priority={3}>Doctor</TableHead>
                    <TableHead kind="short" priority={2}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPast.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                        No past appointment history.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPast.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell kind="short" priority={1} label="Date" className="text-slate-600 dark:text-slate-300">
                          {formatDate(apt.dateTime.slice(0, 10))}
                        </TableCell>
                        <TableCell kind="short" priority={4} label="Time" className="text-slate-600 dark:text-slate-300">
                          {formatTime(apt.dateTime.slice(11, 16))}
                        </TableCell>
                        <TableCell kind="short" priority={3} label="Doctor" className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDoctorName(apt.doctorName)}
                        </TableCell>
                        <TableCell kind="short" priority={2} label="Status" className="text-slate-600 dark:text-slate-300">
                          {formatAppointmentStatus(apt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {pastAppointments.length > 10 && (
              <Pagination
                currentPage={pastPage}
                totalItems={pastAppointments.length}
                pageSize={10}
                onPageChange={setPastPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <DetailGrid balanced>
            {/* Card: Personal Record */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-between">
                <DetailList className="flex-1">
                  <DetailItem label="Name" value={`${patient.firstName} ${patient.lastName}`} />
                  <DetailItem label="MRN" value={patient.mrn} />
                  <DetailItem label="Date of Birth" value={`${formatDate(patient.dob)} (Age ${patient.age})`} />
                  <DetailItem label="Gender" value={<span className="capitalize">{patient.gender}</span>} />
                  <DetailItem label="Blood Group" value={patient.bloodGroup || 'Not recorded'} />
                  <DetailItem label="Phone" value={patient.phone} />
                  <DetailItem label="Email" value={patient.email} />
                  <DetailItem label="Address" value={patient.address} />
                  <DetailItem
                    label="Emergency Contact"
                    value={
                      patient.emergencyContact?.name ? (
                        <div>
                          <div>{patient.emergencyContact.name} ({patient.emergencyContact.relationship || 'Contact'})</div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{patient.emergencyContact.phone}</div>
                        </div>
                      ) : (
                        'Not recorded'
                      )
                    }
                  />
                </DetailList>
              </CardContent>
            </Card>

            {/* Card: Medical Profile */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full">
              <CardHeader>
                <CardTitle>Medical Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-between">
                <DetailList className="flex-1">
                  <DetailItem
                    label="Allergies"
                    value={patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None reported'}
                  />
                  <DetailItem
                    label="Chronic Conditions"
                    value={patient.chronicConditions && patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'None reported'}
                  />
                  <DetailItem
                    label="Current Medications"
                    value={(() => {
                      const activeMeds = activeMedications(patient.id, scopedPrescriptions, new Date());
                      if (activeMeds.length > 0) return activeMeds.join(', ');
                      return 'None recorded';
                    })()}
                  />
                </DetailList>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contact your doctor to update clinical records.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card: Latest Vitals */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full">
              <CardHeader>
                <CardTitle>Latest Vitals</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-between">
                {patientVitalsRecord ? (
                  <DetailList columns={2} className="flex-1">
                    <DetailItem
                      label="Blood Pressure"
                      value={`${patientVitalsRecord.systolicBp}/${patientVitalsRecord.diastolicBp} mmHg`}
                    />
                    <DetailItem
                      label="Heart Rate"
                      value={`${patientVitalsRecord.heartRateBpm} bpm`}
                    />
                    <DetailItem
                      label="Temperature"
                      value={`${patientVitalsRecord.temperatureCelsius}°C`}
                    />
                    <DetailItem
                      label="SpO2"
                      value={`${patientVitalsRecord.oxygenSaturationPct}%`}
                    />
                    <DetailItem
                      label="BMI"
                      value={patientVitalsRecord.bmi}
                    />
                    <DetailItem
                      label="Recorded"
                      value={`${formatDate(patientVitalsRecord.recordedAt.slice(0, 10))} ${formatTime(patientVitalsRecord.recordedAt.slice(11, 16))}`}
                    />
                  </DetailList>
                ) : (
                  <div className="py-6 px-4 text-center text-slate-500 text-xs">
                    No vitals recorded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </DetailGrid>

          {/* Card: Visit History - NO notes or comments */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-fit max-w-full min-w-[40rem]">
            <CardHeader>
              <CardTitle>Visit History</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-0">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Date</TableHead>
                    <TableHead kind="short" priority={2}>Doctor</TableHead>
                    <TableHead kind="short" priority={3}>Department</TableHead>
                    <TableHead kind="text" priority={4}>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVisitHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                        No previous consultation visits recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVisitHistory.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell kind="short" priority={1} label="Date" className="text-slate-600 dark:text-slate-300">
                          {formatDate(v.dateTime.slice(0, 10))}
                        </TableCell>
                        <TableCell kind="short" priority={2} label="Doctor" className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDoctorName(v.doctorName)}
                        </TableCell>
                        <TableCell kind="short" priority={3} label="Department" className="text-slate-600 dark:text-slate-300">
                          {v.department}
                        </TableCell>
                        <TableCell kind="text" priority={4} label="Reason" className="text-slate-600 dark:text-slate-300">
                          {v.reasonForVisit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {visitHistory.length > 10 && (
              <Pagination
                currentPage={visitHistoryPage}
                totalItems={visitHistory.length}
                pageSize={10}
                onPageChange={setVisitHistoryPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Prescriptions</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-0">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Date</TableHead>
                    <TableHead kind="short" priority={4}>Doctor</TableHead>
                    <TableHead kind="text" priority={5}>Diagnosis</TableHead>
                    <TableHead kind="text" priority={6}>Regimen</TableHead>
                    <TableHead kind="short" priority={2}>Status</TableHead>
                    <TableHead kind="short" priority={3} isActions className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPrescriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                        No prescriptions on record.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPrescriptions.map((rx) => {
                      const summary = rx.items.map((it) => formatRegimen(it)).join('; ');
                      const statusText = rx.status === 'cancelled' ? 'Cancelled by the clinic' : 'Active';

                      return (
                        <TableRow key={rx.id}>
                          <TableCell kind="short" priority={1} label="Date" className="text-slate-600 dark:text-slate-300">
                            {formatDate(rx.date)}
                          </TableCell>
                          <TableCell kind="short" priority={4} label="Doctor" className="font-medium text-slate-900 dark:text-slate-100">
                            {formatDoctorName(rx.doctorName)}
                          </TableCell>
                          <TableCell kind="text" priority={5} label="Diagnosis" className="text-slate-600 dark:text-slate-300">
                            {rx.diagnosis}
                          </TableCell>
                          <TableCell kind="text" priority={6} label="Regimen" className="text-slate-600 dark:text-slate-300">
                            {summary}
                          </TableCell>
                          <TableCell kind="short" priority={2} label="Status" className="text-slate-600 dark:text-slate-300">
                            {statusText}
                          </TableCell>
                          <TableCell kind="short" priority={3} isActions label="Actions" className="text-right whitespace-nowrap">
                            <RowActions
                              actions={[
                                {
                                  label: 'View',
                                  onClick: () => setViewingPrescription(rx),
                                  ariaLabel: `View prescription ${rx.prescriptionNumber}`,
                                },
                              ]}
                              subject={rx.prescriptionNumber}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {scopedPrescriptions.length > 10 && (
              <Pagination
                currentPage={prescriptionsPage}
                totalItems={scopedPrescriptions.length}
                pageSize={10}
                onPageChange={setPrescriptionsPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: INVOICES (REUSE M6) */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* Total Balance Due Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Outstanding Balance:</span>{' '}
              <span className={`font-bold ${totalBalanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {formatCurrency(totalBalanceDue)}
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              Payments can also be settled at the front desk cashier.
            </span>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-0">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead kind="short" priority={1}>Invoice #</TableHead>
                    <TableHead kind="short" priority={8}>Date</TableHead>
                    <TableHead kind="short" priority={7}>Doctor</TableHead>
                    <TableHead kind="short" priority={5}>Total</TableHead>
                    <TableHead kind="short" priority={6}>Paid</TableHead>
                    <TableHead kind="short" priority={2}>Balance</TableHead>
                    <TableHead kind="short" priority={4}>Status</TableHead>
                    <TableHead kind="short" priority={3} isActions className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                        No invoices on record.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInvoices.map((inv) => {
                      const total = invoiceTotal(inv);
                      const paid = amountPaid(billingPayments, inv.id);
                      const balance = balanceDue(inv, billingPayments);
                      const currentStatus = deriveStatus(inv, billingPayments);

                      const statusLabel =
                        currentStatus === 'paid'
                          ? 'Paid'
                          : currentStatus === 'partially_paid'
                          ? 'Partially Paid'
                          : currentStatus === 'void'
                          ? 'Void'
                          : 'Unpaid';

                      return (
                        <TableRow key={inv.id}>
                          <TableCell kind="short" priority={1} label="Invoice #" className="font-medium text-slate-900 dark:text-slate-100">
                            {inv.number || (inv as any).invoiceNumber || 'Unknown'}
                          </TableCell>
                          <TableCell kind="short" priority={8} label="Date" className="text-slate-600 dark:text-slate-300">
                            {formatDate(inv.issuedAt || (inv as any).date)}
                          </TableCell>
                          <TableCell kind="short" priority={7} label="Doctor" className="text-slate-600 dark:text-slate-300">
                            {inv.doctorName || 'Consulting Physician'}
                          </TableCell>
                          <TableCell kind="short" priority={5} label="Total" className="text-slate-900 dark:text-slate-100">
                            {formatCurrency(total)}
                          </TableCell>
                          <TableCell kind="short" priority={6} label="Paid" className="text-teal-600 dark:text-teal-400">
                            {formatCurrency(paid)}
                          </TableCell>
                          <TableCell kind="short" priority={2} label="Balance" className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell kind="short" priority={4} label="Status" className="text-slate-600 dark:text-slate-300">
                            {statusLabel}
                          </TableCell>
                          <TableCell kind="short" priority={3} isActions label="Actions" className="text-right whitespace-nowrap">
                            <RowActions
                              actions={[
                                {
                                  label: 'Details',
                                  onClick: () => setPatientViewingInvoice(inv),
                                  ariaLabel: `View details for invoice ${inv.number}`,
                                },
                                ...(balance > 0 && currentStatus !== 'void'
                                  ? [
                                      {
                                        label: 'Pay Now',
                                        onClick: () => handleOpenPayModal(inv),
                                        ariaLabel: `Pay balance for invoice ${inv.number}`,
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
                  )}
                </TableBody>
              </Table>
            </div>
            {scopedInvoices.length > 10 && (
              <Pagination
                currentPage={invoicesPage}
                totalItems={scopedInvoices.length}
                pageSize={10}
                onPageChange={setInvoicesPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* MODAL: BOOK APPOINTMENT */}
      {isBookModalOpen && (
        <Modal
          isOpen={isBookModalOpen}
          onClose={handleCloseBookModal}
          title="Book Consultation"
          fullScreenOnMobile={true}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseBookModal}
                disabled={isSubmittingBooking}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBookSubmit}
                disabled={isSubmittingBooking || !bookingSlot || bookingReason.trim().length < 3}
              >
                {isSubmittingBooking ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
            {bookingError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg">
                {bookingError}
              </div>
            )}

            <div>
              <Select
                label="Consulting Doctor"
                value={bookingDoctorId}
                onChange={(e) => {
                  setBookingDoctorId(e.target.value);
                  setBookingSlot('');
                }}
                disabled={Boolean(assignedDoctorId)}
                options={doctors.map((d) => ({
                  value: d.id,
                  label: `Dr. ${d.name} (${d.department})`,
                }))}
              />
              {assignedDoctorId && (
                <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400 block mt-1">
                  Bookings are scheduled with your assigned primary physician.
                </span>
              )}
            </div>

            <DatePicker
              label="Consultation Date"
              value={bookingDate}
              onChange={(val) => {
                setBookingDate(val);
                setBookingSlot('');
              }}
              minDate={formatTodayDateString()}
              maxDate={formatMaxBookingDateString()}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Available Time Slots (20 min)
              </label>
              {availableBookingSlots.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No available slots on this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                  {availableBookingSlots.map((slot) => {
                    const isSelected = bookingSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setBookingSlot(slot)}
                        className={`min-h-[44px] min-w-[70px] px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700 font-semibold'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Reason for Visit
                </label>
                <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                  {bookingReason.length} / 300
                </span>
              </div>
              <textarea
                value={bookingReason}
                onChange={(e) => setBookingReason(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="Briefly state your symptoms or reason for visit (minimum 3 characters)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
              This booking is for routine consultations only. For medical emergencies call your local emergency service immediately.
            </p>
          </form>
        </Modal>
      )}

      {/* MODAL: RESCHEDULE APPOINTMENT */}
      {rescheduleTarget && (
        <Modal
          isOpen={Boolean(rescheduleTarget)}
          onClose={() => setRescheduleTarget(null)}
          title="Reschedule Appointment"
          fullScreenOnMobile={true}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleTarget(null)}
                disabled={isSubmittingReschedule}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRescheduleSubmit}
                disabled={isSubmittingReschedule || !rescheduleSlot}
              >
                {isSubmittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
            {rescheduleError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg">
                {rescheduleError}
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Doctor:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDoctorName(rescheduleTarget.doctorName)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Time:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {rescheduleTarget.dateTime.replace('T', ' ')}
                </span>
              </div>
            </div>

            <DatePicker
              label="Select New Date"
              value={rescheduleDate}
              onChange={(val) => {
                setRescheduleDate(val);
                setRescheduleSlot('');
              }}
              minDate={formatTodayDateString()}
              maxDate={formatMaxBookingDateString()}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Select New Time Slot
              </label>
              {availableRescheduleSlots.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No available slots on this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                  {availableRescheduleSlots.map((slot) => {
                    const isSelected = rescheduleSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setRescheduleSlot(slot)}
                        className={`min-h-[44px] min-w-[70px] px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700 font-semibold'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
              Rescheduling cancels the previous slot and creates your new confirmed appointment in one step.
            </p>
          </form>
        </Modal>
      )}

      {/* MODAL: CANCEL APPOINTMENT */}
      {cancelTarget && (
        <Modal
          isOpen={Boolean(cancelTarget)}
          onClose={() => setCancelTarget(null)}
          title="Cancel Appointment"
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelTarget(null)}
                disabled={isSubmittingCancel}
              >
                Keep Appointment
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCancelSubmit}
                disabled={isSubmittingCancel}
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
            {cancelError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg">
                {cancelError}
              </div>
            )}

            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to cancel your consultation with {formatDoctorName(cancelTarget.doctorName)} on{' '}
              {cancelTarget.dateTime.replace('T', ' ')}?
            </p>

            <Input
              label="Cancellation Reason (Optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict"
            />
          </form>
        </Modal>
      )}

      {/* MODAL: VIEW PRESCRIPTION DETAILS */}
      {viewingPrescription && (
        <Modal
          isOpen={Boolean(viewingPrescription)}
          onClose={() => setViewingPrescription(null)}
          title="Prescription Details"
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print Prescription
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setViewingPrescription(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 text-center">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Beacon Clinic Outpatient Care
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[0.6875rem]">
                Electronic Medical Prescription
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {viewingPrescription.prescriptionNumber}
              </div>
            </div>

            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {viewingPrescription.date}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Doctor:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDoctorName(viewingPrescription.doctorName)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {viewingPrescription.patientName} ({patient.mrn})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Diagnosis:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {viewingPrescription.diagnosis}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {viewingPrescription.status === 'cancelled' ? 'Cancelled by the clinic' : 'Active'}
                </span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[0.6875rem]">
                Prescribed Regimen
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2.5">
                {viewingPrescription.items.map((it) => (
                  <div key={it.id} className="text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {formatRegimen(it)}
                    </div>
                    {it.instructions && (
                      <div className="text-slate-500 dark:text-slate-400 text-[0.6875rem] mt-0.5">
                        Instructions: {it.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Signed: {formatDoctorName(viewingPrescription.doctorName)}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: SIMULATED PAY NOW (REUSE M6) */}
      {payTargetInvoice && (
        <Modal
          isOpen={Boolean(payTargetInvoice)}
          onClose={() => setPayTargetInvoice(null)}
          title={`Pay Invoice: ${payTargetInvoice.number}`}
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayTargetInvoice(null)}
                disabled={isPaying}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecutePortalPayment}
                disabled={isPaying}
              >
                {isPaying ? 'Processing...' : `Pay ${formatCurrency(balanceDue(payTargetInvoice, billingPayments))}`}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleExecutePortalPayment} className="space-y-3.5 text-xs">
            {payError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg">
                {payError}
              </div>
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
              <div className="font-semibold mb-1">Simulated Payment Environment</div>
              <p>
                No real card charges or gateway transactions will occur. You can also settle invoices at the front desk cashier.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Invoice:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{payTargetInvoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount Due:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(balanceDue(payTargetInvoice, billingPayments))}
                </span>
              </div>
            </div>

            <Select
              label="Payment Method"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as 'card' | 'upi')}
              options={[
                { value: 'card', label: 'Credit / Debit Card (Simulated)' },
                { value: 'upi', label: 'UPI / QR (Simulated)' },
              ]}
            />

            {payMethod === 'card' ? (
              <Input
                label="Simulated Card Number"
                value={payCardRef}
                onChange={(e) => setPayCardRef(e.target.value)}
                placeholder="4000 1234 5678 9010"
              />
            ) : (
              <Input
                label="Simulated UPI ID"
                value={payUpiId}
                onChange={(e) => setPayUpiId(e.target.value)}
                placeholder="username@bank"
              />
            )}
          </form>
        </Modal>
      )}

      {/* MODAL: VIEW INVOICE DETAILS */}
      {patientViewingInvoice && (
        <Modal
          isOpen={Boolean(patientViewingInvoice)}
          onClose={() => setPatientViewingInvoice(null)}
          title={`Invoice ${patientViewingInvoice.number}`}
          maxWidth="md"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPatientViewingInvoice(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[0.6875rem]">
                Billed Items
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 w-28 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {patientViewingInvoice.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 text-slate-900 dark:text-slate-100">{it.description}</td>
                        <td className="p-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          {it.kind === 'discount' ? `-${formatCurrency(it.amount)}` : formatCurrency(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[0.6875rem]">
                Receipts & Settlement History
              </div>
              {billingPayments.filter((p) => p.invoiceId === patientViewingInvoice.id).length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Receipt #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Method</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {billingPayments
                        .filter((p) => p.invoiceId === patientViewingInvoice.id)
                        .map((p) => (
                          <tr key={p.id}>
                            <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{p.receiptNumber || 'Receipt'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-400">
                              {p.receivedAt ? p.receivedAt.split('T')[0] : (p as any).date ? (p as any).date.split('T')[0] : '---'}
                            </td>
                            <td className="p-2 uppercase text-slate-600 dark:text-slate-400">{p.method}</td>
                            <td className="p-2 text-right font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="p-2 text-right">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  const rc = getReceipt(p.id);
                                  if (rc) setPatientReceipt(rc);
                                }}
                              >
                                Receipt
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-xs py-2">
                  No payment receipts generated for this invoice.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: OFFICIAL PAYMENT RECEIPT (REUSE M6) */}
      {patientReceipt && (
        <Modal
          isOpen={Boolean(patientReceipt)}
          onClose={() => setPatientReceipt(null)}
          title="Official Payment Receipt"
          maxWidth="sm"
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPatientReceipt(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
            <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {patientReceipt.clinicName}
              </div>
              <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                Official Outpatient Payment Receipt
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {patientReceipt.receiptNumber}
              </div>
            </div>

            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patientReceipt.receivedAt.replace('T', ' ').slice(0, 16)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Patient Name:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patientReceipt.patientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>MRN:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patientReceipt.patientMrn}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Invoice #:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patientReceipt.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium uppercase text-slate-900 dark:text-slate-100">
                  {patientReceipt.method}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Channel:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patientReceipt.receivedBy}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-900 dark:text-slate-100">Total Settled:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {patientReceipt.formattedAmount}
              </span>
            </div>

            <div className="text-center pt-2 text-[0.625rem] text-slate-500 dark:text-slate-400">
              Outpatient billing receipt.
              <br />
              No clinical diagnosis or prescription details are disclosed on receipts.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
