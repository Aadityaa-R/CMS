import {
  clockIn,
  clockOut,
  hoursWorked,
  lateMinutes,
  earlyMinutes,
  isOutsideShift,
  missingClockOut,
  isOnLeave,
  isStaffAvailable,
  sheetCode,
  staffPresentToday,
  validateLeave,
  decideLeave,
  cancelLeave,
  correctRecord,
  setShift,
  monthlySummary,
  formatDate,
} from '../src/lib/attendance';
import { isDoctorAvailable } from '../src/lib/availability';
import { Shift, AttendanceRecord, LeaveRequest } from '../src/types/attendance';

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

console.log('=== Staff Time, Attendance, and Leave Test Suite ===\n');

const testShift: Shift = {
  id: 'shf-test-1',
  staffId: 'acc-doc-1',
  staffName: 'Dr. Marcus Vance',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  start: '09:00',
  end: '16:30',
  graceMinutes: 15,
};

// 1. Clock-in Rules
console.log('--- Test Group 1: Clock-In Rules ---');
const testDate = new Date(2026, 9, 14, 9, 5, 0); // Wednesday, Oct 14, 2026 09:05:00
const initialRec = clockIn(null, testShift, testDate, 'acc-doc-1', 'Dr. Marcus Vance');
assert('clockIn initializes record correctly', Boolean(initialRec.clockIn && initialRec.date === '2026-10-14'));
assertEqual('clockIn preserves staffId', initialRec.staffId, 'acc-doc-1');

let duplicateClockInError = false;
try {
  clockIn(initialRec, testShift, testDate, 'acc-doc-1');
} catch (err) {
  duplicateClockInError = true;
}
assert('duplicate clock-in on same day is rejected', duplicateClockInError);

// 2. Clock-out Rules & Hours Worked
console.log('\n--- Test Group 2: Clock-Out Rules & Hours Calculation ---');
let clockOutWithoutInError = false;
try {
  clockOut(
    {
      id: 'att-none',
      staffId: 'acc-doc-1',
      date: '2026-10-14',
      clockIn: null,
      clockOut: null,
    },
    testDate
  );
} catch {
  clockOutWithoutInError = true;
}
assert('cannot clock out without clock in', clockOutWithoutInError);

const outDate = new Date(2026, 9, 14, 16, 35, 0); // 16:35:00
const completedRec = clockOut(initialRec, outDate);
assert('clockOut sets clockOut timestamp', Boolean(completedRec.clockOut));

let duplicateClockOutError = false;
try {
  clockOut(completedRec, new Date(2026, 9, 14, 17, 0, 0));
} catch {
  duplicateClockOutError = true;
}
assert('duplicate clock out is rejected', duplicateClockOutError);

const worked = hoursWorked(completedRec);
// 09:05 to 16:35 = 7.5 hours = 7.50
assertEqual('hoursWorked accurately calculated to 2 decimal places', worked, 7.5);

// 3. Late Arrival Calculation
console.log('\n--- Test Group 3: Punctuality and Late Calculation ---');
// 09:10 arrival (within 15m grace) -> 0 late
const onTimeRec: AttendanceRecord = {
  id: 'att-ontime',
  staffId: 'acc-doc-1',
  date: '2026-10-14',
  clockIn: new Date(2026, 9, 14, 9, 10, 0).toISOString(),
  clockOut: null,
};
assertEqual('arrival within grace period is not late', lateMinutes(onTimeRec, testShift), 0);

// 09:25 arrival (threshold 09:15) -> 10 minutes late
const lateRec: AttendanceRecord = {
  id: 'att-late',
  staffId: 'acc-doc-1',
  date: '2026-10-14',
  clockIn: new Date(2026, 9, 14, 9, 25, 0).toISOString(),
  clockOut: null,
};
assertEqual('late minutes calculated beyond grace threshold', lateMinutes(lateRec, testShift), 10);

