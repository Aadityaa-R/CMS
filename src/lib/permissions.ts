import {
  User,
  Doctor,
  Patient,
  Appointment,
  Prescription,
  StaffAccessRecord,
  PatientAssignment,
  type StandardCapability,
  AccessModule,
} from '@/types';
import { INITIAL_MODULES, INITIAL_STAFF_ACCESS } from '@/data/mockData';
import { isValidAccessId } from '@/data/accessCatalog';

export type { StandardCapability };

export const CAPABILITY_ALIAS_MAP: Record<string, StandardCapability> = {
  'perm-admin': 'administrativeAccess',
  'administrativeAccess': 'administrativeAccess',
  'perm-consult': 'consultationWorkstation',
  'consultationWorkstation': 'consultationWorkstation',
  'perm-emr': 'emrRecordsAccess',
  'emrRecordsAccess': 'emrRecordsAccess',
  'perm-presc': 'prescriptionAuthoring',
  'prescriptionAuthoring': 'prescriptionAuthoring',
  'perm-schedule': 'consultingCalendar',
  'consultingCalendar': 'consultingCalendar',
  'perm-register': 'patientRegistration',
  'patientRegistration': 'patientRegistration',
  'perm-checkin': 'patientCheckIn',
  'patientCheckIn': 'patientCheckIn',
  'perm-payment': 'paymentRecording',
  'paymentRecording': 'paymentRecording',
  'perm-attendance': 'attendanceManagement',
  'attendanceManagement': 'attendanceManagement',
  'booking': 'patientCheckIn',
  'perm-pat-booking': 'patientCheckIn',
  'patientBooking': 'patientCheckIn',
};

/**
 * Returns true if the person is a doctor (physician staff type).
 * Prescription Authoring takes effect strictly for doctors.
 */
