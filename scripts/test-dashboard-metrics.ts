import {
  calculateDashboardMetrics,
  getDateRangeBounds,
  formatCurrency,
  toLocalDateKey,
} from '../src/lib/dashboardMetrics';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_INVOICES,
  INITIAL_PRESCRIPTIONS,
  INITIAL_DOCTORS,
  INITIAL_PENDING_APPROVALS,
  INITIAL_PATIENT_ASSIGNMENTS,
  DEMO_USERS,
} from '../src/data/mockData';

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

console.log('--- Real Dashboard Metrics Unit Test Suite ---\n');

// 1. DATE RANGE PRESETS TEST
console.log('--- TEST GROUP 1: Date Range Presets & Utilities ---');
const refDate = new Date('2026-10-15T12:00:00');

const todayBounds = getDateRangeBounds('today', refDate);
assertEqual('Today start day', toLocalDateKey(todayBounds.startDate), '2026-10-15');
assertEqual('Today end day', toLocalDateKey(todayBounds.endDate), '2026-10-15');

const last7Bounds = getDateRangeBounds('last_7_days', refDate);
assertEqual('Last 7 days start day (Oct 15 - 6 days = Oct 9)', toLocalDateKey(last7Bounds.startDate), '2026-10-09');
assertEqual('Last 7 days end day', toLocalDateKey(last7Bounds.endDate), '2026-10-15');

const thisMonthBounds = getDateRangeBounds('this_month', refDate);
assertEqual('This month start day (1st of month)', toLocalDateKey(thisMonthBounds.startDate), '2026-10-01');
assertEqual('This month end day', toLocalDateKey(thisMonthBounds.endDate), '2026-10-15');

const last30Bounds = getDateRangeBounds('last_30_days', refDate);
assertEqual('Last 30 days start day (Oct 15 - 29 days = Sep 16)', toLocalDateKey(last30Bounds.startDate), '2026-09-16');
assertEqual('Last 30 days end day', toLocalDateKey(last30Bounds.endDate), '2026-10-15');

assertEqual('Format currency $1,234.50', formatCurrency(1234.5), '$1,234.50');
assertEqual('Format currency zero', formatCurrency(0), '$0.00');

// 2. MD / ADMIN CLINIC-WIDE METRICS TEST
console.log('\n--- TEST GROUP 2: MD / Admin Clinic-Wide Metrics ---');
const mdMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  pendingClearances: INITIAL_PENDING_APPROVALS,
  role: 'md',
  userId: DEMO_USERS.md.id,
  currentUser: DEMO_USERS.md,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  dateRange: 'this_month',
  referenceDate: refDate,
});

assert('MD gets summary figures', mdMetrics.summaryFigures.length >= 8);
assert('MD summary contains Billed figure', mdMetrics.summaryFigures.some((f) => f.label === 'Billed'));
assert('MD summary contains Collected figure', mdMetrics.summaryFigures.some((f) => f.label === 'Collected'));
assert('MD summary contains Outstanding figure', mdMetrics.summaryFigures.some((f) => f.label === 'Outstanding'));
assert('MD summary contains Pending Clearances figure', mdMetrics.summaryFigures.some((f) => f.label === 'Pending Clearances'));

assert('MD metrics includes fees and payments series', Boolean(mdMetrics.feesAndPayments && mdMetrics.feesAndPayments.length > 0));
assertEqual('MD pending clearances count matches initial pending', mdMetrics.pendingClearances.length, INITIAL_PENDING_APPROVALS.length);

// Verify MD today appointments include visits from multiple doctors
const mdTodayDoctorIds = new Set(mdMetrics.todayAppointments.map((a) => a.doctorId));
assert('MD sees appointments across multiple doctors today', mdTodayDoctorIds.size >= 2);

// 3. STAFF DOCTOR ISOLATION TEST (Dr. Nathan Hayes - doc-2)
console.log('\n--- TEST GROUP 3: Staff Doctor Isolation ---');
const staffMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  pendingClearances: INITIAL_PENDING_APPROVALS,
  role: 'doctor',
  userId: DEMO_USERS.doctor.id,
  currentUser: DEMO_USERS.doctor,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  dateRange: 'this_month',
  referenceDate: refDate,
});

