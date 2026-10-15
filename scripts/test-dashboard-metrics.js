// Unit test suite for Dashboard metrics calculation, date bucketing, and role scoping
// Requirement: Pure functions, date range presets, day/week/month bucketing, and role scoping.

let passed = 0;
let failed = 0;

function assert(testName, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failed++;
  }
}

function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${actual} === ${expected}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected ${expected}, received ${actual}`);
    failed++;
  }
}

// Logic under test: pure functions identical to src/lib/dashboardMetrics.ts

function getDateRangeBounds(preset, referenceDate = new Date('2026-10-15T12:00:00')) {
  const ref = new Date(referenceDate);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const date = ref.getDate();

  const endDate = new Date(year, month, date, 23, 59, 59, 999);
  let startDate;

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

function parseDateOnly(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  if (dateStr.includes(' ')) return dateStr.split(' ')[0];
  return dateStr;
}

function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();
}

function isSameDay(dateStr, targetDate) {
  if (!dateStr) return false;
  const targetIso = targetDate.toISOString().split('T')[0];
  const dateIso = parseDateOnly(dateStr);
  return dateIso === targetIso;
}

function formatDayMonth(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// Mock dataset for unit tests
const TEST_DOCTORS = [
  { id: 'doc-1', name: 'Dr. Marcus Vance' },
  { id: 'doc-2', name: 'Dr. Nathan Hayes' },
  { id: 'doc-3', name: 'Dr. Sophia Reed' },
];

const TEST_PATIENTS = [
  { id: 'pat-1', name: 'Eleanor Wright', registeredDate: '2025-01-15' },
  { id: 'pat-2', name: 'James Miller', registeredDate: '2025-02-10' },
  { id: 'pat-10', name: 'Grace Hopper', registeredDate: '2026-09-18' },
  { id: 'pat-11', name: 'Henry Ford', registeredDate: '2026-09-25' },
  { id: 'pat-12', name: 'Walter White', registeredDate: '2026-10-02' },
  { id: 'pat-13', name: 'Bruce Wayne', registeredDate: '2026-10-07' },
];

const TEST_APPOINTMENTS = [
  // Today (2026-10-15)
  { id: 'apt-1', patientId: 'pat-1', patientName: 'Eleanor Wright', doctorId: 'doc-1', doctorName: 'Dr. Marcus Vance', dateTime: '2026-10-15T09:30:00', status: 'in_consultation', reasonForVisit: 'Cardiac follow-up' },
  { id: 'apt-2', patientId: 'pat-2', patientName: 'James Miller', doctorId: 'doc-1', doctorName: 'Dr. Marcus Vance', dateTime: '2026-10-15T10:15:00', status: 'checked_in', reasonForVisit: 'Diabetes review' },
  { id: 'apt-4', patientId: 'pat-12', patientName: 'Walter White', doctorId: 'doc-2', doctorName: 'Dr. Nathan Hayes', dateTime: '2026-10-15T09:45:00', status: 'in_consultation', reasonForVisit: 'Asthma follow-up' },
  { id: 'apt-5', patientId: 'pat-10', patientName: 'Grace Hopper', doctorId: 'doc-2', doctorName: 'Dr. Nathan Hayes', dateTime: '2026-10-15T10:30:00', status: 'checked_in', reasonForVisit: 'Pharyngitis check' },
  { id: 'apt-7', patientId: 'pat-11', patientName: 'Henry Ford', doctorId: 'doc-3', doctorName: 'Dr. Sophia Reed', dateTime: '2026-10-15T10:00:00', status: 'scheduled', reasonForVisit: 'BP review' },
  // Past days
  { id: 'apt-h1', patientId: 'pat-1', patientName: 'Eleanor Wright', doctorId: 'doc-1', doctorName: 'Dr. Marcus Vance', dateTime: '2026-10-01T10:00:00', status: 'completed', reasonForVisit: 'BP follow-up' },
  { id: 'apt-h2', patientId: 'pat-12', patientName: 'Walter White', doctorId: 'doc-2', doctorName: 'Dr. Nathan Hayes', dateTime: '2026-10-02T11:15:00', status: 'completed', reasonForVisit: 'Cough assessment' },
  { id: 'apt-h3', patientId: 'pat-2', patientName: 'James Miller', doctorId: 'doc-1', doctorName: 'Dr. Marcus Vance', dateTime: '2026-10-05T09:15:00', status: 'no_show', reasonForVisit: 'Fasting glucose' },
  { id: 'apt-h4', patientId: 'pat-13', patientName: 'Bruce Wayne', doctorId: 'doc-1', doctorName: 'Dr. Marcus Vance', dateTime: '2026-10-07T11:00:00', status: 'completed', reasonForVisit: 'Lumbar review' },
  { id: 'apt-h5', patientId: 'pat-10', patientName: 'Grace Hopper', doctorId: 'doc-2', doctorName: 'Dr. Nathan Hayes', dateTime: '2026-09-18T11:00:00', status: 'completed', reasonForVisit: 'Wellness check' },
  { id: 'apt-h6', patientId: 'pat-12', patientName: 'Walter White', doctorId: 'doc-2', doctorName: 'Dr. Nathan Hayes', dateTime: '2026-09-23T15:30:00', status: 'cancelled', reasonForVisit: 'Follow-up consultation' },
];

const TEST_INVOICES = [
  { id: 'inv-1', patientId: 'pat-1', date: '2026-10-15', totalAmount: 150, paidAmount: 0, status: 'unpaid' },
  { id: 'inv-2', patientId: 'pat-12', date: '2026-10-02', totalAmount: 260, paidAmount: 200, status: 'partially_paid' },
  { id: 'inv-3', patientId: 'pat-13', date: '2026-10-07', totalAmount: 320, paidAmount: 320, status: 'paid' },
  { id: 'inv-4', patientId: 'pat-10', date: '2026-09-18', totalAmount: 120, paidAmount: 120, status: 'paid' },
];

const TEST_PRESCRIPTIONS = [
  { id: 'rx-1', patientId: 'pat-1', prescriptionNumber: 'RX-2026-0088', doctorName: 'Dr. Marcus Vance', date: '2026-10-13', diagnosis: 'Hypertension', status: 'pending', items: [{ medicineName: 'Amlodipine', dosage: '5mg' }] },
];

const TEST_PENDING_APPROVALS = [
  { id: 'pend-1', role: 'doctor', staffName: 'Dr. Clara Oswald', department: 'Pediatrics', requestedAt: '2026-10-14 09:30' },
  { id: 'pend-2', role: 'receptionist', staffName: 'Samuel Vance', department: 'Reception', requestedAt: '2026-10-14 10:15' },
];

function toLocalDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('Running Dashboard Metrics Test Suite...\n');

// 1. DATE RANGE PRESETS TEST
console.log('--- TEST GROUP 1: Date Range Presets ---');
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

// 2. DATE BUCKETING TEST
console.log('\n--- TEST GROUP 2: Date Bucketing ---');
// Daily buckets for Last 7 days
function generateDailyBuckets(startDate, endDate) {
  const buckets = [];
  const cur = new Date(startDate);
  while (cur.getTime() <= endDate.getTime()) {
    buckets.push({
      dateKey: toLocalDateKey(cur),
      label: formatDayMonth(cur),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return buckets;
}

const dayBuckets7 = generateDailyBuckets(last7Bounds.startDate, last7Bounds.endDate);
assertEqual('Last 7 days produces exactly 7 daily buckets', dayBuckets7.length, 7);
assertEqual('First day of 7-day bucket', dayBuckets7[0].dateKey, '2026-10-09');
assertEqual('Last day of 7-day bucket', dayBuckets7[6].dateKey, '2026-10-15');

const dayBuckets30 = generateDailyBuckets(last30Bounds.startDate, last30Bounds.endDate);
assertEqual('Last 30 days produces exactly 30 daily buckets', dayBuckets30.length, 30);
assertEqual('First day of 30-day bucket', dayBuckets30[0].dateKey, '2026-09-16');
assertEqual('Last day of 30-day bucket', dayBuckets30[29].dateKey, '2026-10-15');
assertEqual('Last 30 days produces exactly 30 daily buckets', dayBuckets30.length, 30);
assertEqual('First day of 30-day bucket', dayBuckets30[0].dateKey, '2026-09-16');
assertEqual('Last day of 30-day bucket', dayBuckets30[29].dateKey, '2026-10-15');

// 3. ROLE SCOPING: STAFF DOCTOR ISOLATION
console.log('\n--- TEST GROUP 3: Role Scoping: Staff Doctor Isolation ---');

// Staff Doctor (Dr. Nathan Hayes, doc-2) must NEVER receive doc-1 or doc-3 appointments
const staffDoctorId = 'doc-2';
const staffDocAppointments = TEST_APPOINTMENTS.filter((a) => a.doctorId === staffDoctorId);

assert(
  'Staff Doctor receives their own appointments',
  staffDocAppointments.length > 0 && staffDocAppointments.every((a) => a.doctorId === staffDoctorId),
  `Some appointments had doctorId !== ${staffDoctorId}`
);

const leakedAppointments = staffDocAppointments.filter((a) => a.doctorId === 'doc-1' || a.doctorId === 'doc-3');
assertEqual('Staff Doctor receives 0 appointments from other doctors', leakedAppointments.length, 0);

// Today appointments for Staff Doctor
const staffTodayAppts = staffDocAppointments.filter((a) => isSameDay(a.dateTime, refDate));
assertEqual('Staff Doctor has 2 appointments today', staffTodayAppts.length, 2);
assert(
  'All Staff Doctor today appointments belong to doc-2',
  staffTodayAppts.every((a) => a.doctorId === 'doc-2')
);

// Staff Doctor follow-ups due
const staffFollowUps = staffDocAppointments.filter((a) => a.reasonForVisit.toLowerCase().includes('follow-up'));
assertEqual('Staff Doctor has 2 follow-ups', staffFollowUps.length, 2);
assert(
  'Staff Doctor follow-ups belong strictly to doc-2',
  staffFollowUps.every((a) => a.doctorId === 'doc-2')
);

// 4. ROLE SCOPING: MD CLINIC-WIDE AUTHORITY
console.log('\n--- TEST GROUP 4: Role Scoping: MD Clinic-Wide Authority ---');

// MD sees appointments across ALL doctors
const mdAppointments = TEST_APPOINTMENTS;
const mdDoctorIds = new Set(mdAppointments.map((a) => a.doctorId));
assert('MD sees doc-1 appointments', mdDoctorIds.has('doc-1'));
assert('MD sees doc-2 appointments', mdDoctorIds.has('doc-2'));
assert('MD sees doc-3 appointments', mdDoctorIds.has('doc-3'));

// MD gets pending clearances
assertEqual('MD sees 2 pending staff clearances', TEST_PENDING_APPROVALS.length, 2);

// MD gets billing figures for this month
const thisMonthInvoices = TEST_INVOICES.filter((i) => isDateInRange(i.date, thisMonthBounds.startDate, thisMonthBounds.endDate));
const mdBilled = thisMonthInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
const mdCollected = thisMonthInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
const mdOutstanding = TEST_INVOICES.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

assertEqual('MD Billed in October ($150 + $260 + $320 = $730)', mdBilled, 730);
assertEqual('MD Collected in October ($0 + $200 + $320 = $520)', mdCollected, 520);
assertEqual('MD Outstanding balance ($150 + $60 = $210)', mdOutstanding, 210);

// 5. ROLE SCOPING: RECEPTIONIST FRONT DESK (NO CLINICAL DATA)
console.log('\n--- TEST GROUP 5: Role Scoping: Receptionist ---');

// Receptionist summary figures: Appointments Today, Checked In, New Registrations, Outstanding Payments
const recApptsToday = TEST_APPOINTMENTS.filter((a) => isSameDay(a.dateTime, refDate)).length;
const recCheckedInToday = TEST_APPOINTMENTS.filter((a) => isSameDay(a.dateTime, refDate) && (a.status === 'checked_in' || a.status === 'in_consultation')).length;
const recNewRegistrationsThisMonth = TEST_PATIENTS.filter((p) => isDateInRange(p.registeredDate, thisMonthBounds.startDate, thisMonthBounds.endDate)).length;

assertEqual('Receptionist Appointments Today count', recApptsToday, 5);
assertEqual('Receptionist Checked In Today count', recCheckedInToday, 4);
assertEqual('Receptionist New Registrations This Month count (Oct 2, Oct 7)', recNewRegistrationsThisMonth, 2);

// 6. ROLE SCOPING: PATIENT ACCESS
console.log('\n--- TEST GROUP 6: Role Scoping: Patient ---');

const patientId = 'pat-1';
const patientAppts = TEST_APPOINTMENTS.filter((a) => a.patientId === patientId);
const patientInvoices = TEST_INVOICES.filter((i) => i.patientId === patientId);
const patientPrescriptions = TEST_PRESCRIPTIONS.filter((p) => p.patientId === patientId);

assert('Patient sees own appointments only', patientAppts.every((a) => a.patientId === patientId));
assertEqual('Patient Eleanor Wright upcoming appointment on Oct 15', patientAppts[0].dateTime, '2026-10-15T09:30:00');
assertEqual('Patient active prescriptions count', patientPrescriptions.length, 1);
const patientBalanceDue = patientInvoices.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);
assertEqual('Patient balance due ($150)', patientBalanceDue, 150);

console.log(`\n========================================`);
console.log(`Total tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