export function isDoctorStaff(
  user:
    | User
    | StaffAccessRecord
    | Doctor
    | {
        role?: string;
        badgeNumber?: string;
        specialization?: string;
        id?: string;
      }
    | null
    | undefined
): boolean {
  if (!user) return false;
  if ('specialization' in user && Boolean(user.specialization)) return true;
  const role = 'role' in user ? user.role : undefined;
  if (role === 'doctor' || role === 'md') return true;
  const badge = 'badgeNumber' in user ? user.badgeNumber : undefined;
  if (badge && (badge.startsWith('DOC-') || badge.startsWith('MD-'))) return true;
  if (
    user.id &&
    (user.id.startsWith('doc-') ||
      user.id.startsWith('acc-doc-') ||
      user.id.startsWith('usr-doc-'))
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves all identifiers associated with a staff member to locate module memberships.
 */
export function resolveStaffIds(
  user:
    | User
    | StaffAccessRecord
    | Doctor
    | { id?: string; badgeNumber?: string; email?: string; staffName?: string }
    | null
    | undefined
): string[] {
  if (!user) return [];
  const ids = new Set<string>();
  if (user.id) ids.add(user.id);
  if ('badgeNumber' in user && user.badgeNumber) ids.add(user.badgeNumber);

  // Link known demo ID cross-references
  if (
    user.id === 'usr-doc-1' ||
    user.id === 'doc-1' ||
    ('badgeNumber' in user && user.badgeNumber === 'MD-001')
  ) {
    ids.add('acc-doc-1');
    ids.add('usr-doc-1');
    ids.add('doc-1');
  }
  if (
    user.id === 'usr-doc-2' ||
    user.id === 'doc-2' ||
    ('badgeNumber' in user && user.badgeNumber === 'DOC-102')
  ) {
    ids.add('acc-doc-2');
    ids.add('usr-doc-2');
    ids.add('doc-2');
  }
  if (
    user.id === 'usr-doc-3' ||
    user.id === 'doc-3' ||
    ('badgeNumber' in user && user.badgeNumber === 'DOC-103')
  ) {
    ids.add('acc-doc-3');
    ids.add('usr-doc-3');
    ids.add('doc-3');
  }
  if (user.id === 'usr-rec-1' || ('badgeNumber' in user && user.badgeNumber === 'REC-301')) {
    ids.add('acc-rec-1');
    ids.add('usr-rec-1');
  }
  if (user.id === 'usr-rec-2' || ('badgeNumber' in user && user.badgeNumber === 'REC-302')) {
    ids.add('acc-rec-2');
    ids.add('usr-rec-2');
  }

  return Array.from(ids);
}

/**
 * Returns the effective accesses of a person computed as the union across all modules
 * they belong to. Suspended or revoked accounts return an empty array (no access).
 * Prescription Authoring is omitted for non-doctor staff types.
 */
export function getEffectiveAccesses(
  user:
    | User
    | StaffAccessRecord
    | Doctor
    | {
        role?: string;
        capabilities?: string[];
        moduleIds?: string[];
        status?: string;
        badgeNumber?: string;
        id?: string;
      }
    | null
    | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): StandardCapability[] {
  if (!user) return [];

  // Suspended or revoked accounts have zero effective access
  if (
    'status' in user &&
    (user.status === 'revoked' || user.status === 'suspended' || user.status === 'inactive')
  ) {
    return [];
  }

  const staffIds = resolveStaffIds(user);
  const userModules = modules.filter(
    (m) =>
      m.memberIds.some((mid) => staffIds.includes(mid)) ||
      ('moduleIds' in user && Array.isArray(user.moduleIds) && user.moduleIds.includes(m.id))
  );

  const accessSet = new Set<StandardCapability>();

  for (const mod of userModules) {
    for (const acc of mod.accessIds) {
      if (isValidAccessId(acc)) {
        accessSet.add(acc);
      }
    }
  }

  // Also include direct capabilities if explicitly provided (e.g., test mocks)
  if ('capabilities' in user && Array.isArray(user.capabilities)) {
    for (const cap of user.capabilities) {
      const canonical = CAPABILITY_ALIAS_MAP[cap] || (cap as StandardCapability);
      if (isValidAccessId(canonical)) {
        accessSet.add(canonical);
      }
    }
  }

  // Prescription Authoring takes effect strictly for staff whose staff type is Doctor
  if (!isDoctorStaff(user)) {
    accessSet.delete('prescriptionAuthoring');
  }

  return Array.from(accessSet);
}

/**
 * Check if a user or staff member has a specific capability.
 * Derived dynamically from their module memberships.
 */
export function hasCapability(
  user:
    | User
    | StaffAccessRecord
    | Doctor
    | {
        role?: string;
        capabilities?: string[];
        moduleIds?: string[];
        status?: string;
        badgeNumber?: string;
        id?: string;
      }
    | null
    | undefined,
  capability: StandardCapability | string,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!user) return false;

  // Revoked or suspended accounts have zero effective capability
  if (
    'status' in user &&
    (user.status === 'revoked' || user.status === 'suspended' || user.status === 'inactive')
  ) {
    return false;
  }

  const canonical = CAPABILITY_ALIAS_MAP[capability] || (capability as StandardCapability);
  const effective = getEffectiveAccesses(user, modules);
  return effective.includes(canonical);
}

/**
 * Single source of truth for administrative access:
 * isAdmin = hasCapability(user, 'administrativeAccess')
 */
export function isAdmin(
  user:
    | User
    | StaffAccessRecord
    | Doctor
    | {
        role?: string;
        capabilities?: string[];
        moduleIds?: string[];
        status?: string;
        badgeNumber?: string;
        id?: string;
      }
    | null
    | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  return hasCapability(user, 'administrativeAccess', modules);
}

/**
 * Determines whether a user has authority to register new patients.
 * Depends on module access ('patientRegistration').
 */
export function canRegisterPatient(
  user: User | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  return hasCapability(user, 'patientRegistration', modules);
}

/**
 * Determines whether a user has authority to check in arriving patients.
 * Depends on module access ('patientCheckIn').
 */
export function canCheckIn(
  user: User | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  return hasCapability(user, 'patientCheckIn', modules);
}

/**
 * Determines whether a user has authority to book appointments.
 * Receptionists, physicians, clinic administrators, and patients themselves can book.
 */
export function canBookAppointment(
  user: User | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!user) return false;
  if (user.role === 'patient') return true;
  return (
    hasCapability(user, 'patientCheckIn', modules) ||
    hasCapability(user, 'patientRegistration', modules) ||
    hasCapability(user, 'consultingCalendar', modules) ||
    isAdmin(user, modules)
  );
}

