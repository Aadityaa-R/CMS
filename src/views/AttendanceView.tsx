import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { useAttendance } from '@/context/AttendanceContext';
import { hasCapability } from '@/lib/permissions';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { RowActions } from '@/components/ui/RowActions';
import {
  formatDate,
  dayOfWeek,
  hoursWorked,
  lateMinutes,
  earlyMinutes,
  isOutsideShift,
  missingClockOut,
  isOnLeave,
  monthlySummary,
} from '@/lib/attendance';
import { Shift, AttendanceRecord, LeaveRequest, LeaveType, DayOfWeek } from '@/types/attendance';
import { Appointment } from '@/types';
import { appointmentsAffectedByLeave } from '@/lib/scheduling';
import { useNotifications } from '@/context/NotificationContext';
import { formatTime } from '@/lib/time';

interface AttendanceViewProps {
  activeTab?: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ activeTab }) => {
  const { currentUser, staffAccessList = [] } = useAuth();
  const { modules, appointments, updateAppointment } = useClinic();
  const { addNotification } = useNotifications();
  const {
    shifts = [],
    records = [],
    leaveRequests = [],
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
  } = useAttendance();

  const canManage = hasCapability(currentUser, 'attendanceManagement', modules);
  const [activeSubTab, setActiveSubTab] = useState<string>(activeTab || 'my_attendance');

  // Feedback notifications
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  const canonicalUserId = typeof getCanonicalStaffId === 'function' ? getCanonicalStaffId(currentUser?.id) : currentUser?.id || '';
  const userShift = typeof getStaffShift === 'function' ? getStaffShift(canonicalUserId) : undefined;
  const todayRecord = typeof getTodayRecord === 'function' ? getTodayRecord(canonicalUserId) : undefined;
  const todayStr = formatDate(new Date());
  const isUserOnLeaveToday = isOnLeave(canonicalUserId, todayStr, leaveRequests);

  // Pagination states
  const [myRecordsPage, setMyRecordsPage] = useState(1);
  const [myLeavesPage, setMyLeavesPage] = useState(1);
  const [todayStaffPage, setTodayStaffPage] = useState(1);
  const [todayStaffSearch, setTodayStaffSearch] = useState('');
  const [allLeavesPage, setAllLeavesPage] = useState(1);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all');
  const [shiftsPage, setShiftsPage] = useState(1);

  // Month state for Attendance Sheet
  const currentDate = new Date();
  const [sheetYear, setSheetYear] = useState<number>(currentDate.getFullYear());
  const [sheetMonth, setSheetMonth] = useState<number>(currentDate.getMonth() + 1);

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual');
  const [leaveFromDate, setLeaveFromDate] = useState(todayStr);
  const [leaveToDate, setLeaveToDate] = useState(todayStr);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveFormError, setLeaveFormError] = useState('');

  // Approve Leave Modal & Affected Bookings
  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [affectedAppointments, setAffectedAppointments] = useState<Appointment[]>([]);

  // Reject Leave Modal
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Edit Shift Modal
  const [editShiftTarget, setEditShiftTarget] = useState<Shift | null>(null);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('16:30');
  const [shiftGrace, setShiftGrace] = useState('15');
  const [shiftDays, setShiftDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [shiftEditError, setShiftEditError] = useState('');

  // Correct Record Modal
  const [correctTarget, setCorrectTarget] = useState<AttendanceRecord | null>(null);
  const [correctClockIn, setCorrectClockIn] = useState('');
  const [correctClockOut, setCorrectClockOut] = useState('');
  const [correctNote, setCorrectNote] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correctError, setCorrectError] = useState('');

  // Quick Clock-in Modal
  const [quickClockInTarget, setQuickClockInTarget] = useState<{ staffId: string; staffName: string } | null>(null);
  const [quickClockInNote, setQuickClockInNote] = useState('');

  // User's own records sorted descending
  const userRecords = useMemo(() => {
    return records
      .filter((r) => r.staffId === canonicalUserId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, canonicalUserId]);

  // User's own leave requests
  const userLeaveRequests = useMemo(() => {
    return leaveRequests
      .filter((l) => l.staffId === canonicalUserId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }, [leaveRequests, canonicalUserId]);

  // Attendance Sheet Summary
  const sheetSummary = useMemo(() => {
    return monthlySummary(records, shifts, leaveRequests, sheetYear, sheetMonth, new Date());
  }, [records, shifts, leaveRequests, sheetYear, sheetMonth]);

  // Handlers for clock in and clock out
  const handleClockIn = () => {
    const res = clockInUser();
    if (res.success) {
      showMessage('success', 'Clock in recorded successfully.');
    } else {
      showMessage('error', res.error || 'Failed to clock in.');
    }
  };

  const handleClockOut = () => {
    const res = clockOutUser();
    if (res.success) {
      showMessage('success', 'Clock out recorded successfully.');
    } else {
      showMessage('error', res.error || 'Failed to clock out.');
    }
  };

  // Submit leave request
  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveFormError('');

    const res = requestLeave({
      type: leaveType,
      fromDate: leaveFromDate,
      toDate: leaveToDate,
      reason: leaveReason,
    });

    if (res.success) {
      setIsRequestModalOpen(false);
      setLeaveReason('');
      showMessage('success', 'Leave request submitted successfully.');
    } else {
      setLeaveFormError(res.error || 'Failed to submit leave request.');
    }
  };

  // Cancel leave request
  const handleCancelLeave = (requestId: string) => {
    const res = cancelLeaveRequest(requestId);
    if (res.success) {
      showMessage('success', 'Leave request cancelled.');
    } else {
      showMessage('error', res.error || 'Failed to cancel leave request.');
    }
  };

  // Decide leave request (approve)
  const handleApproveLeave = (req: LeaveRequest) => {
    const affected = appointmentsAffectedByLeave(req.staffId, req.fromDate, req.toDate, appointments);
    setApproveTarget(req);
    setAffectedAppointments(affected);
  };

  const handleConfirmApproval = () => {
    if (!approveTarget) return;
    const res = decideLeaveRequest(approveTarget.id, 'approved');
    if (!res.success) {
      showMessage('error', res.error || 'Failed to approve leave request.');
      return;
    }

    // Mark affected appointments and create in-app notifications
    if (affectedAppointments.length > 0) {
      affectedAppointments.forEach((apt) => {
        updateAppointment(apt.id, { needsReschedule: true });
        addNotification({
          recipientId: apt.patientId,
          title: 'Schedule Change Notice',
          message: `Dr. ${approveTarget.staffName || 'your doctor'} is on approved leave from ${approveTarget.fromDate} to ${approveTarget.toDate}. Your appointment on ${apt.dateTime ? apt.dateTime.slice(0, 10) : ''} needs to be rescheduled.`,
          type: 'leave',
          linkTab: 'appointments',
        });
      });
      showMessage(
        'success',
        `Leave request approved. ${affectedAppointments.length} appointment(s) marked for rescheduling.`
      );
    } else {
      showMessage('success', 'Leave request approved.');
    }

    setApproveTarget(null);
    setAffectedAppointments([]);
  };

  // Open reject modal
  const handleOpenRejectModal = (req: LeaveRequest) => {
    setRejectTarget(req);
    setRejectReason('');
    setRejectError('');
  };

  // Confirm reject leave
  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('A decision note explaining the reason for rejection is required.');
      return;
    }

    const res = decideLeaveRequest(rejectTarget.id, 'rejected', rejectReason);
    if (res.success) {
      setRejectTarget(null);
      showMessage('success', 'Leave request rejected with recorded reason.');
    } else {
      setRejectError(res.error || 'Failed to reject leave request.');
    }
  };

  // Open edit shift modal
  const handleOpenEditShift = (shift: Shift) => {
    setEditShiftTarget(shift);
    setShiftStart(shift.start);
    setShiftEnd(shift.end);
    setShiftGrace(String(shift.graceMinutes));
    setShiftDays([...shift.days]);
    setShiftEditError('');
  };

  // Toggle shift day
  const handleToggleDay = (day: DayOfWeek) => {
    setShiftDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Save shift changes
  const handleSaveShift = () => {
    if (!editShiftTarget) return;
    if (shiftDays.length === 0) {
      setShiftEditError('At least one working day must be selected.');
      return;
    }
    if (!shiftStart || !shiftEnd) {
      setShiftEditError('Start and end times are required.');
      return;
    }

    const res = updateShift(editShiftTarget.id, {
      start: shiftStart,
      end: shiftEnd,
      graceMinutes: parseInt(shiftGrace, 10) || 15,
      days: shiftDays,
    });

    if (res.success) {
      setEditShiftTarget(null);
      showMessage('success', 'Staff shift hours updated successfully.');
    } else {
      setShiftEditError(res.error || 'Failed to update shift.');
    }
  };

  // Open correct record modal
  const handleOpenCorrectRecord = (rec: AttendanceRecord) => {
    setCorrectTarget(rec);
    setCorrectClockIn(rec.clockIn ? rec.clockIn.slice(11, 16) : '');
    setCorrectClockOut(rec.clockOut ? rec.clockOut.slice(11, 16) : '');
    setCorrectNote(rec.note || '');
    setCorrectReason('');
    setCorrectError('');
  };

  // Save corrected record
  const handleSaveCorrectRecord = () => {
    if (!correctTarget) return;
    if (!correctReason.trim()) {
      setCorrectError('A correction reason is required for audit compliance.');
      return;
    }

    let nextClockIn = correctTarget.clockIn;
    let nextClockOut = correctTarget.clockOut;

    if (correctClockIn) {
      nextClockIn = `${correctTarget.date}T${correctClockIn}:00.000Z`;
    }
    if (correctClockOut) {
      nextClockOut = `${correctTarget.date}T${correctClockOut}:00.000Z`;
    }

    const res = correctAttendanceRecord(
      correctTarget.id,
      {
        clockIn: nextClockIn,
        clockOut: nextClockOut,
        note: correctNote.trim() || undefined,
      },
      correctReason.trim()
    );

    if (res.success) {
      setCorrectTarget(null);
      showMessage('success', 'Attendance record corrected and audited.');
    } else {
      setCorrectError(res.error || 'Failed to correct record.');
    }
  };

  // Quick clock in submit
  const handleConfirmQuickClockIn = () => {
    if (!quickClockInTarget) return;
    const res = quickClockIn(quickClockInTarget.staffId, quickClockInNote);
    if (res.success) {
      setQuickClockInTarget(null);
      setQuickClockInNote('');
      showMessage('success', `Quick clock-in recorded for ${quickClockInTarget.staffName}.`);
    } else {
      showMessage('error', res.error || 'Failed to record clock-in.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const daysInMonth = sheetSummary.daysInMonth;
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const headerRow = [
      'Staff ID',
      'Staff Name',
      ...dayHeaders,
      'Present',
      'Absent',
      'Leave',
      'Off',
      'Total Hours',
    ].join(',');

    const dataRows = sheetSummary.staffSummaries.map((s) => {
      const dayValues = Array.from({ length: daysInMonth }, (_, i) => s.dailyCodes[i + 1] || '-');
      return [
        s.staffId,
        `"${s.staffName.replace(/"/g, '""')}"`,
        ...dayValues,
        s.presentDays,
        s.absentDays,
        s.leaveDays,
        s.offDays,
        s.totalHoursWorked.toFixed(2),
      ].join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const monthPad = String(sheetMonth).padStart(2, '0');
    link.download = `attendance-${sheetYear}-${monthPad}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helpers for formatting
  const formatTimeStr = (isoStr: string | null) => {
    if (!isoStr) return '—';
    return formatTime(isoStr) || '—';
  };

  const formatRecordStatus = (rec: AttendanceRecord, shift?: Shift) => {
    if (missingClockOut(rec, new Date())) {
      return 'Missing Clock Out';
    }
    if (isOutsideShift(rec, shift)) {
      return 'Outside Shift';
    }
    const late = lateMinutes(rec, shift);
    if (late > 0) {
      return `Late ${late} min`;
    }
    const early = earlyMinutes(rec, shift);
    if (early > 0) {
      return `Left early ${early} min`;
    }
    return 'On time';
  };

  // Check if admin is trying to decide own request
  const isOwnLeaveRequest = (req: LeaveRequest) => {
    return req.staffId === canonicalUserId;
  };

  const adminCount = staffAccessList.filter((s) =>
    s.moduleIds?.includes('mod-admin') || s.isOriginalAdmin
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Staff Time, Attendance, and Leave
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Shift scheduling, real-time check-ins, attendance sheet auditing, and leave administration.
          </p>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div role="status" aria-live="polite"
          className={`p-3 text-xs border rounded ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div role="tablist" aria-label="Attendance Tabs" className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'my_attendance', label: 'My Attendance' },
          ...(canManage
            ? [
                { id: 'today', label: 'Today' },
                { id: 'sheet', label: 'Attendance Sheet' },
                { id: 'leaves', label: 'Leave Requests' },
                { id: 'shifts', label: 'Shifts' },
              ]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            role="tab"
            aria-selected={activeSubTab === tab.id}
            aria-current={activeSubTab === tab.id ? 'page' : undefined}
            className={`pb-2.5 pt-1 text-xs cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'font-bold text-slate-900 dark:text-slate-100 border-b-2 border-teal-600 -mb-px'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MY ATTENDANCE */}
      {activeSubTab === 'my_attendance' && (
        <div className="space-y-6">
          {/* Today's Shift Status Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Today's Attendance Status</CardTitle>
                  <CardDescription>
                    {userShift
                      ? `Scheduled Shift: ${userShift.days.join(', ')} • ${userShift.start} to ${userShift.end} (${userShift.graceMinutes} min grace)`
                      : 'No fixed shift schedule assigned.'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={
                      Boolean(todayRecord?.clockIn) ||
                      (isUserOnLeaveToday && !canManage)
                    }
                    onClick={handleClockIn}
                  >
                    Clock In
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!todayRecord?.clockIn || Boolean(todayRecord?.clockOut)}
                    onClick={handleClockOut}
                  >
                    Clock Out
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Today's Date</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {todayStr} ({dayOfWeek(todayStr)})
                  </span>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Current Status</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {isUserOnLeaveToday
                      ? 'Approved Leave'
                      : todayRecord?.clockOut
                      ? 'Shift Completed'
                      : todayRecord?.clockIn
                      ? 'Clocked In'
                      : 'Not Clocked In'}
                  </span>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Clock In Time</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatTimeStr(todayRecord?.clockIn || null)}
                  </span>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Clock Out Time</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatTimeStr(todayRecord?.clockOut || null)}
                  </span>
                </div>
              </div>

              {isUserOnLeaveToday && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  You are registered as on approved leave today. Standard clock-in is disabled unless overridden by an administrator.
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Monthly Records Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>My Attendance Records</CardTitle>
                  <CardDescription>Detailed clock in, clock out, and total hours worked log.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table stackBelow="lg">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      {canManage && <TableHead isActions className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManage ? 8 : 7} className="text-center py-6 text-slate-500 dark:text-slate-400">
                          No attendance records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      userRecords
                        .slice((myRecordsPage - 1) * 10, myRecordsPage * 10)
                        .map((rec) => {
                          const worked = hoursWorked(rec);
                          const status = formatRecordStatus(rec, userShift);
                          return (
                            <TableRow key={rec.id}>
                              <TableCell label="Date" isPrimary className="font-semibold text-slate-900 dark:text-slate-100">
                                {rec.date}
                              </TableCell>
                              <TableCell label="Day">{dayOfWeek(rec.date)}</TableCell>
                              <TableCell label="Clock In">{formatTimeStr(rec.clockIn)}</TableCell>
                              <TableCell label="Clock Out">{formatTimeStr(rec.clockOut)}</TableCell>
                              <TableCell label="Hours Worked">{worked > 0 ? `${worked.toFixed(2)} hrs` : '--'}</TableCell>
                              <TableCell label="Status">{status}</TableCell>
                              <TableCell label="Notes">
                                {rec.correctionReason
                                  ? `Corrected: ${rec.correctionReason}`
                                  : rec.note || '--'}
                              </TableCell>
                              {canManage && (
                                <TableCell isActions label="Actions" className="text-right">
                                  <RowActions
                                    actions={[
                                      {
                                        label: 'Correct',
                                        onClick: () => handleOpenCorrectRecord(rec),
                                        ariaLabel: `Correct attendance record for ${rec.date}`,
                                      },
                                    ]}
                                    subject={`attendance record for ${rec.date}`}
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>

              {userRecords.length > 10 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={myRecordsPage}
                    totalItems={userRecords.length}
                    pageSize={10}
                    onPageChange={setMyRecordsPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Leave Requests Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>My Leave Requests</CardTitle>
                  <CardDescription>Track pending and past leave applications.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsRequestModalOpen(true)}>
                  Request Leave
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table stackBelow="lg">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead isActions className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLeaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-slate-500 dark:text-slate-400">
                          No leave requests recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      userLeaveRequests
                        .slice((myLeavesPage - 1) * 10, myLeavesPage * 10)
                        .map((req) => (
                          <TableRow key={req.id}>
                            <TableCell label="Type" isPrimary className="font-semibold text-slate-900 dark:text-slate-100">
                              {req.type} Leave
                            </TableCell>
                            <TableCell label="Duration">
                              {req.fromDate} to {req.toDate}
                            </TableCell>
                            <TableCell label="Reason">{req.reason}</TableCell>
                            <TableCell label="Status" className="capitalize">
                              {req.status}
                            </TableCell>
                            <TableCell label="Decision">
                              {req.decisionNote
                                ? `${req.status === 'approved' ? 'Approved' : 'Rejected'}: ${req.decisionNote}`
                                : req.decidedBy
                                ? `Decided by ${req.decidedBy}`
                                : 'Awaiting review'}
                            </TableCell>
                            <TableCell isActions label="Actions" className="text-right">
                              {req.status === 'pending' && (
                                <RowActions
                                  actions={[
                                    {
                                      label: 'Cancel',
                                      onClick: () => handleCancelLeave(req.id),
                                      ariaLabel: `Cancel leave request from ${req.fromDate} to ${req.toDate}`,
                                    },
                                  ]}
                                  subject={`leave request from ${req.fromDate} to ${req.toDate}`}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {userLeaveRequests.length > 10 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={myLeavesPage}
                    totalItems={userLeaveRequests.length}
                    pageSize={10}
                    onPageChange={setMyLeavesPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: TODAY (Admin View) */}
      {activeSubTab === 'today' && canManage && (
        <div className="space-y-6">
          {/* Summary Figures */}
          {(() => {
            const todayStaff = shifts.map((shift) => {
              const rec = records.find((r) => r.staffId === shift.staffId && r.date === todayStr);
              const onLeave = isOnLeave(shift.staffId, todayStr, leaveRequests);
              const isScheduled = shift.days.includes(dayOfWeek(todayStr));
              const isLate = rec ? lateMinutes(rec, shift) > 0 : false;
              return { shift, rec, onLeave, isScheduled, isLate };
            });

            const onShiftCount = todayStaff.filter((s) => s.isScheduled).length;
            const clockedInCount = todayStaff.filter((s) => s.rec?.clockIn).length;
            const lateCount = todayStaff.filter((s) => s.isLate).length;
            const leaveCount = todayStaff.filter((s) => s.onLeave).length;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">On Shift Today</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{onShiftCount}</span>
                </div>
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Clocked In</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{clockedInCount}</span>
                </div>
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Late Arrivals</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{lateCount}</span>
                </div>
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">On Approved Leave</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{leaveCount}</span>
                </div>
              </div>
            );
          })()}

          {/* Staff Roster Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Daily Staff Roster: {todayStr}</CardTitle>
                  <CardDescription>Real-time presence, shift coverage, and quick clock-in overrides.</CardDescription>
                </div>
                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Search staff member..."
                    value={todayStaffSearch}
                    onChange={(e) => setTodayStaffSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const filteredShifts = shifts.filter((s) => {
                  const name = s.staffName || s.staffId;
                  return name.toLowerCase().includes(todayStaffSearch.toLowerCase());
                });

                return (
                  <div className="overflow-x-auto">
                    <Table stackBelow="lg">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Scheduled Shift</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead isActions className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShifts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-slate-500 dark:text-slate-400">
                              No staff found matching query.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredShifts
                            .slice((todayStaffPage - 1) * 10, todayStaffPage * 10)
                            .map((shift) => {
                              const rec = records.find((r) => r.staffId === shift.staffId && r.date === todayStr);
                              const onLeave = isOnLeave(shift.staffId, todayStr, leaveRequests);
                              const isScheduled = shift.days.includes(dayOfWeek(todayStr));
                              const late = rec ? lateMinutes(rec, shift) : 0;

                              let statusText = 'Not Clocked In';
                              if (onLeave) statusText = 'Approved Leave';
                              else if (!isScheduled) statusText = 'Scheduled Off';
                              else if (rec?.clockOut) statusText = 'Clocked Out';
                              else if (rec?.clockIn) {
                                statusText = late > 0 ? `Clocked In (Late ${late}m)` : 'Clocked In (On Time)';
                              }

                              return (
                                <TableRow key={shift.id}>
                                  <TableCell label="Staff Member" isPrimary className="font-semibold text-slate-900 dark:text-slate-100">
                                    {shift.staffName || shift.staffId}
                                  </TableCell>
                                  <TableCell label="Scheduled Shift">
                                    {isScheduled
                                      ? `${shift.start} - ${shift.end}`
                                      : 'Scheduled Off'}
                                  </TableCell>
                                  <TableCell label="Status">{statusText}</TableCell>
                                  <TableCell label="Clock In">{formatTimeStr(rec?.clockIn || null)}</TableCell>
                                  <TableCell label="Clock Out">{formatTimeStr(rec?.clockOut || null)}</TableCell>
                                  <TableCell isActions label="Actions" className="text-right">
                                    <RowActions
                                      actions={[
                                        ...(!rec?.clockIn
                                          ? [
                                              {
                                                label: 'Quick Clock In',
                                                onClick: () =>
                                                  setQuickClockInTarget({
                                                    staffId: shift.staffId,
                                                    staffName: shift.staffName || shift.staffId,
                                                  }),
                                                ariaLabel: `Quick clock in for ${shift.staffName || shift.staffId}`,
                                              },
                                            ]
                                          : []),
                                        ...(rec
                                          ? [
                                              {
                                                label: 'Correct',
                                                onClick: () => handleOpenCorrectRecord(rec),
                                                ariaLabel: `Correct attendance record for ${shift.staffName || shift.staffId}`,
                                              },
                                            ]
                                          : []),
                                      ]}
                                      subject={shift.staffName || shift.staffId}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>

                    {filteredShifts.length > 10 && (
                      <div className="mt-4">
                        <Pagination
                          currentPage={todayStaffPage}
                          totalItems={filteredShifts.length}
                          pageSize={10}
                          onPageChange={setTodayStaffPage}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: ATTENDANCE SHEET (Admin View) */}
      {activeSubTab === 'sheet' && canManage && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Clinic-Wide Monthly Attendance Sheet</CardTitle>
                  <CardDescription>
                    Audited presence grid showing status codes across all calendar days of the month.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-36">
                    <Select
                      size="sm"
                      value={sheetMonth}
                      onChange={(e) => setSheetMonth(parseInt(e.target.value, 10))}
                      options={[
                        { value: '1', label: 'January' },
                        { value: '2', label: 'February' },
                        { value: '3', label: 'March' },
                        { value: '4', label: 'April' },
                        { value: '5', label: 'May' },
                        { value: '6', label: 'June' },
                        { value: '7', label: 'July' },
                        { value: '8', label: 'August' },
                        { value: '9', label: 'September' },
                        { value: '10', label: 'October' },
                        { value: '11', label: 'November' },
                        { value: '12', label: 'December' },
                      ]}
                    />
                  </div>
                  <div className="w-28">
                    <Select
                      size="sm"
                      value={sheetYear}
                      onChange={(e) => setSheetYear(parseInt(e.target.value, 10))}
                      options={[
                        { value: '2025', label: '2025' },
                        { value: '2026', label: '2026' },
                        { value: '2027', label: '2027' },
                      ]}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                P: Present • A: Absent • LV: Approved Leave • OFF: Scheduled Off • -: Future or Not Clocked In
              </div>

              {/* Grid table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-2.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 min-w-[160px]">
                        Staff Member
                      </th>
                      {Array.from({ length: sheetSummary.daysInMonth }, (_, i) => (
                        <th
                          key={i + 1}
                          className="p-1.5 font-medium text-center text-slate-700 dark:text-slate-300 min-w-[28px] border-r border-slate-100 dark:border-slate-800"
                        >
                          {i + 1}
                        </th>
                      ))}
                      <th className="p-2 font-bold text-center text-slate-900 dark:text-slate-100 min-w-[40px]">P</th>
                      <th className="p-2 font-bold text-center text-slate-900 dark:text-slate-100 min-w-[40px]">A</th>
                      <th className="p-2 font-bold text-center text-slate-900 dark:text-slate-100 min-w-[40px]">LV</th>
                      <th className="p-2 font-bold text-center text-slate-900 dark:text-slate-100 min-w-[40px]">OFF</th>
                      <th className="p-2 font-bold text-right text-slate-900 dark:text-slate-100 min-w-[70px]">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetSummary.staffSummaries.map((s, idx) => (
                      <tr
                        key={s.staffId}
                        className={`border-b border-slate-100 dark:border-slate-800/60 ${
                          idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'
                        }`}
                      >
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-700">
                          {s.staffName}
                        </td>
                        {Array.from({ length: sheetSummary.daysInMonth }, (_, i) => {
                          const code = s.dailyCodes[i + 1] || '-';
                          return (
                            <td
                              key={i + 1}
                              className={`p-1.5 text-center font-medium border-r border-slate-100 dark:border-slate-800 ${
                                code === 'P'
                                  ? 'text-slate-900 dark:text-slate-100'
                                  : code === 'A'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : code === 'LV'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {code}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-semibold text-slate-900 dark:text-slate-100">{s.presentDays}</td>
                        <td className="p-2 text-center font-semibold text-slate-900 dark:text-slate-100">{s.absentDays}</td>
                        <td className="p-2 text-center font-semibold text-slate-900 dark:text-slate-100">{s.leaveDays}</td>
                        <td className="p-2 text-center font-semibold text-slate-900 dark:text-slate-100">{s.offDays}</td>
                        <td className="p-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {s.totalHoursWorked.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: LEAVE REQUESTS (Admin View) */}
      {activeSubTab === 'leaves' && canManage && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Staff Leave Administration Queue</CardTitle>
                  <CardDescription>Review, approve, or reject staff leave submissions.</CardDescription>
                </div>
                <div className="w-44">
                  <Select
                    size="sm"
                    value={leaveStatusFilter}
                    onChange={(e) => setLeaveStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Requests' },
                      { value: 'pending', label: 'Pending Review' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const filtered = leaveRequests.filter((l) => {
                  if (leaveStatusFilter === 'all') return true;
                  return l.status === leaveStatusFilter;
                });

                return (
                  <div className="overflow-x-auto">
                    <Table stackBelow="lg">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Decision Notes</TableHead>
                          <TableHead isActions className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-slate-500 dark:text-slate-400">
                              No leave requests found for selected filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered
                            .slice((allLeavesPage - 1) * 10, allLeavesPage * 10)
                            .map((req) => {
                              const isSelf = isOwnLeaveRequest(req);
                              const cannotDecideSelf = isSelf && adminCount > 1;

                              return (
                                <TableRow key={req.id}>
                                  <TableCell label="Staff Member" isPrimary className="font-semibold text-slate-900 dark:text-slate-100">
                                    {req.staffName || req.staffId}
                                  </TableCell>
                                  <TableCell label="Type">{req.type} Leave</TableCell>
                                  <TableCell label="Dates">
                                    {req.fromDate} to {req.toDate}
                                  </TableCell>
                                  <TableCell label="Reason">{req.reason}</TableCell>
                                  <TableCell label="Status" className="capitalize">
                                    {req.status}
                                  </TableCell>
                                  <TableCell label="Decision Notes">
                                    {req.decisionNote
                                      ? req.decisionNote
                                      : req.decidedBy
                                      ? `Authorized by ${req.decidedBy}`
                                      : 'Pending review'}
                                  </TableCell>
                                  <TableCell isActions label="Actions" className="text-right">
                                    {req.status === 'pending' && (
                                      <RowActions
                                        actions={
                                          !cannotDecideSelf
                                            ? [
                                                {
                                                  label: 'Approve',
                                                  variant: 'primary',
                                                  onClick: () => handleApproveLeave(req),
                                                  ariaLabel: `Approve leave request for ${req.staffName || req.staffId}`,
                                                },
                                                {
                                                  label: 'Reject',
                                                  variant: 'outline',
                                                  onClick: () => handleOpenRejectModal(req),
                                                  ariaLabel: `Reject leave request for ${req.staffName || req.staffId}`,
                                                },
                                              ]
                                            : []
                                        }
                                        subject={`leave request for ${req.staffName || req.staffId}`}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>

                    {filtered.length > 10 && (
                      <div className="mt-4">
                        <Pagination
                          currentPage={allLeavesPage}
                          totalItems={filtered.length}
                          pageSize={10}
                          onPageChange={setAllLeavesPage}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: SHIFTS (Admin View) */}
      {activeSubTab === 'shifts' && canManage && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Staff Shift Configurations</CardTitle>
                  <CardDescription>Manage daily shift schedules, grace periods, and duty days.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table stackBelow="lg">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Scheduled Days</TableHead>
                      <TableHead>Shift Start</TableHead>
                      <TableHead>Shift End</TableHead>
                      <TableHead>Grace Period</TableHead>
                      <TableHead isActions className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts
                      .slice((shiftsPage - 1) * 10, shiftsPage * 10)
                      .map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell label="Staff Member" isPrimary className="font-semibold text-slate-900 dark:text-slate-100">
                            {shift.staffName || shift.staffId}
                          </TableCell>
                          <TableCell label="Scheduled Days">{shift.days.join(', ')}</TableCell>
                          <TableCell label="Shift Start">{shift.start}</TableCell>
                          <TableCell label="Shift End">{shift.end}</TableCell>
                          <TableCell label="Grace Period">{shift.graceMinutes} minutes</TableCell>
                          <TableCell isActions label="Actions" className="text-right">
                            <RowActions
                              actions={[
                                {
                                  label: 'Edit Shift',
                                  onClick: () => handleOpenEditShift(shift),
                                  ariaLabel: `Edit shift for ${shift.staffName || shift.staffId}`,
                                },
                              ]}
                              subject={shift.staffName || shift.staffId}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {shifts.length > 10 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={shiftsPage}
                      totalItems={shifts.length}
                      pageSize={10}
                      onPageChange={setShiftsPage}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REQUEST LEAVE                                                    */}
      {/* ========================================================================= */}
      {isRequestModalOpen && (
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title="Submit Leave Request"
          maxWidth="md"
          overflowVisible={true}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitLeave}>
                Submit Request
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {leaveFormError && (
              <div className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded">
                {leaveFormError}
              </div>
            )}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Leave Type</label>
              <Select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                options={[
                  { value: 'Casual', label: 'Casual Leave' },
                  { value: 'Sick', label: 'Sick Leave' },
                  { value: 'Other', label: 'Other Leave' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">From Date</label>
                <DatePicker value={leaveFromDate} onChange={setLeaveFromDate} />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">To Date</label>
                <DatePicker value={leaveToDate} onChange={setLeaveToDate} />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Reason for Leave (Required)
              </label>
              <Textarea
                rows={5}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="State the justification or medical condition for this leave request..."
                className="min-h-[110px]"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1B: APPROVE LEAVE (Checks Affected Appointments)                    */}
      {/* ========================================================================= */}
      {approveTarget && (
        <Modal
          isOpen={Boolean(approveTarget)}
          onClose={() => setApproveTarget(null)}
          title="Approve Leave Request"
          description={`Review leave approval for ${approveTarget.staffName || approveTarget.staffId}`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setApproveTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmApproval}>
                Confirm Approval
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[0.6875rem] mb-1">Staff Member</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {approveTarget.staffName || approveTarget.staffId}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[0.6875rem] mb-1">Leave Period</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {approveTarget.fromDate} to {approveTarget.toDate} ({approveTarget.type} Leave)
              </span>
            </div>

            {affectedAppointments.length > 0 ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {affectedAppointments.length} {affectedAppointments.length === 1 ? 'appointment is affected' : 'appointments are affected'}.
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  Approving this leave will mark the affected consultations as needing rescheduling and automatically send an in-app notice to each patient.
                </p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                  {affectedAppointments.map((apt) => (
                    <div key={apt.id} className="flex justify-between items-center text-xs py-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{apt.patientName}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {apt.dateTime ? apt.dateTime.slice(0, 10) : ''} at {apt.dateTime ? apt.dateTime.slice(11, 16) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs">
                0 appointments are affected by this leave window.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REJECT LEAVE (Requires Note)                                     */}
      {/* ========================================================================= */}
      {rejectTarget && (
        <Modal
          isOpen={Boolean(rejectTarget)}
          onClose={() => setRejectTarget(null)}
          title="Reject Leave Request"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmReject}>
                Confirm Rejection
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {rejectError && (
              <div className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded">
                {rejectError}
              </div>
            )}
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[0.6875rem] mb-1">Staff Member</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {rejectTarget.staffName || rejectTarget.staffId}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[0.6875rem] mb-1">Requested Dates</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {rejectTarget.fromDate} to {rejectTarget.toDate} ({rejectTarget.type} Leave)
              </span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Rejection Reason (Required for Audit Compliance)
              </label>
              <Textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain the administrative or operational reason for rejecting this leave..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT SHIFT                                                       */}
      {/* ========================================================================= */}
      {editShiftTarget && (
        <Modal
          isOpen={Boolean(editShiftTarget)}
          onClose={() => setEditShiftTarget(null)}
          title={`Edit Shift Schedule: ${editShiftTarget.staffName || editShiftTarget.staffId}`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setEditShiftTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveShift}>
                Save Shift Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {shiftEditError && (
              <div className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded">
                {shiftEditError}
              </div>
            )}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
                Scheduled Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as DayOfWeek[]).map((day) => {
                  const isSelected = shiftDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`px-3 py-1.5 border rounded text-xs cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-700 font-semibold'
                          : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Shift Start</label>
                <Select
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  options={[
                    { value: '08:00', label: '08:00' },
                    { value: '08:30', label: '08:30' },
                    { value: '09:00', label: '09:00' },
                    { value: '09:30', label: '09:30' },
                    { value: '10:00', label: '10:00' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Shift End</label>
                <Select
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  options={[
                    { value: '15:30', label: '15:30' },
                    { value: '16:00', label: '16:00' },
                    { value: '16:30', label: '16:30' },
                    { value: '17:00', label: '17:00' },
                    { value: '17:30', label: '17:30' },
                    { value: '18:00', label: '18:00' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Grace Period (Minutes)
              </label>
              <Select
                value={shiftGrace}
                onChange={(e) => setShiftGrace(e.target.value)}
                options={[
                  { value: '5', label: '5 minutes' },
                  { value: '10', label: '10 minutes' },
                  { value: '15', label: '15 minutes (Standard)' },
                  { value: '20', label: '20 minutes' },
                  { value: '30', label: '30 minutes' },
                ]}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CORRECT ATTENDANCE RECORD                                        */}
      {/* ========================================================================= */}
      {correctTarget && (
        <Modal
          isOpen={Boolean(correctTarget)}
          onClose={() => setCorrectTarget(null)}
          title={`Correct Record: ${correctTarget.staffName || correctTarget.staffId} (${correctTarget.date})`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setCorrectTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveCorrectRecord}>
                Save Correction
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {correctError && (
              <div className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded">
                {correctError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Clock In Time (HH:MM)
                </label>
                <Input
                  value={correctClockIn}
                  onChange={(e) => setCorrectClockIn(e.target.value)}
                  placeholder="09:00"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Clock Out Time (HH:MM)
                </label>
                <Input
                  value={correctClockOut}
                  onChange={(e) => setCorrectClockOut(e.target.value)}
                  placeholder="16:30"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Record Note</label>
              <Input
                value={correctNote}
                onChange={(e) => setCorrectNote(e.target.value)}
                placeholder="Optional record notes..."
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Correction Reason (Required for Audit Compliance)
              </label>
              <Textarea
                rows={3}
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value)}
                placeholder="Document why this record was altered (e.g. system omission, biometric error)..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: QUICK CLOCK IN                                                   */}
      {/* ========================================================================= */}
      {quickClockInTarget && (
        <Modal
          isOpen={Boolean(quickClockInTarget)}
          onClose={() => setQuickClockInTarget(null)}
          title={`Administrative Clock In: ${quickClockInTarget.staffName}`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setQuickClockInTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmQuickClockIn}>
                Confirm Clock In
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Record immediate clock-in for <strong className="text-slate-900 dark:text-slate-100">{quickClockInTarget.staffName}</strong> for today ({todayStr}). This action will be logged in the Security Ledger.
            </p>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Audit Note / Reason
              </label>
              <Input
                value={quickClockInNote}
                onChange={(e) => setQuickClockInNote(e.target.value)}
                placeholder="e.g. Card reader offline, confirmed present at workstation..."
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
