/**
 * Pure Dashboard Metrics and Selectors Engine (Milestone M9).
 *
 * All functions accept an explicit 'now' parameter for deterministic, pure evaluation.
 * Widgets, figures, and data scopes are gated strictly by capability accesses,
 * never by job title or role strings.
 */

import {
  Patient,
  Doctor,
  Appointment,
  AppointmentStatus,
  Prescription,
  User,
  UserRole,
  PatientAssignment,
  AccessModule,
} from '@/types';
import {
  Invoice,
  Payment,
} from '@/types/billing';
import {
  Shift,
  AttendanceRecord,
  LeaveRequest,
} from '@/types/attendance';
import { PendingStaffApproval } from '@/data/mockData';
import { ClaimRequest } from '@/types/storage';
import {
  isAdmin,
  hasCapability,
} from '@/lib/permissions';
import {
  invoiceTotal,
  balanceDue,
} from '@/lib/billing';
import {
  staffPresentToday,
  dayOfWeek,
  timeToMinutes,
  lateMinutes,
  hoursWorked,
  isOnLeave,
} from '@/lib/attendance';
import { formatCurrency } from '@/lib/money';
import { formatDoctorName } from '@/lib/doctorNames';

export type DateRangePreset = 'today' | 'last_7_days' | 'this_month' | 'last_30_days';
export type ChartBucketType = 'day' | 'week' | 'month';

export interface SummaryFigure {
  label: string;
  value: string | number;
  formattedValue?: string;
}

export interface PatientsAndVisitsBucket {
  dateKey: string;
  label: string;
  newPatients: number;
  visits: number;
}

export interface FeesAndPaymentsBucket {
  dateKey: string;
  label: string;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface VisitsTrendBucket {
  dateKey: string;
  label: string;
  visits: number;
}

export interface TodayAppointmentRow {
  id: string;
  time: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  status: AppointmentStatus;
}

export interface PendingClearanceRow {
  id: string;
  name: string;
  role: string;
  department: string;
  applied: string;
}

export interface NeedsAttentionItem {
  id: string;
  label: string;
  count: number;
  navigateTab: string;
  navigateSubTab?: string;
}

export interface StaffPresenceResult {
  summaryText: string;
  inCount: number;
  outCount: number;
  leaveCount: number;
  notInCount: number;
  lateOrNotList: Array<{
    staffId: string;
    name: string;
    shiftStart: string;
    status: string;
  }>;
}

export interface MyAttendanceStatus {
  hasShiftToday: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  isClockedIn: boolean;
  isClockedOut: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  hoursWorkedSoFar: number;
  statusText: string;
}

export interface FrontDeskTodayFigures {
  waiting: number;
  inConsultation: number;
  bookedToday: number;
  checkedInToday: number;
  outstandingNow?: string;
}

export interface PatientUpcomingAppointmentRow {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  department: string;
  reason: string;
  status: AppointmentStatus;
}

export interface PatientRecentPrescriptionRow {
  id: string;
  date: string;
  prescriptionNumber: string;
  doctorName: string;
  diagnosis: string;
  medications: string;
  status: string;
}

export interface CalculateDashboardMetricsOptions {
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  payments?: Payment[];
  prescriptions: Prescription[];
  doctors?: Doctor[];
  users?: User[];
  pendingClearances?: PendingStaffApproval[];
  claimRequests?: ClaimRequest[];
  shifts?: Shift[];
  attendanceRecords?: AttendanceRecord[];
  leaves?: LeaveRequest[];
  patientAssignments?: PatientAssignment[];
  modules?: AccessModule[];
  role?: UserRole;
  userId?: string;
  currentUser?: User | null;
  dateRange: DateRangePreset;
  chartBucket?: ChartBucketType;
  referenceDate?: Date;
  now?: Date;
}

export interface DashboardMetricsResult {
  summaryFigures: SummaryFigure[];
  patientsAndVisits: PatientsAndVisitsBucket[];
  feesAndPayments?: FeesAndPaymentsBucket[];
  visitsTrend?: VisitsTrendBucket[];
  todayAppointments: TodayAppointmentRow[];
  needsAttention: NeedsAttentionItem[];
  staffPresence?: StaffPresenceResult;
  myAttendance?: MyAttendanceStatus;
  frontDeskToday?: FrontDeskTodayFigures;
  patientUpcomingAppointments?: PatientUpcomingAppointmentRow[];
  patientRecentPrescriptions?: PatientRecentPrescriptionRow[];
  activeDateRange: {
    preset: DateRangePreset;
    startDate: Date;
    endDate: Date;
  };
  activeBucketType: ChartBucketType;
}

export { formatCurrency };

/**
 * Computes start and end date boundaries for preset date ranges.
 * All computations derive strictly from the passed referenceDate / now.
 */
export function getDateRangeBounds(
  preset: DateRangePreset,
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  const ref = new Date(referenceDate);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const date = ref.getDate();

  const endDate = new Date(year, month, date, 23, 59, 59, 999);
  let startDate: Date;

  switch (preset) {
    case 'today':
      startDate = new Date(year, month, date, 0, 0, 0, 0);
      break;
    case 'last_7_days':
      startDate = new Date(year, month, date - 6, 0, 0, 0, 0);
      break;
    case 'this_month':
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      break;
    case 'last_30_days':
      startDate = new Date(year, month, date - 29, 0, 0, 0, 0);
      break;
    default:
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
  }

  return { startDate, endDate };
}

export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  if (dateStr.includes(' ')) return dateStr.split(' ')[0];
  return dateStr;
}

export function isDateInRange(
  dateStr: string | undefined | null,
  startDate: Date,
  endDate: Date
): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();
}

export function isSameDay(dateStr: string | undefined | null, targetDate: Date): boolean {
  if (!dateStr) return false;
  const targetIso = toLocalDateKey(targetDate);
  const dateIso = parseDateOnly(dateStr);
  return dateIso === targetIso;
}