// 4. Early Departure Calculation
console.log('\n--- Test Group 4: Early Departure Calculation ---');
// Shift ends at 16:30. Clock out at 16:15 -> 15 min early
const earlyRec: AttendanceRecord = {
  id: 'att-early',
  staffId: 'acc-doc-1',
  date: '2026-10-14',
  clockIn: new Date(2026, 9, 14, 9, 0, 0).toISOString(),
  clockOut: new Date(2026, 9, 14, 16, 15, 0).toISOString(),
};
assertEqual('early departure minutes correctly calculated', earlyMinutes(earlyRec, testShift), 15);

const onTimeDepartureRec: AttendanceRecord = {
  id: 'att-normal-dept',
  staffId: 'acc-doc-1',
  date: '2026-10-14',
  clockIn: new Date(2026, 9, 14, 9, 0, 0).toISOString(),
  clockOut: new Date(2026, 9, 14, 16, 35, 0).toISOString(),
};
assertEqual('departure at or after shift end has 0 early minutes', earlyMinutes(onTimeDepartureRec, testShift), 0);

// 5. Outside Shift & Missing Clock Out
console.log('\n--- Test Group 5: Outside Shift & Missing Clock-Out ---');
// Sunday duty for a Mon-Fri shift
const sundayRec: AttendanceRecord = {
  id: 'att-sun',
  staffId: 'acc-doc-1',
  date: '2026-10-18', // Oct 18, 2026 is Sunday
  clockIn: new Date(2026, 9, 18, 10, 0, 0).toISOString(),
  clockOut: new Date(2026, 9, 18, 14, 0, 0).toISOString(),
};
assert('record on unscheduled day is identified as outside shift', isOutsideShift(sundayRec, testShift));

// Missing clock out on past day
const pastMissingOut: AttendanceRecord = {
  id: 'att-miss',
  staffId: 'acc-doc-1',
  date: '2026-10-13',
  clockIn: new Date(2026, 9, 13, 9, 0, 0).toISOString(),
  clockOut: null,
};
assert('past day with clock-in and no clock-out is flagged missing', missingClockOut(pastMissingOut, testDate));

const todayActiveShift: AttendanceRecord = {
  id: 'att-active',
  staffId: 'acc-doc-1',
  date: '2026-10-14',
  clockIn: new Date(2026, 9, 14, 9, 0, 0).toISOString(),
  clockOut: null,
};
assert('today active shift is not flagged missing clock-out', !missingClockOut(todayActiveShift, testDate));

// 6. Leave Validation Rules
console.log('\n--- Test Group 6: Leave Validation Rules ---');
const existingLeaves: LeaveRequest[] = [
  {
    id: 'l-1',
    staffId: 'acc-doc-1',
    type: 'Sick',
    fromDate: '2026-10-20',
    toDate: '2026-10-22',
    reason: 'Medical recovery',
    status: 'approved',
    requestedAt: '2026-10-14T08:00:00.000Z',
  },
];

const nowRef = new Date(2026, 9, 14);

// From > To
const invalidOrder = validateLeave(
  { staffId: 'acc-doc-1', fromDate: '2026-10-25', toDate: '2026-10-24', reason: 'Personal' },
  existingLeaves,
  nowRef
);
assert('fromDate after toDate returns error', invalidOrder !== null);

// Empty reason
const emptyReason = validateLeave(
  { staffId: 'acc-doc-1', fromDate: '2026-10-25', toDate: '2026-10-26', reason: '   ' },
  existingLeaves,
  nowRef
);
assert('empty reason returns error', emptyReason !== null);

// Backdating > 7 days
const backdatedOver7 = validateLeave(
  { staffId: 'acc-doc-1', fromDate: '2026-10-01', toDate: '2026-10-02', reason: 'Emergency' },
  existingLeaves,
  nowRef
);
assert('backdating more than 7 days returns error', backdatedOver7 !== null);

// Overlap with existing approved leave (2026-10-20 to 2026-10-22)
const overlappingLeave = validateLeave(
  { staffId: 'acc-doc-1', fromDate: '2026-10-21', toDate: '2026-10-23', reason: 'Extended rest' },
  existingLeaves,
  nowRef
);
assert('overlapping leave request returns error', overlappingLeave !== null);

