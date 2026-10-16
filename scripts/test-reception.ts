import { Appointment, Patient, User, PatientAssignment, Doctor } from '../src/types';
import {
  getNextTokenNumberForDate,
  calculateWaitTimeMinutes,
  formatCheckedInBy,
  formatRegisteredBy,
  validateWalkInNewArrival,
  validateWalkInExistingArrival,
  validateBookedArrival,
  validateAppointmentBooking,
  getTodayIntakeLogs,
} from '../src/lib/reception';
import {
  canRegisterPatient,
  canCheckIn,
  canBookAppointment,
  scopePatientForReceptionist,
  scopeAppointmentForReceptionist,
} from '../src/lib/permissions';
import { getScopedPatients } from '../src/lib/selectors';
import { isDoctorAvailable } from '../src/lib/availability';
import { INITIAL_MODULES } from '../src/data/mockData';

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
    console.error(`[FAIL] ${testName}: expected ${String(expected)}, got ${String(actual)}`);
    failed++;
  }
}

console.log('=== Reception Workstation and Intake Flows Test Suite (M4) ===\n');

// Mock Users
const receptionistUser: User = {
  id: 'usr-rec-1',
  name: 'Priya Sharma',
  email: 'p.sharma@beaconclinic.com',
  role: 'receptionist',
  badgeNumber: 'REC-301',
  capabilities: ['patientRegistration', 'patientCheckIn', 'paymentRecording'],
};

const unauthorizedUser: User = {
  id: 'usr-guest-1',
  name: 'Guest User',
  email: 'guest@clinic.com',
  role: 'patient',
  capabilities: [],
};

const unauthorizedStaff: User = {
  id: 'usr-guest-staff',
  name: 'Unauthorized Staff',
  email: 'staff@clinic.com',
  role: 'receptionist',
  capabilities: [],
};

const doctorUser: User = {
  id: 'usr-doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-102',
  capabilities: ['consultationWorkstation', 'emrRecordsAccess', 'prescriptionAuthoring', 'consultingCalendar'],
};

// 1. Demographic-only registration and clinical field stripping
console.log('--- Test Group 1: Demographic-Only Registration and Field Stripping ---');
const sampleClinicalPatient: Patient = {
  id: 'pat-test-1',
  mrn: 'MRN-99991',
  firstName: 'John',
  lastName: 'Doe',
  gender: 'male',
  dob: '1980-05-20',
  age: 46,
  phone: '+1 (555) 123-4567',
  email: 'john.doe@test.com',
  address: '123 Test St',
  bloodGroup: 'AB+',
  allergies: ['Penicillin', 'Sulfa'],
  chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
  currentMedications: ['Metformin', 'Lisinopril'],
  previousVitals: {
    recordedAt: '2026-09-01',
    systolicBp: 130,
    diastolicBp: 85,
    heartRateBpm: 72,
    oxygenSaturationPct: 98,
    temperatureCelsius: 36.8,
  },
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+1 (555) 123-9999',
  },
  registeredDate: '2026-10-16',
  status: 'active',
};

const scopedPatient = scopePatientForReceptionist(sampleClinicalPatient);
assert(
  'scopePatientForReceptionist strips bloodGroup',
  scopedPatient.bloodGroup === undefined,
  `Got: ${String(scopedPatient.bloodGroup)}`
);
assertEqual('scopePatientForReceptionist strips allergies to empty array', scopedPatient.allergies.length, 0);
assertEqual('scopePatientForReceptionist strips chronicConditions to empty array', scopedPatient.chronicConditions.length, 0);
assertEqual('scopePatientForReceptionist strips currentMedications to empty array', (scopedPatient.currentMedications || []).length, 0);
assert('scopePatientForReceptionist strips previousVitals', scopedPatient.previousVitals === undefined);
assertEqual('scopePatientForReceptionist preserves demographic firstName', scopedPatient.firstName, 'John');
assertEqual('scopePatientForReceptionist preserves demographic MRN', scopedPatient.mrn, 'MRN-99991');

