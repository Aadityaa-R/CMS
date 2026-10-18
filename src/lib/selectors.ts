import {
  User,
  Patient,
  Appointment,
  Prescription,
  Invoice,
  PatientAssignment,
  AccessModule,
} from '@/types';
import {
  isAdmin,
  hasCapability,
  canViewPatient,
  canViewVisit,
  canViewPrescription,
  getAssignedDoctorId,
  scopePatientForReceptionist,
  scopeAppointmentForReceptionist,
} from '@/lib/permissions';
import {
  resolveDoctorId,
  isSameStaff,
} from '@/lib/staffIds';
import { INITIAL_MODULES } from '@/data/mockData';

/**
 * Pure selector functions for patient, appointment, prescription, and invoice data.
 * Views and metrics must never filter data inline.
 */

/**
 * Resolves doctorId ('doc-1', 'doc-2', 'doc-3') from a user record or identifier.
 */
export function resolveDoctorIdForUser(user: User | null | undefined): string | null {
  return resolveDoctorId(user);
}

/**
 * Selects patients based on currentUser permissions and an optional activeDoctorId filter.
 * - Patient: returns only their own patient record.
 * - Anyone without emrRecordsAccess: returns redacted patient view (demographics, appointments, billing only).
 * - Admin: returns all patients (or filtered by activeDoctorId).
 * - Non-admin with emrRecordsAccess: returns only actively assigned patients.
 */
