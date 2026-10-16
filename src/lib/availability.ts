import { Shift, AttendanceRecord, LeaveRequest } from '@/types/attendance';
import {
  INITIAL_SHIFTS,
  generateInitialAttendanceRecords,
  generateInitialLeaveRequests,
} from '@/data/attendanceSeed';
import { isStaffAvailable, formatDate } from '@/lib/attendance';

export function getDoctorCanonicalStaffId(doctorId: string): string {
  if (doctorId === 'doc-1' || doctorId === 'usr-doc-1') return 'acc-doc-1';
  if (doctorId === 'doc-2' || doctorId === 'usr-doc-2') return 'acc-doc-2';
  if (doctorId === 'doc-3' || doctorId === 'usr-doc-3') return 'acc-doc-3';
  return doctorId;
}

function getStoredOrInitialAttendanceData(): {
  shifts: Shift[];
  records: AttendanceRecord[];
  leaves: LeaveRequest[];
} {
  let shifts = INITIAL_SHIFTS;
  let records = generateInitialAttendanceRecords();
  let leaves = generateInitialLeaveRequests();

  try {
    const savedShifts = sessionStorage.getItem('cms_shifts_v1');
    if (savedShifts) shifts = JSON.parse(savedShifts);
  } catch {
    // Fallback
  }

  try {
    const savedRecords = sessionStorage.getItem('cms_attendance_records_v1');
    if (savedRecords) records = JSON.parse(savedRecords);
  } catch {
    // Fallback
  }

  try {
    const savedLeaves = sessionStorage.getItem('cms_leave_requests_v1');
    if (savedLeaves) leaves = JSON.parse(savedLeaves);
  } catch {
    // Fallback
  }

  return { shifts, records, leaves };
}

/**
 * Check if a doctor is available for consultations on a specific date.
 * If date is omitted, defaults to today.
 */
export function isDoctorAvailable(
  doctorId: string,
  date?: string,
  customShifts?: Shift[],
  customRecords?: AttendanceRecord[],
  customLeaves?: LeaveRequest[]
): boolean {
  const checkDate = date || formatDate(new Date());
  const canonicalStaffId = getDoctorCanonicalStaffId(doctorId);

  let shifts = customShifts;
  let records = customRecords;
  let leaves = customLeaves;

  if (!shifts || !records || !leaves) {
    const fallbackData = getStoredOrInitialAttendanceData();
    shifts = shifts || fallbackData.shifts;
    records = records || fallbackData.records;
    leaves = leaves || fallbackData.leaves;
  }

  return isStaffAvailable(canonicalStaffId, checkDate, shifts, records, leaves);
}