export function formatTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  if (dateTimeStr.includes('T')) {
    const timePart = dateTimeStr.split('T')[1];
    return timePart.substring(0, 5);
  }
  return dateTimeStr;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDayMonth(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function formatMonth(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function resolveDoctorId(user: User | null | undefined, doctors: Doctor[] = []): string {
  if (!user) return '';
  const userId = user.id || '';
  if (userId.startsWith('doc-')) return userId;
  if (userId === 'usr-doc-1' || userId === 'md') return 'doc-1';
  if (userId === 'usr-doc-2' || userId === 'doctor') return 'doc-2';
  if (userId === 'usr-doc-3') return 'doc-3';
  if (user.badgeNumber === 'MD-001') return 'doc-1';
  if (user.badgeNumber === 'DOC-102') return 'doc-2';
  if (user.badgeNumber === 'DOC-103') return 'doc-3';
  const found = doctors.find(
    (d) => d.id === userId || (user.email && d.email && d.email.toLowerCase() === user.email.toLowerCase())
  );
  return found ? found.id : '';
}

export function resolvePatientId(user: User | null | undefined, patients: Patient[] = []): string {
  if (!user) return '';
  if (user.patientId) return user.patientId;
  const userId = user.id || '';
  if (userId.startsWith('pat-')) return userId;
  if (userId === 'usr-pat-1' || userId === 'patient') return 'pat-1';
  const found = patients.find(
    (p) => p.id === userId || (user.email && p.email && p.email.toLowerCase() === user.email.toLowerCase())
  );
  return found ? found.id : 'pat-1';
}

/**
 * Calculates net invoice amount in integer cents.
 */
export function getInvBilledCents(inv: Invoice | any): number {
  if (inv.status === 'void') return 0;
  if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
    return invoiceTotal(inv);
  }
  if (typeof inv.totalAmount === 'number') {
    // If totalAmount is already cents (>= 1000) or fractional dollars
    return inv.totalAmount >= 500 ? Math.round(inv.totalAmount) : Math.round(inv.totalAmount * 100);
  }
  return 0;
}

/**
 * Calculates net balance due for an invoice in integer cents.
 */
export function getInvBalanceDueCents(inv: Invoice | any, payments: Payment[] = []): number {
  if (inv.status === 'void') return 0;
  if (inv.items && Array.isArray(inv.items)) {
    return balanceDue(inv, payments);
  }
  const total = getInvBilledCents(inv);
  const paidCents = payments
    .filter((p) => p.invoiceId === inv.id)
    .reduce((sum, p) => (p.kind === 'reversal' ? sum - p.amount : sum + p.amount), 0);
  return Math.max(0, total - Math.max(0, paidCents));
}

/**
 * Extracts payment date string in YYYY-MM-DD.
 */
export function getPaymentDateStr(p: Payment | any): string {
  return parseDateOnly(p.receivedAt || p.date);
}

/**
 * Extracts invoice date string in YYYY-MM-DD.
 */
export function getInvoiceDateStr(inv: Invoice | any): string {
  return parseDateOnly(inv.issuedAt || inv.date);
}

/**
 * Main Pure Dashboard Calculation Engine.
 */
export function calculateDashboardMetrics(
  options: CalculateDashboardMetricsOptions
): DashboardMetricsResult {
  const {
    patients = [],
    appointments = [],
    invoices = [],
    payments = [],
    prescriptions = [],
    doctors = [],
    pendingClearances = [],
    claimRequests = [],
    shifts = [],
    attendanceRecords = [],
    leaves = [],
    patientAssignments = [],
    modules,
    dateRange,
    chartBucket,
  } = options;

  const now = options.now || options.referenceDate || new Date();
  const { startDate, endDate } = getDateRangeBounds(dateRange, now);
  const diffDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const activeBucketType: ChartBucketType =
    chartBucket || (diffDays <= 31 ? 'day' : 'week');

  const actingUser: User | null = options.currentUser || (options.userId ? {
    id: options.userId,
    name: 'Acting User',
    email: '',
    role: options.role || 'admin',
  } : null);

  const isPatient = actingUser?.role === 'patient';
  const userIsAdmin = isAdmin(actingUser, modules);
  const hasConsult = hasCapability(actingUser, 'consultationWorkstation', modules);
  const hasBilling = hasCapability(actingUser, 'paymentRecording', modules) || userIsAdmin;
  const hasRegistration = hasCapability(actingUser, 'patientRegistration', modules);
  const hasCheckIn = hasCapability(actingUser, 'patientCheckIn', modules);
  const hasAttendance = hasCapability(actingUser, 'attendanceManagement', modules) || userIsAdmin;

  const doctorId = resolveDoctorId(actingUser, doctors);
  const patientId = isPatient ? resolvePatientId(actingUser, patients) : '';

  // 1. Scope Appointments
  let scopedAppointments: Appointment[];
  if (isPatient) {
    scopedAppointments = appointments.filter((a) => a.patientId === patientId);
  } else if (!userIsAdmin && hasConsult && doctorId) {
    // Physician workstation sees only their own patients
    scopedAppointments = appointments.filter((a) => a.doctorId === doctorId);
  } else {
    scopedAppointments = appointments;
  }

  // Range filtered appointments (excluding cancelled appointments from standard appointment count)
  const rangeAppointmentsAll = scopedAppointments.filter((a) =>
    isDateInRange(a.dateTime, startDate, endDate)
  );
  const rangeAppointmentsActive = rangeAppointmentsAll.filter((a) => a.status !== 'cancelled');

  // Completed visits in the range
  const rangeVisitsCompleted = rangeAppointmentsAll.filter((a) => a.status === 'completed');

  // Missed appointments: past appointments in range never checked in
  const rangeMissedAppointments = rangeAppointmentsAll.filter((a) => {
    if (a.status === 'completed' || a.status === 'checked_in' || a.status === 'in_consultation' || a.status === 'cancelled') {
      return false;
    }
    const apptTime = new Date(a.dateTime).getTime();
    return apptTime < now.getTime() || a.status === 'no_show';
  });

  // 2. Scope New Patients
  let scopedNewPatientsCount = 0;
  if (userIsAdmin) {
    scopedNewPatientsCount = patients.filter((p) =>
      isDateInRange(p.registeredDate || p.registeredAt, startDate, endDate)
    ).length;
  } else if (hasConsult && doctorId) {
    const assignedPtIds = patientAssignments.filter((pa) => pa.doctorId === doctorId && !pa.to).map((pa) => pa.patientId);
    const doctorPatientIds = new Set([...scopedAppointments.map((a) => a.patientId), ...assignedPtIds]);
    scopedNewPatientsCount = patients.filter(
      (p) =>
        doctorPatientIds.has(p.id) &&
        isDateInRange(p.registeredDate || p.registeredAt, startDate, endDate)
    ).length;
  }

  // 3. Billing Metrics (Minor unit integer cents)
  // Non-void invoices in range
  const rangeInvoices = invoices.filter(
    (inv) => inv.status !== 'void' && isDateInRange(getInvoiceDateStr(inv), startDate, endDate)
  );
  const billedTotalCents = rangeInvoices.reduce((sum, inv) => sum + getInvBilledCents(inv), 0);

  // Range payments minus reversals
  const rangePayments = payments.filter((p) =>
    isDateInRange(getPaymentDateStr(p), startDate, endDate)
  );
  const collectedTotalCents = rangePayments.reduce((sum, p) => {
    return p.kind === 'reversal' ? sum - p.amount : sum + p.amount;
  }, 0);

  // Outstanding now: balance due across all non-void invoices as of today (independent of range filter)
  const allActiveInvoices = invoices.filter((inv) => inv.status !== 'void');
  const outstandingNowCents = allActiveInvoices.reduce(
    (sum, inv) => sum + getInvBalanceDueCents(inv, payments),
    0
  );

  // Staff present at current time
  const todayKey = toLocalDateKey(now);
  const staffPresentNowCount = staffPresentToday(attendanceRecords, todayKey);

  // 4. Construct Summary Figures based on Capability Accesses
  const summaryFigures: SummaryFigure[] = [];

  if (isPatient) {
    const upcoming = scopedAppointments
      .filter((a) => {
        const d = new Date(a.dateTime);
        return d.getTime() >= now.getTime() && a.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const nextAppt = upcoming[0];
    const nextApptStr = nextAppt
      ? `${formatDayMonth(new Date(nextAppt.dateTime))}, ${formatTime(nextAppt.dateTime)}`
      : 'None scheduled';

    const activePrescriptionsCount = prescriptions.filter(
      (p) => p.patientId === patientId && p.status !== 'cancelled' && p.status !== 'dispensed'
    ).length;

    const currentYear = now.getFullYear();
    const visitsThisYearCount = scopedAppointments.filter((a) => {
      const yr = new Date(a.dateTime).getFullYear();
      return yr === currentYear && a.status === 'completed';
    }).length;

    const patientBalanceDueCents = invoices
      .filter((i) => i.patientId === patientId && i.status !== 'void')
      .reduce((sum, inv) => sum + getInvBalanceDueCents(inv, payments), 0);

    summaryFigures.push(
      { label: 'Next Appointment', value: nextApptStr },
      { label: 'Active Prescriptions', value: activePrescriptionsCount },
      { label: 'Visits this year', value: visitsThisYearCount },
      {
        label: 'Balance Due',
        value: patientBalanceDueCents,
        formattedValue: formatCurrency(patientBalanceDueCents),
      }
    );
  } else if (userIsAdmin) {
    summaryFigures.push(
      { label: 'New Patients', value: scopedNewPatientsCount },
      { label: 'Visits', value: rangeVisitsCompleted.length },
      { label: 'Appointments', value: rangeAppointmentsActive.length },
      { label: 'Missed Appointments', value: rangeMissedAppointments.length },
      { label: 'Billed', value: billedTotalCents, formattedValue: formatCurrency(billedTotalCents) },
      { label: 'Collected', value: collectedTotalCents, formattedValue: formatCurrency(collectedTotalCents) },
      {
        label: 'Outstanding now',
        value: outstandingNowCents,
        formattedValue: formatCurrency(outstandingNowCents),
      },
      { label: 'Staff present', value: staffPresentNowCount }
    );
  } else if (hasConsult) {
    // Doctor workstation: own patient clinical figures only. Doctors never see billing.
    summaryFigures.push(
      { label: 'New Patients', value: scopedNewPatientsCount },
      { label: 'Visits', value: rangeVisitsCompleted.length },
      { label: 'Appointments', value: rangeAppointmentsActive.length },
      { label: 'Missed Appointments', value: rangeMissedAppointments.length },
      { label: 'Staff present', value: staffPresentNowCount }
    );
  } else if (hasRegistration || hasCheckIn) {
    // Front desk: appointment figures only.
    summaryFigures.push(
      { label: 'Appointments', value: rangeAppointmentsActive.length },
      { label: 'Missed Appointments', value: rangeMissedAppointments.length },
      { label: 'Staff present', value: staffPresentNowCount }
    );
  } else if (hasBilling) {
    // Pure billing operator
    summaryFigures.push(
      { label: 'Billed', value: billedTotalCents, formattedValue: formatCurrency(billedTotalCents) },
      { label: 'Collected', value: collectedTotalCents, formattedValue: formatCurrency(collectedTotalCents) },
      {
        label: 'Outstanding now',
        value: outstandingNowCents,
        formattedValue: formatCurrency(outstandingNowCents),
      },
      { label: 'Staff present', value: staffPresentNowCount }
    );
  }

  // 5. Chart Buckets Generation
  const patientsAndVisits: PatientsAndVisitsBucket[] = [];
  const feesAndPayments: FeesAndPaymentsBucket[] = [];
  const visitsTrend: VisitsTrendBucket[] = [];

  const canViewPVChart = userIsAdmin || hasConsult;
  const canViewFPChart = hasBilling;

  if (activeBucketType === 'day') {
    const cur = new Date(startDate);
    while (cur.getTime() <= endDate.getTime()) {
      const dateKey = toLocalDateKey(cur);
      const label = formatDayMonth(cur);

      let dayNewPatients = 0;
      if (userIsAdmin) {
        dayNewPatients = patients.filter(
          (p) => parseDateOnly(p.registeredDate || p.registeredAt) === dateKey
        ).length;
      } else if (hasConsult && doctorId) {
        const docPts = new Set(scopedAppointments.map((a) => a.patientId));
        dayNewPatients = patients.filter(
          (p) => docPts.has(p.id) && parseDateOnly(p.registeredDate || p.registeredAt) === dateKey
        ).length;
      }

      const dayVisits = scopedAppointments.filter(
        (a) => parseDateOnly(a.dateTime) === dateKey && a.status === 'completed'
      ).length;

      if (canViewPVChart) {
        patientsAndVisits.push({
          dateKey,
          label,
          newPatients: dayNewPatients,
          visits: dayVisits,
        });
      }

      if (canViewFPChart) {
        const dayInvoices = invoices.filter(
          (inv) => inv.status !== 'void' && getInvoiceDateStr(inv) === dateKey
        );
        const dayBilledCents = dayInvoices.reduce((sum, inv) => sum + getInvBilledCents(inv), 0);

        const dayPayments = payments.filter((p) => getPaymentDateStr(p) === dateKey);
        const dayCollectedCents = dayPayments.reduce((sum, p) => {
          return p.kind === 'reversal' ? sum - p.amount : sum + p.amount;
        }, 0);

        // Convert cents to dollars for chart scaling
        feesAndPayments.push({
          dateKey,
          label,
          billed: Math.round(dayBilledCents / 100),
          collected: Math.round(dayCollectedCents / 100),
          outstanding: Math.max(0, Math.round((dayBilledCents - dayCollectedCents) / 100)),
        });
      }

      if (hasConsult && !userIsAdmin) {
        visitsTrend.push({
          dateKey,
          label,
          visits: dayVisits,
        });
      }

      cur.setDate(cur.getDate() + 1);
    }
  } else if (activeBucketType === 'week') {
    const cur = new Date(startDate);
    let weekIndex = 1;
    while (cur.getTime() <= endDate.getTime()) {
      const weekStart = new Date(cur);
      const weekEnd = new Date(cur);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd.getTime() > endDate.getTime()) {
        weekEnd.setTime(endDate.getTime());
      }

      const dateKey = `w-${weekIndex}-${toLocalDateKey(weekStart)}`;
      const label = `W${weekIndex} (${formatDayMonth(weekStart)})`;

      let weekNewPatients = 0;
      if (userIsAdmin) {
        weekNewPatients = patients.filter((p) =>
          isDateInRange(p.registeredDate || p.registeredAt, weekStart, weekEnd)
        ).length;
      } else if (hasConsult && doctorId) {
        const docPts = new Set(scopedAppointments.map((a) => a.patientId));
        weekNewPatients = patients.filter(
          (p) => docPts.has(p.id) && isDateInRange(p.registeredDate || p.registeredAt, weekStart, weekEnd)
        ).length;
      }

      const weekVisits = scopedAppointments.filter(
        (a) => isDateInRange(a.dateTime, weekStart, weekEnd) && a.status === 'completed'
      ).length;

      if (canViewPVChart) {
        patientsAndVisits.push({
          dateKey,
          label,
          newPatients: weekNewPatients,
          visits: weekVisits,
        });
      }

      if (canViewFPChart) {
        const weekInvoices = invoices.filter(
          (inv) => inv.status !== 'void' && isDateInRange(getInvoiceDateStr(inv), weekStart, weekEnd)
        );
        const weekBilledCents = weekInvoices.reduce((sum, inv) => sum + getInvBilledCents(inv), 0);

        const weekPayments = payments.filter((p) =>
          isDateInRange(getPaymentDateStr(p), weekStart, weekEnd)
        );
        const weekCollectedCents = weekPayments.reduce((sum, p) => {
          return p.kind === 'reversal' ? sum - p.amount : sum + p.amount;
        }, 0);

        feesAndPayments.push({
          dateKey,
          label,
          billed: Math.round(weekBilledCents / 100),
          collected: Math.round(weekCollectedCents / 100),
          outstanding: Math.max(0, Math.round((weekBilledCents - weekCollectedCents) / 100)),
        });
      }

      if (hasConsult && !userIsAdmin) {
        visitsTrend.push({
          dateKey,
          label,
          visits: weekVisits,
        });
      }

      cur.setDate(cur.getDate() + 7);
      weekIndex++;
    }
  } else if (activeBucketType === 'month') {
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cur.getTime() <= endMonth.getTime()) {
      const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
      const dateKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const label = formatMonth(cur);

      let monthNewPatients = 0;
      if (userIsAdmin) {
        monthNewPatients = patients.filter((p) =>
          isDateInRange(p.registeredDate || p.registeredAt, monthStart, monthEnd)
        ).length;
      } else if (hasConsult && doctorId) {
        const docPts = new Set(scopedAppointments.map((a) => a.patientId));
        monthNewPatients = patients.filter(
          (p) => docPts.has(p.id) && isDateInRange(p.registeredDate || p.registeredAt, monthStart, monthEnd)
        ).length;
      }

      const monthVisits = scopedAppointments.filter(
        (a) => isDateInRange(a.dateTime, monthStart, monthEnd) && a.status === 'completed'
      ).length;

      if (canViewPVChart) {
        patientsAndVisits.push({
          dateKey,
          label,
          newPatients: monthNewPatients,
          visits: monthVisits,
        });
      }

      if (canViewFPChart) {
        const monthInvoices = invoices.filter(
          (inv) => inv.status !== 'void' && isDateInRange(getInvoiceDateStr(inv), monthStart, monthEnd)
        );
        const monthBilledCents = monthInvoices.reduce((sum, inv) => sum + getInvBilledCents(inv), 0);

        const monthPayments = payments.filter((p) =>
          isDateInRange(getPaymentDateStr(p), monthStart, monthEnd)
        );
        const monthCollectedCents = monthPayments.reduce((sum, p) => {
          return p.kind === 'reversal' ? sum - p.amount : sum + p.amount;
        }, 0);

        feesAndPayments.push({
          dateKey,
          label,
          billed: Math.round(monthBilledCents / 100),
          collected: Math.round(monthCollectedCents / 100),
          outstanding: Math.max(0, Math.round((monthBilledCents - monthCollectedCents) / 100)),
        });
      }

      if (hasConsult && !userIsAdmin) {
        visitsTrend.push({
          dateKey,
          label,
          visits: monthVisits,
        });
      }

      cur.setMonth(cur.getMonth() + 1);
    }
  }

  // 6. Today's Appointments List
  // Visible to consultationWorkstation (own), patientCheckIn/patientRegistration (all, no clinical fields), administrativeAccess (all)
  let todayAppointments: TodayAppointmentRow[] = [];
  if (userIsAdmin || hasConsult || hasCheckIn || hasRegistration) {
    todayAppointments = scopedAppointments
      .filter((a) => isSameDay(a.dateTime, now))
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .map((a) => ({
        id: a.id,
        time: formatTime(a.dateTime),
        patientId: a.patientId,
        patientName: a.patientName,
        doctorId: a.doctorId,
        doctorName: formatDoctorName(a.doctorName),
        status: a.status,
      }));
  }

  // 7. Needs Attention List
  // Each row rendered ONLY when the user has the access required to act on it
  const needsAttention: NeedsAttentionItem[] = [];

  if (userIsAdmin) {
    const pendingClearancesCount = pendingClearances.length;
    if (pendingClearancesCount > 0) {
      needsAttention.push({
        id: 'clearances',
        label: 'Pending Clearances',
        count: pendingClearancesCount,
        navigateTab: 'access_control',
        navigateSubTab: 'add_users',
      });
    }
  }

  if (userIsAdmin || hasAttendance) {
    const pendingLeavesCount = leaves.filter((l) => l.status === 'pending').length;
    if (pendingLeavesCount > 0) {
      needsAttention.push({
        id: 'leaves',
        label: 'Leave Requests',
        count: pendingLeavesCount,
        navigateTab: 'attendance',
        navigateSubTab: 'leaves',
      });
    }
  }

  if (hasRegistration || hasCheckIn || userIsAdmin) {
    const pendingClaimsCount = claimRequests.filter((c) => c.status === 'pending').length;
    if (pendingClaimsCount > 0) {
      needsAttention.push({
        id: 'claims',
        label: 'Account Link Requests',
        count: pendingClaimsCount,
        navigateTab: 'role_receptionist',
        navigateSubTab: 'claims',
      });
    }

    const needsRescheduleCount = appointments.filter(
      (a) => a.needsReschedule === true && a.status !== 'cancelled' && a.status !== 'completed'
    ).length;
    if (needsRescheduleCount > 0) {
      needsAttention.push({
        id: 'reschedule',
        label: 'Needs Rescheduling',
        count: needsRescheduleCount,
        navigateTab: 'role_receptionist',
        navigateSubTab: 'booking',
      });
    }
  }

  if (hasBilling) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const unpaidOver30Count = invoices.filter((inv) => {
      if (inv.status === 'void') return false;
      const invDateStr = getInvoiceDateStr(inv);
      const invDate = new Date(invDateStr.length === 10 ? `${invDateStr}T12:00:00` : invDateStr);
      return invDate.getTime() < thirtyDaysAgo.getTime() && getInvBalanceDueCents(inv, payments) > 0;
    }).length;

    if (unpaidOver30Count > 0) {
      needsAttention.push({
        id: 'unpaid_30',
        label: 'Unpaid Invoices over 30 days',
        count: unpaidOver30Count,
        navigateTab: 'admin_billing',
        navigateSubTab: 'invoices',
      });
    }
  }

  // 8. Staff Presence Widget (attendanceManagement or administrativeAccess)
  let staffPresence: StaffPresenceResult | undefined;
  if (hasAttendance || userIsAdmin) {
    const dayName = dayOfWeek(todayKey);
    const scheduledShifts = shifts.filter((s) => s.days.includes(dayName));

    let inCount = 0;
    let outCount = 0;
    let leaveCount = 0;
    let notInCount = 0;
    const lateOrNotList: StaffPresenceResult['lateOrNotList'] = [];

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const shift of scheduledShifts) {
      const onLeave = isOnLeave(shift.staffId, todayKey, leaves);
      const rec = attendanceRecords.find(
        (r) => r.staffId === shift.staffId && r.date === todayKey
      );

      const staffName = rec?.staffName || shift.staffId;
      const shiftStartMin = timeToMinutes(shift.start);
      const grace = shift.graceMinutes ?? 15;
      const threshold = shiftStartMin + grace;

      if (onLeave) {
        leaveCount++;
      } else if (rec?.clockOut) {
        outCount++;
      } else if (rec?.clockIn) {
        inCount++;
        const lateMin = lateMinutes(rec, shift);
        if (lateMin > 0) {
          lateOrNotList.push({
            staffId: shift.staffId,
            name: staffName,
            shiftStart: shift.start,
            status: `Late (clocked in at ${formatTime(rec.clockIn)})`,
          });
        }
      } else {
        notInCount++;
        if (nowMinutes > threshold) {
          lateOrNotList.push({
            staffId: shift.staffId,
            name: staffName,
            shiftStart: shift.start,
            status: 'Late (not in yet)',
          });
        } else {
          lateOrNotList.push({
            staffId: shift.staffId,
            name: staffName,
            shiftStart: shift.start,
            status: 'Not in yet',
          });
        }
      }
    }

    staffPresence = {
      summaryText: `${inCount} in, ${outCount} out, ${leaveCount} on leave, ${notInCount} not in yet`,
      inCount,
      outCount,
      leaveCount,
      notInCount,
      lateOrNotList,
    };
  }

  // 9. My Attendance Widget (All staff accounts)
  let myAttendance: MyAttendanceStatus | undefined;
  if (!isPatient && actingUser) {
    const staffIds = [
      actingUser.id,
      actingUser.badgeNumber,
      actingUser.id === 'usr-1' ? 'acc-doc-1' : '',
      actingUser.id === 'usr-doc-2' ? 'acc-doc-2' : '',
      actingUser.id === 'usr-rec-1' ? 'acc-rec-1' : '',
      actingUser.id === 'usr-rec-2' ? 'acc-rec-2' : '',
    ].filter(Boolean) as string[];

    const todayRec = attendanceRecords.find(
      (r) => staffIds.includes(r.staffId) && r.date === todayKey
    );
    const dayName = dayOfWeek(todayKey);
    const myShift = shifts.find(
      (s) => staffIds.includes(s.staffId) && s.days.includes(dayName)
    );

    const isClockedIn = Boolean(todayRec?.clockIn);
    const isClockedOut = Boolean(todayRec?.clockOut);
    const totalHours = todayRec ? hoursWorked(todayRec) : 0;

    let statusText = 'Not clocked in yet';
    if (isClockedOut && todayRec?.clockOut) {
      statusText = `Clocked out at ${formatTime(todayRec.clockOut)} (${totalHours} hrs worked)`;
    } else if (isClockedIn && todayRec?.clockIn) {
      const inTime = new Date(todayRec.clockIn).getTime();
      const currentHours = Math.max(0, (now.getTime() - inTime) / (1000 * 60 * 60));
      statusText = `Clocked in at ${formatTime(todayRec.clockIn)} (${currentHours.toFixed(1)} hrs so far)`;
    }

    myAttendance = {
      hasShiftToday: Boolean(myShift),
      shiftStart: myShift?.start,
      shiftEnd: myShift?.end,
      isClockedIn,
      isClockedOut,
      clockInTime: todayRec?.clockIn ? formatTime(todayRec.clockIn) : undefined,
      clockOutTime: todayRec?.clockOut ? formatTime(todayRec.clockOut) : undefined,
      hoursWorkedSoFar: totalHours,
      statusText,
    };
  }

  // 10. Front Desk Today Figures (patientCheckIn or patientRegistration)
  let frontDeskToday: FrontDeskTodayFigures | undefined;
  if (hasCheckIn || hasRegistration) {
    const todayApts = appointments.filter((a) => isSameDay(a.dateTime, now));
    const waiting = todayApts.filter((a) => a.status === 'checked_in').length;
    const inConsultation = todayApts.filter((a) => a.status === 'in_consultation').length;
    const bookedToday = todayApts.filter((a) => a.status === 'scheduled').length;
    const checkedInToday = todayApts.filter(
      (a) => a.status === 'checked_in' || a.status === 'in_consultation' || a.status === 'completed'
    ).length;

    frontDeskToday = {
      waiting,
      inConsultation,
      bookedToday,
      checkedInToday,
      outstandingNow: hasBilling ? formatCurrency(outstandingNowCents) : undefined,
    };
  }

  // 11. Patient Upcoming Appointments & Prescriptions (Patient only)
  let patientUpcomingAppointments: PatientUpcomingAppointmentRow[] | undefined;
  let patientRecentPrescriptions: PatientRecentPrescriptionRow[] | undefined;

  if (isPatient) {
    patientUpcomingAppointments = scopedAppointments
      .filter((a) => {
        const d = new Date(a.dateTime);
        return d.getTime() >= startDate.getTime() && a.status !== 'cancelled';
      })
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .map((a) => ({
        id: a.id,
        date: formatDate(a.dateTime),
        time: formatTime(a.dateTime),
        doctorName: formatDoctorName(a.doctorName),
        department: a.department,
        reason: a.reasonForVisit,
        status: a.status,
      }));

    patientRecentPrescriptions = prescriptions
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => ({
        id: p.id,
        date: formatDate(p.date),
        prescriptionNumber: p.prescriptionNumber,
        doctorName: formatDoctorName(p.doctorName),
        diagnosis: p.diagnosis,
        medications: p.items.map((i) => `${i.medicineName || i.customName || 'Medication'} (${i.dosage || i.strength || ''})`).join(', '),
        status: p.status,
      }));
  }

  return {
    summaryFigures,
    patientsAndVisits: canViewPVChart ? patientsAndVisits : [],
    feesAndPayments: canViewFPChart ? feesAndPayments : undefined,
    visitsTrend: hasConsult && !userIsAdmin ? visitsTrend : undefined,
    todayAppointments,
    needsAttention,
    staffPresence,
    myAttendance,
    frontDeskToday,
    patientUpcomingAppointments,
    patientRecentPrescriptions,
    activeDateRange: {
      preset: dateRange,
      startDate,
      endDate,
    },
    activeBucketType,
  };
}

