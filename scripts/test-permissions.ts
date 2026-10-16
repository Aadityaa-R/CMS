import {
  isAdmin,
  hasCapability,
  canViewPatient,
  canViewVisit,
  canViewPrescription,
  canTransferPatient,
  canGrantAdmin,
  canRevokeAdmin,
  canDeleteStaff,
  scopePatientForReceptionist,
  getEffectiveAccesses,
  canRegisterPatient,
  canCheckIn,
  canRecordPayment,
  canDeleteModule,
  canIncludeAccess,
  canRemoveAccess,
  canAddMember,
  canRemoveMember,
} from '../src/lib/permissions';
import {
  getScopedPatients,
  getScopedAppointments,
  getScopedPrescriptions,
  getScopedInvoices,
  getDoctorPatients,
} from '../src/lib/selectors';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_INVOICES,
  INITIAL_PATIENT_ASSIGNMENTS,
  INITIAL_STAFF_ACCESS,
  INITIAL_DOCTORS,
  INITIAL_MODULES,
  DEMO_USERS,
} from '../src/data/mockData';
import { User, StaffAccessRecord, AccessModule, StandardCapability } from '../src/types';
import { ACCESS_CATALOG } from '../src/data/accessCatalog';

let passed = 0;
let failed = 0;

function assert(testName: string, condition: boolean, details: string = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failed++;
  }
}

