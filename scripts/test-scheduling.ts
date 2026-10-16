import assert from 'node:assert';
import {
  SLOT_MINUTES,
  BOOKING_LEAD_MINUTES,
  BOOKING_WINDOW_DAYS,
  CANCEL_CUTOFF_MINUTES,
  MAX_ACTIVE_BOOKINGS,
  minutesToTime,
  getAvailableSlots,
  validateBooking,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  appointmentsAffectedByLeave,
} from '../src/lib/scheduling';
import { Shift, LeaveRequest } from '../src/types/attendance';
import { Appointment } from '../src/types';

console.log('[TEST] Running Scheduling Engine and Online Booking test suite (M7)...');

// ---------------------------------------------------------------------------
// 1. Unified Scheduling Constants
// ---------------------------------------------------------------------------
console.log('  1. Verifying scheduling constants...');
assert.strictEqual(SLOT_MINUTES, 20, 'SLOT_MINUTES must be 20');
assert.strictEqual(BOOKING_LEAD_MINUTES, 120, 'BOOKING_LEAD_MINUTES must be 120');
assert.strictEqual(BOOKING_WINDOW_DAYS, 30, 'BOOKING_WINDOW_DAYS must be 30');
assert.strictEqual(CANCEL_CUTOFF_MINUTES, 120, 'CANCEL_CUTOFF_MINUTES must be 120');
assert.strictEqual(MAX_ACTIVE_BOOKINGS, 2, 'MAX_ACTIVE_BOOKINGS must be 2');

assert.strictEqual(minutesToTime(540), '09:00');
assert.strictEqual(minutesToTime(560), '09:20');
assert.strictEqual(minutesToTime(1020), '17:00');

// ---------------------------------------------------------------------------
// Setup Mock Shifts, Leaves, and Base Fixtures
// ---------------------------------------------------------------------------
// Canonical doctor staff ID for doc-1 is acc-doc-1
const mockShifts: Shift[] = [
  {
    id: 'sh-1',
    staffId: 'acc-doc-1',
    staffName: 'Dr. Marcus Vance',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '17:00',
    graceMinutes: 15,
  },
  {
    id: 'sh-2',
    staffId: 'acc-doc-2',
    staffName: 'Dr. Nathan Hayes',
    days: ['Mon', 'Wed', 'Fri'],
    start: '10:00',
    end: '14:00',
    graceMinutes: 15,
  },
];

const mockLeaves: LeaveRequest[] = [
  {
    id: 'lv-1',
    staffId: 'acc-doc-1',
    staffName: 'Dr. Marcus Vance',
    fromDate: '2026-10-21',
    toDate: '2026-10-22',
    reason: 'Medical Conference',
    type: 'Other',
    status: 'approved',
    requestedAt: '2026-10-15T08:00:00.000Z',
  },
];

// Fixed Reference Time: 2026-10-19 06:00 AM (Monday)
const refNow = new Date('2026-10-19T06:00:00');

// ---------------------------------------------------------------------------
// 2. Slot Generation across Shifts and Leaves
// ---------------------------------------------------------------------------
console.log('  2. Slot generation across shifts and leaves...');

// Normal Monday for doc-1 (09:00 to 17:00, 20-min slots -> 24 slots total)
const slotsMonday = getAvailableSlots('doc-1', '2026-10-19', [], mockShifts, mockLeaves, refNow);
assert.strictEqual(slotsMonday.length, 24, '09:00 to 17:00 in 20-min intervals should yield 24 slots');
assert.strictEqual(slotsMonday[0], '09:00');
assert.strictEqual(slotsMonday[slotsMonday.length - 1], '16:40');

// Doctor off-duty day (Saturday 2026-10-24)
const slotsSaturday = getAvailableSlots('doc-1', '2026-10-24', [], mockShifts, mockLeaves, refNow);
assert.strictEqual(slotsSaturday.length, 0, 'No slots generated on unscheduled shift days');

// Doctor approved leave day (Wednesday 2026-10-21)
const slotsOnLeave = getAvailableSlots('doc-1', '2026-10-21', [], mockShifts, mockLeaves, refNow);
assert.strictEqual(slotsOnLeave.length, 0, 'No slots generated when doctor is on approved leave');

