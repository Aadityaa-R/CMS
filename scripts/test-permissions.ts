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
  DEMO_USERS,
} from '../src/data/mockData';
import { User, StaffAccessRecord } from '../src/types';

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

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