// Valid leave
const validLeave = validateLeave(
  { staffId: 'acc-doc-1', fromDate: '2026-10-25', toDate: '2026-10-26', reason: 'Vacation' },
  existingLeaves,
  nowRef
);
assertEqual('valid leave request passes validation', validLeave, null);

// 7. Leave Decisions & Self-Decision Restrictions
console.log('\n--- Test Group 7: Leave Decisions & Self-Decision Constraints ---');
const pendingReq: LeaveRequest = {
  id: 'leave-pending-1',
  staffId: 'acc-doc-2',
  staffName: 'Dr. Nathan Hayes',
  type: 'Casual',
  fromDate: '2026-10-25',
  toDate: '2026-10-26',
  reason: 'Conference',
  status: 'pending',
  requestedAt: '2026-10-14T09:00:00.000Z',
};

// Reject without note throws
let rejectWithoutNoteError = false;
try {
  decideLeave(pendingReq, 'rejected', { id: 'acc-doc-1', name: 'Dr. Marcus Vance' }, '', nowRef);
} catch {
  rejectWithoutNoteError = true;
}
assert('rejection without note throws error', rejectWithoutNoteError);

// Approve succeeds
const approved = decideLeave(pendingReq, 'approved', { id: 'acc-doc-1', name: 'Dr. Marcus Vance' }, 'Approved by MD', nowRef);
assertEqual('leave request approved status set', approved.status, 'approved');
assertEqual('approver name recorded', approved.decidedBy, 'Dr. Marcus Vance');

// Self decision check: if actor is requester and adminCount > 1, reject
let selfDecisionError = false;
try {
  decideLeave(
    { ...pendingReq, staffId: 'acc-doc-1' },
    'approved',
    { id: 'acc-doc-1', name: 'Dr. Marcus Vance' },
    undefined,
    nowRef,
    3 // 3 admins in clinic
  );
} catch {
  selfDecisionError = true;
}
assert('self-approval forbidden when other administrators exist', selfDecisionError);

// Cancel leave rules
const cancelPending = cancelLeave(pendingReq, { id: 'acc-doc-2' });
assertEqual('requester can cancel pending leave', cancelPending.status, 'cancelled');

let cancelOtherError = false;
try {
  cancelLeave(pendingReq, { id: 'acc-doc-1' });
} catch {
  cancelOtherError = true;
}
assert('non-requester cannot cancel leave request', cancelOtherError);

// 8. Sheet Code Resolution
console.log('\n--- Test Group 8: Attendance Sheet Codes ---');
const leavesList: LeaveRequest[] = [
  {
    id: 'l-approved',
    staffId: 'acc-doc-1',
    type: 'Sick',
    fromDate: '2026-10-10',
    toDate: '2026-10-11',
    reason: 'Illness',
    status: 'approved',
    requestedAt: '2026-10-09T08:00:00.000Z',
  },
];

const sampleRecords: AttendanceRecord[] = [
  {
    id: 'att-12',
    staffId: 'acc-doc-1',
    date: '2026-10-12', // Monday, present
    clockIn: '2026-10-12T09:02:00.000Z',
    clockOut: '2026-10-12T16:30:00.000Z',
  },
];

// Reference date: Wednesday Oct 14, 2026
const codePresent = sheetCode('acc-doc-1', '2026-10-12', testShift, sampleRecords, leavesList, testDate);
assertEqual('sheet code for clocked-in day is P', codePresent, 'P');

const codeLeave = sheetCode('acc-doc-1', '2026-10-10', testShift, sampleRecords, leavesList, testDate);
assertEqual('sheet code for approved leave day is LV', codeLeave, 'LV');

// Sunday Oct 04 was off-day (testShift is Mon-Fri)
const codeOff = sheetCode('acc-doc-1', '2026-10-04', testShift, sampleRecords, leavesList, testDate);
assertEqual('sheet code for scheduled off-day is OFF', codeOff, 'OFF');