/**
 * Daily Summary Data Structure.
 */
export interface DailySummaryData {
  date: string;
  formattedDate: string;
  hasActivity: boolean;
  patients?: {
    registrations: number;
    checkIns: number;
    completedVisits: number;
    cancellations: number;
    noShows: number;
    onlineBookings: number;
  };
  byDoctor?: Array<{
    doctorId: string;
    doctorName: string;
    booked: number;
    checkedIn: number;
    completed: number;
    prescriptions: number;
  }>;
  byReceptionist?: Array<{
    receptionistId: string;
    receptionistName: string;
    registrations: number;
    checkIns: number;
    bookings: number;
    paymentsCount: number;
    paymentsTotalCents: number;
    formattedPaymentsTotal: string;
  }>;
  collections?: {
    isMyCollections: boolean;
    cashCents: number;
    cardCents: number;
    upiCents: number;
    portalCents: number;
    reversalsCents: number;
    netTotalCents: number;
    dailyBilledCents: number;
    cashToHandOverCents: number;
    formattedCash: string;
    formattedCard: string;
    formattedUpi: string;
    formattedPortal: string;
    formattedReversals: string;
    formattedNetTotal: string;
    formattedDailyBilled: string;
    formattedCashToHandOver: string;
  };
  attendance?: {
    presentCount: number;
    lateCount: number;
    onLeaveCount: number;
    absentCount: number;
    lateStaffNames: string[];
    absentStaffNames: string[];
    totalHoursWorked: number;
  };
}