/**
 * Determines whether a user has authority to record billing payments.
 * Depends on module access ('paymentRecording').
 */
export function canRecordPayment(
  user: User | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  return hasCapability(user, 'paymentRecording', modules);
}

/**
 * Only clinic administrators can manage staff.
 */
export function canManageStaff(
  user: User | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  return isAdmin(user, modules);
}

/**
 * Get currently assigned doctor ID for a patient.
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
 * Determines if a user can view a patient's record.
 * - Patients see only their own record.
 * - Users without emrRecordsAccess receive the redacted view (demographics only).
 * - Users with emrRecordsAccess who are not admin require an active care assignment or authorship.
 * - Admins see all.
 */
export function canViewPatient(
  user: User | null | undefined,
  patientId: string,
  assignments: PatientAssignment[],
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!user) return false;

  if (user.role === 'patient') {
    return (
      user.patientId === patientId ||
      user.badgeNumber === patientId ||
      user.id === `usr-${patientId}`
    );
  }

  // Users without EMR Records Access view demographics only (redacted at selector)
  if (!hasCapability(user, 'emrRecordsAccess', modules)) {
    return true;
  }

  // Admins see all patients clinic-wide
  if (isAdmin(user, modules)) {
    return true;
  }

  // Non-admins with EMR Records Access require active assignment to this patient
  const assignedDocId = getAssignedDoctorId(patientId, assignments);
  if (!assignedDocId) return false;

  return (
    assignedDocId === user.id ||
    user.id === `usr-${assignedDocId}` ||
    (assignedDocId === 'doc-2' &&
      (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
    (assignedDocId === 'doc-3' &&
      (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'))
  );
}

/**
 * Determines if a user can view a specific consultation visit/appointment.
 */
export function canViewVisit(
  user: User | null | undefined,
  visit: Appointment,
  assignments: PatientAssignment[],
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!user) return false;

  if (user.role === 'patient') {
    return (
      visit.patientId === user.patientId ||
      visit.patientId === user.badgeNumber ||
      user.id === `usr-${visit.patientId}`
    );
  }

  if (isAdmin(user, modules)) return true;

  // Front desk staff without EMR Records Access view appointment scheduling metadata
  if (!hasCapability(user, 'emrRecordsAccess', modules)) {
    return true;
  }

  // Doctor with EMR Records Access: current doctor or author of the visit
  const assignedDocId = getAssignedDoctorId(visit.patientId, assignments);
  const isCurrentDoctor =
    assignedDocId === user.id ||
    user.id === `usr-${assignedDocId}` ||
    (assignedDocId === 'doc-2' &&
      (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
    (assignedDocId === 'doc-3' &&
      (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'));

  if (isCurrentDoctor) return true;

  const isAuthor =
    visit.doctorId === user.id ||
    user.id === `usr-${visit.doctorId}` ||
    (visit.doctorId === 'doc-2' &&
      (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
    (visit.doctorId === 'doc-3' &&
      (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103')) ||
    visit.doctorName === user.name;

  return isAuthor;
}

/**
 * Determines if a user can view a specific prescription.
 * - Receptionists and staff without EMR Records Access never see prescriptions.
 * - Admins see all prescriptions.
 * - Doctors see prescriptions for assigned patients or authored prescriptions.
 * - Patients see only their own prescriptions.
 */
export function canViewPrescription(
  user: User | null | undefined,
  rx: Prescription,
  assignments: PatientAssignment[],
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!user) return false;

  if (user.role === 'patient') {
    return (
      rx.patientId === user.patientId ||
      rx.patientId === user.badgeNumber ||
      user.id === `usr-${rx.patientId}`
    );
  }

  // Staff without EMR access never view prescriptions
  if (!hasCapability(user, 'emrRecordsAccess', modules)) {
    return false;
  }

  if (isAdmin(user, modules)) return true;

  // Non-admin with EMR: current doctor or author
  const assignedDocId = getAssignedDoctorId(rx.patientId, assignments);
  const isCurrentDoctor =
    assignedDocId === user.id ||
    user.id === `usr-${assignedDocId}` ||
    (assignedDocId === 'doc-2' &&
      (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
    (assignedDocId === 'doc-3' &&
      (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'));

  if (isCurrentDoctor) return true;

  const isAuthor =
    rx.doctorId === user.id ||
    user.id === `usr-${rx.doctorId}` ||
    (rx.doctorId === 'doc-2' &&
      (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
    (rx.doctorId === 'doc-3' &&
      (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103')) ||
    rx.doctorName === user.name;

  return isAuthor;
}

/**
 * Determines if a user can transfer a patient to another physician.
 * - Admins can transfer any patient.
 * - Doctor can transfer only patients currently assigned to them.
 */
export function canTransferPatient(
  user: User | null | undefined,
  patientId: string,
  assignments: PatientAssignment[],
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!user) return false;
  if (isAdmin(user, modules)) return true;

  const assignedDocId = getAssignedDoctorId(patientId, assignments);
  if (!assignedDocId) return false;

  const isAssigned =
    assignedDocId === user.id ||
    user.id === `usr-${assignedDocId}` ||
    (assignedDocId === 'doc-2' &&
      (user.email === 'n.hayes@beaconclinic.com' || user.badgeNumber === 'DOC-102')) ||
    (assignedDocId === 'doc-3' &&
      (user.email === 's.reed@beaconclinic.com' || user.badgeNumber === 'DOC-103'));

  return isAssigned && hasCapability(user, 'consultationWorkstation', modules);
}

/**
 * Strips clinical fields from a patient record for non-EMR views.
 */
export function scopePatientForReceptionist(patient: Patient): Patient {
  return {
    ...patient,
    bloodGroup: undefined,
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    previousVitals: undefined,
  };
}

/**
 * Strips clinical notes from an appointment record for non-EMR views.
 */
export function scopeAppointmentForReceptionist(appointment: Appointment): Appointment {
  return {
    ...appointment,
    notes: undefined,
  };
}

// -------------------------------------------------------------
// MODULE GUARDS & ADMINISTRATIVE INTEGRITY
// -------------------------------------------------------------

/**
 * Checks if a module can be deleted.
 * - System modules cannot be deleted.
 * - A custom module can be deleted only when it has no members.
 */
export function canDeleteModule(
  actingUser: User | null | undefined,
  module: AccessModule | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, modules)) {
    return { allowed: false, reason: 'Only clinic administrators can delete modules.' };
  }
  if (!module) {
    return { allowed: false, reason: 'Module not found.' };
  }
  if (module.isSystem) {
    return { allowed: false, reason: 'System modules cannot be deleted.' };
  }
  if (module.memberIds && module.memberIds.length > 0) {
    return {
      allowed: false,
      reason: 'Remove all members before deleting this module.',
    };
  }
  return { allowed: true };
}

/**
 * Checks if an access can be included in a module.
 * - Prescription Authoring cannot be included in a module that lacks EMR Records Access.
 */
export function canIncludeAccess(
  actingUser: User | null | undefined,
  module: AccessModule | null | undefined,
  accessId: StandardCapability,
  modules: AccessModule[] = INITIAL_MODULES
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, modules)) {
    return { allowed: false, reason: 'Only clinic administrators can modify module accesses.' };
  }
  if (!module) {
    return { allowed: false, reason: 'Module not found.' };
  }
  if (module.accessIds.includes(accessId)) {
    return { allowed: false, reason: 'Access is already included in this module.' };
  }
  if (accessId === 'prescriptionAuthoring' && !module.accessIds.includes('emrRecordsAccess')) {
    return {
      allowed: false,
      reason: 'Prescription Authoring requires EMR Records Access to be included in the module first.',
    };
  }
  return { allowed: true };
}

/**
 * Checks if an access can be removed from a module.
 * - Administration cannot have administrativeAccess removed.
 * - Cannot remove EMR Records Access if Prescription Authoring is present in the module.
 */
export function canRemoveAccess(
  actingUser: User | null | undefined,
  module: AccessModule | null | undefined,
  accessId: StandardCapability,
  modules: AccessModule[] = INITIAL_MODULES
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, modules)) {
    return { allowed: false, reason: 'Only clinic administrators can modify module accesses.' };
  }
  if (!module) {
    return { allowed: false, reason: 'Module not found.' };
  }
  if (!module.accessIds.includes(accessId)) {
    return { allowed: false, reason: 'Access is not included in this module.' };
  }
  if (module.id === 'mod-admin' && accessId === 'administrativeAccess') {
    return {
      allowed: false,
      reason: 'Administration module must retain Administrative Access.',
    };
  }
  if (accessId === 'emrRecordsAccess' && module.accessIds.includes('prescriptionAuthoring')) {
    return {
      allowed: false,
      reason: 'Must remove Prescription Authoring before removing EMR Records Access.',
    };
  }
  return { allowed: true };
}

/**
 * Checks if a staff member can be added to a module.
 * Adding to Administration requires a non-empty reason.
 */
export function canAddMember(
  actingUser: User | null | undefined,
  module: AccessModule | null | undefined,
  staffMember: StaffAccessRecord | User | null | undefined,
  reason?: string,
  modules: AccessModule[] = INITIAL_MODULES
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, modules)) {
    return { allowed: false, reason: 'Only clinic administrators can add members to modules.' };
  }
  if (!module || !staffMember) {
    return { allowed: false, reason: 'Invalid module or staff member.' };
  }
  const staffIds = resolveStaffIds(staffMember);
  if (module.memberIds.some((mid) => staffIds.includes(mid))) {
    return { allowed: false, reason: 'Staff member is already a member of this module.' };
  }
  const isAdministration =
    module.id === 'mod-admin' || module.accessIds.includes('administrativeAccess');
  if (isAdministration) {
    if (!reason || !reason.trim()) {
      return {
        allowed: false,
        reason: 'A specific operational justification is required when adding a member to Administration.',
      };
    }
  }
  return { allowed: true };
}

/**
 * Checks if a staff member can be removed from a module.
 * - Original MD cannot be removed from Administration.
 * - Last remaining active admin cannot be removed from Administration.
 */
export function canRemoveMember(
  actingUser: User | null | undefined,
  module: AccessModule | null | undefined,
  staffMember: StaffAccessRecord | User | null | undefined,
  allModules: AccessModule[] = INITIAL_MODULES,
  allStaff: StaffAccessRecord[] = INITIAL_STAFF_ACCESS
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, allModules)) {
    return { allowed: false, reason: 'Only clinic administrators can remove members from modules.' };
  }
  if (!module || !staffMember) {
    return { allowed: false, reason: 'Invalid module or staff member.' };
  }
  const staffIds = resolveStaffIds(staffMember);
  const isAdministration =
    module.id === 'mod-admin' || module.accessIds.includes('administrativeAccess');

  const isMember =
    module.memberIds.some((mid) => staffIds.includes(mid)) ||
    (isAdministration && (
      ('moduleIds' in staffMember && (staffMember as any).moduleIds?.includes(module.id)) ||
      ('capabilities' in staffMember && (staffMember as any).capabilities?.includes('administrativeAccess')) ||
      ('permissions' in staffMember && (staffMember as any).permissions?.some((p: any) => p.id === 'perm-admin' && p.enabled))
    ));

  if (!isMember) {
    return { allowed: false, reason: 'Staff member is not a member of this module.' };
  }

  if (isAdministration) {
    const isOriginal =
      ('isOriginalAdmin' in staffMember && staffMember.isOriginalAdmin) ||
      ('badgeNumber' in staffMember && staffMember.badgeNumber === 'MD-001') ||
      staffMember.id === 'acc-doc-1' ||
      staffMember.id === 'usr-doc-1' ||
      ('staffName' in staffMember && staffMember.staffName === 'Dr. Marcus Vance');

    if (isOriginal) {
      return {
        allowed: false,
        reason: 'Original Managing Director cannot be removed from the Administration module.',
      };
    }

    // Count how many active members remain in the Administration module
    const adminModule = allModules.find(
      (m) => m.id === 'mod-admin' || m.accessIds.includes('administrativeAccess')
    );
    const activeStaffAdmins = allStaff.filter(
      (s) =>
        s.status !== 'revoked' &&
        ((adminModule && adminModule.memberIds.some((mid) => resolveStaffIds(s).includes(mid))) ||
          s.moduleIds?.includes('mod-admin') ||
          s.capabilities?.includes('administrativeAccess') ||
          s.permissions?.some((p) => p.id === 'perm-admin' && p.enabled))
    );

    const activeAdminMemberCount = Math.max(
      adminModule
        ? adminModule.memberIds.filter((mid) => {
            const staffRec = allStaff.find((s) => s.id === mid || resolveStaffIds(s).includes(mid));
            return !staffRec || staffRec.status !== 'revoked';
          }).length
        : 0,
      activeStaffAdmins.length
    );

    if (activeAdminMemberCount <= 1) {
      return {
        allowed: false,
        reason: 'Cannot remove the last remaining administrator from Administration.',
      };
    }
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
  allStaff: StaffAccessRecord[] = INITIAL_STAFF_ACCESS,
  modules: AccessModule[] = INITIAL_MODULES
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, modules) || !target) {
    return { allowed: false, reason: 'Only administrators can delete staff accounts.' };
  }

  // Original MD protection
  if (
    target.isOriginalAdmin ||
    target.id === 'acc-doc-1' ||
    target.badgeNumber === 'MD-001' ||
    target.staffName === 'Dr. Marcus Vance'
  ) {
    return {
      allowed: false,
      reason: 'Original Managing Director account cannot be deleted.',
    };
  }

  // Last remaining admin protection
  if (isAdmin(target, modules)) {
    const activeAdmins = allStaff.filter(
      (s) => s.status === 'granted' && isAdmin(s, modules)
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
 * Check if administrative access can be granted to a staff member.
 */
export function canGrantAdmin(
  actingUser: User | null | undefined,
  target: StaffAccessRecord | null | undefined,
  modules: AccessModule[] = INITIAL_MODULES
): boolean {
  if (!isAdmin(actingUser, modules) || !target) return false;
  if (isAdmin(target, modules)) return false;
  const adminMod = modules.find((m) => m.id === 'mod-admin' || m.accessIds.includes('administrativeAccess'));
  if (!adminMod) return false;
  return canAddMember(actingUser, adminMod, target, 'Administrative promotion', modules).allowed;
}

/**
 * Check if administrative access can be revoked from a staff member.
 */
export function canRevokeAdmin(
  actingUser: User | null | undefined,
  target: StaffAccessRecord | null | undefined,
  allStaff: StaffAccessRecord[] = INITIAL_STAFF_ACCESS,
  modules: AccessModule[] = INITIAL_MODULES
): { allowed: boolean; reason?: string } {
  if (!isAdmin(actingUser, modules) || !target) {
    return { allowed: false, reason: 'Only administrators can revoke access.' };
  }
  const adminMod = modules.find((m) => m.id === 'mod-admin' || m.accessIds.includes('administrativeAccess'));
  if (!adminMod) {
    return { allowed: false, reason: 'Administration module not found.' };
  }
  return canRemoveMember(actingUser, adminMod, target, modules, allStaff);
}
