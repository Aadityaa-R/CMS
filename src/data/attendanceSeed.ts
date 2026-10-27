import { Shift, AttendanceRecord, LeaveRequest } from '@/types/attendance';
import { formatDateKey as formatDate, dayOfWeek, isOnLeave } from '@/lib/attendance';

export const INITIAL_SHIFTS: Shift[] = [
  {
    id: 'shift-doc-1',
    staffId: 'acc-doc-1',
    staffName: 'Dr. Marcus Vance',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '17:00',
    graceMinutes: 15,
  },
  {
    id: 'shift-doc-2',
    staffId: 'acc-doc-2',
    staffName: 'Dr. Nathan Hayes',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '17:00',
    graceMinutes: 15,
  },
  {
    id: 'shift-doc-3',
    staffId: 'acc-doc-3',
    staffName: 'Dr. Sophia Reed',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'],
    start: '09:30',
    end: '16:00',
    graceMinutes: 15,
  },
  {
    id: 'shift-rec-1',
    staffId: 'acc-rec-1',
    staffName: 'Priya Sharma',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '08:30',
    end: '17:00',
    graceMinutes: 15,
  },
  {
    id: 'shift-rec-2',
    staffId: 'acc-rec-2',
    staffName: 'David Kim',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '08:30',
    end: '17:00',
    graceMinutes: 15,
  },
];

export function generateInitialLeaveRequests(now: Date = new Date()): LeaveRequest[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  function offsetDate(days: number, hours = 9, minutes = 0): Date {
    return new Date(y, m, d + days, hours, minutes, 0, 0);
  }

  function offsetIso(days: number, hours = 9, minutes = 0): string {
    return offsetDate(days, hours, minutes).toISOString();
  }

  function offsetLocal(days: number): string {
    return formatDate(offsetDate(days));
  }

  const dayOfWeekNow = now.getDay();
  const daysSinceCurrentWeekMonday = (dayOfWeekNow + 6) % 7;
  const lastWeekMondayOffset = -(daysSinceCurrentWeekMonday + 7);

  // Dr. Sophia Reed: 3-day approved leave last week (Tue, Wed, Thu of last week)
  const reedLeaveStartOffset = lastWeekMondayOffset + 1;
  const reedLeaveEndOffset = lastWeekMondayOffset + 3;

  return [
    {
      id: 'leave-approved-reed',
      staffId: 'acc-doc-3',
      staffName: 'Dr. Sophia Reed',
      type: 'Sick',
      fromDate: offsetLocal(reedLeaveStartOffset),
      toDate: offsetLocal(reedLeaveEndOffset),
      reason: 'Acute respiratory infection with physician rest order',
      status: 'approved',
      requestedAt: offsetIso(reedLeaveStartOffset - 1, 8, 30),
      decidedBy: 'Dr. Marcus Vance (Managing Director)',
      decidedAt: offsetIso(reedLeaveStartOffset - 1, 9, 15),
      decisionNote: 'Approved. Clinic cross-coverage arranged with Dr. Nathan Hayes.',
    },
    {
      id: 'leave-pending-1',
      staffId: 'acc-rec-1',
      staffName: 'Priya Sharma',
      type: 'Casual',
      fromDate: offsetLocal(4),
      toDate: offsetLocal(5),
      reason: 'Personal travel and family commitment',
      status: 'pending',
      requestedAt: offsetIso(-1, 14, 20),
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
    },
    {
      id: 'leave-approved-doc-next-week',
      staffId: 'acc-doc-2',
      staffName: 'Dr. Nathan Hayes',
      type: 'Other',
      fromDate: offsetLocal(7),
      toDate: offsetLocal(9),
      reason: 'Medical symposium on respiratory clinical protocols',
      status: 'approved',
      requestedAt: offsetIso(-3, 10, 0),
      decidedBy: 'Dr. Marcus Vance (Managing Director)',
      decidedAt: offsetIso(-3, 11, 0),
      decisionNote: 'Approved.',
    },
  ];
}