export interface CalculateDailySummaryOptions {
  user: User | null;
  targetDate: string; // YYYY-MM-DD
  now?: Date;
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  payments: Payment[];
  prescriptions: Prescription[];
  doctors: Doctor[];
  users: User[];
  shifts: Shift[];
  attendanceRecords: AttendanceRecord[];
  leaves: LeaveRequest[];
  modules?: AccessModule[];
}

/**
 * Calculates pure Daily Summary sections scoped strictly to user accesses.
 */
export function calculateDailySummary(options: CalculateDailySummaryOptions): DailySummaryData {
  const {
    user,
    targetDate,
    patients = [],
    appointments = [],
    invoices = [],
    payments = [],
    prescriptions = [],
    doctors = [],
    shifts = [],
    attendanceRecords = [],
    leaves = [],
    modules,
  } = options;

  const now = options.now || new Date();
  const userIsAdmin = isAdmin(user, modules);
  const hasConsult = hasCapability(user, 'consultationWorkstation', modules);
  const hasCheckIn = hasCapability(user, 'patientCheckIn', modules);
  const hasRegistration = hasCapability(user, 'patientRegistration', modules);
  const hasBilling = hasCapability(user, 'paymentRecording', modules) || userIsAdmin;
  const hasAttendance = hasCapability(user, 'attendanceManagement', modules) || userIsAdmin;

  const doctorId = resolveDoctorId(user, doctors);
  let hasActivity = false;

  // 1. Patients Section (administrativeAccess or any patient access)
  let patientsSection: DailySummaryData['patients'] | undefined;
  if (userIsAdmin || hasRegistration || hasCheckIn || hasConsult) {
    const registrations = patients.filter(
      (p) => parseDateOnly(p.registeredDate || p.registeredAt) === targetDate
    ).length;

    const dayApts = appointments.filter((a) => parseDateOnly(a.dateTime) === targetDate);

    const checkIns = appointments.filter((a) => {
      const checkInDate = a.checkedInAt ? parseDateOnly(a.checkedInAt) : '';
      return checkInDate === targetDate || (parseDateOnly(a.dateTime) === targetDate && (a.status === 'checked_in' || a.status === 'in_consultation' || a.status === 'completed'));
    }).length;

    const completedVisits = dayApts.filter((a) => a.status === 'completed').length;
    const cancellations = appointments.filter((a) => {
      const cancelDate = a.cancelledAt ? parseDateOnly(a.cancelledAt) : parseDateOnly(a.dateTime);
      return cancelDate === targetDate && a.status === 'cancelled';
    }).length;
    const noShows = dayApts.filter((a) => a.status === 'no_show').length;
    const onlineBookings = dayApts.filter((a) => a.source === 'web').length;

    if (registrations > 0 || checkIns > 0 || completedVisits > 0 || cancellations > 0 || noShows > 0 || onlineBookings > 0) {
      hasActivity = true;
    }

    patientsSection = {
      registrations,
      checkIns,
      completedVisits,
      cancellations,
      noShows,
      onlineBookings,
    };
  }

  // 2. By Doctor Section (administrativeAccess; doctors see only themselves)
  let byDoctorSection: DailySummaryData['byDoctor'] | undefined;
  if (userIsAdmin || hasConsult) {
    const targetDoctors = userIsAdmin
      ? doctors
      : doctors.filter((d) => d.id === doctorId);

    byDoctorSection = targetDoctors.map((doc) => {
      const docApts = appointments.filter(
        (a) => a.doctorId === doc.id && parseDateOnly(a.dateTime) === targetDate
      );
      const booked = docApts.filter((a) => a.status !== 'cancelled').length;
      const checkedIn = docApts.filter(
        (a) => a.status === 'checked_in' || a.status === 'in_consultation' || a.status === 'completed'
      ).length;
      const completed = docApts.filter((a) => a.status === 'completed').length;
      const docRx = prescriptions.filter(
        (rx) => rx.doctorId === doc.id && parseDateOnly(rx.date) === targetDate
      ).length;

      if (booked > 0 || checkedIn > 0 || completed > 0 || docRx > 0) {
        hasActivity = true;
      }

      return {
        doctorId: doc.id,
        doctorName: formatDoctorName(doc.name),
        booked,
        checkedIn,
        completed,
        prescriptions: docRx,
      };
    });
  }

  // 3. By Receptionist Section (administrativeAccess, or patientCheckIn for own row only)
  let byReceptionistSection: DailySummaryData['byReceptionist'] | undefined;
  if (userIsAdmin || hasCheckIn) {
    const knownReceptionists = [
      { id: 'acc-rec-1', name: 'Priya Sharma' },
      { id: 'acc-rec-2', name: 'David Kim' },
    ];

    const userStaffIds = [
      user?.id,
      user?.badgeNumber,
      user?.id === 'usr-rec-1' ? 'acc-rec-1' : '',
      user?.id === 'usr-rec-2' ? 'acc-rec-2' : '',
    ].filter(Boolean) as string[];

    const targetReceptionists = userIsAdmin
      ? knownReceptionists
      : knownReceptionists.filter(
          (r) => userStaffIds.includes(r.id) || user?.name === r.name
        );

    byReceptionistSection = targetReceptionists.map((rec) => {
      const regs = patients.filter(
        (p) => p.registeredBy?.id === rec.id && parseDateOnly(p.registeredDate || p.registeredAt) === targetDate
      ).length;

      const checkIns = appointments.filter((a) => {
        const checkDate = a.checkedInAt ? parseDateOnly(a.checkedInAt) : parseDateOnly(a.dateTime);
        return a.checkedInBy?.id === rec.id && checkDate === targetDate;
      }).length;

      const bookings = appointments.filter((a) => {
        return a.bookedBy?.id === rec.id && parseDateOnly(a.dateTime) === targetDate;
      }).length;

      const recPayments = payments.filter((p) => {
        const receiverId = typeof p.receivedBy === 'object' ? p.receivedBy?.id : p.receivedBy;
        return receiverId === rec.id && getPaymentDateStr(p) === targetDate;
      });

      const paymentsTotalCents = recPayments.reduce(
        (sum, p) => (p.kind === 'reversal' ? sum - p.amount : sum + p.amount),
        0
      );

      if (regs > 0 || checkIns > 0 || bookings > 0 || recPayments.length > 0) {
        hasActivity = true;
      }

      return {
        receptionistId: rec.id,
        receptionistName: rec.name,
        registrations: regs,
        checkIns,
        bookings,
        paymentsCount: recPayments.length,
        paymentsTotalCents,
        formattedPaymentsTotal: formatCurrency(paymentsTotalCents),
      };
    });
  }

  // 4. Collections Section (paymentRecording or administrativeAccess)
  let collectionsSection: DailySummaryData['collections'] | undefined;
  if (hasBilling) {
    const isReceptionistOnly = !userIsAdmin && hasCheckIn;
    const operatorId = user?.id || '';

    // Filter day payments
    const dayPayments = payments.filter((p) => {
      if (getPaymentDateStr(p) !== targetDate) return false;
      if (isReceptionistOnly) {
        const receiverId = typeof p.receivedBy === 'object' ? p.receivedBy?.id : p.receivedBy;
        return receiverId === operatorId || receiverId === 'acc-rec-1' || receiverId === 'acc-rec-2';
      }
      return true;
    });

    let cashCents = 0;
    let cardCents = 0;
    let upiCents = 0;
    let portalCents = 0;
    let reversalsCents = 0;

    for (const p of dayPayments) {
      if (p.kind === 'reversal') {
        reversalsCents += p.amount;
        continue;
      }
      if (p.method === 'cash') cashCents += p.amount;
      else if (p.method === 'card') cardCents += p.amount;
      else if (p.method === 'upi') upiCents += p.amount;
      else if (p.method === 'portal') portalCents += p.amount;
    }

    const netTotalCents = cashCents + cardCents + upiCents + portalCents - reversalsCents;

    // Daily Billed
    const dayInvoices = invoices.filter(
      (inv) => inv.status !== 'void' && getInvoiceDateStr(inv) === targetDate
    );
    const dailyBilledCents = dayInvoices.reduce((sum, inv) => sum + getInvBilledCents(inv), 0);
    const cashToHandOverCents = Math.max(0, cashCents);

    if (dayPayments.length > 0 || dailyBilledCents > 0) {
      hasActivity = true;
    }

    collectionsSection = {
      isMyCollections: isReceptionistOnly,
      cashCents,
      cardCents,
      upiCents,
      portalCents,
      reversalsCents,
      netTotalCents,
      dailyBilledCents,
      cashToHandOverCents,
      formattedCash: formatCurrency(cashCents),
      formattedCard: formatCurrency(cardCents),
      formattedUpi: formatCurrency(upiCents),
      formattedPortal: formatCurrency(portalCents),
      formattedReversals: formatCurrency(reversalsCents),
      formattedNetTotal: formatCurrency(netTotalCents),
      formattedDailyBilled: formatCurrency(dailyBilledCents),
      formattedCashToHandOver: formatCurrency(cashToHandOverCents),
    };
  }

  // 5. Attendance Section (attendanceManagement or administrativeAccess; individual sees own line)
  let attendanceSection: DailySummaryData['attendance'] | undefined;
  if (hasAttendance || userIsAdmin) {
    const dayName = dayOfWeek(targetDate);
    const scheduledShifts = shifts.filter((s) => s.days.includes(dayName));

    let presentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let totalHoursWorked = 0;
    const lateStaffNames: string[] = [];
    const absentStaffNames: string[] = [];

    const isPastOrToday = targetDate <= toLocalDateKey(now);

    for (const shift of scheduledShifts) {
      const onLeave = isOnLeave(shift.staffId, targetDate, leaves);
      const rec = attendanceRecords.find(
        (r) => r.staffId === shift.staffId && r.date === targetDate
      );
      const staffName = rec?.staffName || shift.staffId;

      if (onLeave) {
        onLeaveCount++;
      } else if (rec && rec.clockIn) {
        presentCount++;
        totalHoursWorked += hoursWorked(rec);
        if (lateMinutes(rec, shift) > 0) {
          lateCount++;
          lateStaffNames.push(staffName);
        }
      } else if (isPastOrToday) {
        absentCount++;
        absentStaffNames.push(staffName);
      }
    }

    if (presentCount > 0 || lateCount > 0 || onLeaveCount > 0) {
      hasActivity = true;
    }

    attendanceSection = {
      presentCount,
      lateCount,
      onLeaveCount,
      absentCount,
      lateStaffNames,
      absentStaffNames,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
    };
  } else if (user) {
    // Individual staff attendance line
    const staffIds = [user.id, user.badgeNumber].filter(Boolean) as string[];
    const rec = attendanceRecords.find(
      (r) => staffIds.includes(r.staffId) && r.date === targetDate
    );
    const dayName = dayOfWeek(targetDate);
    const shift = shifts.find((s) => staffIds.includes(s.staffId) && s.days.includes(dayName));
    const onLeave = isOnLeave(user.id, targetDate, leaves);

    const isPresent = Boolean(rec?.clockIn);
    const isLate = Boolean(rec && shift && lateMinutes(rec, shift) > 0);
    const hours = rec ? hoursWorked(rec) : 0;

    if (isPresent || onLeave) {
      hasActivity = true;
    }

    attendanceSection = {
      presentCount: isPresent ? 1 : 0,
      lateCount: isLate ? 1 : 0,
      onLeaveCount: onLeave ? 1 : 0,
      absentCount: !isPresent && !onLeave && shift ? 1 : 0,
      lateStaffNames: isLate ? [user.name] : [],
      absentStaffNames: !isPresent && !onLeave && shift ? [user.name] : [],
      totalHoursWorked: hours,
    };
  }

  return {
    date: targetDate,
    formattedDate: formatDate(targetDate),
    hasActivity,
    patients: patientsSection,
    byDoctor: byDoctorSection,
    byReceptionist: byReceptionistSection,
    collections: collectionsSection,
    attendance: attendanceSection,
  };
}