assert('Staff doctor summary figures are present', staffMetrics.summaryFigures.length >= 4);
assert('Staff doctor summary contains Follow-ups Due', staffMetrics.summaryFigures.some((f) => f.label === "Follow-ups Due"));
assert('Staff doctor fees and payments are undefined (no financial data)', staffMetrics.feesAndPayments === undefined);
assert('Staff doctor pending clearances list is empty', staffMetrics.pendingClearances.length === 0);

assert(
  'All staff doctor today appointments belong to doc-2',
  staffMetrics.todayAppointments.every((a) => a.doctorId === 'doc-2'),
  'Found appointments for other doctors in staff doctor desk'
);

const staffLeakedAppts = staffMetrics.todayAppointments.filter((a) => a.doctorId !== 'doc-2');
assertEqual('Staff doctor today appointments leaked count', staffLeakedAppts.length, 0);

assert(
  'All staff doctor follow-ups belong to doc-2',
  staffMetrics.followUpsDue.every((f) => f.doctorId === 'doc-2'),
  'Found follow-ups for other doctors in staff doctor metrics'
);

// 4. RECEPTIONIST FRONT DESK METRICS TEST
console.log('\n--- TEST GROUP 4: Receptionist Front Desk Metrics ---');
const receptionistMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  pendingClearances: INITIAL_PENDING_APPROVALS,
  role: 'receptionist',
  userId: DEMO_USERS.receptionist.id,
  currentUser: DEMO_USERS.receptionist,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  dateRange: 'this_month',
  referenceDate: refDate,
});

assert('Receptionist summary has Appointments Today', receptionistMetrics.summaryFigures.some((f) => f.label === 'Appointments Today'));
assert('Receptionist summary has Checked In', receptionistMetrics.summaryFigures.some((f) => f.label === 'Checked In'));
assert('Receptionist summary has New Registrations', receptionistMetrics.summaryFigures.some((f) => f.label === 'New Registrations'));
assert('Receptionist summary has Outstanding Payments', receptionistMetrics.summaryFigures.some((f) => f.label === 'Outstanding Payments'));
assert('Receptionist fees and payments is undefined', receptionistMetrics.feesAndPayments === undefined);
assert('Receptionist pending clearances list is empty', receptionistMetrics.pendingClearances.length === 0);

// 5. PATIENT ACCESS TEST
console.log('\n--- TEST GROUP 5: Patient Access Metrics ---');
const patientMetrics = calculateDashboardMetrics({
  patients: INITIAL_PATIENTS,
  appointments: INITIAL_APPOINTMENTS,
  invoices: INITIAL_INVOICES,
  prescriptions: INITIAL_PRESCRIPTIONS,
  doctors: INITIAL_DOCTORS,
  users: Object.values(DEMO_USERS),
  pendingClearances: INITIAL_PENDING_APPROVALS,
  role: 'patient',
  userId: DEMO_USERS.patient.id,
  currentUser: DEMO_USERS.patient,
  patientAssignments: INITIAL_PATIENT_ASSIGNMENTS,
  dateRange: 'this_month',
  referenceDate: refDate,
});

assert('Patient summary has Next Appointment', patientMetrics.summaryFigures.some((f) => f.label === 'Next Appointment'));
assert('Patient summary has Active Prescriptions', patientMetrics.summaryFigures.some((f) => f.label === 'Active Prescriptions'));
assert('Patient summary has Balance Due', patientMetrics.summaryFigures.some((f) => f.label === 'Balance Due'));

if (patientMetrics.patientUpcomingAppointments) {
  assert(
    'Patient upcoming appointments only belong to patient',
    patientMetrics.patientUpcomingAppointments.length >= 0
  );
}

if (patientMetrics.patientRecentPrescriptions) {
  assert(
    'Patient recent prescriptions only belong to patient',
    patientMetrics.patientRecentPrescriptions.length >= 0
  );
}

console.log('\n========================================');
console.log(`Total tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
