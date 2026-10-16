import {
  User,
  Patient,
  Appointment,
  Prescription,
  Invoice,
  PatientAssignment,
} from '@/types';
import {
  isAdmin,
  canViewPatient,
  canViewVisit,
  canViewPrescription,
  getAssignedDoctorId,
  scopePatientForReceptionist,
  scopeAppointmentForReceptionist,
} from '@/lib/permissions';

/**
 * Pure selector functions for patient, appointment, prescription, and invoice data.
 * Views and metrics must never filter data inline.
 */

/**
 * Resolves doctorId ('doc-1', 'doc-2', 'doc-3') from a user record or identifier.
 */
export function resolveDoctorIdForUser(user: User | null | undefined): string | null {
  if (!user) return null;
  if (user.id === 'usr-1' || user.id === 'usr-doc-1' || user.id === 'doc-1' || user.badgeNumber === 'MD-001') {
    return 'doc-1';
  }
  if (user.id === 'usr-doc-2' || user.id === 'doc-2' || user.badgeNumber === 'DOC-102') {
    return 'doc-2';
  }
  if (user.id === 'usr-doc-3' || user.id === 'doc-3' || user.badgeNumber === 'DOC-103') {
    return 'doc-3';
  }
  if (user.id.startsWith('doc-')) return user.id;
  if (user.id.startsWith('usr-doc-')) return user.id.replace('usr-', '');
  return null;
}

/**
 * Selects patients based on currentUser permissions and an optional activeDoctorId filter.
 * - Admin:
 *     If activeDoctorId is provided and !== 'all', returns patients assigned to that doctor.
 *     If activeDoctorId is omitted or === 'all', returns all patients (including unassigned pat-16).
 * - Staff Doctor:
 *     Returns ONLY currently assigned patients for this doctor.
 * - Receptionist:
 *     Returns all patients passed through scopePatientForReceptionist (demographics only, clinical fields stripped).
 * - Patient:
 *     Returns only their own patient record.
 */
export function getScopedPatients(
  currentUser: User | null | undefined,
  patients: Patient[],
  assignments: PatientAssignment[],
  activeDoctorId?: string | null
): Patient[] {
  if (!currentUser) return [];

  // 1. Patient view
  if (currentUser.role === 'patient') {
    return patients.filter(
      (p) =>
        p.id === currentUser.patientId ||
        p.mrn === currentUser.badgeNumber ||
        currentUser.id === `usr-${p.id}` ||
        currentUser.id === p.id
    );
  }

  // 2. Receptionist view: demographics only, stripped of all clinical data
  if (currentUser.role === 'receptionist') {
    return patients.map((p) => scopePatientForReceptionist(p));
  }

  // 3. Admin view (original MD or promoted doctor-admin)
  if (isAdmin(currentUser)) {
    if (activeDoctorId && activeDoctorId !== 'all') {
      return patients.filter(
        (p) => getAssignedDoctorId(p.id, assignments) === activeDoctorId
      );
    }
    return patients;
  }

  // 4. Staff Doctor view: assigned patients only
  if (currentUser.role === 'doctor' || currentUser.role === 'md') {
    return patients.filter((p) => canViewPatient(currentUser, p.id, assignments));
  }

  return [];
}

/**
 * Returns patients assigned to a specific doctor.
 */
export function getDoctorPatients(
  doctorId: string,
  patients: Patient[],
  assignments: PatientAssignment[]
): Patient[] {
  return patients.filter((p) => getAssignedDoctorId(p.id, assignments) === doctorId);
}

/**
 * Selects appointments based on currentUser permissions and an optional activeDoctorId filter.
 * - Admin:
 *     If activeDoctorId is provided and !== 'all', returns appointments for that doctor.
 *     If activeDoctorId is omitted or === 'all', returns all clinic appointments.
 * - Staff Doctor:
 *     Returns appointments where patient is currently assigned OR doctor authored/attended.
 *     If activeDoctorId is provided, filters to that doctor's desk.
 * - Receptionist:
 *     Returns all appointments passed through scopeAppointmentForReceptionist (clinical notes stripped).
 * - Patient:
 *     Returns only their own appointments.
 */
