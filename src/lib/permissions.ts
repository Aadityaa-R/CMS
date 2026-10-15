import {
  User,
  Patient,
  Appointment,
  Prescription,
  StaffAccessRecord,
  StaffPermission,
  PatientAssignment,
} from '@/types';

export type StandardCapability =
  | 'administrativeAccess'
  | 'consultationWorkstation'
  | 'emrRecordsAccess'
  | 'prescriptionAuthoring'
  | 'consultingCalendar'
  | 'patientRegistration'
  | 'patientCheckIn'
  | 'paymentRecording';

export const DOCTOR_CAPABILITIES: StaffPermission[] = [
  {
    id: 'perm-admin',
    name: 'Administrative Access',
    description: 'Promote to clinic administrator with staff management and security ledger authority',
    enabled: false,
  },
  {
    id: 'perm-consult',
    name: 'Consultation Workstation',
    description: 'Conduct patient visits and clinical assessments',
    enabled: true,
  },
  {
    id: 'perm-emr',
    name: 'EMR Records Access',
    description: 'Review medical records, chronic history, and vitals',
    enabled: true,
  },
  {
    id: 'perm-presc',
    name: 'Prescription Authoring',
    description: 'Generate and sign electronic outpatient prescriptions (requires EMR access)',
    enabled: true,
  },
  {
    id: 'perm-schedule',
    name: 'Consulting Calendar',
    description: 'Manage personal schedule and view patient queue',
    enabled: true,
  },
];

export const RECEPTIONIST_CAPABILITIES: StaffPermission[] = [
  {
    id: 'perm-register',
    name: 'Patient Registration',
    description: 'Enroll new outpatients and generate medical record numbers',
    enabled: true,
  },
  {
    id: 'perm-checkin',
    name: 'Patient Check-in',
    description: 'Check in waiting patients and issue queue tokens',
    enabled: true,
  },
  {
    id: 'perm-payment',
    name: 'Payment Recording',
    description: 'Record patient billing payments and issue settlement receipts',
    enabled: true,
  },
];

/**
 * Returns true if the user holds clinic administrative privileges.
 * MD is the original admin; any doctor promoted with Administrative Access is also an admin.
 */
export function isAdmin(
  user:
    | User
    | StaffAccessRecord
    | { role?: string; capabilities?: string[]; isOriginalAdmin?: boolean; permissions?: StaffPermission[] }
    | null
    | undefined
): boolean {
  if (!user) return false;
  if (user.role === 'md' || user.role === 'admin' || user.isOriginalAdmin) return true;
  if ('capabilities' in user && user.capabilities && user.capabilities.includes('administrativeAccess')) {
    return true;
  }
  if ('permissions' in user && user.permissions) {
    const adminPerm = user.permissions.find(
      (p) => p.id === 'perm-admin' || p.name === 'Administrative Access'
    );
    if (adminPerm && adminPerm.enabled) return true;
  }
  return false;
}

/**
 * Check if a user or staff member has a specific capability.
 */
export function hasCapability(
  user: User | StaffAccessRecord | null | undefined,
  capability: StandardCapability | string,
  staffRecords?: StaffAccessRecord[]
): boolean {
  if (!user) return false;

  // MD has all capabilities
  if (user.role === 'md') return true;

  // Admin capability check
  if (capability === 'administrativeAccess' || capability === 'perm-admin') {
    return isAdmin(user);
  }

  // Look up staff record if provided
  let record: StaffAccessRecord | undefined;
  if ('permissions' in user) {
    record = user as StaffAccessRecord;
  } else if (staffRecords) {
    record = staffRecords.find((s) => s.id === user.id || s.badgeNumber === user.badgeNumber);
  }

  if (record) {
    const perm = record.permissions.find(
      (p) => p.id === capability || p.name.toLowerCase() === capability.toLowerCase()
    );
    if (perm) return perm.enabled;
  }

  if ('capabilities' in user && user.capabilities) {
    return user.capabilities.includes(capability);
  }

  // Default role-based fallbacks
  if (user.role === 'doctor') {
    return (
      capability === 'consultationWorkstation' ||
      capability === 'perm-consult' ||
      capability === 'emrRecordsAccess' ||
      capability === 'perm-emr' ||
      capability === 'prescriptionAuthoring' ||
      capability === 'perm-presc' ||
      capability === 'consultingCalendar' ||
      capability === 'perm-schedule'
    );
  }

  if (user.role === 'receptionist') {
    return (
      capability === 'patientRegistration' ||
      capability === 'perm-register' ||
      capability === 'patientCheckIn' ||
      capability === 'perm-checkin' ||
      capability === 'paymentRecording' ||
      capability === 'perm-payment'
    );
  }

  return false;
}

