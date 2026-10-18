import { describe, it, expect } from 'vitest';
import {
  clockIn,
  clockOut,
  hoursWorked,
  lateMinutes,
  staffPresentToday,
  validateLeave,
  decideLeave,
  cancelLeave,
  monthlySummary,
} from '../src/lib/attendance';
import { Shift, AttendanceRecord, LeaveRequest } from '../src/types/attendance';

describe('Staff Time, Attendance, and Leave Engine (M9.5 Requirement H)', () => {
  const testShift: Shift = {
    id: 'shf-test-1',
    staffId: 'acc-doc-1',
    staffName: 'Dr. Marcus Vance',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '09:00',
    end: '16:30',
    graceMinutes: 15,
  };

  const testNow = new Date(2026, 9, 14, 9, 5, 0); // Wednesday, Oct 14, 2026 09:05:00

  describe('Clock-In and Approved Leave Enforcement', () => {
    const approvedLeave: LeaveRequest = {
      id: 'leave-app-1',
      staffId: 'acc-doc-1',
      staffName: 'Dr. Marcus Vance',
      type: 'Casual',
      fromDate: '2026-10-14',
      toDate: '2026-10-14',
      reason: 'Doctor Appointment',
      status: 'approved',
      requestedAt: '2026-10-10T08:00:00Z',
    };

    it('refuses clock-in when on approved leave', () => {
      expect(() => {
        clockIn(null, testShift, testNow, 'acc-doc-1', 'Dr. Marcus Vance', [approvedLeave], false);
      }).toThrow(/on approved leave/i);
    });

    it('permits clock-in when on approved leave if override is explicitly specified', () => {
      const rec = clockIn(null, testShift, testNow, 'acc-doc-1', 'Dr. Marcus Vance', [approvedLeave], true);
      expect(rec.clockIn).toBeTruthy();
      expect(rec.staffId).toBe('acc-doc-1');
    });

    it('prevents duplicate clock-ins on the same calendar day', () => {
      const rec = clockIn(null, testShift, testNow, 'acc-doc-1', 'Dr. Marcus Vance');
      expect(() => {
        clockIn(rec, testShift, testNow, 'acc-doc-1');
      }).toThrow(/already clocked in/i);
    });
  });

  describe('Clock-Out, Hours Calculation, and Punctuality', () => {
    it('calculates hours worked accurately to 2 decimal places', () => {
      const rec = clockIn(null, testShift, testNow, 'acc-doc-1', 'Dr. Marcus Vance');
      const outDate = new Date(2026, 9, 14, 16, 35, 0); // 7.5 hours later
      const completed = clockOut(rec, outDate);
      expect(hoursWorked(completed)).toBe(7.5);
    });

    it('computes late arrival taking grace minutes into account', () => {
      // 09:10 arrival (within 15m grace) -> 0 late
      const onTimeRec: AttendanceRecord = {
        id: 'att-1',
        staffId: 'acc-doc-1',
        date: '2026-10-14',
        clockIn: new Date(2026, 9, 14, 9, 10, 0).toISOString(),
        clockOut: null,
      };
      expect(lateMinutes(onTimeRec, testShift)).toBe(0);

      // 09:30 arrival (15m past the 09:15 grace limit) -> 15 late
      const lateRec: AttendanceRecord = {
        id: 'att-2',
        staffId: 'acc-doc-1',
        date: '2026-10-14',
        clockIn: new Date(2026, 9, 14, 9, 30, 0).toISOString(),
        clockOut: null,
      };
      expect(lateMinutes(lateRec, testShift)).toBe(15);
    });
  });

  describe('Leave Validation Rules', () => {
    const existingLeaves: LeaveRequest[] = [
      {
        id: 'l-1',
        staffId: 'acc-doc-1',
        type: 'Sick',
        fromDate: '2026-10-20',
        toDate: '2026-10-22',
        reason: 'Medical recovery',
        status: 'approved',
        requestedAt: '2026-10-12T08:00:00Z',
      },
    ];

    it('rejects leave when fromDate is after toDate', () => {
      const err = validateLeave(
        { staffId: 'acc-doc-1', fromDate: '2026-10-25', toDate: '2026-10-24', reason: 'Personal' },
        existingLeaves,
        testNow
      );
      expect(err).toMatch(/on or before/i);
    });

    it('rejects leave with empty reason', () => {
      const err = validateLeave(
        { staffId: 'acc-doc-1', fromDate: '2026-10-25', toDate: '2026-10-26', reason: '   ' },
        existingLeaves,
        testNow
      );
      expect(err).toMatch(/reason.*required/i);
    });

    it('rejects backdating more than 7 days', () => {
      const err = validateLeave(
        { staffId: 'acc-doc-1', fromDate: '2026-10-01', toDate: '2026-10-02', reason: 'Emergency' },
        existingLeaves,
        testNow
      );
      expect(err).toMatch(/cannot be backdated more than 7 days/i);
    });

    it('rejects overlapping leave requests', () => {
      const err = validateLeave(
        { staffId: 'acc-doc-1', fromDate: '2026-10-21', toDate: '2026-10-23', reason: 'Extended' },
        existingLeaves,
        testNow
      );
      expect(err).toMatch(/overlaps with an existing/i);
    });

    it('accepts valid leave request', () => {
      const err = validateLeave(
        { staffId: 'acc-doc-1', fromDate: '2026-10-25', toDate: '2026-10-26', reason: 'Vacation' },
        existingLeaves,
        testNow
      );
      expect(err).toBeNull();
    });
  });

  describe('Leave Decision and Cancellation Rules', () => {
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

    it('permits sole admin to self-approve leave request', () => {
      const approved = decideLeave(
        { ...pendingReq, staffId: 'acc-doc-1' },
        'approved',
        { id: 'acc-doc-1', name: 'Dr. Marcus Vance' },
        'Sole admin self approval',
        testNow,
        1 // sole admin
      );
      expect(approved.status).toBe('approved');
      expect(approved.decidedBy).toBe('Dr. Marcus Vance');
    });

    it('forbids self-decision when multiple administrators exist', () => {
      expect(() => {
        decideLeave(
          { ...pendingReq, staffId: 'acc-doc-1' },
          'approved',
          { id: 'acc-doc-1', name: 'Dr. Marcus Vance' },
          'Self approval',
          testNow,
          2 // 2 admins exist
        );
      }).toThrow(/cannot approve or reject your own/i);
    });

    it('requires a note when rejecting a leave request', () => {
      expect(() => {
        decideLeave(
          pendingReq,
          'rejected',
          { id: 'acc-doc-1', name: 'Dr. Marcus Vance' },
          '',
          testNow
        );
      }).toThrow(/decision note.*required/i);
    });

    it('permits requester to cancel pending leave', () => {
      const cancelled = cancelLeave(pendingReq, { id: 'acc-doc-2' });
      expect(cancelled.status).toBe('cancelled');
    });

    it('fails to cancel non-pending leave request', () => {
      const approvedReq: LeaveRequest = { ...pendingReq, status: 'approved' };
      expect(() => {
        cancelLeave(approvedReq, { id: 'acc-doc-2' });
      }).toThrow(/only pending leave requests can be cancelled/i);

      const rejectedReq: LeaveRequest = { ...pendingReq, status: 'rejected' };
      expect(() => {
        cancelLeave(rejectedReq, { id: 'acc-doc-2' });
      }).toThrow(/only pending leave requests can be cancelled/i);
    });

    it('fails when non-requester attempts to cancel leave', () => {
      expect(() => {
        cancelLeave(pendingReq, { id: 'acc-doc-1' });
      }).toThrow(/only the requester can cancel/i);
    });
  });

  describe('Monthly Summary and Present Definition', () => {
    it('accurately counts staff present today', () => {
      const records: AttendanceRecord[] = [
        { id: 'a1', staffId: 'acc-doc-1', date: '2026-10-14', clockIn: '2026-10-14T09:00:00Z', clockOut: null },
        { id: 'a2', staffId: 'acc-doc-2', date: '2026-10-14', clockIn: '2026-10-14T09:05:00Z', clockOut: null },
        { id: 'a3', staffId: 'acc-rec-1', date: '2026-10-14', clockIn: null, clockOut: null },
      ];
      expect(staffPresentToday(records, '2026-10-14')).toBe(2);
    });

    it('generates monthly summary with all numeric fields populated', () => {
      const records: AttendanceRecord[] = [
        {
          id: 'att-12',
          staffId: 'acc-doc-1',
          date: '2026-10-12',
          clockIn: '2026-10-12T09:00:00.000Z',
          clockOut: '2026-10-12T16:30:00.000Z',
        },
      ];
      const summary = monthlySummary(records, [testShift], [], 2026, 10, testNow);
      expect(summary.daysInMonth).toBe(31);
      expect(summary.staffSummaries.length).toBe(1);

      const staff = summary.staffSummaries[0];
      expect(typeof staff.presentDays).toBe('number');
      expect(typeof staff.absentDays).toBe('number');
      expect(typeof staff.leaveDays).toBe('number');
      expect(typeof staff.offDays).toBe('number');
      expect(typeof staff.totalHoursWorked).toBe('number');
      expect(staff.totalHoursWorked).toBe(7.5);
    });
  });
});