// Tuesday Oct 13 was scheduled duty day with no record -> Absent
const codeAbsent = sheetCode('acc-doc-1', '2026-10-13', testShift, sampleRecords, leavesList, testDate);
assertEqual('sheet code for unworked past shift day is A', codeAbsent, 'A');

// Future day Oct 16
const codeFuture = sheetCode('acc-doc-1', '2026-10-16', testShift, sampleRecords, leavesList, testDate);
assertEqual('sheet code for future day is -', codeFuture, '-');

// 9. Availability Check
console.log('\n--- Test Group 9: Staff & Doctor Availability Integration ---');
// Doctor on leave
assert(
  'staff is unavailable on approved leave date',
  !isStaffAvailable('acc-doc-1', '2026-10-10', [testShift], sampleRecords, leavesList)
);

// Doctor on off-day (Sunday Oct 18)
assert(
  'staff is unavailable on scheduled day off',
  !isStaffAvailable('acc-doc-1', '2026-10-18', [testShift], sampleRecords, leavesList)
);

// Doctor on scheduled day (Monday Oct 12) without leave
assert(
  'staff is available on normal scheduled shift day',
  isStaffAvailable('acc-doc-1', '2026-10-12', [testShift], sampleRecords, leavesList)
);

// isDoctorAvailable wrapper test
const docAvail = isDoctorAvailable('doc-1', '2026-10-12', [testShift], sampleRecords, leavesList);
assertEqual('isDoctorAvailable resolves canonical ID and returns true for working day', docAvail, true);

const docUnavail = isDoctorAvailable('doc-1', '2026-10-10', [testShift], sampleRecords, leavesList);
assertEqual('isDoctorAvailable returns false for approved leave day', docUnavail, false);

// 10. Record Correction and Shift Editing
console.log('\n--- Test Group 10: Record Corrections & Shift Updates ---');
let correctWithoutReasonError = false;
try {
  correctRecord(onTimeRec, { note: 'Updated note' }, { id: 'acc-doc-1', name: 'Dr. Marcus Vance' }, '', testDate);
} catch {
  correctWithoutReasonError = true;
}
assert('correcting attendance record without reason is rejected', correctWithoutReasonError);

const corrected = correctRecord(
  onTimeRec,
  { clockIn: '2026-10-14T09:00:00.000Z' },
  { id: 'acc-doc-1', name: 'Dr. Marcus Vance' },
  'Corrected system clock desynchronization',
  testDate
);
assertEqual('corrected record contains correctionReason', corrected.correctionReason, 'Corrected system clock desynchronization');
assertEqual('corrected record records actor name', corrected.correctedBy, 'Dr. Marcus Vance');

const updatedShift = setShift(testShift, { graceMinutes: 20 }, { id: 'acc-doc-1', name: 'Dr. Marcus Vance' }, testDate);
assertEqual('setShift updates graceMinutes', updatedShift.graceMinutes, 20);

// 11. Staff Present Today
console.log('\n--- Test Group 11: Present Count & Monthly Summary ---');
const todayRecords: AttendanceRecord[] = [
  { id: 'a1', staffId: 'acc-doc-1', date: '2026-10-14', clockIn: '2026-10-14T09:00:00Z', clockOut: null },
  { id: 'a2', staffId: 'acc-doc-2', date: '2026-10-14', clockIn: '2026-10-14T09:05:00Z', clockOut: null },
  { id: 'a3', staffId: 'acc-rec-1', date: '2026-10-14', clockIn: null, clockOut: null },
];
const presentCount = staffPresentToday(todayRecords, '2026-10-14');
assertEqual('staffPresentToday counts staff with active clockIn', presentCount, 2);

const summary = monthlySummary(sampleRecords, [testShift], leavesList, 2026, 10, testDate);
assertEqual('monthlySummary returns 31 days for October', summary.daysInMonth, 31);
assert('monthlySummary produces summary for staff', summary.staffSummaries.length === 1);

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
