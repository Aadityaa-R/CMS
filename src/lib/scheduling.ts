import { Appointment, AppointmentSource } from '@/types';
import { Shift, LeaveRequest } from '@/types/attendance';
import {
  formatDate,
  dayOfWeek,
  timeToMinutes,
  isOnLeave,
} from '@/lib/attendance';
import { getDoctorCanonicalStaffId } from '@/lib/availability';

// Scheduling Constants
export const SLOT_MINUTES = 20;
export const BOOKING_LEAD_MINUTES = 120; // 2 hours advance notice required
export const BOOKING_WINDOW_DAYS = 30; // 30 days in advance maximum
export const CANCEL_CUTOFF_MINUTES = 120; // Cutoff 2 hours before appointment
export const MAX_ACTIVE_BOOKINGS = 2; // Maximum concurrent active bookings per patient

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Returns list of available slot start times (e.g. ['09:00', '09:20'])
 * inside the doctor's shift for the given date.
 */
export function getAvailableSlots(
  doctorId: string,
  date: string,
  appointments: Appointment[],
  shifts: Shift[],
  leaves: LeaveRequest[],
  now: Date
): string[] {
  const canonicalId = getDoctorCanonicalStaffId(doctorId);
  const todayStr = formatDate(now);

  // Check booking window (0 to 30 days from today)
  const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
  const dateMs = new Date(`${date}T00:00:00`).getTime();
  const diffDays = Math.round((dateMs - todayMs) / (24 * 3600 * 1000));

  if (diffDays < 0 || diffDays > BOOKING_WINDOW_DAYS) {
    return [];
  }

  // Check doctor leave
  if (isOnLeave(canonicalId, date, leaves)) {
    return [];
  }

  // Check doctor shift for the day of week
  const dow = dayOfWeek(date);
  const shift = shifts.find((s) => s.staffId === canonicalId && s.days.includes(dow));
  if (!shift) {
    return [];
  }

  const shiftStartMin = timeToMinutes(shift.start);
  const shiftEndMin = timeToMinutes(shift.end);
  const availableSlots: string[] = [];
  const nowMs = now.getTime();
  const leadMs = BOOKING_LEAD_MINUTES * 60 * 1000;

  // Filter doctor's active (non-cancelled) appointments on this date
  const dayAppointments = appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    if (aptDate !== date) return false;
    return getDoctorCanonicalStaffId(a.doctorId) === canonicalId;
  });

  for (let slotStart = shiftStartMin; slotStart + SLOT_MINUTES <= shiftEndMin; slotStart += SLOT_MINUTES) {
    const slotEnd = slotStart + SLOT_MINUTES;
    const slotTimeStr = minutesToTime(slotStart);
    const slotDate = new Date(`${date}T${slotTimeStr}:00`);

    // Past time and lead time enforcement
    if (slotDate.getTime() - nowMs < leadMs) {
      continue;
    }

    // Check collision with existing active appointments
    const hasConflict = dayAppointments.some((a) => {
      const aptTimeStr = a.dateTime.slice(11, 16);
      const aStart = timeToMinutes(aptTimeStr);
      const aDuration = a.durationMinutes || SLOT_MINUTES;
      const aEnd = aStart + aDuration;
      return slotStart < aEnd && slotEnd > aStart;
    });

    if (!hasConflict) {
      availableSlots.push(slotTimeStr);
    }
  }

  return availableSlots;
}

/**
 * Validates whether a booking request meets all scheduling constraints.
 */
