import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Doctor, User, AccessModule } from '@/types';
import { Shift, LeaveRequest, AttendanceRecord } from '@/types/attendance';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import {
  buildDayGrid,
  buildWeekGrid,
  addDays,
  CalendarCell,
} from '@/lib/calendar';
import { SLOT_MINUTES, getAvailableSlots } from '@/lib/scheduling';
import { formatLocalDate, formatDate } from '@/lib/time';
import { formatDoctorName } from '@/lib/doctorNames';
import { isDoctorAvailable } from '@/lib/availability';
import { hasCapability, isAdmin } from '@/lib/permissions';

export interface AppointmentCalendarProps {
  doctors: Doctor[];
  appointments: Appointment[];
  shifts: Shift[];
  leaves: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  currentUser: User | null;
  modules: AccessModule[];
  todayStr: string;
  onBookSlot: (doctorId: string, date: string, time: string) => void;
  onCheckIn: (apt: Appointment) => void;
  onCancel: (apt: Appointment, reason: string) => boolean;
  onReschedule: (apt: Appointment, newDate: string, newTime: string) => boolean;
}

function getStartOfWeek(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDate(d);
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  doctors,
  appointments,
  shifts,
  leaves,
  attendanceRecords,
  currentUser,
  modules,
  todayStr,
  onBookSlot,
  onCheckIn,
  onCancel,
  onReschedule,
}) => {
  // Real-time minute ticker (updates current time line without animation)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // View state: 'day' | 'week'
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  // Ensure valid doctor selected in week view or phone view
  const activeDoctors = useMemo(() => {
    return doctors.filter((d) => d.status === 'active');
  }, [doctors]);

  const effectiveDoctorId = useMemo(() => {
    if (selectedDoctorId !== 'all') return selectedDoctorId;
    return activeDoctors[0]?.id || doctors[0]?.id || '';
  }, [selectedDoctorId, activeDoctors, doctors]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'day') {
      setSelectedDate((prev) => addDays(prev, -1));
    } else {
      setSelectedDate((prev) => addDays(prev, -7));
    }
  };

  const handleToday = () => {
    setSelectedDate(formatLocalDate(now));
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setSelectedDate((prev) => addDays(prev, 1));
    } else {
      setSelectedDate((prev) => addDays(prev, 7));
    }
  };

  // Day view doctors to render
  const doctorsForDayView = useMemo(() => {
    if (selectedDoctorId === 'all') {
      return activeDoctors.length > 0 ? activeDoctors : doctors;
    }
    const found = doctors.find((d) => d.id === selectedDoctorId);
    return found ? [found] : activeDoctors;
  }, [selectedDoctorId, activeDoctors, doctors]);

  // Day grid
  const dayGrid = useMemo(() => {
    return buildDayGrid(
      selectedDate,
      doctorsForDayView,
      shifts,
      leaves,
      appointments,
      SLOT_MINUTES,
      now
    );
  }, [selectedDate, doctorsForDayView, shifts, leaves, appointments, now]);

  // Week start calculation
  const weekStart = useMemo(() => {
    return getStartOfWeek(selectedDate);
  }, [selectedDate]);

  // Week grid
  const weekGrid = useMemo(() => {
    return buildWeekGrid(
      effectiveDoctorId,
      weekStart,
      shifts,
      leaves,
      appointments,
      SLOT_MINUTES,
      now
    );
  }, [effectiveDoctorId, weekStart, shifts, leaves, appointments, now]);

  // Count booked and free cells
  const { bookedCount, freeCount } = useMemo(() => {
    let booked = 0;
    let free = 0;
    if (viewMode === 'day') {
      dayGrid.rows.forEach((row) => {
        Object.values(row.cells).forEach((cell) => {
          if (cell.state === 'booked') booked++;
          if (cell.state === 'free') free++;
        });
      });
    } else {
      weekGrid.rows.forEach((row) => {
        Object.values(row.cells).forEach((cell) => {
          if (cell.state === 'booked') booked++;
          if (cell.state === 'free') free++;
        });
      });
    }
    return { bookedCount: booked, freeCount: free };
  }, [viewMode, dayGrid, weekGrid]);

  // Modals state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>(todayStr);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleError, setRescheduleError] = useState<string>('');

  // Cancel state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');

  const handleOpenBookedCell = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsRescheduling(false);
    setIsCancelling(false);
    setRescheduleDate(apt.dateTime ? apt.dateTime.slice(0, 10) : todayStr);
    setRescheduleTime('');
    setCancelReasonInput('');
    setCancelError('');
    setRescheduleError('');
    setIsDetailModalOpen(true);
  };

  // Check action permissions for the selected appointment
  const canCheckIn = useMemo(() => {
    if (!selectedAppointment) return false;
    const hasPerm = hasCapability(currentUser, 'patientCheckIn', modules) || isAdmin(currentUser, modules);
    if (!hasPerm) return false;
    const aptDate = selectedAppointment.dateTime ? selectedAppointment.dateTime.slice(0, 10) : '';
    const isToday = aptDate === todayStr;
    const isScheduled = selectedAppointment.status === 'scheduled';
    const docAvailable = isDoctorAvailable(
      selectedAppointment.doctorId,
      todayStr,
      shifts,
      attendanceRecords,
      leaves
    );
    return isToday && isScheduled && docAvailable;
  }, [selectedAppointment, currentUser, modules, todayStr, shifts, attendanceRecords, leaves]);

  const canReschedule = useMemo(() => {
    if (!selectedAppointment) return false;
    const hasPerm = hasCapability(currentUser, 'booking', modules) || isAdmin(currentUser, modules);
    return hasPerm && selectedAppointment.status === 'scheduled';
  }, [selectedAppointment, currentUser, modules]);

  const canCancel = useMemo(() => {
    if (!selectedAppointment) return false;
    const hasPerm = hasCapability(currentUser, 'booking', modules) || isAdmin(currentUser, modules);
    return hasPerm && selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed';
  }, [selectedAppointment, currentUser, modules]);

  // Reschedule available slots
  const availableRescheduleSlots = useMemo(() => {
    if (!selectedAppointment || !rescheduleDate) return [];
    return getAvailableSlots(
      selectedAppointment.doctorId,
      rescheduleDate,
      appointments,
      shifts,
      leaves,
      now
    );
  }, [selectedAppointment, rescheduleDate, appointments, shifts, leaves, now]);

  const handlePerformCheckIn = () => {
    if (!selectedAppointment) return;
    onCheckIn(selectedAppointment);
    setIsDetailModalOpen(false);
  };

  const handleConfirmCancel = () => {
    if (!selectedAppointment) return;
    if (!cancelReasonInput.trim()) {
      setCancelError('Cancellation reason is required.');
      return;
    }
    const success = onCancel(selectedAppointment, cancelReasonInput.trim());
    if (success) {
      setIsDetailModalOpen(false);
    }
  };

  const handleConfirmReschedule = () => {
    if (!selectedAppointment) return;
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError('Please select both a date and a time slot.');
      return;
    }
    const success = onReschedule(selectedAppointment, rescheduleDate, rescheduleTime);
    if (success) {
      setIsDetailModalOpen(false);
    }
  };

  // Phone agenda items
  const phoneDoctor = doctors.find((d) => d.id === effectiveDoctorId) || doctors[0];
  const phoneDayGrid = useMemo(() => {
    if (!phoneDoctor) return null;
    return buildDayGrid(
      selectedDate,
      [phoneDoctor],
      shifts,
      leaves,
      appointments,
      SLOT_MINUTES,
      now
    );
  }, [phoneDoctor, selectedDate, shifts, leaves, appointments, now]);

  // Current time marker calculation for today
  const isSelectedDateToday = selectedDate === todayStr;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        {/* Left: Previous, Today, Next buttons & DatePicker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handlePrev}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              Next
            </Button>
          </div>
          <div className="w-44">
            <DatePicker value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>

        {/* Center: Day and Week underline sub-tabs */}
        <div className="flex items-center justify-center">
          <Tabs
            ariaLabel="Calendar View Mode"
            tabs={[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
            ]}
            activeTab={viewMode}
            onChange={(id) => setViewMode(id as 'day' | 'week')}
          />
        </div>

        {/* Right: Doctor Select & Plain count line */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Select
              value={viewMode === 'week' ? effectiveDoctorId : selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              options={
                viewMode === 'day'
                  ? [
                      { value: 'all', label: 'All doctors' },
                      ...doctors.map((d) => ({
                        value: d.id,
                        label: `${d.name} (${d.specialization})`,
                      })),
                    ]
                  : doctors.map((d) => ({
                      value: d.id,
                      label: `${d.name} (${d.specialization})`,
                    }))
              }
            />
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {bookedCount} booked, {freeCount} free
          </span>
        </div>
      </div>

      {/* DESKTOP/TABLET GRID VIEW (screens >= 40rem / 640px) */}
      <div className="hidden sm:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm max-h-[70vh] overflow-y-auto relative">
        {viewMode === 'day' ? (
          /* DAY VIEW GRID */
          <table className="w-full border-collapse table-fixed text-left">
            <thead>
              <tr className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-10 border-b border-slate-200 dark:border-slate-700">
                <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 w-24 p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                  Time
                </th>
                {doctorsForDayView.map((doc) => (
                  <th
                    key={doc.id}
                    className="p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 truncate"
                  >
                    <div>{doc.name}</div>
                    <div className="text-[0.6875rem] font-normal text-slate-500 dark:text-slate-400 truncate">
                      {doc.specialization}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayGrid.rows.map((row) => {
                const isCurrentTimeSlot =
                  isSelectedDateToday &&
                  nowMin >= row.startMinutes &&
                  nowMin < row.endMinutes;
                const ratio = isCurrentTimeSlot
                  ? (nowMin - row.startMinutes) / (row.endMinutes - row.startMinutes)
                  : 0;

                return (
                  <tr key={row.slotTime} className="min-h-[2.75rem] h-[2.75rem] relative">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 w-24 p-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {row.slotTime}
                      {isCurrentTimeSlot && (
                        <div
                          className="absolute left-0 right-0 border-t border-rose-500 z-20 pointer-events-none"
                          style={{ top: `${Math.round(ratio * 100)}%` }}
                          aria-hidden="true"
                        />
                      )}
                    </td>
                    {doctorsForDayView.map((doc) => {
                      const cell: CalendarCell = row.cells[doc.id] || {
                        state: 'off',
                        slotTime: row.slotTime,
                        date: selectedDate,
                        doctorId: doc.id,
                      };

                      return (
                        <td
                          key={doc.id}
                          className="p-1.5 border-r border-slate-100 dark:border-slate-800 relative align-middle"
                        >
                          {isCurrentTimeSlot && (
                            <div
                              className="absolute left-0 right-0 border-t border-rose-500 z-20 pointer-events-none"
                              style={{ top: `${Math.round(ratio * 100)}%` }}
                              aria-hidden="true"
                            />
                          )}
                          <CellContent
                            cell={cell}
                            onBookSlot={onBookSlot}
                            onOpenBooked={handleOpenBookedCell}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* WEEK VIEW GRID */
          <table className="w-full border-collapse table-fixed text-left">
            <thead>
              <tr className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-10 border-b border-slate-200 dark:border-slate-700">
                <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 w-24 p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                  Time
                </th>
                {weekGrid.days.map((dStr) => {
                  const isDayToday = dStr === todayStr;
                  return (
                    <th
                      key={dStr}
                      className={`p-2 text-xs font-semibold border-r border-slate-200 dark:border-slate-700 ${
                        isDayToday
                          ? 'text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div>{formatDate(dStr)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {weekGrid.rows.map((row) => {
                return (
                  <tr key={row.slotTime} className="min-h-[2.75rem] h-[2.75rem] relative">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 w-24 p-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {row.slotTime}
                    </td>
                    {weekGrid.days.map((dStr) => {
                      const cell: CalendarCell = row.cells[dStr] || {
                        state: 'off',
                        slotTime: row.slotTime,
                        date: dStr,
                        doctorId: effectiveDoctorId,
                      };
                      const isCellToday = dStr === todayStr;
                      const isCurrentTimeSlot =
                        isCellToday &&
                        nowMin >= row.startMinutes &&
                        nowMin < row.endMinutes;
                      const ratio = isCurrentTimeSlot
                        ? (nowMin - row.startMinutes) / (row.endMinutes - row.startMinutes)
                        : 0;

                      return (
                        <td
                          key={dStr}
                          className="p-1.5 border-r border-slate-100 dark:border-slate-800 relative align-middle"
                        >
                          {isCurrentTimeSlot && (
                            <div
                              className="absolute left-0 right-0 border-t border-rose-500 z-20 pointer-events-none"
                              style={{ top: `${Math.round(ratio * 100)}%` }}
                              aria-hidden="true"
                            />
                          )}
                          <CellContent
                            cell={cell}
                            onBookSlot={onBookSlot}
                            onOpenBooked={handleOpenBookedCell}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PHONE AGENDA LIST VIEW (screens < 40rem / under 640px) */}
      <div className="block sm:hidden space-y-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Selected Physician (Required)
          </label>
          <Select
            value={effectiveDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.specialization})`,
            }))}
          />
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
          {phoneDayGrid && phoneDayGrid.rows.length > 0 ? (
            phoneDayGrid.rows.map((row) => {
              const cell = row.cells[effectiveDoctorId] || {
                state: 'off',
                slotTime: row.slotTime,
                date: selectedDate,
                doctorId: effectiveDoctorId,
              };

              return (
                <div
                  key={row.slotTime}
                  className="p-3 flex items-center justify-between gap-3 min-h-[2.75rem]"
                >
                  <div className="w-16 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {row.slotTime}
                  </div>
                  <div className="flex-1">
                    <CellContent
                      cell={cell}
                      onBookSlot={onBookSlot}
                      onOpenBooked={handleOpenBookedCell}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No schedule records for this date.
            </div>
          )}
        </div>
      </div>

      {/* BOOKED APPOINTMENT DETAILS & ACTIONS MODAL */}
      {selectedAppointment && isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Appointment Details"
        >
          <div className="space-y-4">
            {/* Scoped Details: Name, Phone, Reason, Status, Doctor, Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Patient:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {selectedAppointment.patientName}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {selectedAppointment.patientPhone || 'None'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Doctor:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {formatDoctorName(selectedAppointment.doctorName || 'Assigned Physician')}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Time:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {selectedAppointment.dateTime
                    ? `${selectedAppointment.dateTime.slice(0, 10)} at ${selectedAppointment.dateTime.slice(11, 16)}`
                    : 'Scheduled'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-medium capitalize">
                  {selectedAppointment.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Reason:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {selectedAppointment.reasonForVisit || 'General Consultation'}
                </span>
              </div>
            </div>

            {/* RESCHEDULE VIEW */}
            {isRescheduling ? (
              <div className="space-y-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Reschedule Appointment
                </div>
                {rescheduleError && (
                  <div className="p-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded">
                    {rescheduleError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Date
                    </label>
                    <DatePicker value={rescheduleDate} onChange={setRescheduleDate} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Time Slot
                    </label>
                    <Select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      options={
                        availableRescheduleSlots.length > 0
                          ? availableRescheduleSlots.map((slot) => ({
                              value: slot,
                              label: slot,
                            }))
                          : [{ value: '', label: 'No free slots on this date' }]
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRescheduling(false)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmReschedule}
                  >
                    Confirm Reschedule
                  </Button>
                </div>
              </div>
            ) : isCancelling ? (
              /* CANCEL VIEW */
              <div className="space-y-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Cancel Appointment
                </div>
                {cancelError && (
                  <div className="p-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded">
                    {cancelError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cancellation Reason (Required)
                  </label>
                  <Input
                    value={cancelReasonInput}
                    onChange={(e) => setCancelReasonInput(e.target.value)}
                    placeholder="Document clinical or administrative indication for cancellation..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCancelling(false)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmCancel}
                  >
                    Confirm Cancellation
                  </Button>
                </div>
              </div>
            ) : (
              /* PRIMARY ACTIONS ROW */
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                {canCheckIn && (
                  <Button variant="primary" size="sm" onClick={handlePerformCheckIn}>
                    Check In
                  </Button>
                )}
                {canReschedule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRescheduling(true)}
                  >
                    Reschedule
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsCancelling(true)}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

interface CellContentProps {
  cell: CalendarCell;
  onBookSlot: (doctorId: string, date: string, time: string) => void;
  onOpenBooked: (apt: Appointment) => void;
}

const CellContent: React.FC<CellContentProps> = ({
  cell,
  onBookSlot,
  onOpenBooked,
}) => {
  if (cell.state === 'free') {
    return (
      <button
        type="button"
        onClick={() => onBookSlot(cell.doctorId, cell.date, cell.slotTime)}
        className="w-full text-left p-1.5 rounded-lg border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[var(--fs-label)] font-medium transition-colors"
      >
        Free
      </button>
    );
  }

  if (cell.state === 'past-free') {
    return (
      <div className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 text-[var(--fs-label)] font-medium cursor-not-allowed">
        Free
      </div>
    );
  }

  if (cell.state === 'booked' && cell.appointment) {
    const apt = cell.appointment;
    return (
      <button
        type="button"
        onClick={() => onOpenBooked(apt)}
        className="w-full text-left p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="text-[var(--fs-label)] font-semibold text-slate-900 dark:text-slate-100 truncate">
          {apt.patientName}
        </div>
        <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 truncate">
          {apt.reasonForVisit || 'Consultation'} · {apt.status}
        </div>
      </button>
    );
  }

  if (cell.state === 'leave') {
    return (
      <div className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 chart-hatch-legend text-slate-500 dark:text-slate-400 text-[var(--fs-label)] font-medium flex items-center justify-center">
        On leave
      </div>
    );
  }

  // State === 'off'
  return (
    <div className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 chart-hatch-legend text-slate-400 dark:text-slate-500 text-[var(--fs-label)] font-medium flex items-center justify-center">
      Off
    </div>
  );
};