/**
 * Get currently assigned doctor ID for a patient.
 * Returns null if patient has no active assignment.
 */
export function getAssignedDoctorId(
  patientId: string,
  assignments: PatientAssignment[]
): string | null {
  const current = assignments.find((a) => a.patientId === patientId && a.to === null);
  return current ? current.doctorId : null;
}

/**
 * Get all former doctors who had assigned care for this patient.
 */
export function getFormerDoctorIds(
  patientId: string,
  assignments: PatientAssignment[]
): string[] {
  const former = assignments
    .filter((a) => a.patientId === patientId && a.to !== null)
    .map((a) => a.doctorId);
  return Array.from(new Set(former));
}

/**
 * Determines if a user can view a patient's full clinical record.
 * - Admins (including MD): can view all patients.
 * - Staff Doctor: only if patient is currently assigned to them.
 * - Receptionist: can view demographics only (clinical fields must be stripped).
 * - Patient: can view only their own record.
 */
export function canViewPatient(
  user: User | null | undefined,
  patientId: string,
  assignments: PatientAssignment[]
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    const assignedDocId = getAssignedDoctorId(patientId, assignments);
    if (!assignedDocId) return false;
    // Match by doctor id (doc-1, doc-2) or user id (usr-doc-1, usr-doc-2)
    return (
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
      (assignedDocId === 'doc-3' && (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'))
    );
  }

  if (user.role === 'receptionist') {
    return true; // Receives stripped demographics via selector
  }

  if (user.role === 'patient') {
    return user.patientId === patientId || user.badgeNumber === patientId || user.id === `usr-${patientId}`;
  }

  return false;
}

/**
 * Determines if a user can view a specific consultation visit/appointment.
 * - Admins: can view all visits.
 * - Doctor: can view if patient currently assigned OR if this doctor authored/attended the visit.
 * - Receptionist: can view scheduling and status metadata only.
 * - Patient: can view only their own visits.
 */
export function canViewVisit(
  user: User | null | undefined,
  visit: Appointment,
  assignments: PatientAssignment[]
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    // Current doctor has full access
    const assignedDocId = getAssignedDoctorId(visit.patientId, assignments);
    const isCurrentDoctor =
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
      (assignedDocId === 'doc-3' && (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'));

    if (isCurrentDoctor) return true;

    // Authored-by rule for former doctors: read-only access to visits they personally conducted
    const isAuthor =
      visit.doctorId === user.id ||
      user.id === `usr-${visit.doctorId}` ||
      (visit.doctorId === 'doc-2' && (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
      (visit.doctorId === 'doc-3' && (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103')) ||
      visit.doctorName === user.name;

    return isAuthor;
  }

  if (user.role === 'receptionist') {
    return true;
  }

  if (user.role === 'patient') {
    return (
      visit.patientId === user.patientId ||
      visit.patientId === user.badgeNumber ||
      user.id === `usr-${visit.patientId}`
    );
  }

  return false;
}

/**
 * Determines if a user can view a specific prescription.
 * - Admins: can view all.
 * - Doctor: can view if patient currently assigned OR if this doctor authored the prescription.
 * - Receptionist: strictly false (never sees prescriptions).
 * - Patient: can view only their own prescriptions.
 */
export function canViewPrescription(
  user: User | null | undefined,
  rx: Prescription,
  assignments: PatientAssignment[]
): boolean {
  if (!user) return false;
  if (user.role === 'receptionist') return false; // Receptionists never see prescriptions
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    // Current doctor has full access
    const assignedDocId = getAssignedDoctorId(rx.patientId, assignments);
    const isCurrentDoctor =
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
      (assignedDocId === 'doc-3' && (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'));

    if (isCurrentDoctor) return true;

    // Authored-by rule for former doctors: read-only access to prescriptions they authored
    const isAuthor =
      rx.doctorId === user.id ||
      user.id === `usr-${rx.doctorId}` ||
      (rx.doctorId === 'doc-2' && (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
      (rx.doctorId === 'doc-3' && (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103')) ||
      rx.doctorName === user.name;

    return isAuthor;
  }

  if (user.role === 'patient') {
    return (
      rx.patientId === user.patientId ||
      rx.patientId === user.badgeNumber ||
      user.id === `usr-${rx.patientId}`
    );
  }

  return false;
}

/**
 * Determines if a user can transfer a patient to another physician.
 * - Admins: can transfer any patient.
 * - Doctor: can transfer only patients currently assigned to them.
 */
export function canTransferPatient(
  user: User | null | undefined,
  patientId: string,
  assignments: PatientAssignment[]
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    const assignedDocId = getAssignedDoctorId(patientId, assignments);
    if (!assignedDocId) return false;
    return (
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
      (assignedDocId === 'doc-3' && (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'))
    );
  }

  return false;
}

/**
 * Receptionist alone registers patients. Doctors and MD never register patients.
 */
export function canRegisterPatient(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'receptionist') {
    return hasCapability(user, 'patientRegistration');
  }
  return false;
}

/**
 * Receptionist alone checks in patients. Doctors and MD never check in patients.
 */
export function canCheckIn(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'receptionist') {
    return hasCapability(user, 'patientCheckIn');
  }
  return false;
}

/**
 * Receptionist alone records payments. Doctors and MD never record payments.
 */
export function canRecordPayment(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'receptionist') {
    return hasCapability(user, 'paymentRecording');
  }
  return false;
}

/**
 * Only clinic administrators can manage staff.
 */
export function canManageStaff(user: User | null | undefined): boolean {
  return isAdmin(user);
}

/**
 * Only admins can grant administrative access, and only to active doctors.
 */
export function canGrantAdmin(
  actingUser: User | null | undefined,
  target: StaffAccessRecord | null | undefined
): boolean {
  if (!isAdmin(actingUser) || !target) return false;
  if (target.role !== 'doctor') return false;
  if (target.status !== 'granted') return false;
  return true;
}

/**
 * Check if administrative access can be revoked from a staff member.
 * Original MD and the last remaining admin can never be revoked.
 */
export function canRevokeAdmin(
  actingUser: User | null | undefined,
  target: StaffAccessRecord | null | undefined,
  allStaff: StaffAccessRecord[]
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser) || !target) {
    return { allowed: false, reason: 'Only administrators can revoke access.' };
  }

  // Original MD protection
  if (
    target.isOriginalAdmin ||
    target.id === 'acc-doc-1' ||
    target.staffName === 'Dr. Marcus Vance' ||
    target.badgeNumber === 'MD-001'
  ) {
    return {
      allowed: false,
      reason: 'Original Managing Director administrative access cannot be revoked.',
    };
  }

  // Count active admins
  const activeAdmins = allStaff.filter(
    (s) => s.status === 'granted' && (s.role === 'md' || isAdmin(s))
  );

  if (activeAdmins.length <= 1) {
    return {
      allowed: false,
      reason: 'Cannot revoke the last remaining clinic administrator.',
    };
  }

  return { allowed: true };
}

/**
 * Check if a staff account can be permanently deleted.
 * Original MD and the last remaining admin can never be deleted.
 */
export function canDeleteStaff(
  actingUser: User | null | undefined,
  target: StaffAccessRecord | null | undefined,
  allStaff: StaffAccessRecord[]
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser) || !target) {
    return { allowed: false, reason: 'Only administrators can delete staff accounts.' };
  }

  // Original MD protection
  if (
    target.isOriginalAdmin ||
    target.id === 'acc-doc-1' ||
    target.staffName === 'Dr. Marcus Vance' ||
    target.badgeNumber === 'MD-001'
  ) {
    return {
      allowed: false,
      reason: 'Original Managing Director account cannot be deleted.',
    };
  }

  // Last remaining admin protection
  if (isAdmin(target)) {
    const activeAdmins = allStaff.filter(
      (s) => s.status === 'granted' && (s.role === 'md' || isAdmin(s))
    );
    if (activeAdmins.length <= 1) {
      return {
        allowed: false,
        reason: 'Cannot delete the last remaining clinic administrator.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Strips clinical fields from a patient record for receptionist views.
 * Receptionist sees demographics and registration only, never vitals, diagnoses, notes, or prescriptions.
 */
export function scopePatientForReceptionist(patient: Patient): Patient {
  return {
    ...patient,
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    previousVitals: undefined,
  };
}

/**
 * Strips clinical notes from an appointment record for receptionist views.
 */
export function scopeAppointmentForReceptionist(appointment: Appointment): Appointment {
  return {
    ...appointment,
    notes: undefined,
  };
}