export function validateBooking(
  doctorId: string,
  date: string,
  time: string,
  patientId: string,
  appointments: Appointment[],
  shifts: Shift[],
  leaves: LeaveRequest[],
  now: Date
): ValidationResult {
  const todayStr = formatDate(now);
  const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
  const dateMs = new Date(`${date}T00:00:00`).getTime();
  const diffDays = Math.round((dateMs - todayMs) / (24 * 3600 * 1000));

  if (diffDays < 0) {
    return { allowed: false, reason: 'Appointments cannot be booked in the past.' };
  }
  if (diffDays > BOOKING_WINDOW_DAYS) {
    return { allowed: false, reason: 'Date is outside the 30-day booking window.' };
  }

  const canonicalId = getDoctorCanonicalStaffId(doctorId);

  if (isOnLeave(canonicalId, date, leaves)) {
    return { allowed: false, reason: 'Doctor is on approved leave on this date.' };
  }

  const dow = dayOfWeek(date);
  const shift = shifts.find((s) => s.staffId === canonicalId && s.days.includes(dow));
  if (!shift) {
    return { allowed: false, reason: 'Doctor has no scheduled shift on this day.' };
  }

  const slotStart = timeToMinutes(time);
  const slotEnd = slotStart + SLOT_MINUTES;
  const shiftStart = timeToMinutes(shift.start);
  const shiftEnd = timeToMinutes(shift.end);

  if (slotStart < shiftStart || slotEnd > shiftEnd) {
    return { allowed: false, reason: 'Selected time is outside the doctor shift hours.' };
  }

  const slotDate = new Date(`${date}T${time}:00`);
  const leadMs = BOOKING_LEAD_MINUTES * 60 * 1000;
  if (slotDate.getTime() - now.getTime() < leadMs) {
    return { allowed: false, reason: 'Appointments must be booked at least 2 hours in advance.' };
  }

  // Enforce maximum active bookings per patient
  const activeBookings = appointments.filter((a) => {
    if (a.patientId !== patientId) return false;
    if (a.status !== 'scheduled' && a.status !== 'confirmed') return false;
    const aptTime = new Date(a.dateTime).getTime();
    return aptTime >= now.getTime();
  });

  if (activeBookings.length >= MAX_ACTIVE_BOOKINGS) {
    return { allowed: false, reason: 'Maximum of 2 active bookings allowed per patient.' };
  }

  // Conflict check with existing active appointments for this doctor
  const conflict = appointments.some((a) => {
    if (a.status === 'cancelled') return false;
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    if (aptDate !== date) return false;
    if (getDoctorCanonicalStaffId(a.doctorId) !== canonicalId) return false;
    const aStart = timeToMinutes(a.dateTime.slice(11, 16));
    const aEnd = aStart + (a.durationMinutes || SLOT_MINUTES);
    return slotStart < aEnd && slotEnd > aStart;
  });

  if (conflict) {
    return { allowed: false, reason: 'Selected time slot is already booked.' };
  }

  return { allowed: true };
}

export interface BookAppointmentParams {
  id?: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  department?: string;
  date: string;
  time: string;
  reasonForVisit: string;
  source?: AppointmentSource;
  bookedBy?: { id: string; name: string } | null;
  rescheduledFrom?: string | null;
}

/**
 * Pure helper generating a new scheduled appointment record.
 */
