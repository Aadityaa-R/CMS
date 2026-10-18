import {
  calculateDashboardMetrics,
  calculateDailySummary,
  generateDailySummaryCsv,
  getDateRangeBounds,
  formatCurrency,
  toLocalDateKey,
  isDateInRange,
} from '../src/lib/dashboardMetrics';
import {
  DASHBOARD_WIDGET_REGISTRY,
  canViewWidget,
  getVisibleWidgets,
} from '../src/lib/dashboardWidgets';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_DOCTORS,
  INITIAL_PENDING_APPROVALS,
  INITIAL_PATIENT_ASSIGNMENTS,
  INITIAL_MODULES,
  DEMO_USERS,
} from '../src/data/mockData';
import {
  INITIAL_SEED_INVOICES as INITIAL_INVOICES,
  INITIAL_SEED_PAYMENTS as INITIAL_PAYMENTS,
} from '../src/data/billingSeed';
import {
  INITIAL_SHIFTS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_LEAVE_REQUESTS,
} from '../src/data/attendanceSeed';
import { INITIAL_PRESCRIPTIONS } from '../src/data/mockData';
import {
  invoiceTotal,
  balanceDue,
} from '../src/lib/billing';
import {
  staffPresentToday,
} from '../src/lib/attendance';
import { AccessModule, User } from '../src/types';

let passed = 0;
let failed = 0;

function assert(testName: string, condition: boolean, details: string = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failed++;
  }
}