// Selector Level Scoping
const testAssignments: PatientAssignment[] = [
  {
    id: 'asgn-test-1',
    patientId: 'pat-test-1',
    doctorId: 'doc-1',
    from: '2026-10-01',
    to: null,
    transferredBy: 'Admin',
    reason: 'Initial assignment',
  },
];
const selectorScoped = getScopedPatients(receptionistUser, [sampleClinicalPatient], testAssignments, INITIAL_MODULES);
assertEqual('Selector for receptionist returns scoped patient without allergies', selectorScoped[0].allergies.length, 0);
assert('Selector for receptionist returns scoped patient without bloodGroup', selectorScoped[0].bloodGroup === undefined);

// Appointment Note Stripping
const sampleApt: Appointment = {
  id: 'apt-test-1',
  appointmentNumber: 'APT-2026-901',
  patientId: 'pat-test-1',
  patientName: 'John Doe',
  patientPhone: '+1 (555) 123-4567',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  department: 'Internal Medicine',
  dateTime: '2026-10-16T10:00:00',
  durationMinutes: 30,
  status: 'scheduled',
  reasonForVisit: 'General checkup',
  tokenNumber: 0,
  notes: 'Confidential clinical discussion notes',
};
const scopedApt = scopeAppointmentForReceptionist(sampleApt);
assert('scopeAppointmentForReceptionist strips clinical consultation notes', scopedApt.notes === undefined);

// 2. Token Uniqueness and Daily Reset
console.log('\n--- Test Group 2: Daily Token Issuing and Reset ---');
const day1Appointments: Appointment[] = [
  {
    ...sampleApt,
    id: 'apt-d1-1',
    dateTime: '2026-10-15T09:00:00',
    tokenNumber: 1,
    status: 'checked_in',
    checkedInAt: '2026-10-15T08:50:00',
  },
  {
    ...sampleApt,
    id: 'apt-d1-2',
    dateTime: '2026-10-15T09:30:00',
    tokenNumber: 2,
    status: 'checked_in',
    checkedInAt: '2026-10-15T09:15:00',
  },
];

const day2Appointments: Appointment[] = [
  {
    ...sampleApt,
    id: 'apt-d2-1',
    dateTime: '2026-10-16T09:00:00',
    tokenNumber: 1,
    status: 'checked_in',
    checkedInAt: '2026-10-16T08:50:00',
  },
];

const allAppointments = [...day1Appointments, ...day2Appointments];

const nextTokenDay1 = getNextTokenNumberForDate(allAppointments, '2026-10-15');
assertEqual('Next token for Day 1 (2026-10-15) is 3', nextTokenDay1, 3);

const nextTokenDay2 = getNextTokenNumberForDate(allAppointments, '2026-10-16');
assertEqual('Next token for Day 2 (2026-10-16) is 2', nextTokenDay2, 2);

const nextTokenDay3 = getNextTokenNumberForDate(allAppointments, '2026-10-17');
assertEqual('Token resets to 1 on an empty day (2026-10-17)', nextTokenDay3, 1);

// 3. Arrival Flow A: New Walk-In
console.log('\n--- Test Group 3: Arrival Flow A (New Walk-in) ---');
const validNewWalkIn = {
  firstName: 'Sarah',
  lastName: 'Connor',
  dob: '1984-02-28',
  phone: '+1 (555) 777-8888',
  doctorId: 'doc-1', // Dr. Marcus Vance (available Mon-Fri)
  chiefComplaint: 'Acute headache and dizziness',
};

const flowAResult = validateWalkInNewArrival(receptionistUser, validNewWalkIn, '2026-10-16');
assert('Flow A succeeds for valid new patient and available doctor', flowAResult.allowed);

const flowAUnauthorized = validateWalkInNewArrival(unauthorizedUser, validNewWalkIn, '2026-10-16');
assert('Flow A fails when actor lacks patientRegistration capability', !flowAUnauthorized.allowed);