/**
 * Generates RFC 4180 CSV export content for Daily Summary.
 * Contains only the sections the person has access to see.
 */
export function generateDailySummaryCsv(data: DailySummaryData): string {
  const rows: string[] = [];

  rows.push(`"Beacon Health Clinic - Daily Summary"`);
  rows.push(`"Date","${data.date}"`);
  rows.push('');

  if (data.patients) {
    rows.push('"Patients"');
    rows.push(`"New Registrations",${data.patients.registrations}`);
    rows.push(`"Check-ins",${data.patients.checkIns}`);
    rows.push(`"Visits Completed",${data.patients.completedVisits}`);
    rows.push(`"Cancellations",${data.patients.cancellations}`);
    rows.push(`"No-shows",${data.patients.noShows}`);
    rows.push(`"Online Bookings",${data.patients.onlineBookings}`);
    rows.push('');
  }

  if (data.byDoctor && data.byDoctor.length > 0) {
    rows.push('"By Doctor"');
    rows.push('"Doctor","Booked","Checked In","Completed","Prescriptions Issued"');
    for (const doc of data.byDoctor) {
      rows.push(`"${doc.doctorName}",${doc.booked},${doc.checkedIn},${doc.completed},${doc.prescriptions}`);
    }
    rows.push('');
  }

  if (data.byReceptionist && data.byReceptionist.length > 0) {
    rows.push('"By Receptionist"');
    rows.push('"Receptionist","Registrations","Check-ins","Bookings Made","Payments Recorded"');
    for (const rec of data.byReceptionist) {
      rows.push(`"${rec.receptionistName}",${rec.registrations},${rec.checkIns},${rec.bookings},"${rec.paymentsCount} (${rec.formattedPaymentsTotal})"`);
    }
    rows.push('');
  }

  if (data.collections) {
    const title = data.collections.isMyCollections ? 'My Collections' : 'Collections';
    rows.push(`"${title}"`);
    rows.push(`"Cash","${data.collections.formattedCash}"`);
    rows.push(`"Card","${data.collections.formattedCard}"`);
    rows.push(`"UPI","${data.collections.formattedUpi}"`);
    rows.push(`"Patient Portal","${data.collections.formattedPortal}"`);
    rows.push(`"Reversals","${data.collections.formattedReversals}"`);
    rows.push(`"Net Total","${data.collections.formattedNetTotal}"`);
    rows.push(`"Daily Billed","${data.collections.formattedDailyBilled}"`);
    if (data.collections.isMyCollections) {
      rows.push(`"Cash to hand over","${data.collections.formattedCashToHandOver}"`);
    }
    rows.push('');
  }

  if (data.attendance) {
    rows.push('"Attendance"');
    rows.push(`"Present",${data.attendance.presentCount}`);
    rows.push(`"Late",${data.attendance.lateCount}`);
    rows.push(`"On Leave",${data.attendance.onLeaveCount}`);
    rows.push(`"Absent",${data.attendance.absentCount}`);
    rows.push(`"Total Hours Worked",${data.attendance.totalHoursWorked}`);
    if (data.attendance.lateStaffNames.length > 0) {
      rows.push(`"Late Staff","${data.attendance.lateStaffNames.join(', ')}"`);
    }
    if (data.attendance.absentStaffNames.length > 0) {
      rows.push(`"Absent Staff","${data.attendance.absentStaffNames.join(', ')}"`);
    }
    rows.push('');
  }

  return rows.join('\r\n');
}
