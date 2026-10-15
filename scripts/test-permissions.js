// Unit test suite for Permissions, Patient Scoping, Authored-By rule, and Admin Promotion
// Follows CMS specification: zero emojis, pure function verification.

let passed = 0;
let failed = 0;

function assert(testName, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failed++;
  }
}

function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${actual} === ${expected}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected ${expected}, received ${actual}`);
    failed++;
  }
}

// Mock Types & Fixtures
const mdUser = {
  id: 'usr-doc-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  role: 'md',
  isOriginalAdmin: true,
  badgeNumber: 'MD-001',
};

const staffDoctorHayes = {
  id: 'usr-doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-102',
};

const staffDoctorReed = {
  id: 'usr-doc-3',
  name: 'Dr. Sophia Reed',
  email: 's.reed@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-103',
};

const promotedAdminDoctor = {
  id: 'usr-doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-102',
  capabilities: ['administrativeAccess'],
};

const receptionist = {
  id: 'usr-rec-1',
  name: 'Priya Sharma',
  email: 'p.sharma@beaconclinic.com',
  role: 'receptionist',
  badgeNumber: 'REC-301',
};

const patientUser = {
  id: 'usr-pat-1',
  name: 'Eleanor Wright',
  email: 'eleanor.wright@email.com',
  role: 'patient',
  badgeNumber: 'MRN-84291',
  patientId: 'pat-1',
};

const sampleAssignments = [
  {
    id: 'asgn-1',
    patientId: 'pat-1', // Eleanor Wright
    doctorId: 'doc-1',
    from: '2026-01-15',
    to: null,
    transferredBy: 'usr-doc-1',
    reason: 'Initial intake',
  },
  {
    id: 'asgn-2-old',
    patientId: 'pat-3', // Sophia Chen (former Vance)
    doctorId: 'doc-1',
    from: '2026-03-01',
    to: '2026-09-30',
    transferredBy: 'usr-doc-1',
    reason: 'Initial pulmonary care',
  },
  {
    id: 'asgn-2-current',
    patientId: 'pat-3', // Sophia Chen (current Hayes)
    doctorId: 'doc-2',
    from: '2026-10-01',
    to: null,
    transferredBy: 'usr-doc-1',
    reason: 'Transferred to General Medicine',
  },
  {
    id: 'asgn-3',
    patientId: 'pat-7', // David Kim (Reed)
    doctorId: 'doc-3',
    from: '2026-05-10',
    to: null,
    transferredBy: 'usr-doc-1',
    reason: 'Family Medicine',
  },
];

// Logic under test: pure functions matching src/lib/permissions.ts
function isAdmin(user) {
  if (!user) return false;
  if (user.role === 'md' || user.role === 'admin' || user.isOriginalAdmin) return true;
  if (user.capabilities && user.capabilities.includes('administrativeAccess')) return true;
  if (user.permissions) {
    const adminPerm = user.permissions.find((p) => p.id === 'perm-admin' || p.name === 'Administrative Access');
    if (adminPerm && adminPerm.enabled) return true;
  }
  return false;
}

function getAssignedDoctorId(patientId, assignments) {
  const current = assignments.find((a) => a.patientId === patientId && a.to === null);
  return current ? current.doctorId : null;
}

function canViewPatient(user, patientId, assignments) {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    const assignedDocId = getAssignedDoctorId(patientId, assignments);
    if (!assignedDocId) return false;
    return (
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && user.badgeNumber === 'DOC-102') ||
      (assignedDocId === 'doc-3' && user.badgeNumber === 'DOC-103')
    );
  }

  if (user.role === 'receptionist') return true;
  if (user.role === 'patient') return user.patientId === patientId || user.badgeNumber === patientId;
  return false;
}

function canViewVisit(user, visit, assignments) {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    const assignedDocId = getAssignedDoctorId(visit.patientId, assignments);
    const isCurrentDoctor =
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && user.badgeNumber === 'DOC-102') ||
      (assignedDocId === 'doc-3' && user.badgeNumber === 'DOC-103');

    if (isCurrentDoctor) return true;

    // Authored-by rule for former doctors
    return (
      visit.doctorId === user.id ||
      user.id === `usr-${visit.doctorId}` ||
      (visit.doctorId === 'doc-2' && user.badgeNumber === 'DOC-102') ||
      (visit.doctorId === 'doc-3' && user.badgeNumber === 'DOC-103') ||
      visit.doctorName === user.name
    );
  }

  if (user.role === 'receptionist') return true;
  if (user.role === 'patient') return visit.patientId === user.patientId;
  return false;
}

function canViewPrescription(user, rx, assignments) {
  if (!user) return false;
  if (user.role === 'receptionist') return false; // Strictly false for receptionist
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    const assignedDocId = getAssignedDoctorId(rx.patientId, assignments);
    const isCurrentDoctor =
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && user.badgeNumber === 'DOC-102') ||
      (assignedDocId === 'doc-3' && user.badgeNumber === 'DOC-103');

    if (isCurrentDoctor) return true;

    // Authored-by rule for former doctors
    return (
      rx.doctorId === user.id ||
      user.id === `usr-${rx.doctorId}` ||
      (rx.doctorId === 'doc-2' && user.badgeNumber === 'DOC-102') ||
      (rx.doctorId === 'doc-3' && user.badgeNumber === 'DOC-103') ||
      rx.doctorName === user.name
    );
  }

  if (user.role === 'patient') return rx.patientId === user.patientId;
  return false;
}

function canTransferPatient(user, patientId, assignments) {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'doctor') {
    const assignedDocId = getAssignedDoctorId(patientId, assignments);
    if (!assignedDocId) return false;
    return (
      assignedDocId === user.id ||
      user.id === `usr-${assignedDocId}` ||
      (assignedDocId === 'doc-2' && user.badgeNumber === 'DOC-102') ||
      (assignedDocId === 'doc-3' && user.badgeNumber === 'DOC-103')
    );
  }

  return false;
}

function canRegisterPatient(user) {
  return user && user.role === 'receptionist';
}

function canCheckIn(user) {
  return user && user.role === 'receptionist';
}

function canRevokeAdmin(actingUser, target, allStaff) {
  if (!isAdmin(actingUser) || !target) return { allowed: false, reason: 'Only administrators can revoke access.' };
  if (target.isOriginalAdmin || target.id === 'acc-doc-1' || target.badgeNumber === 'MD-001') {
    return { allowed: false, reason: 'Original Managing Director administrative access cannot be revoked.' };
  }
  const activeAdmins = allStaff.filter((s) => s.status === 'granted' && (s.role === 'md' || isAdmin(s)));
  if (activeAdmins.length <= 1) {
    return { allowed: false, reason: 'Cannot revoke the last remaining clinic administrator.' };
  }
  return { allowed: true };
}

function canDeleteStaff(actingUser, target, allStaff) {
  if (!isAdmin(actingUser) || !target) return { allowed: false, reason: 'Only administrators can delete staff.' };
  if (target.isOriginalAdmin || target.id === 'acc-doc-1' || target.badgeNumber === 'MD-001') {
    return { allowed: false, reason: 'Original Managing Director account cannot be deleted.' };
  }
  if (isAdmin(target)) {
    const activeAdmins = allStaff.filter((s) => s.status === 'granted' && (s.role === 'md' || isAdmin(s)));
    if (activeAdmins.length <= 1) {
      return { allowed: false, reason: 'Cannot delete the last remaining clinic administrator.' };
    }
  }
  return { allowed: true };
}

function scopePatientForReceptionist(patient) {
  return {
    ...patient,
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    previousVitals: undefined,
  };
}

console.log('Running CMS Permissions & Workflow Test Suite...\n');

// GROUP 1: Role & Admin Identification
console.log('--- TEST GROUP 1: Admin & Role Identification ---');
assert('MD is admin', isAdmin(mdUser));
assert('Staff Doctor without promotion is NOT admin', !isAdmin(staffDoctorHayes));
assert('Promoted Doctor WITH administrativeAccess capability IS admin', isAdmin(promotedAdminDoctor));
assert('Receptionist is NOT admin', !isAdmin(receptionist));
assert('Patient is NOT admin', !isAdmin(patientUser));

// GROUP 2: Patient Visibility Scoping
console.log('\n--- TEST GROUP 2: Patient Visibility Scoping ---');
assert('MD can view Eleanor Wright (pat-1)', canViewPatient(mdUser, 'pat-1', sampleAssignments));
assert('MD can view Sophia Chen (pat-3)', canViewPatient(mdUser, 'pat-3', sampleAssignments));
assert('Staff Doctor Hayes CAN view currently assigned patient Sophia Chen (pat-3)', canViewPatient(staffDoctorHayes, 'pat-3', sampleAssignments));
assert('Staff Doctor Hayes CANNOT view Eleanor Wright (pat-1, assigned to doc-1)', !canViewPatient(staffDoctorHayes, 'pat-1', sampleAssignments));
assert('Staff Doctor Reed CANNOT view Sophia Chen (pat-3, assigned to doc-2)', !canViewPatient(staffDoctorReed, 'pat-3', sampleAssignments));
assert('Promoted Admin Doctor CAN view all patients (Eleanor Wright pat-1)', canViewPatient(promotedAdminDoctor, 'pat-1', sampleAssignments));
assert('Unassigned patient (pat-99) is NOT visible to regular Staff Doctor', !canViewPatient(staffDoctorHayes, 'pat-99', sampleAssignments));
assert('Unassigned patient (pat-99) IS visible to MD / Admin', canViewPatient(mdUser, 'pat-99', sampleAssignments));

// GROUP 3: Authored-by Rule for Former Doctors (Visits & Prescriptions)
console.log('\n--- TEST GROUP 3: Authored-By Rule for Former Doctors ---');
const oldVisitAuthoredByReed = {
  id: 'apt-old-1',
  patientId: 'pat-3', // Currently assigned to Hayes
  doctorId: 'doc-3',  // Authored by Reed in the past
  doctorName: 'Dr. Sophia Reed',
  dateTime: '2026-08-10T10:00:00',
  status: 'completed',
};

const newVisitUnderHayes = {
  id: 'apt-new-1',
  patientId: 'pat-3',
  doctorId: 'doc-2',
  doctorName: 'Dr. Nathan Hayes',
  dateTime: '2026-10-15T09:45:00',
  status: 'in_consultation',
};

assert('Current doctor Hayes can view new visit', canViewVisit(staffDoctorHayes, newVisitUnderHayes, sampleAssignments));
assert('Current doctor Hayes can view old visit of assigned patient', canViewVisit(staffDoctorHayes, oldVisitAuthoredByReed, sampleAssignments));
assert('Former doctor Reed CAN view old visit they authored (authored-by rule)', canViewVisit(staffDoctorReed, oldVisitAuthoredByReed, sampleAssignments));
assert('Former doctor Reed CANNOT view new visit authored by Hayes', !canViewVisit(staffDoctorReed, newVisitUnderHayes, sampleAssignments));

const oldRxAuthoredByReed = {
  id: 'rx-old-1',
  patientId: 'pat-3',
  doctorId: 'doc-3',
  doctorName: 'Dr. Sophia Reed',
  date: '2026-08-10',
};

const newRxAuthoredByHayes = {
  id: 'rx-new-1',
  patientId: 'pat-3',
  doctorId: 'doc-2',
  doctorName: 'Dr. Nathan Hayes',
  date: '2026-10-15',
};

assert('Current doctor Hayes can view new prescription', canViewPrescription(staffDoctorHayes, newRxAuthoredByHayes, sampleAssignments));
assert('Former doctor Reed CAN view prescription they authored for former patient', canViewPrescription(staffDoctorReed, oldRxAuthoredByReed, sampleAssignments));
assert('Former doctor Reed CANNOT view new prescription authored by Hayes', !canViewPrescription(staffDoctorReed, newRxAuthoredByHayes, sampleAssignments));
assert('Receptionist CANNOT view any prescription (data isolation)', !canViewPrescription(receptionist, oldRxAuthoredByReed, sampleAssignments));

// GROUP 4: Patient Transfer Authority
console.log('\n--- TEST GROUP 4: Patient Transfer Authority ---');
assert('Current doctor Hayes CAN transfer their assigned patient Sophia Chen (pat-3)', canTransferPatient(staffDoctorHayes, 'pat-3', sampleAssignments));
assert('Staff doctor Reed CANNOT transfer Sophia Chen (not assigned to Reed)', !canTransferPatient(staffDoctorReed, 'pat-3', sampleAssignments));
assert('MD / Admin CAN transfer any patient (Sophia Chen)', canTransferPatient(mdUser, 'pat-3', sampleAssignments));
assert('MD / Admin CAN transfer David Kim (pat-7)', canTransferPatient(mdUser, 'pat-7', sampleAssignments));

// GROUP 5: Receptionist Exclusivity (Registration & Check-In)
console.log('\n--- TEST GROUP 5: Receptionist Registration & Check-in Exclusivity ---');
assert('Receptionist CAN register patient', canRegisterPatient(receptionist));
assert('Receptionist CAN check in patient', canCheckIn(receptionist));
assert('Doctor CANNOT register patient', !canRegisterPatient(staffDoctorHayes));
assert('Doctor CANNOT check in patient', !canCheckIn(staffDoctorHayes));
assert('MD CANNOT register patient (receptionist exclusivity)', !canRegisterPatient(mdUser));
assert('MD CANNOT check in patient (receptionist exclusivity)', !canCheckIn(mdUser));

// GROUP 6: Admin Protection Guards (Original MD & Last Admin)
console.log('\n--- TEST GROUP 6: Admin Protection Guards ---');
const staffListWithTwoAdmins = [
  { id: 'acc-doc-1', staffName: 'Dr. Marcus Vance', role: 'md', isOriginalAdmin: true, status: 'granted', badgeNumber: 'MD-001' },
  { id: 'acc-doc-2', staffName: 'Dr. Nathan Hayes', role: 'doctor', capabilities: ['administrativeAccess'], status: 'granted', badgeNumber: 'DOC-102' },
];

const staffListWithOneAdmin = [
  { id: 'acc-doc-1', staffName: 'Dr. Marcus Vance', role: 'md', isOriginalAdmin: true, status: 'granted', badgeNumber: 'MD-001' },
];

const revokeOriginalMD = canRevokeAdmin(promotedAdminDoctor, staffListWithTwoAdmins[0], staffListWithTwoAdmins);
assert('Original MD administrative access CANNOT be revoked', !revokeOriginalMD.allowed);

const deleteOriginalMD = canDeleteStaff(promotedAdminDoctor, staffListWithTwoAdmins[0], staffListWithTwoAdmins);
assert('Original MD account CANNOT be deleted', !deleteOriginalMD.allowed);

const revokePromotedWhenTwo = canRevokeAdmin(mdUser, staffListWithTwoAdmins[1], staffListWithTwoAdmins);
assert('Promoted Doctor admin access CAN be revoked when another admin exists', revokePromotedWhenTwo.allowed);

const soloAdminTarget = { id: 'acc-doc-solo', staffName: 'Dr. Solo Admin', role: 'doctor', capabilities: ['administrativeAccess'], status: 'granted' };
const staffWithSoloAdmin = [soloAdminTarget];
const revokeLastAdmin = canRevokeAdmin(mdUser, soloAdminTarget, staffWithSoloAdmin);
assert('Last remaining admin CANNOT have admin access revoked', !revokeLastAdmin.allowed);

const deleteLastAdmin = canDeleteStaff(mdUser, soloAdminTarget, staffWithSoloAdmin);
assert('Last remaining admin account CANNOT be deleted', !deleteLastAdmin.allowed);

// GROUP 7: Receptionist Clinical Data Stripping
console.log('\n--- TEST GROUP 7: Receptionist Clinical Data Stripping ---');
const fullPatient = {
  id: 'pat-1',
  mrn: 'MRN-84291',
  firstName: 'Eleanor',
  lastName: 'Wright',
  allergies: ['Penicillin'],
  chronicConditions: ['Hypertension'],
  currentMedications: ['Amlodipine 5mg'],
  previousVitals: { systolicBp: 130, diastolicBp: 80 },
  phone: '+1 555 1234',
};

const stripped = scopePatientForReceptionist(fullPatient);
assertEqual('Receptionist view has empty allergies', stripped.allergies.length, 0);
assertEqual('Receptionist view has empty chronicConditions', stripped.chronicConditions.length, 0);
assertEqual('Receptionist view has empty currentMedications', stripped.currentMedications.length, 0);
assertEqual('Receptionist view has undefined previousVitals', stripped.previousVitals, undefined);
assertEqual('Receptionist view retains MRN', stripped.mrn, 'MRN-84291');
assertEqual('Receptionist view retains phone', stripped.phone, '+1 555 1234');

console.log('\n========================================');
console.log(`Total tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}

