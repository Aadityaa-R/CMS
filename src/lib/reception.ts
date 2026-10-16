import { Appointment, Patient, User, PatientAssignment } from '@/types';
import { isDoctorAvailable } from '@/lib/availability';
import { canRegisterPatient, canCheckIn, canBookAppointment, getAssignedDoctorId } from '@/lib/permissions';

/**
 * Returns the next unique daily token number for a given calendar date (YYYY-MM-DD).
 * Daily tokens count from 1 and reset each calendar day.
 */
export function getNextTokenNumberForDate(appointments: Appointment[], dateStr: string): number {
  const dayApts = appointments.filter((a) => {
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    const checkInDate = a.checkedInAt ? a.checkedInAt.slice(0, 10) : '';
    return aptDate === dateStr || checkInDate === dateStr;
  });
  return dayApts.reduce((max, a) => Math.max(max, a.tokenNumber || 0), 0) + 1;
}

/**
 * Calculates waiting duration in minutes from arrival timestamp to reference time.
 */
export function calculateWaitTimeMinutes(
  checkedInAt: string | null | undefined,
  referenceTime: Date = new Date()
): number {
  if (!checkedInAt) return 0;
  const arrival = new Date(checkedInAt).getTime();
  const now = referenceTime.getTime();
  if (isNaN(arrival)) return 0;
  const diffMs = Math.max(0, now - arrival);
  return Math.floor(diffMs / 60000);
}

/**
 * Formats who checked in the patient. Displays "Not recorded" when missing.
 */
export function formatCheckedInBy(checkedInBy?: { id: string; name: string } | null): string {
  return checkedInBy?.name || 'Not recorded';
}

/**
 * Formats who registered the patient. Displays "Not recorded" when missing.
 */
