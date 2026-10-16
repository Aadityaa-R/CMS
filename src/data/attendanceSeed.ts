import { Shift, AttendanceRecord, LeaveRequest } from '@/types/attendance';
import { formatDate, dayOfWeek } from '@/lib/attendance';

export const INITIAL_SHIFTS: Shift[] = [
  {
    id: 'shf-acc-doc-1',
    staffId: 'acc-doc-1',
    staffName: 'Dr. Marcus Vance',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '16:30',
    graceMinutes: 15,
  },
  {
    id: 'shf-acc-doc-2',
    staffId: 'acc-doc-2',
    staffName: 'Dr. Nathan Hayes',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '17:00',
    graceMinutes: 15,
  },
  {
    id: 'shf-acc-doc-3',
    staffId: 'acc-doc-3',
    staffName: 'Dr. Sophia Reed',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'],
    start: '09:30',
    end: '16:00',
    graceMinutes: 15,
  },
  {
    id: 'shf-acc-rec-1',
    staffId: 'acc-rec-1',
    staffName: 'Priya Sharma',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '16:30',
    graceMinutes: 15,
  },
  {
    id: 'shf-acc-rec-2',
    staffId: 'acc-rec-2',
    staffName: 'David Kim',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '16:30',
    graceMinutes: 15,
  },
];

export function generateInitialLeaveRequests(now: Date = new Date()): LeaveRequest[] {
  // 1 approved leave: Dr. Sophia Reed was on leave 4 and 3 days ago
  const leave1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4);
  const leave1End = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);

  // 1 pending leave: Priya Sharma requesting leave next week (+4 to +5 days)
  const leave2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4);
  const leave2End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);

  return [
    {
      id: 'leave-1',
      staffId: 'acc-doc-3',
      staffName: 'Dr. Sophia Reed',
      type: 'Sick',
      fromDate: formatDate(leave1Start),
      toDate: formatDate(leave1End),
      reason: 'Acute respiratory infection with physician rest order',
      status: 'approved',
      requestedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 8, 30).toISOString(),
      decidedBy: 'Dr. Marcus Vance (Managing Director)',
      decidedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 9, 15).toISOString(),
      decisionNote: 'Approved. Clinic cross-coverage arranged with Dr. Nathan Hayes.',
    },
    {
      id: 'leave-2',
      staffId: 'acc-rec-1',
      staffName: 'Priya Sharma',
      type: 'Casual',
      fromDate: formatDate(leave2Start),
      toDate: formatDate(leave2End),
      reason: 'Family event and personal travel',
      status: 'pending',
      requestedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 20).toISOString(),
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
    },
  ];
}

export function generateInitialAttendanceRecords(now: Date = new Date()): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const leaves = generateInitialLeaveRequests(now);

  for (let offset = -14; offset <= 0; offset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dateStr = formatDate(targetDate);
    const day = dayOfWeek(dateStr);

    for (const shift of INITIAL_SHIFTS) {
      const isLeave = leaves.some(
        (l) => l.staffId === shift.staffId && l.status === 'approved' && l.fromDate <= dateStr && dateStr <= l.toDate
      );
      if (isLeave) {
        // Staff on approved leave does not record standard clock-in
        continue;
      }

      const isScheduled = shift.days.includes(day);

      // Seed 1 outside shift: Dr. Nathan Hayes worked on Sunday 6 days ago
      if (offset === -6 && shift.staffId === 'acc-doc-2' && !isScheduled) {
        const inTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 10, 0);
        const outTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 14, 30);
        records.push({
          id: `att-${shift.staffId}-${dateStr}`,
          staffId: shift.staffId,
          staffName: shift.staffName,
          date: dateStr,
          clockIn: inTime.toISOString(),
          clockOut: outTime.toISOString(),
          note: 'Emergency weekend on-call consultation duty',
        });
        continue;
      }

      if (!isScheduled) {
        continue;
      }

      // Today (offset === 0): Clock in some staff, leave others pending
      if (offset === 0) {
        if (shift.staffId === 'acc-doc-1' || shift.staffId === 'acc-doc-2' || shift.staffId === 'acc-rec-1') {
          const [sh, sm] = shift.start.split(':').map(Number);
          const inTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sh, sm + 4);
          records.push({
            id: `att-${shift.staffId}-${dateStr}`,
            staffId: shift.staffId,
            staffName: shift.staffName,
            date: dateStr,
            clockIn: inTime.toISOString(),
            clockOut: null, // Still actively working today
          });
        }
        continue;
      }

      // Seed 1 missing clock-out: David Kim 3 days ago
      if (offset === -3 && shift.staffId === 'acc-rec-2') {
        const [sh, sm] = shift.start.split(':').map(Number);
        const inTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sh, sm + 2);
        records.push({
          id: `att-${shift.staffId}-${dateStr}`,
          staffId: shift.staffId,
          staffName: shift.staffName,
          date: dateStr,
          clockIn: inTime.toISOString(),
          clockOut: null, // Missing clock out
          note: 'Forgot to clock out before clinic closure',
        });
        continue;
      }

      // Regular past days:
      const [sh, sm] = shift.start.split(':').map(Number);
      const [eh, em] = shift.end.split(':').map(Number);

      // Vary punctuality: occasionally 20 minutes late
      const isLateDay = (offset + shift.staffId.charCodeAt(shift.staffId.length - 1)) % 5 === 0;
      const inMinutesAdd = isLateDay ? 22 : Math.abs(offset) % 10;
      const inTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sh, sm + inMinutesAdd);
      const outTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), eh, em + 5);

      records.push({
        id: `att-${shift.staffId}-${dateStr}`,
        staffId: shift.staffId,
        staffName: shift.staffName,
        date: dateStr,
        clockIn: inTime.toISOString(),
        clockOut: outTime.toISOString(),
      });
    }
  }

  return records;
}