// Past date (< 0 days)
const slotsPast = getAvailableSlots('doc-1', '2026-10-18', [], mockShifts, mockLeaves, refNow);
assert.strictEqual(slotsPast.length, 0, 'No slots generated for past dates');

// Outside booking window (> 30 days)
const slotsFarFuture = getAvailableSlots('doc-1', '2026-12-01', [], mockShifts, mockLeaves, refNow);
assert.strictEqual(slotsFarFuture.length, 0, 'No slots generated beyond 30 days');

// ---------------------------------------------------------------------------
// 3. Lead Time Cutoff (120 minutes)
// ---------------------------------------------------------------------------
console.log('  3. Lead time cutoff (120 minutes advance notice)...');
// If current time is 08:30 AM, lead cutoff is 10:30 AM.
// Slots before 10:30 (09:00, 09:20, 09:40, 10:00, 10:20) must be excluded.
const refMorning = new Date('2026-10-19T08:30:00');
const slotsMorning = getAvailableSlots('doc-1', '2026-10-19', [], mockShifts, mockLeaves, refMorning);
assert.ok(!slotsMorning.includes('09:00'), 'Slots closer than 120m must be omitted');
assert.ok(!slotsMorning.includes('10:20'), 'Slots closer than 120m must be omitted');
assert.ok(slotsMorning.includes('10:40'), 'Slots >= 120m in future must be included');

// ---------------------------------------------------------------------------
// 4. Double-Booking Collision Detection
// ---------------------------------------------------------------------------
console.log('  4. Double-booking collision detection...');
const existingAppointments: Appointment[] = [
  {
    id: 'apt-1',
    appointmentNumber: 'APT-2026-001',
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    dateTime: '2026-10-19T11:00:00',
    durationMinutes: 20,
    status: 'scheduled',
    reasonForVisit: 'Follow up',
    tokenNumber: 1,
  },
  {
    id: 'apt-2',
    appointmentNumber: 'APT-2026-002',
    patientId: 'pat-2',
    patientName: 'James Miller',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    dateTime: '2026-10-19T14:00:00',
    durationMinutes: 20,
    status: 'cancelled', // Cancelled should NOT block slot
    reasonForVisit: 'Consultation',
    tokenNumber: 2,
  },
];

const slotsWithAppointments = getAvailableSlots(
  'doc-1',
  '2026-10-19',
  existingAppointments,
  mockShifts,
  mockLeaves,
  refNow
);
assert.ok(!slotsWithAppointments.includes('11:00'), 'Slot 11:00 is occupied and must be omitted');
assert.ok(slotsWithAppointments.includes('14:00'), 'Cancelled appointment slot 14:00 must remain free');

// ---------------------------------------------------------------------------
// 5. Booking Validation Logic (validateBooking)
// ---------------------------------------------------------------------------
console.log('  5. Booking validation rules...');