const flowAMissingName = validateWalkInNewArrival(
  receptionistUser,
  { ...validNewWalkIn, firstName: '' },
  '2026-10-16'
);
assert('Flow A fails when first name is empty', !flowAMissingName.allowed);

// Doctor availability gating on Flow A (Dr. Marcus Vance is available Mon-Fri; on Sunday 2026-10-18 he is unavailable)
const flowAUnavailableDoc = validateWalkInNewArrival(receptionistUser, validNewWalkIn, '2026-10-18');
assert('Flow A fails when selected doctor is unavailable on that date', !flowAUnavailableDoc.allowed);

// 4. Arrival Flow B: Registered Walk-in
console.log('\n--- Test Group 4: Arrival Flow B (Registered Walk-in) ---');
// Patient with assigned doctor doc-1
const existingPatientAssignments: PatientAssignment[] = [
  {
    id: 'asgn-p1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    from: '2026-01-01',
    to: null,
    transferredBy: 'Admin',
    reason: 'Initial assignment',
  },
];

// Friday 2026-10-16: Dr. Vance is available
const flowBSuccess = validateWalkInExistingArrival(
  receptionistUser,
  'pat-1',
  existingPatientAssignments,
  '2026-10-16'
);
assert('Flow B succeeds when assigned doctor is available today', flowBSuccess.allowed);

// Sunday 2026-10-18: Dr. Vance is not on duty
const flowBUnavailable = validateWalkInExistingArrival(
  receptionistUser,
  'pat-1',
  existingPatientAssignments,
  '2026-10-18'
);
assert('Flow B fails when assigned doctor is not available today', !flowBUnavailable.allowed);
assertEqual(
  'Flow B returns required plain-text reassignment requirement message',
  flowBUnavailable.reason,
  'Assigned doctor is not available today. Reassignment requires an administrator.'
);

// Unassigned patient check
const flowBUnassigned = validateWalkInExistingArrival(
  receptionistUser,
  'pat-unassigned',
  existingPatientAssignments,
  '2026-10-16'
);
assert('Flow B fails when patient has no assigned doctor', !flowBUnassigned.allowed);

// 5. Arrival Flow C: Booked Arrival
console.log('\n--- Test Group 5: Arrival Flow C (Booked Arrival) ---');
const bookedAppointmentToday: Appointment = {
  ...sampleApt,
  id: 'apt-booked-today',
  doctorId: 'doc-1',
  dateTime: '2026-10-16T11:00:00',
  status: 'scheduled',
};

const flowCSuccess = validateBookedArrival(receptionistUser, bookedAppointmentToday, '2026-10-16');
assert('Flow C succeeds for today scheduled appointment with available doctor', flowCSuccess.allowed);

// Attempting check-in for tomorrow appointment
const flowCWrongDate = validateBookedArrival(receptionistUser, bookedAppointmentToday, '2026-10-17');
assert('Flow C rejects check-in for appointments not scheduled for today', !flowCWrongDate.allowed);

// Attempting check-in on a date when doctor is unavailable
const flowCUnavailableDoc = validateBookedArrival(receptionistUser, bookedAppointmentToday, '2026-10-18');
assert('Flow C rejects check-in when assigned doctor is unavailable today', !flowCUnavailableDoc.allowed);

// Attempting check-in for already completed appointment
const completedApt: Appointment = { ...bookedAppointmentToday, status: 'completed' };
const flowCCompleted = validateBookedArrival(receptionistUser, completedApt, '2026-10-16');
assert('Flow C rejects check-in for already completed appointment', !flowCCompleted.allowed);

// 6. Appointment Booking Validation
console.log('\n--- Test Group 6: Consultation Booking Validation ---');
const bookingValid = validateAppointmentBooking(
  receptionistUser,
  'doc-1',
  '2026-10-19', // Monday (available)
  'Follow-up cardiology consultation'
);
assert('Booking succeeds for valid doctor on their duty day', bookingValid.allowed);