export function bookAppointment(
  params: BookAppointmentParams,
  appointments: Appointment[],
  _now?: Date
): Appointment {
  const newId = params.id || `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const year = params.date.slice(0, 4) || '2026';
  const appointmentNumber = `APT-${year}-${String(appointments.length + 1).padStart(3, '0')}`;

  return {
    id: newId,
    appointmentNumber,
    patientId: params.patientId,
    patientName: params.patientName,
    patientPhone: params.patientPhone || '',
    doctorId: params.doctorId,
    doctorName: params.doctorName,
    department: params.department || 'General Medicine',
    dateTime: `${params.date}T${params.time}:00`,
    durationMinutes: SLOT_MINUTES,
    status: 'scheduled',
    reasonForVisit: (params.reasonForVisit || 'Consultation').trim(),
    tokenNumber: 0,
    source: params.source || 'web',
    checkedInAt: null,
    checkedInBy: null,
    bookedBy: params.bookedBy || null,
    cancelledBy: null,
    cancelledAt: null,
    cancelReason: null,
    rescheduledFrom: params.rescheduledFrom || null,
    needsReschedule: false,
  };
}

export interface CancelResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
}

/**
 * Pure helper to cancel an appointment if outside the cutoff window.
 */
export function cancelAppointment(
  appointment: Appointment,
  actor: { id: string; name: string; role?: string } | null | undefined,
  now: Date,
  reason?: string
): CancelResult {
  if (appointment.status === 'cancelled') {
    return { success: false, error: 'Appointment is already cancelled.' };
  }

  const isStaff = actor?.role === 'receptionist' || actor?.role === 'admin' || actor?.role === 'md';
  const aptTime = new Date(appointment.dateTime).getTime();
  const diffMinutes = (aptTime - now.getTime()) / (60 * 1000);

  if (!isStaff && diffMinutes < CANCEL_CUTOFF_MINUTES) {
    return {
      success: false,
      error: 'Appointments cannot be cancelled within 2 hours of the scheduled time.',
    };
  }

  if (isStaff && !reason?.trim()) {
    return {
      success: false,
      error: 'A reason is required to cancel this appointment.',
    };
  }

  const updated: Appointment = {
    ...appointment,
    status: 'cancelled',
    cancelledBy: actor ? { id: actor.id, name: actor.name } : null,
    cancelledAt: now.toISOString(),
    cancelReason: reason || 'Cancelled by user',
  };

  return { success: true, appointment: updated };
}

export interface RescheduleResult {
  success: boolean;
  cancelledAppointment?: Appointment;
  newAppointment?: Appointment;
  error?: string;
}

/**
 * Atomically cancels old appointment and creates new appointment.
 */
export function rescheduleAppointment(
  appointment: Appointment,
  newDate: string,
  newTime: string,
  actor: { id: string; name: string; role?: string } | null | undefined,
  appointments: Appointment[],
  shifts: Shift[],
  leaves: LeaveRequest[],
  now: Date
): RescheduleResult {
  const isStaff = actor?.role === 'receptionist' || actor?.role === 'admin' || actor?.role === 'md';
  const aptTime = new Date(appointment.dateTime).getTime();
  const diffMinutes = (aptTime - now.getTime()) / (60 * 1000);

  if (!isStaff && diffMinutes < CANCEL_CUTOFF_MINUTES) {
    return {
      success: false,
      error: 'Appointments cannot be rescheduled within 2 hours of the scheduled time.',
    };
  }

  const remainingAppointments = appointments.filter((a) => a.id !== appointment.id);
  const val = validateBooking(
    appointment.doctorId,
    newDate,
    newTime,
    appointment.patientId,
    remainingAppointments,
    shifts,
    leaves,
    now
  );

  if (!val.allowed) {
    return {
      success: false,
      error: val.reason || 'The requested new slot is not available.',
    };
  }

  const cancelRes = cancelAppointment(
    appointment,
    actor,
    now,
    `Rescheduled to ${newDate} at ${newTime}`
  );

  if (!cancelRes.success || !cancelRes.appointment) {
    return {
      success: false,
      error: cancelRes.error || 'Failed to cancel existing appointment.',
    };
  }

  const newApt = bookAppointment(
    {
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      department: appointment.department,
      date: newDate,
      time: newTime,
      reasonForVisit: appointment.reasonForVisit,
      source: appointment.source || 'web',
      bookedBy: actor ? { id: actor.id, name: actor.name } : null,
      rescheduledFrom: appointment.id,
    },
    appointments,
    now
  );

  return {
    success: true,
    cancelledAppointment: cancelRes.appointment,
    newAppointment: newApt,
  };
}

/**
 * Returns all non-cancelled appointments scheduled with the doctor in the specified date range.
 */
export function appointmentsAffectedByLeave(
  doctorId: string,
  fromDate: string,
  toDate: string,
  appointments: Appointment[]
): Appointment[] {
  const canonicalId = getDoctorCanonicalStaffId(doctorId);
  return appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    if (a.status !== 'scheduled' && a.status !== 'confirmed') return false;
    if (getDoctorCanonicalStaffId(a.doctorId) !== canonicalId) return false;
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    return fromDate <= aptDate && aptDate <= toDate;
  });
}