export function getScopedAppointments(
  currentUser: User | null | undefined,
  appointments: Appointment[],
  assignments: PatientAssignment[],
  activeDoctorId?: string | null
): Appointment[] {
  if (!currentUser) return [];

  // 1. Patient view
  if (currentUser.role === 'patient') {
    return appointments.filter(
      (a) =>
        a.patientId === currentUser.patientId ||
        a.patientId === currentUser.badgeNumber ||
        currentUser.id === `usr-${a.patientId}` ||
        currentUser.id === a.patientId
    );
  }

  // 2. Receptionist view: metadata only, stripped of clinical consultation notes
  if (currentUser.role === 'receptionist') {
    return appointments.map((a) => scopeAppointmentForReceptionist(a));
  }

  // 3. Admin view
  if (isAdmin(currentUser)) {
    if (activeDoctorId && activeDoctorId !== 'all') {
      return appointments.filter((a) => a.doctorId === activeDoctorId);
    }
    return appointments;
  }

  // 4. Staff Doctor view: assigned patients or authored visits
  if (currentUser.role === 'doctor' || currentUser.role === 'md') {
    let scoped = appointments.filter((a) => canViewVisit(currentUser, a, assignments));
    if (activeDoctorId && activeDoctorId !== 'all') {
      scoped = scoped.filter((a) => a.doctorId === activeDoctorId);
    }
    return scoped;
  }

  return [];
}

/**
 * Selects prescriptions based on currentUser permissions and an optional activeDoctorId filter.
 * - Admin:
 *     If activeDoctorId is provided and !== 'all', returns prescriptions for patients assigned to or authored by that doctor.
 *     If activeDoctorId is omitted or === 'all', returns all prescriptions.
 * - Staff Doctor:
 *     Returns prescriptions where patient is currently assigned OR doctor authored prescription.
 * - Receptionist:
 *     Returns empty list (receptionist never sees prescriptions).
 * - Patient:
 *     Returns only their own prescriptions.
 */
export function getScopedPrescriptions(
  currentUser: User | null | undefined,
  prescriptions: Prescription[],
  assignments: PatientAssignment[],
  activeDoctorId?: string | null
): Prescription[] {
  if (!currentUser) return [];

  // 1. Receptionist view: strictly forbidden
  if (currentUser.role === 'receptionist') {
    return [];
  }

  // 2. Patient view
  if (currentUser.role === 'patient') {
    return prescriptions.filter(
      (rx) =>
        rx.patientId === currentUser.patientId ||
        rx.patientId === currentUser.badgeNumber ||
        currentUser.id === `usr-${rx.patientId}` ||
        currentUser.id === rx.patientId
    );
  }

  // 3. Admin view
  if (isAdmin(currentUser)) {
    if (activeDoctorId && activeDoctorId !== 'all') {
      return prescriptions.filter((rx) => {
        const assignedDocId = getAssignedDoctorId(rx.patientId, assignments);
        return assignedDocId === activeDoctorId || rx.doctorId === activeDoctorId;
      });
    }
    return prescriptions;
  }

  // 4. Staff Doctor view: assigned patients or authored prescriptions
  if (currentUser.role === 'doctor' || currentUser.role === 'md') {
    return prescriptions.filter((rx) => canViewPrescription(currentUser, rx, assignments));
  }

  return [];
}

/**
 * Selects invoices based on currentUser permissions.
 * - Admin & Receptionist: full clinic invoices.
 * - Patient: only their own invoices.
 * - Staff Doctor: invoices for their currently assigned patients.
 */
export function getScopedInvoices(
  currentUser: User | null | undefined,
  invoices: Invoice[],
  assignments?: PatientAssignment[]
): Invoice[] {
  if (!currentUser) return [];

  if (currentUser.role === 'patient') {
    return invoices.filter(
      (inv) =>
        inv.patientId === currentUser.patientId ||
        inv.patientId === currentUser.badgeNumber ||
        currentUser.id === `usr-${inv.patientId}` ||
        currentUser.id === inv.patientId
    );
  }

  if (currentUser.role === 'receptionist' || isAdmin(currentUser)) {
    return invoices;
  }

  if ((currentUser.role === 'doctor' || currentUser.role === 'md') && assignments) {
    return invoices.filter((inv) => canViewPatient(currentUser, inv.patientId, assignments));
  }

  return invoices;
}
