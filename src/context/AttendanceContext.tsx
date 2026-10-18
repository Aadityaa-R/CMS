import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shift, AttendanceRecord, LeaveRequest, LeaveType } from '@/types/attendance';
import {
  INITIAL_SHIFTS,
  generateInitialAttendanceRecords,
  generateInitialLeaveRequests,
} from '@/data/attendanceSeed';
import {
  clockIn,
  clockOut,
  validateLeave,
  decideLeave,
  cancelLeave,
  correctRecord,
  setShift,
  isOnLeave,
  formatDate,
} from '@/lib/attendance';
import { useAuth } from '@/context/AuthContext';
import { hasCapability } from '@/lib/permissions';
import { getRepository } from '@/data/storage';
import { STORAGE_KEY_PREFIX } from '@/lib/authConstants';

interface AttendanceContextType {
  shifts: Shift[];
  records: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  clockInUser: (targetStaffId?: string, overrideLeave?: boolean) => { success: boolean; error?: string };
  clockOutUser: (targetStaffId?: string) => { success: boolean; error?: string };
  requestLeave: (data: { type: LeaveType; fromDate: string; toDate: string; reason: string }) => {
    success: boolean;
    error?: string;
  };
  decideLeaveRequest: (
    requestId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) => { success: boolean; error?: string };
  cancelLeaveRequest: (requestId: string) => { success: boolean; error?: string };
  correctAttendanceRecord: (
    recordId: string,
    patch: Partial<Pick<AttendanceRecord, 'clockIn' | 'clockOut' | 'note'>>,
    reason: string
  ) => { success: boolean; error?: string };
  updateShift: (
    shiftId: string,
    patch: Partial<Omit<Shift, 'id' | 'staffId'>>
  ) => { success: boolean; error?: string };
  quickClockIn: (targetStaffId: string, note?: string) => { success: boolean; error?: string };
  getCanonicalStaffId: (input?: string) => string;
  getStaffShift: (staffId: string) => Shift | undefined;
  getTodayRecord: (staffId: string) => AttendanceRecord | undefined;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, staffAccessList, addAuditLogEntry } = useAuth();

  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  // Load from repository on startup
  useEffect(() => {
    const loadRepo = async () => {
      try {
        const repoShifts = getRepository<Shift>('shifts');
        const repoRecords = getRepository<AttendanceRecord>('attendance');
        const repoLeaves = getRepository<LeaveRequest>('leave');

        const [s, r, l] = await Promise.all([
          repoShifts.list(),
          repoRecords.list(),
          repoLeaves.list(),
        ]);

        if (s.length > 0) setShifts(s);
        if (r.length > 0) setRecords(r);
        else setRecords(generateInitialAttendanceRecords());
        if (l.length > 0) setLeaveRequests(l);
        else setLeaveRequests(generateInitialLeaveRequests());
      } catch {
        setRecords(generateInitialAttendanceRecords());
        setLeaveRequests(generateInitialLeaveRequests());
      }
    };
    loadRepo();
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === `${STORAGE_KEY_PREFIX}shifts`) {
        const repo = getRepository<Shift>('shifts');
        setShifts(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}attendance`) {
        const repo = getRepository<AttendanceRecord>('attendance');
        setRecords(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}leave`) {
        const repo = getRepository<LeaveRequest>('leave');
        setLeaveRequests(await repo.list());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Write-through to repository and sessionStorage
  useEffect(() => {
    if (shifts.length > 0) {
      getRepository<Shift>('shifts').replaceAll(shifts).catch(() => {});
      try {
        sessionStorage.setItem('cms_shifts_v1', JSON.stringify(shifts));
      } catch {
        // Fallback
      }
    }
  }, [shifts]);

  useEffect(() => {
    if (records.length > 0) {
      getRepository<AttendanceRecord>('attendance').replaceAll(records).catch(() => {});
      try {
        sessionStorage.setItem('cms_attendance_records_v1', JSON.stringify(records));
      } catch {
        // Fallback
      }
    }
  }, [records]);

  useEffect(() => {
    if (leaveRequests.length > 0) {
      getRepository<LeaveRequest>('leave').replaceAll(leaveRequests).catch(() => {});
      try {
        sessionStorage.setItem('cms_leave_requests_v1', JSON.stringify(leaveRequests));
      } catch {
        // Fallback
      }
    }
  }, [leaveRequests]);

  const getCanonicalStaffId = (input?: string): string => {
    const rawId = input || currentUser.id;
    if (!rawId) return '';

    // Direct doctor ID shortcuts
    if (rawId === 'doc-1' || rawId === 'usr-doc-1') return 'acc-doc-1';
    if (rawId === 'doc-2' || rawId === 'usr-doc-2') return 'acc-doc-2';
    if (rawId === 'doc-3' || rawId === 'usr-doc-3') return 'acc-doc-3';
    if (rawId === 'usr-rec-1') return 'acc-rec-1';
    if (rawId === 'usr-rec-2') return 'acc-rec-2';

    // Match in staff access list
    const found = staffAccessList.find(
      (s) =>
        s.id === rawId ||
        s.badgeNumber === rawId ||
        s.staffName.toLowerCase() === rawId.toLowerCase()
    );
    if (found) return found.id;

    // Check by user badge or name
    if (currentUser.badgeNumber) {
      const foundByBadge = staffAccessList.find((s) => s.badgeNumber === currentUser.badgeNumber);
      if (foundByBadge) return foundByBadge.id;
    }

    return rawId;
  };

  const getStaffShift = (staffId: string): Shift | undefined => {
    const canonical = getCanonicalStaffId(staffId);
    return shifts.find((s) => s.staffId === canonical);
  };

  const getTodayRecord = (staffId: string): AttendanceRecord | undefined => {
    const canonical = getCanonicalStaffId(staffId);
    const todayStr = formatDate(new Date());
    return records.find((r) => r.staffId === canonical && r.date === todayStr);
  };

  const clockInUser = (targetStaffId?: string, overrideLeave?: boolean): { success: boolean; error?: string } => {
    const canonical = getCanonicalStaffId(targetStaffId);
    const staffRecord = staffAccessList.find((s) => s.id === canonical);
    const staffName = staffRecord?.staffName || currentUser.name || canonical;
    const now = new Date();
    const todayStr = formatDate(now);

    const isLeave = isOnLeave(canonical, todayStr, leaveRequests);
    const canManage = hasCapability(currentUser, 'attendanceManagement');

    if (isLeave && !overrideLeave && !canManage) {
      return {
        success: false,
        error: 'Cannot clock in: staff member is on approved leave today. Administrative override required.',
      };
    }

    const shift = getStaffShift(canonical);
    const existingRec = records.find((r) => r.staffId === canonical && r.date === todayStr) || null;

    try {
      const updatedRec = clockIn(existingRec, shift, now, canonical, staffName, leaveRequests, Boolean(overrideLeave || canManage));
      if (isLeave && (overrideLeave || canManage)) {
        updatedRec.note = updatedRec.note
          ? `${updatedRec.note} (Approved leave overridden by ${currentUser.name})`
          : `Approved leave overridden by ${currentUser.name}`;

        addAuditLogEntry({
          targetRole: staffRecord?.role || 'doctor',
          targetStaffName: staffName,
          targetUserId: canonical,
          action: 'attendance_clock_in_override',
          description: `Administrative clock-in override for ${staffName} on approved leave day (${todayStr}) authorized by ${currentUser.name}`,
          authorizedBy: currentUser.name,
        });
      }

      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === updatedRec.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedRec;
          return next;
        }
        return [updatedRec, ...prev];
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clock in.';
      return { success: false, error: msg };
    }
  };

  const clockOutUser = (targetStaffId?: string): { success: boolean; error?: string } => {
    const canonical = getCanonicalStaffId(targetStaffId);
    const todayStr = formatDate(new Date());
    const existingRec = records.find((r) => r.staffId === canonical && r.date === todayStr);

    if (!existingRec || !existingRec.clockIn) {
      return { success: false, error: 'Staff member is not clocked in today.' };
    }

    try {
      const updatedRec = clockOut(existingRec, new Date());
      setRecords((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clock out.';
      return { success: false, error: msg };
    }
  };

  const requestLeave = (data: {
    type: LeaveType;
    fromDate: string;
    toDate: string;
    reason: string;
  }): { success: boolean; error?: string } => {
    const canonical = getCanonicalStaffId();
    const staffRecord = staffAccessList.find((s) => s.id === canonical);
    const staffName = staffRecord?.staffName || currentUser.name || canonical;
    const now = new Date();

    const validationError = validateLeave(
      {
        staffId: canonical,
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason,
      },
      leaveRequests,
      now
    );

    if (validationError) {
      return { success: false, error: validationError };
    }

    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      staffId: canonical,
      staffName,
      type: data.type,
      fromDate: data.fromDate,
      toDate: data.toDate,
      reason: data.reason.trim(),
      status: 'pending',
      requestedAt: now.toISOString(),
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);
    return { success: true };
  };

  const decideLeaveRequest = (
    requestId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): { success: boolean; error?: string } => {
    if (!hasCapability(currentUser, 'attendanceManagement')) {
      return { success: false, error: 'Permission denied: Attendance Management required.' };
    }

    const req = leaveRequests.find((l) => l.id === requestId);
    if (!req) {
      return { success: false, error: 'Leave request not found.' };
    }

    // Determine admin count to enforce self-decision restriction
    const adminCount = staffAccessList.filter((s) =>
      s.moduleIds?.includes('mod-admin') || s.isOriginalAdmin
    ).length;

    try {
      const updated = decideLeave(
        req,
        decision,
        {
          id: getCanonicalStaffId(),
          name: currentUser.name,
          isOriginalAdmin: currentUser.isOriginalAdmin,
        },
        note,
        new Date(),
        adminCount
      );

      setLeaveRequests((prev) => prev.map((l) => (l.id === requestId ? updated : l)));

      const staffRecord = staffAccessList.find((s) => s.id === req.staffId);
      addAuditLogEntry({
        targetRole: staffRecord?.role || 'doctor',
        targetStaffName: req.staffName || req.staffId,
        targetUserId: req.staffId,
        action: decision === 'approved' ? 'leave_approved' : 'leave_rejected',
        description: `Leave request (${req.fromDate} to ${req.toDate}, ${req.type}) ${decision} by ${currentUser.name}. ${note ? `Decision note: ${note}` : ''}`.trim(),
        authorizedBy: currentUser.name,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update leave request.';
      return { success: false, error: msg };
    }
  };

  const cancelLeaveRequest = (requestId: string): { success: boolean; error?: string } => {
    const req = leaveRequests.find((l) => l.id === requestId);
    if (!req) {
      return { success: false, error: 'Leave request not found.' };
    }

    try {
      const updated = cancelLeave(req, { id: getCanonicalStaffId() });
      setLeaveRequests((prev) => prev.map((l) => (l.id === requestId ? updated : l)));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel leave request.';
      return { success: false, error: msg };
    }
  };

  const correctAttendanceRecord = (
    recordId: string,
    patch: Partial<Pick<AttendanceRecord, 'clockIn' | 'clockOut' | 'note'>>,
    reason: string
  ): { success: boolean; error?: string } => {
    if (!hasCapability(currentUser, 'attendanceManagement')) {
      return { success: false, error: 'Permission denied: Attendance Management required.' };
    }

    const rec = records.find((r) => r.id === recordId);
    if (!rec) {
      return { success: false, error: 'Attendance record not found.' };
    }

    try {
      const updated = correctRecord(
        rec,
        patch,
        { id: getCanonicalStaffId(), name: currentUser.name },
        reason,
        new Date()
      );

      setRecords((prev) => prev.map((r) => (r.id === recordId ? updated : r)));

      const staffRecord = staffAccessList.find((s) => s.id === rec.staffId);
      addAuditLogEntry({
        targetRole: staffRecord?.role || 'doctor',
        targetStaffName: rec.staffName || rec.staffId,
        targetUserId: rec.staffId,
        action: 'attendance_record_corrected',
        description: `Attendance record on ${rec.date} for ${rec.staffName || rec.staffId} corrected by ${currentUser.name}. Reason: ${reason.trim()}`,
        authorizedBy: currentUser.name,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to correct attendance record.';
      return { success: false, error: msg };
    }
  };

  const updateShift = (
    shiftId: string,
    patch: Partial<Omit<Shift, 'id' | 'staffId'>>
  ): { success: boolean; error?: string } => {
    if (!hasCapability(currentUser, 'attendanceManagement')) {
      return { success: false, error: 'Permission denied: Attendance Management required.' };
    }

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      return { success: false, error: 'Shift definition not found.' };
    }

    try {
      const updated = setShift(
        shift,
        patch,
        { id: getCanonicalStaffId(), name: currentUser.name },
        new Date()
      );

      setShifts((prev) => prev.map((s) => (s.id === shiftId ? updated : s)));

      const staffRecord = staffAccessList.find((s) => s.id === shift.staffId);
      addAuditLogEntry({
        targetRole: staffRecord?.role || 'doctor',
        targetStaffName: shift.staffName || shift.staffId,
        targetUserId: shift.staffId,
        action: 'shift_updated',
        description: `Shift hours for ${shift.staffName || shift.staffId} updated (${updated.start} - ${updated.end}, ${updated.days.join(', ')}) by ${currentUser.name}`,
        authorizedBy: currentUser.name,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update shift.';
      return { success: false, error: msg };
    }
  };

  const quickClockIn = (targetStaffId: string, note?: string): { success: boolean; error?: string } => {
    if (!hasCapability(currentUser, 'attendanceManagement')) {
      return { success: false, error: 'Permission denied: Attendance Management required.' };
    }

    const canonical = getCanonicalStaffId(targetStaffId);
    const staffRecord = staffAccessList.find((s) => s.id === canonical);
    const staffName = staffRecord?.staffName || canonical;
    const now = new Date();
    const todayStr = formatDate(now);
    const shift = getStaffShift(canonical);
    const existingRec = records.find((r) => r.staffId === canonical && r.date === todayStr) || null;

    try {
      const updated = clockIn(existingRec, shift, now, canonical, staffName, leaveRequests, true);
      if (note && note.trim()) {
        updated.note = note.trim();
      }

      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });

      addAuditLogEntry({
        targetRole: staffRecord?.role || 'doctor',
        targetStaffName: staffName,
        targetUserId: canonical,
        action: 'attendance_clock_in_override',
        description: `Quick clock-in recorded for ${staffName} by ${currentUser.name}. ${note ? `Note: ${note}` : ''}`.trim(),
        authorizedBy: currentUser.name,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to quick clock in.';
      return { success: false, error: msg };
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        shifts,
        records,
        leaveRequests,
        clockInUser,
        clockOutUser,
        requestLeave,
        decideLeaveRequest,
        cancelLeaveRequest,
        correctAttendanceRecord,
        updateShift,
        quickClockIn,
        getCanonicalStaffId,
        getStaffShift,
        getTodayRecord,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