export function generateInitialAttendanceRecords(
  now: Date = new Date(),
  shifts: Shift[] = INITIAL_SHIFTS,
  leaves: LeaveRequest[] = generateInitialLeaveRequests(now)
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  const dayOfWeekNow = now.getDay();
  const daysSinceCurrentWeekMonday = (dayOfWeekNow + 6) % 7;
  const lastWeekMondayOffset = -(daysSinceCurrentWeekMonday + 7);

  // Priya Sharma: late on 3 days in the past 14 days (last week Mon, Wed, Fri)
  const sharmaLateOffsets = [
    lastWeekMondayOffset,
    lastWeekMondayOffset + 2,
    lastWeekMondayOffset + 4,
  ];

  // David Kim: 1 absent weekday (last week Thu)
  const kimAbsentOffset = lastWeekMondayOffset + 3;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let offset = -14; offset <= 0; offset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dateStr = formatDate(targetDate);
    const day = dayOfWeek(dateStr);

    // Weekends are off
    if (day === 'Sat' || day === 'Sun') {
      continue;
    }

    shifts.forEach((shift, staffIdx) => {
      // Must be scheduled shift day
      if (!shift.days.includes(day)) {
        return;
      }

      // Check approved leave
      if (isOnLeave(shift.staffId, dateStr, leaves)) {
        return;
      }

      const [sh, sm] = shift.start.split(':').map(Number);
      const [eh, em] = shift.end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      // -------------------------------------------------------------
      // TODAY (offset === 0)
      // -------------------------------------------------------------
      if (offset === 0) {
        // If current time is before shift start, do not create record
        if (nowMinutes < startMin) {
          return;
        }

        // Dr. Sophia Reed: no record today (shows "Not clocked in" with Quick Clock In)
        if (shift.staffId === 'acc-doc-3') {
          return;
        }

        // Clock-in derived strictly from shift start, never from current time:
        // Dr. Marcus Vance: start minus 5 min
        // Dr. Nathan Hayes: start plus 8 min (inside grace period)
        // Priya Sharma: start plus 24 min (late by 9 min after 15 min grace)
        // David Kim: start minus 2 min
        let inMin = startMin;
        if (shift.staffId === 'acc-doc-1') {
          inMin = startMin - 5;
        } else if (shift.staffId === 'acc-doc-2') {
          inMin = startMin + 8;
        } else if (shift.staffId === 'acc-rec-1') {
          inMin = startMin + 24;
        } else if (shift.staffId === 'acc-rec-2') {
          inMin = startMin - 2;
        }

        const clockInDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          Math.floor(inMin / 60),
          inMin % 60,
          0
        );

        // Add clock-out (shift end plus 0 to 10 min) only when current time is past shift end
        let clockOutIso: string | null = null;
        if (nowMinutes > endMin) {
          const outOffsets = [4, 7, 3, 5];
          const outMin = endMin + outOffsets[staffIdx % outOffsets.length];
          const clockOutDate = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            Math.floor(outMin / 60),
            outMin % 60,
            0
          );
          clockOutIso = clockOutDate.toISOString();
        }

        records.push({
          id: `att-${shift.staffId}-${dateStr}`,
          staffId: shift.staffId,
          staffName: shift.staffName,
          date: dateStr,
          clockIn: clockInDate.toISOString(),
          clockOut: clockOutIso,
        });
        return;
      }

      // -------------------------------------------------------------
      // LAST 14 DAYS (offset < 0)
      // -------------------------------------------------------------

      // David Kim: 1 absent weekday (no record and no leave)
      if (shift.staffId === 'acc-rec-2' && offset === kimAbsentOffset) {
        return;
      }

      // Dr. Nathan Hayes: missing clock-out yesterday (clock-in only)
      if (shift.staffId === 'acc-doc-2' && offset === -1) {
        const inMin = startMin - 3;
        const clockInDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          Math.floor(inMin / 60),
          inMin % 60,
          0
        );
        records.push({
          id: `att-${shift.staffId}-${dateStr}`,
          staffId: shift.staffId,
          staffName: shift.staffName,
          date: dateStr,
          clockIn: clockInDate.toISOString(),
          clockOut: null,
          note: 'Forgot to clock out before clinic closure',
        });
        return;
      }

      // Priya Sharma: late (20 to 35 min) on 3 of those days
      if (shift.staffId === 'acc-rec-1' && sharmaLateOffsets.includes(offset)) {
        const lateMins = [24, 28, 32];
        const lateAdd = lateMins[sharmaLateOffsets.indexOf(offset) % lateMins.length];
        const inMin = startMin + lateAdd;
        const outMin = endMin + 6;
        const clockInDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          Math.floor(inMin / 60),
          inMin % 60,
          0
        );
        const clockOutDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          Math.floor(outMin / 60),
          outMin % 60,
          0
        );
        records.push({
          id: `att-${shift.staffId}-${dateStr}`,
          staffId: shift.staffId,
          staffName: shift.staffName,
          date: dateStr,
          clockIn: clockInDate.toISOString(),
          clockOut: clockOutDate.toISOString(),
        });
        return;
      }

      // Normal days: clock-in between 10 min before and 10 min after shift start,
      // clock-out between 5 min before and 20 min after shift end, varied by day index.
      const dayIdx = Math.abs(offset);
      const inVariations = [-6, 4, -9, 8, -3, 6, -10, 2, -5, 9, -2, 7, -8, 5];
      const outVariations = [7, 14, -2, 18, 5, 20, -5, 12, 3, 16, -1, 10, 6, 19];
      const inVar = inVariations[(dayIdx + staffIdx * 3) % inVariations.length];
      const outVar = outVariations[(dayIdx + staffIdx * 5) % outVariations.length];

      const inMin = startMin + inVar;
      const outMin = endMin + outVar;

      const clockInDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        Math.floor(inMin / 60),
        inMin % 60,
        0
      );
      const clockOutDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        Math.floor(outMin / 60),
        outMin % 60,
        0
      );

      records.push({
        id: `att-${shift.staffId}-${dateStr}`,
        staffId: shift.staffId,
        staffName: shift.staffName,
        date: dateStr,
        clockIn: clockInDate.toISOString(),
        clockOut: clockOutDate.toISOString(),
      });
    });
  }

  return records;
}

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = generateInitialAttendanceRecords();
export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = generateInitialLeaveRequests();
