import {
  Patient,
  Doctor,
  Appointment,
  AppointmentStatus,
  Prescription,
  User,
  UserRole,
  PatientAssignment,
} from '@/types';
import { isAdmin } from '@/lib/permissions';
import { PendingStaffApproval } from '@/data/mockData';

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

export interface FollowUpDueRow {
  id: string;
  patientId: string;
  patientName: string;
  dueDate: string;
  doctorId: string;
  doctorName: string;
  reason?: string;
}

export interface PendingClearanceRow {
  id: string;
  name: string;
  role: string;
  department: string;
  applied: string;
}

export interface PatientAppointmentRow {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  department: string;
  reason: string;
  status: AppointmentStatus;
}

export interface PatientPrescriptionRow {
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
  invoices: any[];
  payments?: any[];
  prescriptions: Prescription[];
  doctors?: Doctor[];
  users?: User[];
  pendingClearances?: PendingStaffApproval[];
  role: UserRole;
  userId: string;
  currentUser?: User | null;
  patientAssignments?: PatientAssignment[];
  dateRange: DateRangePreset;
  chartBucket?: ChartBucketType;
  referenceDate?: Date;
}

export interface DashboardMetricsResult {
  summaryFigures: SummaryFigure[];
  patientsAndVisits: PatientsAndVisitsBucket[];
  feesAndPayments?: FeesAndPaymentsBucket[];
  visitsTrend?: VisitsTrendBucket[];
  todayAppointments: TodayAppointmentRow[];
  followUpsDue: FollowUpDueRow[];
  pendingClearances: PendingClearanceRow[];
  patientUpcomingAppointments?: PatientAppointmentRow[];
  patientRecentPrescriptions?: PatientPrescriptionRow[];
  activeDateRange: {
    preset: DateRangePreset;
    startDate: Date;
    endDate: Date;
  };
  activeBucketType: ChartBucketType;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

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

function resolveDoctorId(userId: string, doctors: Doctor[] = []): string {
  if (userId.startsWith('doc-')) return userId;
  if (userId === 'usr-doc-1' || userId === 'md') return 'doc-1';
  if (userId === 'usr-doc-2' || userId === 'doctor') return 'doc-2';
  if (userId === 'usr-doc-3') return 'doc-3';
  const found = doctors.find(
    (d) => d.id === userId || d.email.toLowerCase() === userId.toLowerCase()
  );
  return found ? found.id : 'doc-2';
}

function resolvePatientId(userId: string, patients: Patient[] = []): string {
  if (userId.startsWith('pat-')) return userId;
  if (userId === 'usr-pat-1' || userId === 'patient') return 'pat-1';
  const found = patients.find(
    (p) => p.id === userId || p.email.toLowerCase() === userId.toLowerCase()
  );
  return found ? found.id : 'pat-1';
}

export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  if (dateStr.includes(' ')) return dateStr.split(' ')[0];
  return dateStr;
}

function isDateInRange(dateStr: string, startDate: Date, endDate: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();
}

function isSameDay(dateStr: string, targetDate: Date): boolean {
  if (!dateStr) return false;
  const targetIso = toLocalDateKey(targetDate);
  const dateIso = parseDateOnly(dateStr);
  return dateIso === targetIso;
}

function formatTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  if (dateTimeStr.includes('T')) {
    const timePart = dateTimeStr.split('T')[1];
    return timePart.substring(0, 5);
  }
  return dateTimeStr;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDayMonth(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatMonth(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getInvBilled(inv: any): number {
  if (inv.items && Array.isArray(inv.items)) {
    let cents = 0;
    for (const it of inv.items) {
      if (it.kind === 'consultation' || it.kind === 'charge') cents += it.amount;
      else if (it.kind === 'discount') cents -= it.amount;
    }
    return Math.max(0, cents) / 100;
  }
  return inv.totalAmount || 0;
}

function getInvPaid(inv: any, payments: any[] = []): number {
  if (payments && payments.length > 0) {
    let cents = 0;
    for (const p of payments) {
      if (p.invoiceId === inv.id) {
        if (p.kind === 'payment') cents += p.amount;
        else if (p.kind === 'reversal') cents -= p.amount;
      }
    }
    return Math.max(0, cents) / 100;
  }
  if (typeof inv.paidAmount === 'number') {
    return inv.paidAmount;
  }
  return 0;
}

function getInvOutstanding(inv: any, payments: any[] = []): number {
  if (inv.status === 'void') return 0;
  const billed = getInvBilled(inv);
  const paid = getInvPaid(inv, payments);
  return Math.max(0, billed - paid);
}

function getInvDate(inv: any): string {
  if (inv.issuedAt) return inv.issuedAt.split('T')[0];
  return inv.date || '';
}

export function calculateDashboardMetrics(
  options: CalculateDashboardMetricsOptions
): DashboardMetricsResult {
  const {
    patients,
    appointments,
    invoices,
    payments = [],
    prescriptions,
    doctors = [],
    pendingClearances = [],
    role,
    userId,
    dateRange,
    chartBucket,
    referenceDate = new Date(),
  } = options;

  const { startDate, endDate } = getDateRangeBounds(dateRange, referenceDate);
  const diffDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const activeBucketType: ChartBucketType =
    chartBucket || (diffDays <= 31 ? 'day' : 'week');

  const actingUser: User | { role?: string; id?: string } = options.currentUser || {
    id: userId,
    role,
  };
  const isMD = isAdmin(actingUser);
  const isStaffDoctor = !isMD && (role === 'doctor' || actingUser.role === 'doctor');
  const isReceptionist = !isMD && (role === 'receptionist' || actingUser.role === 'receptionist');
  const isPatient = role === 'patient' || actingUser.role === 'patient';

  const doctorId = isStaffDoctor ? resolveDoctorId(userId, doctors) : '';
  const patientId = isPatient ? resolvePatientId(userId, patients) : '';

  // Scope appointments
  const scopedAppointments = isStaffDoctor
    ? appointments.filter((a) => a.doctorId === doctorId)
    : isPatient
    ? appointments.filter((a) => a.patientId === patientId)
    : appointments;

  // Range-filtered appointments
  const rangeAppointments = scopedAppointments.filter((a) =>
    isDateInRange(a.dateTime, startDate, endDate)
  );

  // Completed or in-consultation appointments are clinical visits
  const visits = rangeAppointments.filter(
    (a) => a.status === 'completed' || a.status === 'in_consultation'
  );

  const missedAppointments = rangeAppointments.filter(
    (a) => a.status === 'cancelled' || a.status === 'no_show'
  );

  // Scope patients
  let scopedNewPatients = 0;
  if (isMD || isReceptionist) {
    scopedNewPatients = patients.filter((p) =>
      isDateInRange(p.registeredDate, startDate, endDate)
    ).length;
  } else if (isStaffDoctor) {
    const doctorPatientIds = new Set(scopedAppointments.map((a) => a.patientId));
    scopedNewPatients = patients.filter(
      (p) => doctorPatientIds.has(p.id) && isDateInRange(p.registeredDate, startDate, endDate)
    ).length;
  }

  // Follow-ups calculation
  const followUpCandidates = scopedAppointments.filter((a) => {
    const reason = (a.reasonForVisit || '').toLowerCase();
    return reason.includes('follow-up') || reason.includes('follow up');
  });

  const followUpsDue: FollowUpDueRow[] = followUpCandidates
    .map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patientName,
      dueDate: parseDateOnly(a.dateTime),
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      reason: a.reasonForVisit,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Range invoices (MD, Receptionist, Patient)
  const scopedInvoices = isStaffDoctor
    ? []
    : isPatient
    ? invoices.filter((i) => i.patientId === patientId)
    : invoices;

  const rangeInvoices = scopedInvoices.filter((i) =>
    isDateInRange(getInvDate(i), startDate, endDate)
  );

  const billedTotal = rangeInvoices.reduce((sum, inv) => sum + getInvBilled(inv), 0);
  const collectedTotal = rangeInvoices.reduce((sum, inv) => sum + getInvPaid(inv, payments), 0);
  const outstandingTotal = scopedInvoices
    .filter((i) => i.status === 'unpaid' || i.status === 'partially_paid')
    .reduce((sum, inv) => sum + getInvOutstanding(inv, payments), 0);

  // Summary figures per role
  const summaryFigures: SummaryFigure[] = [];

  if (isMD) {
    summaryFigures.push(
      { label: 'New Patients', value: scopedNewPatients },
      { label: 'Visits', value: visits.length },
      { label: 'Appointments', value: rangeAppointments.length },
      { label: 'Missed Appointments', value: missedAppointments.length },
      { label: 'Billed', value: billedTotal, formattedValue: formatCurrency(billedTotal) },
      { label: 'Collected', value: collectedTotal, formattedValue: formatCurrency(collectedTotal) },
      { label: 'Outstanding', value: outstandingTotal, formattedValue: formatCurrency(outstandingTotal) },
      { label: 'Pending Clearances', value: pendingClearances.length }
    );
  } else if (isStaffDoctor) {
    summaryFigures.push(
      { label: 'New Patients', value: scopedNewPatients },
      { label: 'Visits', value: visits.length },
      { label: 'Appointments', value: rangeAppointments.length },
      { label: 'Missed Appointments', value: missedAppointments.length },
      { label: 'Follow-ups Due', value: followUpsDue.length }
    );
  } else if (isReceptionist) {
    const appointmentsToday = appointments.filter((a) =>
      isSameDay(a.dateTime, referenceDate)
    ).length;
    const checkedInToday = appointments.filter(
      (a) =>
        isSameDay(a.dateTime, referenceDate) &&
        (a.status === 'checked_in' || a.status === 'in_consultation')
    ).length;

    summaryFigures.push(
      { label: 'Appointments Today', value: appointmentsToday },
      { label: 'Checked In', value: checkedInToday },
      { label: 'New Registrations', value: scopedNewPatients },
      {
        label: 'Outstanding Payments',
        value: outstandingTotal,
        formattedValue: formatCurrency(outstandingTotal),
      }
    );
  } else if (isPatient) {
    const upcoming = scopedAppointments
      .filter((a) => {
        const d = new Date(a.dateTime);
        return d.getTime() >= startDate.getTime() && a.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const nextAppt = upcoming[0];
    const nextApptStr = nextAppt
      ? `${formatDayMonth(new Date(nextAppt.dateTime))}, ${formatTime(nextAppt.dateTime)}`
      : 'None scheduled';

    const activePrescriptionsCount = prescriptions.filter(
      (p) => p.patientId === patientId && p.status !== 'dispensed'
    ).length;

    const patientBalanceDue = scopedInvoices
      .filter((i) => i.status === 'unpaid' || i.status === 'partially_paid')
      .reduce((sum, inv) => sum + Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)), 0);

    summaryFigures.push(
      { label: 'Next Appointment', value: nextApptStr },
      { label: 'Active Prescriptions', value: activePrescriptionsCount },
      {
        label: 'Balance Due',
        value: patientBalanceDue,
        formattedValue: formatCurrency(patientBalanceDue),
      }
    );
  }

  // Chart Buckets Generation
  const patientsAndVisits: PatientsAndVisitsBucket[] = [];
  const feesAndPayments: FeesAndPaymentsBucket[] = [];
  const visitsTrend: VisitsTrendBucket[] = [];

  if (activeBucketType === 'day') {
    const cur = new Date(startDate);
    while (cur.getTime() <= endDate.getTime()) {
      const dateKey = toLocalDateKey(cur);
      const label = formatDayMonth(cur);

      let newPtsCount = 0;
      if (isMD) {
        newPtsCount = patients.filter((p) => parseDateOnly(p.registeredDate) === dateKey).length;
      } else if (isStaffDoctor) {
        const docPts = new Set(scopedAppointments.map((a) => a.patientId));
        newPtsCount = patients.filter(
          (p) => docPts.has(p.id) && parseDateOnly(p.registeredDate) === dateKey
        ).length;
      }

      const dayVisits = scopedAppointments.filter(
        (a) =>
          parseDateOnly(a.dateTime) === dateKey &&
          (a.status === 'completed' || a.status === 'in_consultation')
      ).length;

      patientsAndVisits.push({
        dateKey,
        label,
        newPatients: newPtsCount,
        visits: dayVisits,
      });

      if (isMD) {
        const dayInvoices = invoices.filter((i) => parseDateOnly(getInvDate(i)) === dateKey);
        const dayBilled = dayInvoices.reduce((sum, i) => sum + getInvBilled(i), 0);
        const dayCollected = dayInvoices.reduce((sum, i) => sum + getInvPaid(i, payments), 0);
        const dayOutstanding = Math.max(0, dayBilled - dayCollected);

        feesAndPayments.push({
          dateKey,
          label,
          billed: dayBilled,
          collected: dayCollected,
          outstanding: dayOutstanding,
        });
      }

      if (isStaffDoctor) {
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

      let newPtsCount = 0;
      if (isMD) {
        newPtsCount = patients.filter((p) =>
          isDateInRange(p.registeredDate, weekStart, weekEnd)
        ).length;
      } else if (isStaffDoctor) {
        const docPts = new Set(scopedAppointments.map((a) => a.patientId));
        newPtsCount = patients.filter(
          (p) => docPts.has(p.id) && isDateInRange(p.registeredDate, weekStart, weekEnd)
        ).length;
      }

      const weekVisits = scopedAppointments.filter(
        (a) =>
          isDateInRange(a.dateTime, weekStart, weekEnd) &&
          (a.status === 'completed' || a.status === 'in_consultation')
      ).length;

      patientsAndVisits.push({
        dateKey,
        label,
        newPatients: newPtsCount,
        visits: weekVisits,
      });

      if (isMD) {
        const weekInvoices = invoices.filter((i) => isDateInRange(getInvDate(i), weekStart, weekEnd));
        const weekBilled = weekInvoices.reduce((sum, i) => sum + getInvBilled(i), 0);
        const weekCollected = weekInvoices.reduce((sum, i) => sum + getInvPaid(i, payments), 0);
        feesAndPayments.push({
          dateKey,
          label,
          billed: weekBilled,
          collected: weekCollected,
          outstanding: Math.max(0, weekBilled - weekCollected),
        });
      }

      if (isStaffDoctor) {
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

      let newPtsCount = 0;
      if (isMD) {
        newPtsCount = patients.filter((p) =>
          isDateInRange(p.registeredDate, monthStart, monthEnd)
        ).length;
      } else if (isStaffDoctor) {
        const docPts = new Set(scopedAppointments.map((a) => a.patientId));
        newPtsCount = patients.filter(
          (p) => docPts.has(p.id) && isDateInRange(p.registeredDate, monthStart, monthEnd)
        ).length;
      }

      const monthVisits = scopedAppointments.filter(
        (a) =>
          isDateInRange(a.dateTime, monthStart, monthEnd) &&
          (a.status === 'completed' || a.status === 'in_consultation')
      ).length;

      patientsAndVisits.push({
        dateKey,
        label,
        newPatients: newPtsCount,
        visits: monthVisits,
      });

      if (isMD) {
        const monthInvoices = invoices.filter((i) =>
          isDateInRange(getInvDate(i), monthStart, monthEnd)
        );
        const monthBilled = monthInvoices.reduce((sum, i) => sum + getInvBilled(i), 0);
        const monthCollected = monthInvoices.reduce((sum, i) => sum + getInvPaid(i, payments), 0);
        feesAndPayments.push({
          dateKey,
          label,
          billed: monthBilled,
          collected: monthCollected,
          outstanding: Math.max(0, monthBilled - monthCollected),
        });
      }

      if (isStaffDoctor) {
        visitsTrend.push({
          dateKey,
          label,
          visits: monthVisits,
        });
      }

      cur.setMonth(cur.getMonth() + 1);
    }
  }

  // Today's Appointments List
  const todayAppointments: TodayAppointmentRow[] = scopedAppointments
    .filter((a) => isSameDay(a.dateTime, referenceDate))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .map((a) => ({
      id: a.id,
      time: formatTime(a.dateTime),
      patientId: a.patientId,
      patientName: a.patientName,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      status: a.status,
    }));

  // Pending Clearances List (MD only)
  const pendingClearancesList: PendingClearanceRow[] = isMD
    ? pendingClearances.map((p) => ({
        id: p.id,
        name: p.staffName,
        role: p.role === 'doctor' ? 'Doctor' : 'Receptionist',
        department: p.department,
        applied: parseDateOnly(p.requestedAt),
      }))
    : [];

  // Patient Upcoming Appointments List
  const patientUpcomingAppointments: PatientAppointmentRow[] | undefined = isPatient
    ? scopedAppointments
        .filter((a) => {
          const d = new Date(a.dateTime);
          return d.getTime() >= startDate.getTime() && a.status !== 'cancelled';
        })
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
        .map((a) => ({
          id: a.id,
          date: formatDate(a.dateTime),
          time: formatTime(a.dateTime),
          doctorName: a.doctorName,
          department: a.department,
          reason: a.reasonForVisit,
          status: a.status,
        }))
    : undefined;

  // Patient Recent Prescriptions List
  const patientRecentPrescriptions: PatientPrescriptionRow[] | undefined = isPatient
    ? prescriptions
        .filter((p) => p.patientId === patientId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((p) => ({
          id: p.id,
          date: formatDate(p.date),
          prescriptionNumber: p.prescriptionNumber,
          doctorName: p.doctorName,
          diagnosis: p.diagnosis,
          medications: p.items.map((i) => `${i.medicineName} (${i.dosage})`).join(', '),
          status: p.status,
        }))
    : undefined;

  return {
    summaryFigures,
    patientsAndVisits,
    feesAndPayments: isMD ? feesAndPayments : undefined,
    visitsTrend: isStaffDoctor ? visitsTrend : undefined,
    todayAppointments,
    followUpsDue,
    pendingClearances: pendingClearancesList,
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