// Valid booking
const validRes = validateBooking(
  'doc-1',
  '2026-10-19',
  '11:20',
  'pat-1',
  existingAppointments,
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(validRes.allowed, true, 'Valid booking should be allowed');

// Conflict with existing slot
const conflictRes = validateBooking(
  'doc-1',
  '2026-10-19',
  '11:00',
  'pat-2',
  existingAppointments,
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(conflictRes.allowed, false, 'Conflicting booking must be rejected');

// Doctor on leave
const leaveRes = validateBooking(
  'doc-1',
  '2026-10-21',
  '11:00',
  'pat-1',
  [],
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(leaveRes.allowed, false, 'Booking on doctor leave must be rejected');

// Doctor off-duty
const offDutyRes = validateBooking(
  'doc-1',
  '2026-10-25',
  '11:00',
  'pat-1',
  [],
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(offDutyRes.allowed, false, 'Booking on doctor off day must be rejected');

// Booking beyond 30 days
const farDateRes = validateBooking(
  'doc-1',
  '2026-12-15',
  '11:00',
  'pat-1',
  [],
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(farDateRes.allowed, false, 'Booking beyond 30 days must be rejected');

// ---------------------------------------------------------------------------
// 6. Maximum 2 Active Bookings per Patient Enforcement
// ---------------------------------------------------------------------------
console.log('  6. Maximum active future bookings (MAX_ACTIVE_BOOKINGS = 2)...');
const patientTwoActive: Appointment[] = [
  {
    id: 'apt-p1',
    appointmentNumber: 'APT-2026-010',
    patientId: 'pat-99',
    patientName: 'Test Patient',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    dateTime: '2026-10-20T10:00:00',
    durationMinutes: 20,
    status: 'scheduled',
    reasonForVisit: 'General check',
    tokenNumber: 3,
  },
  {
    id: 'apt-p2',
    appointmentNumber: 'APT-2026-011',
    patientId: 'pat-99',
    patientName: 'Test Patient',
    doctorId: 'doc-2',
    doctorName: 'Dr. Nathan Hayes',
    dateTime: '2026-10-23T11:00:00',
    durationMinutes: 20,
    status: 'scheduled',
    reasonForVisit: 'General check 2',
    tokenNumber: 4,
  },
];

const thirdBookingRes = validateBooking(
  'doc-1',
  '2026-10-20',
  '14:00',
  'pat-99',
  patientTwoActive,
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(thirdBookingRes.allowed, false, '3rd active booking must be rejected');
assert.ok(
  thirdBookingRes.reason?.includes('Maximum of 2 active bookings'),
  'Error reason must cite maximum active bookings'
);

// ---------------------------------------------------------------------------
// 7. bookAppointment Pure Function
// ---------------------------------------------------------------------------
console.log('  7. bookAppointment creation...');
const newApt = bookAppointment(
  {
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    patientPhone: '+1 (555) 234-5678',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    department: 'General Medicine',
    date: '2026-10-20',
    time: '10:00',
    reasonForVisit: 'Routine consultation checkup',
    source: 'web',
    bookedBy: { id: 'usr-pat-1', name: 'Eleanor Wright' },
  },
  []
);

assert.strictEqual(newApt.patientId, 'pat-1');
assert.strictEqual(newApt.status, 'scheduled');
assert.strictEqual(newApt.dateTime, '2026-10-20T10:00:00');
assert.strictEqual(newApt.source, 'web');
assert.strictEqual(newApt.needsReschedule, false);
assert.strictEqual(newApt.bookedBy?.name, 'Eleanor Wright');
assert.strictEqual(newApt.appointmentNumber, 'APT-2026-001');

// ---------------------------------------------------------------------------
// 8. Cancellation Cutoff and Staff Override
// ---------------------------------------------------------------------------
console.log('  8. Cancellation cutoff (120m) and staff override...');
const targetApt: Appointment = {
  id: 'apt-target',
  appointmentNumber: 'APT-2026-099',
  patientId: 'pat-1',
  patientName: 'Eleanor Wright',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  dateTime: '2026-10-19T10:00:00', // 3 hours after refNow (07:00)
  durationMinutes: 20,
  status: 'scheduled',
  reasonForVisit: 'Check',
  tokenNumber: 5,
};

// Patient cancels 3 hours before start (> 120m) -> SUCCESS
const cancelOk = cancelAppointment(
  targetApt,
  { id: 'usr-pat-1', name: 'Eleanor Wright', role: 'patient' },
  refNow,
  'Schedule conflict'
);
assert.strictEqual(cancelOk.success, true);
assert.strictEqual(cancelOk.appointment?.status, 'cancelled');
assert.strictEqual(cancelOk.appointment?.cancelReason, 'Schedule conflict');

// Patient cancels 1 hour before start (< 120m) -> REJECTED
const lateNow = new Date('2026-10-19T09:00:00'); // 1 hour before 10:00
const cancelTooLate = cancelAppointment(
  targetApt,
  { id: 'usr-pat-1', name: 'Eleanor Wright', role: 'patient' },
  lateNow,
  'Last minute conflict'
);
assert.strictEqual(cancelTooLate.success, false);
assert.ok(
  cancelTooLate.error?.includes('within 2 hours'),
  'Patient cancellation within 2 hours must be rejected'
);

// Staff (receptionist) cancels within 2 hours with reason -> ALLOWED
const staffCancel = cancelAppointment(
  targetApt,
  { id: 'usr-rec-1', name: 'Priya Sharma', role: 'receptionist' },
  lateNow,
  'Patient called front desk emergency'
);
assert.strictEqual(staffCancel.success, true, 'Staff can cancel at any time with reason');
assert.strictEqual(staffCancel.appointment?.status, 'cancelled');

// Staff cancels without reason -> REJECTED
const staffCancelNoReason = cancelAppointment(
  targetApt,
  { id: 'usr-rec-1', name: 'Priya Sharma', role: 'receptionist' },
  lateNow,
  ''
);
assert.strictEqual(staffCancelNoReason.success, false, 'Staff cancellation requires reason');

// ---------------------------------------------------------------------------
// 9. Atomic Rescheduling
// ---------------------------------------------------------------------------
console.log('  9. Atomic rescheduling...');
// Patient reschedules > 2 hours before -> SUCCESS
const rescheduleOk = rescheduleAppointment(
  targetApt,
  '2026-10-20',
  '10:40',
  { id: 'usr-pat-1', name: 'Eleanor Wright', role: 'patient' },
  [targetApt],
  mockShifts,
  mockLeaves,
  refNow
);
assert.strictEqual(rescheduleOk.success, true);
assert.strictEqual(rescheduleOk.cancelledAppointment?.status, 'cancelled');
assert.strictEqual(rescheduleOk.newAppointment?.status, 'scheduled');
assert.strictEqual(rescheduleOk.newAppointment?.dateTime, '2026-10-20T10:40:00');
assert.strictEqual(rescheduleOk.newAppointment?.rescheduledFrom, 'apt-target');

// Patient reschedules < 2 hours before -> REJECTED
const rescheduleTooLate = rescheduleAppointment(
  targetApt,
  '2026-10-20',
  '10:40',
  { id: 'usr-pat-1', name: 'Eleanor Wright', role: 'patient' },
  [targetApt],
  mockShifts,
  mockLeaves,
  lateNow
);
assert.strictEqual(rescheduleTooLate.success, false);
assert.ok(
  rescheduleTooLate.error?.includes('within 2 hours'),
  'Reschedule within 2 hours must be rejected for patients'
);

// ---------------------------------------------------------------------------
// 10. Attendance Leave Impact (appointmentsAffectedByLeave)
// ---------------------------------------------------------------------------
console.log('  10. Appointments affected by leave...');
const leaveAppointments: Appointment[] = [
  {
    id: 'apt-lv-1',
    appointmentNumber: 'APT-1',
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    dateTime: '2026-10-21T09:20:00',
    durationMinutes: 20,
    status: 'scheduled',
    reasonForVisit: 'Care',
    tokenNumber: 1,
  },
  {
    id: 'apt-lv-2',
    appointmentNumber: 'APT-2',
    patientId: 'pat-2',
    patientName: 'James Miller',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    dateTime: '2026-10-22T14:00:00',
    durationMinutes: 20,
    status: 'scheduled',
    reasonForVisit: 'Consultation',
    tokenNumber: 2,
  },
  {
    id: 'apt-lv-3',
    appointmentNumber: 'APT-3',
    patientId: 'pat-3',
    patientName: 'Sarah Jenkins',
    doctorId: 'doc-2', // Different doctor
    doctorName: 'Dr. Nathan Hayes',
    dateTime: '2026-10-21T11:00:00',
    durationMinutes: 20,
    status: 'scheduled',
    reasonForVisit: 'Care',
    tokenNumber: 3,
  },
  {
    id: 'apt-lv-4',
    appointmentNumber: 'APT-4',
    patientId: 'pat-4',
    patientName: 'Robert Lang',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    dateTime: '2026-10-21T15:00:00',
    durationMinutes: 20,
    status: 'cancelled', // Already cancelled -> should not be included
    reasonForVisit: 'Care',
    tokenNumber: 4,
  },
];

const affected = appointmentsAffectedByLeave('doc-1', '2026-10-21', '2026-10-22', leaveAppointments);
assert.strictEqual(affected.length, 2, 'Should find exactly 2 active appointments for doc-1 during leave');
assert.strictEqual(affected[0].id, 'apt-lv-1');
assert.strictEqual(affected[1].id, 'apt-lv-2');

console.log('[TEST] All 10 scheduling and booking test categories passed cleanly (100%).');