function assertEqual<T>(testName: string, actual: T, expected: T) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${String(actual)} === ${String(expected)}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected ${String(expected)}, received ${String(actual)}`);
    failed++;
  }
}

console.log('--- Permissions & Scoping Verification Suite ---');

// 1. One Source of Truth for Admin
const originalMdUser: User = DEMO_USERS.md;
const staffDoctorUser: User = DEMO_USERS.doctor;
const receptionistUser: User = DEMO_USERS.receptionist;
const patientUser: User = DEMO_USERS.patient;

assert('Original MD is admin', isAdmin(originalMdUser));
assert('Staff doctor Hayes without admin access is not admin', !isAdmin(staffDoctorUser));
assert('Receptionist is not admin', !isAdmin(receptionistUser));
assert('Patient is not admin', !isAdmin(patientUser));

// Promoted doctor
const promotedDoctorUser: User = {
  ...staffDoctorUser,
  capabilities: ['consultationWorkstation', 'administrativeAccess'],
};
assert('Promoted doctor holding administrativeAccess is admin', isAdmin(promotedDoctorUser));

const promotedDoctorPermUser: User = {
  ...staffDoctorUser,
  capabilities: ['perm-admin'],
};
assert('Promoted doctor holding perm-admin is admin', isAdmin(promotedDoctorPermUser));

// Revoked doctor holding administrativeAccess cannot act as admin if status is revoked
const revokedDoctorAdmin = {
  ...promotedDoctorUser,
  status: 'revoked',
};
assert('Revoked doctor is not admin', !isAdmin(revokedDoctorAdmin));

// Admin promotion & revocation protection rules
const mdStaffRecord = INITIAL_STAFF_ACCESS.find((s) => s.id === 'acc-doc-1')!;
const hayesStaffRecord = INITIAL_STAFF_ACCESS.find((s) => s.id === 'acc-doc-2')!;

assert('Admin can promote active doctor to admin', canGrantAdmin(originalMdUser, hayesStaffRecord));
assert(
  'Non-admin cannot promote doctor to admin',
  !canGrantAdmin(staffDoctorUser, hayesStaffRecord)
);

const originalMdRevokeCheck = canRevokeAdmin(originalMdUser, mdStaffRecord, INITIAL_STAFF_ACCESS);
assert('Original MD cannot be revoked', !originalMdRevokeCheck.allowed);

const originalMdDeleteCheck = canDeleteStaff(originalMdUser, mdStaffRecord, INITIAL_STAFF_ACCESS);
assert('Original MD cannot be deleted', !originalMdDeleteCheck.allowed);

// If Hayes is promoted, then active admins = [Vance, Hayes]. Hayes can be revoked by Vance.
const staffWithPromotedHayes: StaffAccessRecord[] = INITIAL_STAFF_ACCESS.map((s) =>
  s.id === 'acc-doc-2'
    ? {
        ...s,
        permissions: s.permissions.map((p) =>
          p.id === 'perm-admin' ? { ...p, enabled: true } : p
        ),
      }
    : s
);
const hayesPromotedRecord = staffWithPromotedHayes.find((s) => s.id === 'acc-doc-2')!;
const revokeHayesCheck = canRevokeAdmin(originalMdUser, hayesPromotedRecord, staffWithPromotedHayes);
assert('Promoted doctor admin can be revoked when another admin exists', revokeHayesCheck.allowed);

// If only one admin exists in clinic, revoking that admin is blocked
const singleAdminStaffList = INITIAL_STAFF_ACCESS.filter(
  (s) => s.id !== 'acc-doc-1' && s.id !== 'acc-doc-2'
);
const fakeAdminTarget = {
  ...hayesStaffRecord,
  permissions: hayesStaffRecord.permissions.map((p) =>
    p.id === 'perm-admin' ? { ...p, enabled: true } : p
  ),
};
const singleAdminRevokeCheck = canRevokeAdmin(
  fakeAdminTarget,
  fakeAdminTarget,
  [fakeAdminTarget]
);
assert('Last remaining admin cannot be revoked', !singleAdminRevokeCheck.allowed);

// 2. Expected Results - Patient Scoping
// Dr. Marcus Vance clinic-wide ('all') sees all 16 patients
const allPatientsScoped = getScopedPatients(
  originalMdUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS,
  'all'
);
assertEqual('Admin clinic-wide patient scope count', allPatientsScoped.length, 16);
assert(
  'Rachel Green (unassigned pat-16) visible in clinic-wide admin scope',
  allPatientsScoped.some((p) => p.id === 'pat-16')
);

// Dr. Vance desk ('doc-1') sees exactly 5 patients: Eleanor Wright, James Miller, Arthur Pendleton, Bruce Wayne, Clark Kent
const vanceDeskPatients = getScopedPatients(
  originalMdUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS,
  'doc-1'
);
assertEqual('Dr. Vance own desk patient count', vanceDeskPatients.length, 5);
const vancePatientNames = vanceDeskPatients.map((p) => `${p.firstName} ${p.lastName}`).sort();
assertEqual(
  'Dr. Vance assigned patients',
  vancePatientNames.join(', '),
  'Arthur Pendleton, Bruce Wayne, Clark Kent, Eleanor Wright, James Miller'
);

// Dr. Nathan Hayes ('usr-doc-2') sees exactly 5 patients: Sophia Chen, Liam Bennett, Maya Patel, Grace Hopper, Walter White
const hayesDoctorUser: User = {
  id: 'usr-doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-102',
};
const hayesPatients = getScopedPatients(
  hayesDoctorUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS,
  'doc-2'
);
assertEqual('Dr. Nathan Hayes patient scope count', hayesPatients.length, 5);
const hayesPatientNames = hayesPatients.map((p) => `${p.firstName} ${p.lastName}`).sort();
assertEqual(
  'Dr. Nathan Hayes assigned patients',
  hayesPatientNames.join(', '),
  'Grace Hopper, Liam Bennett, Maya Patel, Sophia Chen, Walter White'
);

// Dr. Sophia Reed ('usr-doc-3') sees exactly 5 patients: David Kim, Elena Rostova, Samuel Torres, Henry Ford, Diana Prince
const reedDoctorUser: User = {
  id: 'usr-doc-3',
  name: 'Dr. Sophia Reed',
  email: 's.reed@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-103',
};
const reedPatients = getScopedPatients(
  reedDoctorUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS,
  'doc-3'
);
assertEqual('Dr. Sophia Reed patient scope count', reedPatients.length, 5);
const reedPatientNames = reedPatients.map((p) => `${p.firstName} ${p.lastName}`).sort();
assertEqual(
  'Dr. Sophia Reed assigned patients',
  reedPatientNames.join(', '),
  'David Kim, Diana Prince, Elena Rostova, Henry Ford, Samuel Torres'
);

// Unassigned patient Rachel Green (pat-16) is NOT visible to staff doctors Hayes or Reed
assert('Rachel Green pat-16 not visible to Dr. Hayes', !hayesPatients.some((p) => p.id === 'pat-16'));
assert('Rachel Green pat-16 not visible to Dr. Reed', !reedPatients.some((p) => p.id === 'pat-16'));

// 3. Expected Results - Prescription Scoping & Authored-By rule
// Prescription RX-2026-0070 is for Sophia Chen (pat-3), authored by Dr. Marcus Vance (doc-1).
// Sophia Chen is currently assigned to Dr. Nathan Hayes (doc-2).
const chenRx = INITIAL_PRESCRIPTIONS.find((r) => r.prescriptionNumber === 'RX-2026-0070')!;
assert('RX-2026-0070 exists in mock data', Boolean(chenRx));

const hayesPrescriptions = getScopedPrescriptions(
  hayesDoctorUser,
  INITIAL_PRESCRIPTIONS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assert(
  'RX-2026-0070 is visible to Dr. Hayes (currently assigned doctor)',
  hayesPrescriptions.some((r) => r.prescriptionNumber === 'RX-2026-0070')
);

const vancePrescriptions = getScopedPrescriptions(
  originalMdUser,
  INITIAL_PRESCRIPTIONS,
  INITIAL_PATIENT_ASSIGNMENTS,
  'doc-1'
);
assert(
  'RX-2026-0070 is visible to Dr. Vance (author)',
  vancePrescriptions.some((r) => r.prescriptionNumber === 'RX-2026-0070')
);

const reedPrescriptions = getScopedPrescriptions(
  reedDoctorUser,
  INITIAL_PRESCRIPTIONS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assert(
  'RX-2026-0070 is NOT visible to Dr. Reed (neither current doctor nor author)',
  !reedPrescriptions.some((r) => r.prescriptionNumber === 'RX-2026-0070')
);

// 4. Expected Results - Receptionist Scoping
// Receptionist sees no allergies, conditions, medications, vitals, notes, diagnoses or prescriptions anywhere
const receptionistPrescriptions = getScopedPrescriptions(
  receptionistUser,
  INITIAL_PRESCRIPTIONS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assertEqual('Receptionist sees zero prescriptions', receptionistPrescriptions.length, 0);

const receptionistPatients = getScopedPatients(
  receptionistUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assert('Receptionist receives all patients for registration', receptionistPatients.length > 0);
const sampleReceptionistPat = receptionistPatients[0];
assertEqual('Receptionist patient allergies stripped', sampleReceptionistPat.allergies.length, 0);
assertEqual(
  'Receptionist patient chronic conditions stripped',
  sampleReceptionistPat.chronicConditions.length,
  0
);
assertEqual(
  'Receptionist patient medications stripped',
  sampleReceptionistPat.currentMedications?.length || 0,
  0
);
assertEqual(
  'Receptionist patient previous vitals stripped',
  sampleReceptionistPat.previousVitals,
  undefined
);

// 5. Expected Results - Patient Scoping
// Patient sees only their own record, visits, prescriptions, and invoices
const eleanorWrightUser: User = {
  id: 'usr-pat-1',
  name: 'Eleanor Wright',
  email: 'eleanor.wright@email.com',
  role: 'patient',
  patientId: 'pat-1',
  badgeNumber: 'MRN-84291',
};
const patientScopedPatients = getScopedPatients(
  eleanorWrightUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assertEqual('Patient sees only 1 patient record', patientScopedPatients.length, 1);
assertEqual('Patient sees only their own record', patientScopedPatients[0].id, 'pat-1');

const patientScopedPrescriptions = getScopedPrescriptions(
  eleanorWrightUser,
  INITIAL_PRESCRIPTIONS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assert('Patient has at least 1 prescription', patientScopedPrescriptions.length >= 1);
assertEqual(
  'Eleanor Wright sees RX-2026-0081 in portal',
  patientScopedPrescriptions.some((r) => r.prescriptionNumber === 'RX-2026-0081'),
  true
);
assert(
  'Patient prescriptions only belong to pat-1',
  patientScopedPrescriptions.every((r) => r.patientId === 'pat-1')
);

const patientScopedAppointments = getScopedAppointments(
  eleanorWrightUser,
  INITIAL_APPOINTMENTS,
  INITIAL_PATIENT_ASSIGNMENTS
);
assert(
  'Patient appointments only belong to pat-1',
  patientScopedAppointments.every((a) => a.patientId === 'pat-1')
);

const patientScopedInvoices = getScopedInvoices(
  eleanorWrightUser,
  INITIAL_INVOICES,
  INITIAL_PATIENT_ASSIGNMENTS
);
assert(
  'Patient invoices only belong to pat-1',
  patientScopedInvoices.every((i) => i.patientId === 'pat-1')
);

// 6. Transfer Edge Cases
// Can transfer check:
assert(
  'Admin can transfer any patient',
  canTransferPatient(originalMdUser, 'pat-1', INITIAL_PATIENT_ASSIGNMENTS)
);
assert(
  'Assigned doctor Hayes can transfer his patient Sophia Chen',
  canTransferPatient(hayesDoctorUser, 'pat-3', INITIAL_PATIENT_ASSIGNMENTS)
);
assert(
  'Doctor Reed cannot transfer patient Sophia Chen assigned to Hayes',
  !canTransferPatient(reedDoctorUser, 'pat-3', INITIAL_PATIENT_ASSIGNMENTS)
);

// --- M2 MODULES SPECIFICATION VERIFICATION SUITE ---
console.log('\n--- M2 Modules Specification Suite ---');

// 1. Effective access is the union across modules; revoked account has none
const multiModuleUser: User = {
  ...hayesDoctorUser,
  id: 'acc-doc-2',
};
const clinicalAndFrontDeskModules: AccessModule[] = INITIAL_MODULES.map((m) =>
  m.id === 'mod-frontdesk'
    ? { ...m, memberIds: [...m.memberIds, 'acc-doc-2'] }
    : m
);
const multiEffectiveAccesses = getEffectiveAccesses(multiModuleUser, clinicalAndFrontDeskModules);
assert(
  'Effective access includes consultationWorkstation from Clinical',
  multiEffectiveAccesses.includes('consultationWorkstation')
);
assert(
  'Effective access includes patientRegistration from Front Desk',
  multiEffectiveAccesses.includes('patientRegistration')
);
assert(
  'Effective access includes patientCheckIn from Front Desk',
  multiEffectiveAccesses.includes('patientCheckIn')
);

// Revoked account has 0 effective accesses
const revokedStaffRecord: StaffAccessRecord = {
  ...hayesStaffRecord,
  status: 'revoked',
};
const revokedAccesses = getEffectiveAccesses(revokedStaffRecord, INITIAL_MODULES);
assertEqual('Revoked account has 0 effective access', revokedAccesses.length, 0);

// 2. Doctor added to Front Desk can register and check in; removed cannot
assert(
  'Doctor in Clinical only cannot register patients',
  !canRegisterPatient(hayesDoctorUser, INITIAL_MODULES)
);
assert(
  'Doctor in Clinical only cannot check in patients',
  !canCheckIn(hayesDoctorUser, INITIAL_MODULES)
);
assert(
  'Doctor added to Front Desk can register patients',
  canRegisterPatient(hayesDoctorUser, clinicalAndFrontDeskModules)
);
assert(
  'Doctor added to Front Desk can check in patients',
  canCheckIn(hayesDoctorUser, clinicalAndFrontDeskModules)
);

// 3. Receptionist added to Clinical gets no clinical patient data (no assignments) and no prescribing
const priyaReceptionistUser = receptionistUser;
const priyaStaffRecord = INITIAL_STAFF_ACCESS.find((s) => s.id === 'acc-rec-1')!;
const modulesWithPriyaInClinical: AccessModule[] = INITIAL_MODULES.map((m) =>
  m.id === 'mod-clinical'
    ? { ...m, memberIds: [...m.memberIds, 'acc-rec-1'] }
    : m
);

const priyaClinicalAccesses = getEffectiveAccesses(priyaStaffRecord, modulesWithPriyaInClinical);
assert(
  'Receptionist in Clinical receives EMR Records Access capability',
  priyaClinicalAccesses.includes('emrRecordsAccess')
);
assert(
  'Receptionist in Clinical DOES NOT receive Prescription Authoring (doctors only)',
  !priyaClinicalAccesses.includes('prescriptionAuthoring')
);
const priyaScopedPatients = getScopedPatients(
  priyaReceptionistUser,
  INITIAL_PATIENTS,
  INITIAL_PATIENT_ASSIGNMENTS,
  modulesWithPriyaInClinical
);
assertEqual(
  'Receptionist added to Clinical with 0 assignments sees 0 clinical patients',
  priyaScopedPatients.length,
  0
);

// 4. isAdmin follows membership of Administration
const modulesWithHayesAdmin: AccessModule[] = INITIAL_MODULES.map((m) =>
  m.id === 'mod-admin'
    ? { ...m, memberIds: [...m.memberIds, 'acc-doc-2'] }
    : m
);
assert('Doctor added to Administration is admin', isAdmin(hayesDoctorUser, modulesWithHayesAdmin));
assert('Doctor removed from Administration is not admin', !isAdmin(hayesDoctorUser, INITIAL_MODULES));

// 5. Guard enforcement in Section 4 (handler-level)
const adminMod = INITIAL_MODULES.find((m) => m.id === 'mod-admin')!;
const clinicalMod = INITIAL_MODULES.find((m) => m.id === 'mod-clinical')!;
const frontdeskMod = INITIAL_MODULES.find((m) => m.id === 'mod-frontdesk')!;

// Administration cannot be deleted
const deleteAdminCheck = canDeleteModule(originalMdUser, adminMod, INITIAL_MODULES);
assert('Administration module cannot be deleted', !deleteAdminCheck.allowed);

// Administration always retains administrativeAccess
const removeAdminAccessCheck = canRemoveAccess(originalMdUser, adminMod, 'administrativeAccess', INITIAL_MODULES);
assert('Administration module must retain Administrative Access', !removeAdminAccessCheck.allowed);

// Original MD cannot be removed from Administration
const removeMdCheck = canRemoveMember(originalMdUser, adminMod, mdStaffRecord, INITIAL_MODULES, INITIAL_STAFF_ACCESS);
assert('Original MD cannot be removed from Administration', !removeMdCheck.allowed);

// Last remaining admin cannot be removed
const singleAdminMod: AccessModule = {
  ...adminMod,
  memberIds: ['acc-doc-2'],
};
const singleAdminList = [hayesStaffRecord];
const removeLastAdminCheck = canRemoveMember(hayesDoctorUser, singleAdminMod, hayesStaffRecord, [singleAdminMod], singleAdminList);
assert('Last remaining admin cannot be removed from Administration', !removeLastAdminCheck.allowed);

// Prescription Authoring cannot be included in a module that lacks EMR Records Access
const customModuleNoEmr: AccessModule = {
  id: 'mod-custom-test',
  name: 'Custom Triage',
  accessIds: ['consultationWorkstation'],
  memberIds: [],
  isSystem: false,
  createdBy: 'Dr. Marcus Vance',
  createdAt: '2026-10-16',
};
const includePrescWithoutEmrCheck = canIncludeAccess(originalMdUser, customModuleNoEmr, 'prescriptionAuthoring', INITIAL_MODULES);
assert('Prescription Authoring cannot be included without EMR Records Access', !includePrescWithoutEmrCheck.allowed);

// EMR Records Access cannot be removed if Prescription Authoring is present
const removeEmrCheck = canRemoveAccess(originalMdUser, clinicalMod, 'emrRecordsAccess', INITIAL_MODULES);
assert('Cannot remove EMR Records Access while Prescription Authoring is present', !removeEmrCheck.allowed);

// System modules cannot be deleted
assert('System Clinical module cannot be deleted', !canDeleteModule(originalMdUser, clinicalMod, INITIAL_MODULES).allowed);
assert('System Front Desk module cannot be deleted', !canDeleteModule(originalMdUser, frontdeskMod, INITIAL_MODULES).allowed);

// Custom module with members cannot be deleted
const customModuleWithMembers: AccessModule = {
  ...customModuleNoEmr,
  memberIds: ['acc-doc-2'],
};
assert('Custom module with members cannot be deleted', !canDeleteModule(originalMdUser, customModuleWithMembers, INITIAL_MODULES).allowed);

// Custom module with 0 members CAN be deleted
const customModuleEmpty: AccessModule = {
  ...customModuleNoEmr,
  memberIds: [],
};
assert('Custom module with 0 members can be deleted', canDeleteModule(originalMdUser, customModuleEmpty, INITIAL_MODULES).allowed);

// Adding to Administration requires non-empty reason
const addAdminNoReason = canAddMember(originalMdUser, adminMod, hayesStaffRecord, '', INITIAL_MODULES);
assert('Adding to Administration requires an operational reason', !addAdminNoReason.allowed);
const addAdminWithReason = canAddMember(originalMdUser, adminMod, hayesStaffRecord, 'Designated Acting MD', INITIAL_MODULES);
assert('Adding to Administration succeeds with valid operational reason', addAdminWithReason.allowed);

// 6. Migration equivalence check from section 2 for every seeded staff member
console.log('\n--- Migration Equivalence Check ---');
const exceptionList: string[] = [];

for (const staff of INITIAL_STAFF_ACCESS.filter((s) => s.role !== 'patient')) {
  // Legacy capability set
  const legacyCaps = (staff.permissions || [])
    .filter((p) => p.enabled)
    .map((p) => {
      if (p.id === 'perm-admin') return 'administrativeAccess';
      if (p.id === 'perm-consult') return 'consultationWorkstation';
      if (p.id === 'perm-emr') return 'emrRecordsAccess';
      if (p.id === 'perm-presc') return 'prescriptionAuthoring';
      if (p.id === 'perm-schedule') return 'consultingCalendar';
      if (p.id === 'perm-register') return 'patientRegistration';
      if (p.id === 'perm-checkin') return 'patientCheckIn';
      if (p.id === 'perm-payment') return 'paymentRecording';
      return p.id;
    })
    .sort();

  // New module effective accesses
  const newEffectiveCaps = getEffectiveAccesses(staff, INITIAL_MODULES).sort();

  const isIdentical =
    legacyCaps.length === newEffectiveCaps.length &&
    legacyCaps.every((c, idx) => c === newEffectiveCaps[idx]);

  if (!isIdentical) {
    exceptionList.push(staff.staffName);
  }

  assert(
    `Migration equivalence for ${staff.staffName} (${staff.id}): legacy [${legacyCaps.join(', ')}] === modules [${newEffectiveCaps.join(', ')}]`,
    isIdentical
  );
}

assertEqual('Zero staff members required exception list', exceptionList.length, 0);

// 7. Sidebar Mapping & Person in no module
const emptyModules: AccessModule[] = INITIAL_MODULES.map((m) => ({
  ...m,
  memberIds: [],
}));
const orphanUser: User = {
  id: 'usr-orphan',
  name: 'Orphan User',
  email: 'orphan@clinic.com',
  role: 'doctor',
};
assert(
  'Orphan staff in no module has no consultation workstation',
  !hasCapability(orphanUser, 'consultationWorkstation', emptyModules)
);
assert(
  'Orphan staff in no module has no consulting calendar',
  !hasCapability(orphanUser, 'consultingCalendar', emptyModules)
);
assert(
  'Orphan staff in no module has no reception capabilities',
  !hasCapability(orphanUser, 'patientRegistration', emptyModules) &&
  !hasCapability(orphanUser, 'patientCheckIn', emptyModules) &&
  !hasCapability(orphanUser, 'paymentRecording', emptyModules)
);
assert(
  'Orphan staff in no module has no administrative access',
  !hasCapability(orphanUser, 'administrativeAccess', emptyModules)
);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