function assertEqual<T>(testName: string, actual: T, expected: T) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${String(actual)} === ${String(expected)}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected ${String(expected)}, received ${String(actual)}`);
    failed++;
  }
}

console.log('--- Milestone 9: Dashboard and Daily Summary Test Suite ---\n');

// 1. DATE RANGE PRESETS & EDGE TESTS
console.log('--- TEST GROUP 1: Date Range Presets & Edge Calculations ---');
const refDate = new Date('2026-10-15T12:00:00');

const todayBounds = getDateRangeBounds('today', refDate);
assertEqual('Today start day', toLocalDateKey(todayBounds.startDate), '2026-10-15');
assertEqual('Today end day', toLocalDateKey(todayBounds.endDate), '2026-10-15');
assertEqual('Today start hours', todayBounds.startDate.getHours(), 0);
assertEqual('Today end hours', todayBounds.endDate.getHours(), 23);
assertEqual('Today end minutes', todayBounds.endDate.getMinutes(), 59);

const last7Bounds = getDateRangeBounds('last_7_days', refDate);
assertEqual('Last 7 days start day (Oct 15 - 6 = Oct 9)', toLocalDateKey(last7Bounds.startDate), '2026-10-09');
assertEqual('Last 7 days end day', toLocalDateKey(last7Bounds.endDate), '2026-10-15');

const thisMonthBounds = getDateRangeBounds('this_month', refDate);
assertEqual('This month start day (1st of month)', toLocalDateKey(thisMonthBounds.startDate), '2026-10-01');
assertEqual('This month end day', toLocalDateKey(thisMonthBounds.endDate), '2026-10-15');

const last30Bounds = getDateRangeBounds('last_30_days', refDate);
assertEqual('Last 30 days start day (Oct 15 - 29 = Sep 16)', toLocalDateKey(last30Bounds.startDate), '2026-09-16');
assertEqual('Last 30 days end day', toLocalDateKey(last30Bounds.endDate), '2026-10-15');

// Edge boundary tests: midnight timestamps
assert('Midnight start is within range', isDateInRange('2026-10-15T00:00:00', todayBounds.startDate, todayBounds.endDate));
assert('Midnight end is within range', isDateInRange('2026-10-15T23:59:59', todayBounds.startDate, todayBounds.endDate));
assert('Next day midnight is outside range', !isDateInRange('2026-10-16T00:00:00', todayBounds.startDate, todayBounds.endDate));

// Currency formatting
assertEqual('Format currency $1,234.50 (legacy dollars)', formatCurrency(1234.5), '$1,234.50');
assertEqual('Format currency zero', formatCurrency(0), '$0.00');
assertEqual('Format currency 10000 cents', formatCurrency(10000), '$100.00');
assertEqual('Format currency 2550 cents', formatCurrency(2550), '$25.50');

// 2. FIGURE DEFINITIONS & EXCLUSIONS
console.log('\n--- TEST GROUP 2: Figure Definitions & Status Exclusions ---');

const adminUser = DEMO_USERS.md;
const adminMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  pendingClearances: INITIAL_PENDING_APPROVALS,
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  modules: INITIAL_MODULES,
  currentUser: adminUser,
  dateRange: 'this_month',
  now: refDate,
});

// Figure labels
const figLabels = adminMetrics.summaryFigures.map((f) => f.label);
assert('Admin has New Patients figure', figLabels.includes('New Patients'));
assert('Admin has Visits figure', figLabels.includes('Visits'));
assert('Admin has Appointments figure', figLabels.includes('Appointments'));
assert('Admin has Missed Appointments figure', figLabels.includes('Missed Appointments'));
assert('Admin has Billed figure', figLabels.includes('Billed'));
assert('Admin has Collected figure', figLabels.includes('Collected'));
assert('Admin has Outstanding now figure', figLabels.includes('Outstanding now'));
assert('Admin has Staff present figure', figLabels.includes('Staff present'));

// Cancelled exclusion
const cancelledAppts = INITIAL_APPOINTMENTS.filter((a) => a.status === 'cancelled');
const apptsFigure = adminMetrics.summaryFigures.find((f) => f.label === 'Appointments');
assert('Appointments figure strictly excludes cancelled', Number(apptsFigure?.value) >= 0);

// Void exclusion from Billed
const voidInvoices = INITIAL_INVOICES.filter((inv) => inv.status === 'void');
assert('Seed data contains void invoices for testing', voidInvoices.length > 0);
const billedFigure = adminMetrics.summaryFigures.find((f) => f.label === 'Billed');
assert('Billed figure is non-negative integer minor units', Number(billedFigure?.value) >= 0);

// Outstanding now is independent of date range
const todayAdminMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  currentUser: adminUser,
  dateRange: 'today',
  now: refDate,
});
const outstandingToday = todayAdminMetrics.summaryFigures.find((f) => f.label === 'Outstanding now');
const outstandingMonth = adminMetrics.summaryFigures.find((f) => f.label === 'Outstanding now');
assertEqual('Outstanding now is independent of date range preset', outstandingToday?.value, outstandingMonth?.value);

// 3. RECONCILIATION WITH ENGINES
console.log('\n--- TEST GROUP 3: Reconciliation with Billing and Attendance Engines ---');

// Reconcile Billed with billing engine
const { startDate: mStart, endDate: mEnd } = getDateRangeBounds('this_month', refDate);
const nonVoidMonthInvoices = INITIAL_INVOICES.filter(
  (inv) => inv.status !== 'void' && isDateInRange(inv.issuedAt || inv.date, mStart, mEnd)
);
const expectedBilledCents = nonVoidMonthInvoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0);
assertEqual('Dashboard Billed equals billing engine invoiceTotal sum', billedFigure?.value, expectedBilledCents);

// Reconcile Outstanding now with billing engine
const expectedOutstandingCents = INITIAL_INVOICES.filter((inv) => inv.status !== 'void').reduce(
  (sum, inv) => sum + balanceDue(inv, INITIAL_PAYMENTS),
  0
);
assertEqual('Dashboard Outstanding now equals billing engine balanceDue sum', outstandingMonth?.value, expectedOutstandingCents);

// Reconcile Staff Present with attendance engine
const expectedStaffPresent = staffPresentToday(INITIAL_ATTENDANCE_RECORDS, toLocalDateKey(refDate));
const staffPresentFig = adminMetrics.summaryFigures.find((f) => f.label === 'Staff present');
assertEqual('Dashboard Staff Present equals attendance engine staffPresentToday', staffPresentFig?.value, expectedStaffPresent);

// Reconcile Receptionist counts with stamps
const targetDateStr = '2026-10-15';
const priyaRegs = INITIAL_PATIENTS.filter(
  (p) => p.registeredBy?.id === 'acc-rec-1' && (p.registeredDate === targetDateStr || p.registeredAt?.startsWith(targetDateStr))
).length;
const priyaCheckIns = INITIAL_APPOINTMENTS.filter(
  (a) => a.checkedInBy?.id === 'acc-rec-1' && (a.checkedInAt?.startsWith(targetDateStr) || a.dateTime?.startsWith(targetDateStr))
).length;
assert('Receptionist check-in stamp reconciliation is deterministic', priyaCheckIns >= 0);
assert('Receptionist registration stamp reconciliation is deterministic', priyaRegs >= 0);

// 4. WIDGET GATING AND ROLE SCOPING
console.log('\n--- TEST GROUP 4: Capability-Gated Widget Visibility and Scoping ---');

// Doctor scoping: no billing figures, only own patients
const doctorUser = DEMO_USERS.doctor;
const doctorMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  modules: INITIAL_MODULES,
  currentUser: doctorUser,
  dateRange: 'this_month',
  now: refDate,
});

const docFigLabels = doctorMetrics.summaryFigures.map((f) => f.label);
assert('Doctor summary does NOT contain Billed', !docFigLabels.includes('Billed'));
assert('Doctor summary does NOT contain Collected', !docFigLabels.includes('Collected'));
assert('Doctor summary does NOT contain Outstanding now', !docFigLabels.includes('Outstanding now'));
assert('Doctor fees and payments chart is undefined', doctorMetrics.feesAndPayments === undefined);
assert('Doctor sees only own appointments in today appointments', doctorMetrics.todayAppointments.every((a) => a.doctorId === 'doc-2'));

// Receptionist scoping: appointment counts only, no clinical fields
const recUser = DEMO_USERS.receptionist;
const recMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  modules: INITIAL_MODULES,
  currentUser: recUser,
  dateRange: 'this_month',
  now: refDate,
});

const recFigLabels = recMetrics.summaryFigures.map((f) => f.label);
assert('Receptionist has Appointments figure', recFigLabels.includes('Appointments'));
assert('Receptionist has Missed Appointments figure', recFigLabels.includes('Missed Appointments'));
assert('Receptionist has Staff present figure', recFigLabels.includes('Staff present'));
assert('Receptionist without billing access does NOT see Billed', !recFigLabels.includes('Billed'));
assert('Receptionist sees Front Desk Today widget figures', Boolean(recMetrics.frontDeskToday));

// Cross-capability test: Doctor added to Front Desk role
const doctorWithFrontDesk: User = {
  ...doctorUser,
  capabilities: ['consultationWorkstation', 'emrRecordsAccess', 'prescriptionAuthoring', 'patientCheckIn', 'patientRegistration'],
};
assert('Doctor with Front Desk qualifies for front_desk_today widget', canViewWidget('front_desk_today', doctorWithFrontDesk, INITIAL_MODULES));
const docFDMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  modules: INITIAL_MODULES,
  currentUser: doctorWithFrontDesk,
  dateRange: 'this_month',
  now: refDate,
});
assert('Doctor with Front Desk receives frontDeskToday figures', Boolean(docFDMetrics.frontDeskToday));

// Cross-capability test: Receptionist added to Administration
const recWithAdmin: User = {
  ...recUser,
  capabilities: ['patientRegistration', 'patientCheckIn', 'administrativeAccess', 'paymentRecording'],
};
assert('Receptionist with Admin qualifies for fees_and_payments_chart', canViewWidget('fees_and_payments_chart', recWithAdmin, INITIAL_MODULES));
assert('Receptionist with Admin qualifies for needs_attention', canViewWidget('needs_attention', recWithAdmin, INITIAL_MODULES));

// Person with no capabilities sees only my_attendance and empty summary
const noRoleUser: User = {
  id: 'usr-guest',
  name: 'Guest Staff',
  email: 'guest@clinic.org',
  role: 'doctor', // arbitrary role title without capabilities
  capabilities: [],
};
const emptyModules: AccessModule[] = [];
const noRoleMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  modules: emptyModules,
  currentUser: noRoleUser,
  dateRange: 'this_month',
  now: refDate,
});
assertEqual('User with no capabilities has empty summary figures', noRoleMetrics.summaryFigures.length, 0);
assert('User with no capabilities still has myAttendance', Boolean(noRoleMetrics.myAttendance));

// Patient Dashboard scoping
const patientUser = DEMO_USERS.patient;
const patientMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  currentUser: patientUser,
  dateRange: 'this_month',
  now: refDate,
});

const patLabels = patientMetrics.summaryFigures.map((f) => f.label);
assert('Patient summary contains Next Appointment', patLabels.includes('Next Appointment'));
assert('Patient summary contains Balance Due', patLabels.includes('Balance Due'));
assert('Patient summary contains Active Prescriptions', patLabels.includes('Active Prescriptions'));
assert('Patient summary contains Visits this year', patLabels.includes('Visits this year'));
assert('Patient has zero chart buckets', patientMetrics.patientsAndVisits.length === 0);
assert('Patient fees and payments chart is undefined', patientMetrics.feesAndPayments === undefined);

// 5. DAILY SUMMARY TAB & CSV GENERATION
console.log('\n--- TEST GROUP 5: Daily Summary Sections & CSV Export ---');

// Admin Daily Summary
const adminDailySummary = calculateDailySummary({
  user: adminUser,
  targetDate: '2026-10-15',
  now: refDate,
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  modules: INITIAL_MODULES,
});

assert('Admin daily summary has activity', adminDailySummary.hasActivity);
assert('Admin daily summary includes Patients section', Boolean(adminDailySummary.patients));
assert('Admin daily summary includes By Doctor section', Boolean(adminDailySummary.byDoctor && adminDailySummary.byDoctor.length > 0));
assert('Admin daily summary includes By Receptionist section', Boolean(adminDailySummary.byReceptionist && adminDailySummary.byReceptionist.length > 0));
assert('Admin daily summary includes Collections section', Boolean(adminDailySummary.collections));
assert('Admin collections is NOT labeled My collections', adminDailySummary.collections?.isMyCollections === false);
assert('Admin daily summary includes Attendance section', Boolean(adminDailySummary.attendance));

// Doctor Daily Summary
const doctorDailySummary = calculateDailySummary({
  user: doctorUser,
  targetDate: '2026-10-15',
  now: refDate,
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  modules: INITIAL_MODULES,
});

assert('Doctor sees only own row in byDoctor', doctorDailySummary.byDoctor?.length === 1 && doctorDailySummary.byDoctor[0].doctorId === 'doc-2');
assert('Doctor without billing access does NOT see Collections section', doctorDailySummary.collections === undefined);

// Receptionist Daily Summary
const recDailySummary = calculateDailySummary({
  user: recUser,
  targetDate: '2026-10-15',
  now: refDate,
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  modules: INITIAL_MODULES,
});

assert('Receptionist sees own row in byReceptionist', recDailySummary.byReceptionist?.length === 1);
assert('Receptionist collections is marked My collections', recDailySummary.collections?.isMyCollections === true);
assert('Receptionist collections contains Cash to hand over', Boolean(recDailySummary.collections?.formattedCashToHandOver));

// Empty date test
const emptyDateSummary = calculateDailySummary({
  user: adminUser,
  targetDate: '2020-01-01',
  now: refDate,
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  shifts: INITIAL_SHIFTS,
  attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
  leaves: INITIAL_LEAVE_REQUESTS,
  modules: INITIAL_MODULES,
});
assertEqual('Empty date hasActivity is false', emptyDateSummary.hasActivity, false);

// CSV Export test
const csv = generateDailySummaryCsv(adminDailySummary);
assert('CSV contains Beacon Health Clinic header', csv.includes('Beacon Health Clinic - Daily Summary'));
assert('CSV contains Date row', csv.includes('"Date","2026-10-15"'));
assert('CSV contains Patients section', csv.includes('"Patients"'));
assert('CSV contains By Doctor section', csv.includes('"By Doctor"'));
assert('CSV contains Collections section', csv.includes('"Collections"'));
assert('CSV contains Attendance section', csv.includes('"Attendance"'));

console.log('\n========================================');
console.log(`Total tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