export function formatRegisteredBy(registeredBy?: { id: string; name: string } | null): string {
  return registeredBy?.name || 'Not recorded';
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates Flow A: New Walk-in Patient intake.
 */
export function validateWalkInNewArrival(
  actor: User | null | undefined,
  fields: {
    firstName: string;
    lastName: string;
    dob: string;
    phone: string;
    doctorId: string;
    chiefComplaint: string;
  },
  todayStr: string
): ValidationResult {
  if (!canRegisterPatient(actor)) {
    return {
      allowed: false,
      reason: 'Unauthorized: Patient registration capability required.',
    };
  }
  if (!canCheckIn(actor)) {
    return {
      allowed: false,
      reason: 'Unauthorized: Patient check-in capability required.',
    };
  }
  if (!fields.firstName.trim() || !fields.lastName.trim()) {
    return {
      allowed: false,
      reason: 'Patient first and last name are required.',
    };
  }
  if (!fields.phone.trim()) {
    return {
      allowed: false,
      reason: 'Contact phone number is required.',
    };
  }
  if (!fields.doctorId) {
    return {
      allowed: false,
      reason: 'Doctor selection is required.',
    };
  }
  if (!isDoctorAvailable(fields.doctorId, todayStr)) {
    return {
      allowed: false,
      reason: 'Selected doctor is not available today.',
    };
  }
  if (!fields.chiefComplaint.trim()) {
    return {
      allowed: false,
      reason: 'Reason for visit is required.',
    };
  }
  return { allowed: true };
}

/**
 * Validates Flow B: Registered Walk-in Patient intake.
 * Registered patients must see their assigned doctor.
 * If that doctor is unavailable today, check-in is forbidden and an admin must reassign.
 */
export function validateWalkInExistingArrival(
  actor: User | null | undefined,
  patientId: string,
  assignments: PatientAssignment[],
  todayStr: string
): ValidationResult {
  if (!canCheckIn(actor)) {
    return {
      allowed: false,
      reason: 'Unauthorized: Patient check-in capability required.',
    };
  }
  if (!patientId) {
    return {
      allowed: false,
      reason: 'Patient selection is required.',
    };
  }
  const assignedDocId = getAssignedDoctorId(patientId, assignments);
  if (!assignedDocId) {
    return {
      allowed: false,
      reason: 'Patient has no assigned doctor. Assignment requires an administrator.',
    };
  }
  if (!isDoctorAvailable(assignedDocId, todayStr)) {
    return {
      allowed: false,
      reason: 'Assigned doctor is not available today. Reassignment requires an administrator.',
    };
  }
  return { allowed: true };
}

/**
 * Validates Flow C: Booked Arrival check-in.
 */
export function validateBookedArrival(
  actor: User | null | undefined,
  appointment: Appointment | null | undefined,
  todayStr: string
): ValidationResult {
  if (!canCheckIn(actor)) {
    return {
      allowed: false,
      reason: 'Unauthorized: Patient check-in capability required.',
    };
  }
  if (!appointment) {
    return {
      allowed: false,
      reason: 'Appointment record not found.',
    };
  }
  if (appointment.status !== 'scheduled') {
    return {
      allowed: false,
      reason: `Appointment cannot be checked in because current status is ${appointment.status}.`,
    };
  }
  const aptDate = appointment.dateTime ? appointment.dateTime.slice(0, 10) : '';
  if (aptDate !== todayStr) {
    return {
      allowed: false,
      reason: 'Only appointments scheduled for today can be checked in.',
    };
  }
  if (!isDoctorAvailable(appointment.doctorId, todayStr)) {
    return {
      allowed: false,
      reason: 'Assigned doctor is not available today. Reassignment requires an administrator.',
    };
  }
  return { allowed: true };
}

/**
 * Validates consultation appointment booking.
 */
export function validateAppointmentBooking(
  actor: User | null | undefined,
  doctorId: string,
  dateStr: string,
  reasonForVisit: string
): ValidationResult {
  if (!canBookAppointment(actor)) {
    return {
      allowed: false,
      reason: 'Unauthorized: Booking capability required.',
    };
  }
  if (!doctorId) {
    return {
      allowed: false,
      reason: 'Attending physician selection is required.',
    };
  }
  if (!dateStr) {
    return {
      allowed: false,
      reason: 'Appointment date is required.',
    };
  }
  if (!isDoctorAvailable(doctorId, dateStr)) {
    return {
      allowed: false,
      reason: 'Doctor is not available on selected date.',
    };
  }
  if (!reasonForVisit.trim()) {
    return {
      allowed: false,
      reason: 'Reason for consultation is required.',
    };
  }
  return { allowed: true };
}

export interface IntakeLogEntry {
  id: string;
  time: string;
  isoTimestamp: string;
  type: 'Registration' | 'Check-in';
  patientName: string;
  performedBy: string;
  details: string;
}

/**
 * Compiles today's unified intake registry: registrations and check-ins.
 */
export function getTodayIntakeLogs(
  patients: Patient[],
  appointments: Appointment[],
  todayStr: string
): IntakeLogEntry[] {
  const entries: IntakeLogEntry[] = [];

  // 1. Registrations
  patients.forEach((p) => {
    const regDate = p.registeredAt ? p.registeredAt.slice(0, 10) : p.registeredDate;
    if (regDate === todayStr) {
      const isoTimestamp = p.registeredAt || `${p.registeredDate}T09:00:00`;
      const timeStr = isoTimestamp.includes('T')
        ? isoTimestamp.split('T')[1].slice(0, 5)
        : '09:00';
      entries.push({
        id: `reg-${p.id}`,
        time: timeStr,
        isoTimestamp,
        type: 'Registration',
        patientName: `${p.firstName} ${p.lastName}`,
        performedBy: formatRegisteredBy(p.registeredBy),
        details: `MRN: ${p.mrn}`,
      });
    }
  });

  // 2. Check-ins
  appointments.forEach((a) => {
    const checkInDate = a.checkedInAt ? a.checkedInAt.slice(0, 10) : '';
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    const isToday = checkInDate === todayStr || (aptDate === todayStr && a.status !== 'scheduled');

    if (isToday && a.status !== 'scheduled') {
      const isoTimestamp = a.checkedInAt || a.dateTime;
      const timeStr = isoTimestamp.includes('T')
        ? isoTimestamp.split('T')[1].slice(0, 5)
        : '09:00';
      entries.push({
        id: `chk-${a.id}`,
        time: timeStr,
        isoTimestamp,
        type: 'Check-in',
        patientName: a.patientName,
        performedBy: formatCheckedInBy(a.checkedInBy),
        details: `Token #${a.tokenNumber} - Dr. ${a.doctorName}`,
      });
    }
  });

  // Sort descending by time
  return entries.sort((a, b) => b.isoTimestamp.localeCompare(a.isoTimestamp));
}
