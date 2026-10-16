/**
 * Staff Time, Attendance, and Leave Management Engine.
 *
 * Production Note:
 * Timestamps in this implementation derive from the client device clock for demo execution.
 * Production clinical environments require cryptographically verified server-side timestamps
 * to ensure regulatory audit compliance and prevent client-side time modification.
 */

import {
  Shift,
  AttendanceRecord,
  LeaveRequest,
  DaySheetCode,
  MonthlyAttendanceSummary,
  StaffMonthlySummary,
  DayOfWeek,
} from '@/types/attendance';

export const MAX_LEAVE_BACKDATE_DAYS = 7;

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function dayOfWeek(dateStr: string): DayOfWeek {
  const d = parseDate(dateStr);
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

export function getMinutesFromDate(d: Date | string): number {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.getHours() * 60 + dateObj.getMinutes();
}

/**
 * Clock in a staff member.
 * Only one clock-in allowed per calendar day.
 */
export function clockIn(
  record: AttendanceRecord | null,
  _shift: Shift | undefined,
  now: Date,
  staffId: string,
  staffName?: string
): AttendanceRecord {
  const todayStr = formatDate(now);
  if (record && record.clockIn) {
    throw new Error('Staff member is already clocked in for today.');
  }

  return {
    id: record ? record.id : `att-${staffId}-${todayStr}`,
    staffId: record ? record.staffId : staffId,
    staffName: record?.staffName || staffName,
    date: todayStr,
    clockIn: now.toISOString(),
    clockOut: record?.clockOut || null,
    note: record?.note,
  };
}

/**
 * Clock out a staff member.
 * Must be clocked in first, not already clocked out, and out time must be after in time.
 */
export function clockOut(record: AttendanceRecord, now: Date): AttendanceRecord {
  if (!record.clockIn) {
    throw new Error('Cannot clock out without clocking in first.');
  }
  if (record.clockOut) {
    throw new Error('Staff member is already clocked out for today.');
  }

  const inTime = new Date(record.clockIn).getTime();
  const outTime = now.getTime();
  if (outTime < inTime) {
    throw new Error('Clock out time cannot be earlier than clock in time.');
  }

  return {
    ...record,
    clockOut: now.toISOString(),
  };
}

/**
 * Calculate total hours worked, rounded to 2 decimal places.
 */
export function hoursWorked(record: AttendanceRecord): number {
  if (!record.clockIn || !record.clockOut) return 0;
  const inTime = new Date(record.clockIn).getTime();
  const outTime = new Date(record.clockOut).getTime();
  const diffMs = outTime - inTime;
  if (diffMs <= 0) return 0;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Calculate late minutes past the shift start and grace threshold.
 * If arrival is within start + graceMinutes, returns 0.
 * If after grace, returns minutes after the grace threshold.
 */
export function lateMinutes(record: AttendanceRecord, shift: Shift | undefined): number {
  if (!record.clockIn || !shift) return 0;
  const clockInMinutes = getMinutesFromDate(record.clockIn);
  const shiftStartMinutes = timeToMinutes(shift.start);
  const grace = shift.graceMinutes ?? 15;
  const threshold = shiftStartMinutes + grace;
  if (clockInMinutes > threshold) {
    return clockInMinutes - threshold;
  }
  return 0;
}

/**
 * Calculate early departure minutes relative to scheduled shift end.
 */
export function earlyMinutes(record: AttendanceRecord, shift: Shift | undefined): number {
  if (!record.clockOut || !shift) return 0;
  const clockOutMinutes = getMinutesFromDate(record.clockOut);
  const shiftEndMinutes = timeToMinutes(shift.end);
  if (clockOutMinutes < shiftEndMinutes) {
    return shiftEndMinutes - clockOutMinutes;
  }
  return 0;
}

/**
 * Determine if an attendance record occurred outside the scheduled shift.
 */
export function isOutsideShift(record: AttendanceRecord, shift: Shift | undefined): boolean {
  if (!shift) return true;
  const day = dayOfWeek(record.date);
  if (!shift.days.includes(day)) return true;

  if (record.clockIn) {
    const inMin = getMinutesFromDate(record.clockIn);
    const startMin = timeToMinutes(shift.start);
    const endMin = timeToMinutes(shift.end);
    if (inMin < startMin - 60 || inMin > endMin + 60) return true;
  }
  return false;
}

/**
 * Check if a shift day in the past is missing a clock out.
 */
export function missingClockOut(record: AttendanceRecord, now: Date): boolean {
  if (!record.clockIn || record.clockOut) return false;
  const todayStr = formatDate(now);
  return record.date < todayStr;
}

/**
 * Check if a staff member is on approved leave on a given date.
 */
export function isOnLeave(staffId: string, date: string, leaves: LeaveRequest[]): boolean {
  return leaves.some(
    (l) => l.staffId === staffId && l.status === 'approved' && l.fromDate <= date && date <= l.toDate
  );
}

/**
 * Check staff availability on a specific date based on shifts and approved leaves.
 */
export function isStaffAvailable(
  staffId: string,
  date: string,
  shifts: Shift[],
  _records: AttendanceRecord[],
  leaves: LeaveRequest[]
): boolean {
  if (isOnLeave(staffId, date, leaves)) return false;
  const shift = shifts.find((s) => s.staffId === staffId);
  if (shift && !shift.days.includes(dayOfWeek(date))) return false;
  return true;
}

/**
 * Resolve the sheet status code for a staff member on a specific calendar date.
 * Codes:
 *   P   - Present (clocked in)
 *   LV  - Approved Leave
 *   OFF - Scheduled Off day
 *   A   - Absent (past shift day without clock in)
 *   -   - Future date or today before/during shift
 */
export function sheetCode(
  staffId: string,
  date: string,
  shift: Shift | undefined,
  records: AttendanceRecord[],
  leaves: LeaveRequest[],
  now: Date
): DaySheetCode {
  if (isOnLeave(staffId, date, leaves)) return 'LV';

  const rec = records.find((r) => r.staffId === staffId && r.date === date);
  if (rec && rec.clockIn) return 'P';

  const todayStr = formatDate(now);
  const day = dayOfWeek(date);
  const isShiftDay = shift ? shift.days.includes(day) : false;

  if (date > todayStr) {
    return '-';
  }

  if (date === todayStr) {
    if (!isShiftDay) return 'OFF';
    return '-';
  }

  // Past date with no clock in
  if (!isShiftDay) return 'OFF';
  return 'A';
}

/**
 * Count how many staff members are present (clocked in) on a specific date.
 */
export function staffPresentToday(records: AttendanceRecord[], today: string): number {
  const staffSet = new Set<string>();
  for (const r of records) {
    if (r.date === today && r.clockIn) {
      staffSet.add(r.staffId);
    }
  }
  return staffSet.size;
}

/**
 * Validate a leave request before submission.
 */
export function validateLeave(
  request: { staffId: string; fromDate: string; toDate: string; reason: string },
  existingLeaves: LeaveRequest[],
  now: Date
): string | null {
  if (!request.fromDate || !request.toDate) {
    return 'From date and to date are required.';
  }
  if (request.fromDate > request.toDate) {
    return 'From date must be on or before to date.';
  }
  if (!request.reason || !request.reason.trim()) {
    return 'Reason for leave is required.';
  }

  // Backdating check: cannot backdate more than 7 days
  const minAllowed = new Date(now.getFullYear(), now.getMonth(), now.getDate() - MAX_LEAVE_BACKDATE_DAYS);
  const minAllowedStr = formatDate(minAllowed);
  if (request.fromDate < minAllowedStr) {
    return `Leave cannot be backdated more than ${MAX_LEAVE_BACKDATE_DAYS} days.`;
  }

  // Overlap check with active (pending or approved) requests for the same staff member
  const hasOverlap = existingLeaves.some((l) => {
    if (l.staffId !== request.staffId) return false;
    if (l.status !== 'pending' && l.status !== 'approved') return false;
    return request.fromDate <= l.toDate && request.toDate >= l.fromDate;
  });

  if (hasOverlap) {
    return 'Leave request overlaps with an existing pending or approved leave.';
  }

  return null;
}

/**
 * Approve or reject a leave request.
 * Rejection requires a non-empty note.
 * Self-decision is forbidden unless the actor is the sole administrator.
 */
export function decideLeave(
  request: LeaveRequest,
  decision: 'approved' | 'rejected',
  actor: { id: string; name?: string; isOriginalAdmin?: boolean },
  note: string | undefined,
  now: Date,
  allAdminCount?: number
): LeaveRequest {
  if (decision === 'rejected' && (!note || !note.trim())) {
    throw new Error('A decision note explaining the reason for rejection is required.');
  }

  const isOwnRequest = actor.id === request.staffId;
  if (isOwnRequest) {
    const isSoleAdmin = allAdminCount !== undefined ? allAdminCount <= 1 : false;
    if (!isSoleAdmin) {
      throw new Error('You cannot approve or reject your own leave request.');
    }
  }

  return {
    ...request,
    status: decision,
    decidedBy: actor.name || actor.id,
    decidedAt: now.toISOString(),
    decisionNote: note ? note.trim() : null,
  };
}

/**
 * Cancel a pending leave request.
 * Only the requester can cancel, and only while status is pending.
 */
export function cancelLeave(request: LeaveRequest, actor: { id: string }): LeaveRequest {
  if (request.status !== 'pending') {
    throw new Error('Only pending leave requests can be cancelled.');
  }
  if (actor.id !== request.staffId) {
    throw new Error('Only the requester can cancel their own leave request.');
  }

  return {
    ...request,
    status: 'cancelled',
  };
}

/**
 * Correct an attendance record with mandatory reason and audit metadata.
 */
export function correctRecord(
  record: AttendanceRecord,
  patch: Partial<Pick<AttendanceRecord, 'clockIn' | 'clockOut' | 'note'>>,
  actor: { id: string; name?: string },
  reason: string,
  now: Date
): AttendanceRecord {
  if (!reason || !reason.trim()) {
    throw new Error('A correction reason is required.');
  }

  return {
    ...record,
    ...patch,
    correctedBy: actor.name || actor.id,
    correctionReason: reason.trim(),
    correctedAt: now.toISOString(),
  };
}

/**
 * Update shift definition.
 */
export function setShift(
  shift: Shift,
  patch: Partial<Omit<Shift, 'id' | 'staffId'>>,
  _actor: { id: string; name?: string },
  _now: Date
): Shift {
  return {
    ...shift,
    ...patch,
  };
}

/**
 * Calculate full monthly summary for a given year and month.
 */
export function monthlySummary(
  records: AttendanceRecord[],
  shifts: Shift[],
  leaves: LeaveRequest[],
  year: number,
  month: number, // 1-12
  now: Date
): MonthlyAttendanceSummary {
  const daysInMonth = new Date(year, month, 0).getDate();

  const staffSummaries: StaffMonthlySummary[] = shifts.map((shift) => {
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let offDays = 0;
    let totalHoursWorked = 0;
    const dailyCodes: Record<number, DaySheetCode> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const code = sheetCode(shift.staffId, dateStr, shift, records, leaves, now);
      dailyCodes[day] = code;

      if (code === 'P') presentDays++;
      else if (code === 'A') absentDays++;
      else if (code === 'LV') leaveDays++;
      else if (code === 'OFF') offDays++;
    }

    // Sum hours worked in this month
    for (const rec of records) {
      if (rec.staffId === shift.staffId && rec.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
        totalHoursWorked += hoursWorked(rec);
      }
    }

    return {
      staffId: shift.staffId,
      staffName: shift.staffName || shift.staffId,
      presentDays,
      absentDays,
      leaveDays,
      offDays,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      dailyCodes,
    };
  });

  return {
    year,
    month,
    daysInMonth,
    staffSummaries,
  };
}