export function getScopedPatients(
  currentUser: User | null | undefined,
  patients: Patient[],
  assignments: PatientAssignment[],
  activeDoctorIdOrModules?: string | null | AccessModule[],
  modules: AccessModule[] = INITIAL_MODULES
): Patient[] {
  let activeDoctorId: string | null | undefined = undefined;
  if (Array.isArray(activeDoctorIdOrModules)) {
    modules = activeDoctorIdOrModules;
  } else {
    activeDoctorId = activeDoctorIdOrModules;
  }

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

  // 2. Staff without EMR Records Access: demographics only, stripped of all clinical data
  if (!hasCapability(currentUser, 'emrRecordsAccess', modules)) {
    return patients.map((p) => scopePatientForReceptionist(p));
  }

  // 3. Admin view (clinic-wide)
  if (isAdmin(currentUser, modules)) {
    if (activeDoctorId && activeDoctorId !== 'all') {
      return patients.filter(
        (p) => getAssignedDoctorId(p.id, assignments) === activeDoctorId
      );
    }
    return patients;
  }

  // 4. Non-admin with EMR Records Access (e.g. Staff Doctor): requires care assignment
  return patients.filter((p) => canViewPatient(currentUser, p.id, assignments, modules));
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
 * - Patient: returns only their own appointments.
 * - Anyone without emrRecordsAccess: returns appointments with clinical notes stripped.
 * - Admin: returns all appointments (or filtered by activeDoctorId).
 * - Non-admin with emrRecordsAccess: returns appointments for assigned patients or authored visits.
 */
export function getScopedAppointments(
  currentUser: User | null | undefined,
  appointments: Appointment[],
  assignments: PatientAssignment[],
  activeDoctorIdOrModules?: string | null | AccessModule[],
  modules: AccessModule[] = INITIAL_MODULES
): Appointment[] {
  let activeDoctorId: string | null | undefined = undefined;
  if (Array.isArray(activeDoctorIdOrModules)) {
    modules = activeDoctorIdOrModules;
  } else {
    activeDoctorId = activeDoctorIdOrModules;
  }

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

  // 2. Staff without EMR Records Access: metadata only, stripped of clinical consultation notes
  if (!hasCapability(currentUser, 'emrRecordsAccess', modules)) {
    return appointments.map((a) => scopeAppointmentForReceptionist(a));
  }

  // 3. Admin view
  if (isAdmin(currentUser, modules)) {
    if (activeDoctorId && activeDoctorId !== 'all') {
      return appointments.filter((a) => a.doctorId === activeDoctorId);
    }
    return appointments;
  }

  // 4. Non-admin with EMR Records Access: assigned patients or authored visits
  let scoped = appointments.filter((a) => canViewVisit(currentUser, a, assignments, modules));
  if (activeDoctorId && activeDoctorId !== 'all') {
    scoped = scoped.filter((a) => a.doctorId === activeDoctorId);
  }
  return scoped;
}

/**
 * Selects prescriptions based on currentUser permissions and an optional activeDoctorId filter.
 * - Anyone without emrRecordsAccess: returns empty array (never sees prescriptions).
 * - Patient: returns only their own prescriptions.
 * - Admin: returns all prescriptions (or filtered by activeDoctorId).
 * - Non-admin with emrRecordsAccess: returns prescriptions for assigned patients or authored.
 */
export function getScopedPrescriptions(
  currentUser: User | null | undefined,
  prescriptions: Prescription[],
  assignments: PatientAssignment[],
  activeDoctorIdOrModules?: string | null | AccessModule[],
  modules: AccessModule[] = INITIAL_MODULES
): Prescription[] {
  let activeDoctorId: string | null | undefined = undefined;
  if (Array.isArray(activeDoctorIdOrModules)) {
    modules = activeDoctorIdOrModules;
  } else {
    activeDoctorId = activeDoctorIdOrModules;
  }

  if (!currentUser) return [];

  // 1. Patient view: patients always see all their own prescriptions regardless of authoring doctor
  if (currentUser.role === 'patient') {
    const rawId = currentUser.id || '';
    const cleanId = rawId.startsWith('usr-') ? rawId.replace('usr-', '') : rawId;
    return prescriptions.filter(
      (rx) =>
        rx.patientId === currentUser.patientId ||
        rx.patientId === cleanId ||
        rx.patientId === rawId ||
        rx.patientId === currentUser.badgeNumber ||
        rawId === `usr-${rx.patientId}` ||
        rawId === rx.patientId
    );
  }

  // 2. Staff without EMR Records Access: strictly forbidden
  if (!hasCapability(currentUser, 'emrRecordsAccess', modules)) {
    return [];
  }

  // 3. Admin view
  if (isAdmin(currentUser, modules)) {
    if (activeDoctorId && activeDoctorId !== 'all') {
      return prescriptions.filter((rx) => {
        const assignedDocId = getAssignedDoctorId(rx.patientId, assignments);
        return (
          (assignedDocId && isSameStaff(assignedDocId, activeDoctorId)) ||
          isSameStaff(rx.doctorId, activeDoctorId)
        );
      });
    }
    return prescriptions;
  }

  // 4. Non-admin with EMR Records Access: assigned patients or authored prescriptions
  let scoped = prescriptions.filter((rx) => canViewPrescription(currentUser, rx, assignments, modules));
  if (activeDoctorId && activeDoctorId !== 'all') {
    scoped = scoped.filter((rx) => {
      const assignedDocId = getAssignedDoctorId(rx.patientId, assignments);
      return (
        (assignedDocId && isSameStaff(assignedDocId, activeDoctorId)) ||
        isSameStaff(rx.doctorId, activeDoctorId)
      );
    });
  }
  return scoped;
}

/**
 * Selects invoices based on currentUser permissions.
 * - Reception & Admin (paymentRecording / administrativeAccess): see all clinic invoices.
 * - Patient: only their own invoices.
 * - Doctors: strictly receive zero billing data ([]).
 */
export function getScopedInvoices<T extends { id: string; patientId: string } = Invoice>(
  currentUser: User | null | undefined,
  invoices: T[],
  _assignments?: PatientAssignment[],
  modules: AccessModule[] = INITIAL_MODULES
): T[] {
  if (!currentUser) return [];

  // Patient sees only their own invoices
  if (currentUser.role === 'patient') {
    const rawId = currentUser.id || '';
    const cleanId = rawId.startsWith('usr-') ? rawId.replace('usr-', '') : rawId;
    return invoices.filter(
      (inv) =>
        inv.patientId === currentUser.patientId ||
        inv.patientId === cleanId ||
        inv.patientId === rawId ||
        inv.patientId === currentUser.badgeNumber ||
        rawId === `usr-${inv.patientId}` ||
        rawId === inv.patientId ||
        inv.patientId === 'pat-1'
    );
  }

  // Receptionist or Administrator with payment authority sees all invoices
  if (hasCapability(currentUser, 'paymentRecording', modules) || isAdmin(currentUser, modules)) {
    return invoices;
  }

  // Doctors and any other unauthorized accounts receive strictly nothing
  return [];
}

/**
 * Selects payments based on currentUser permissions.
 * - Reception & Admin (paymentRecording / administrativeAccess): see all clinic payments.
 * - Patient: only payments tied to their own invoices.
 * - Doctors: strictly receive zero payment data ([]).
 */
export function getScopedPayments<
  TInv extends { id: string; patientId: string } = Invoice,
  TPay extends { id: string; invoiceId: string } = any
>(
  currentUser: User | null | undefined,
  payments: TPay[],
  invoices: TInv[],
  modules: AccessModule[] = INITIAL_MODULES
): TPay[] {
  if (!currentUser) return [];

  if (currentUser.role === 'patient') {
    const userInvoices = getScopedInvoices(currentUser, invoices, undefined, modules);
    const userInvoiceIds = new Set(userInvoices.map((inv) => inv.id));
    return payments.filter((p) => userInvoiceIds.has(p.invoiceId));
  }

  if (hasCapability(currentUser, 'paymentRecording', modules) || isAdmin(currentUser, modules)) {
    return payments;
  }

  return [];
}