const bookingSunday = validateAppointmentBooking(
  receptionistUser,
  'doc-1',
  '2026-10-18', // Sunday (off duty)
  'Follow-up consultation'
);
assert('Booking rejects when doctor is unavailable on chosen date', !bookingSunday.allowed);

const bookingUnauthorized = validateAppointmentBooking(
  unauthorizedStaff,
  'doc-1',
  '2026-10-19',
  'Follow-up consultation'
);
assert('Booking rejects when actor lacks booking capability', !bookingUnauthorized.allowed);

// 7. Permission Guards
console.log('\n--- Test Group 7: Reception Permission Guards ---');
assert('Receptionist has canRegisterPatient capability', canRegisterPatient(receptionistUser, INITIAL_MODULES));
assert('Receptionist has canCheckIn capability', canCheckIn(receptionistUser, INITIAL_MODULES));
assert('Receptionist has canBookAppointment capability', canBookAppointment(receptionistUser, INITIAL_MODULES));

assert('Unauthorized user cannot register patients', !canRegisterPatient(unauthorizedUser, INITIAL_MODULES));
assert('Unauthorized user cannot check in patients', !canCheckIn(unauthorizedUser, INITIAL_MODULES));
assert('Unauthorized non-patient cannot book appointments', !canBookAppointment({ ...unauthorizedUser, role: 'receptionist' }, INITIAL_MODULES));

// 8. Wait Time and Formatting Helpers
console.log('\n--- Test Group 8: Wait Time and Formatting Helpers ---');
const refTime = new Date('2026-10-16T10:30:00Z');
const checkInTime = '2026-10-16T10:15:00Z';
const waitMins = calculateWaitTimeMinutes(checkInTime, refTime);
assertEqual('Wait time calculated accurately as 15 minutes', waitMins, 15);

assertEqual('calculateWaitTimeMinutes returns 0 for null checkedInAt', calculateWaitTimeMinutes(null, refTime), 0);

assertEqual(
  'formatCheckedInBy displays staff name when present',
  formatCheckedInBy({ id: 'acc-rec-1', name: 'Priya Sharma' }),
  'Priya Sharma'
);
assertEqual('formatCheckedInBy displays "Not recorded" when null or undefined', formatCheckedInBy(null), 'Not recorded');

assertEqual(
  'formatRegisteredBy displays staff name when present',
  formatRegisteredBy({ id: 'acc-rec-2', name: 'David Kim' }),
  'David Kim'
);
assertEqual('formatRegisteredBy displays "Not recorded" when null or undefined', formatRegisteredBy(null), 'Not recorded');

// 9. Unified Intake Registry Log
console.log('\n--- Test Group 9: Intake Registry Log ---');
const todayPatients: Patient[] = [
  {
    ...sampleClinicalPatient,
    id: 'pat-today-1',
    registeredAt: '2026-10-16T08:30:00',
    registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
  },
];
const todayAppointmentsList: Appointment[] = [
  {
    ...sampleApt,
    id: 'apt-today-1',
    dateTime: '2026-10-16T09:00:00',
    status: 'checked_in',
    tokenNumber: 1,
    checkedInAt: '2026-10-16T08:45:00',
    checkedInBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
  },
];

const logs = getTodayIntakeLogs(todayPatients, todayAppointmentsList, '2026-10-16');
assertEqual('Intake logs contains 2 events (1 registration, 1 check-in)', logs.length, 2);
assertEqual('Logs are ordered descending by time (08:45 check-in first)', logs[0].type, 'Check-in');
assertEqual('Second log is registration at 08:30', logs[1].type, 'Registration');
assertEqual('Check-in log details contain Token and Doctor', logs[0].details, 'Token #1 - Dr. Dr. Marcus Vance');
assertEqual('Registration log details contain MRN', logs[1].details, 'MRN: MRN-99991');

console.log(`\n========================================`);
console.log(`Total tests passed: ${passed}`);
console.log(`Total tests failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
