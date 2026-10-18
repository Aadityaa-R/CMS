import assert from 'node:assert';
import {
  formatRegimen,
  calculateQuantity,
  validatePrescription,
  validateItem,
  ALLERGEN_RULES,
  checkAllergies,
  checkDuplicates,
  activeMedications,
  migrateLegacyPrescription,
} from '../src/lib/prescribing';
import {
  canPrescribe,
  canCancelPrescription,
} from '../src/lib/permissions';
import { getScopedPrescriptions } from '../src/lib/selectors';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { INITIAL_MODULES } from '../src/data/mockData';
import { Medicine, Prescription, PrescriptionItem } from '../src/types/prescribing';
import { User, PatientAssignment } from '../src/types';

console.log('[TEST] Running Prescribing, Allergy Checks, and Formulary Test Suite (M8)...');

// ---------------------------------------------------------------------------
// 1. formatRegimen formatting tests
// ---------------------------------------------------------------------------
console.log('  1. Testing formatRegimen...');

const sampleItem1: PrescriptionItem = {
  id: 'item-1',
  medicineId: 'med-1',
  medicineName: 'Amlodipine Besylate',
  strength: '5 mg',
  form: 'Tablet',
  route: 'Oral',
  dose: { amount: 1, unit: 'tablet' },
  frequency: 'Once daily',
  timing: 'Morning',
  duration: '30 days',
  quantity: 30,
  refills: 0,
  instructions: 'Take after breakfast',
};

const formatted1 = formatRegimen(sampleItem1);
assert.strictEqual(
  formatted1,
  'Amlodipine Besylate 5 mg tablet, 1 tablet, once daily in the morning, for 30 days, 0 refills.',
  'formatRegimen should format standardized sentence'
);

const sampleItem2: PrescriptionItem = {
  id: 'item-2',
  medicineId: 'med-3',
  medicineName: 'Metformin Hydrochloride Extended Release',
  strength: '500 mg',
  form: 'Tablet',
  route: 'Oral',
  dose: { amount: 2, unit: 'tablets' },
  frequency: 'Twice daily',
  timing: 'With food',
  duration: 'Ongoing',
  quantity: 120,
  refills: 2,
  instructions: '',
};

const formatted2 = formatRegimen(sampleItem2);
assert.strictEqual(
  formatted2,
  'Metformin Hydrochloride Extended Release 500 mg tablet, 2 tablets, twice daily with food, for ongoing, 2 refills.',
  'formatRegimen should format ongoing duration and refills'
);

// ---------------------------------------------------------------------------
// 2. calculateQuantity computation tests
// ---------------------------------------------------------------------------
console.log('  2. Testing calculateQuantity...');

// Once daily, 1 dose, 30 days -> 30
assert.strictEqual(calculateQuantity(1, 'Once daily', '30 days'), 30);

// Twice daily, 1 dose, 14 days -> 28
assert.strictEqual(calculateQuantity(1, 'Twice daily', '14 days'), 28);

// Three times daily, 2 tablets, 10 days -> 60
assert.strictEqual(calculateQuantity(2, 'Three times daily', '10 days'), 60);

// Four times daily, 1 capsule, 7 days -> 28
assert.strictEqual(calculateQuantity(1, 'Four times daily', '7 days'), 28);

// Every 8 hours, 1 dose, 5 days -> 15
assert.strictEqual(calculateQuantity(1, 'Every 8 hours', '5 days'), 15);

// At bedtime, 1 dose, 30 days -> 30
assert.strictEqual(calculateQuantity(1, 'At bedtime', '30 days'), 30);

// As needed, 1 dose, 30 days -> 30
assert.strictEqual(calculateQuantity(1, 'As needed', '30 days'), 30);

// Ongoing duration baseline: calculated for 30 days
assert.strictEqual(calculateQuantity(1, 'Once daily', 'Ongoing'), 30);
assert.strictEqual(calculateQuantity(2, 'Twice daily', 'Ongoing'), 120);

// Fractional doses rounded up
assert.strictEqual(calculateQuantity(1.5, 'Once daily', '7 days'), 11);

// ---------------------------------------------------------------------------
// 3. validatePrescription and validateItem rules
// ---------------------------------------------------------------------------
console.log('  3. Testing prescription validation rules...');

const validItem: PrescriptionItem = {
  id: 'item-valid',
  medicineId: 'med-1',
  medicineName: 'Amlodipine Besylate',
  strength: '5 mg',
  form: 'Tablet',
  route: 'Oral',
  dose: { amount: 1, unit: 'tablet' },
  frequency: 'Once daily',
  timing: 'Morning',
  duration: '30 days',
  quantity: 30,
  refills: 0,
  instructions: '',
};

// Item level validation
assert.strictEqual(validateItem(validItem).valid, true);

// Dose amount <= 0 should fail
const invalidDoseItem = { ...validItem, dose: { amount: 0, unit: 'tablet' } };
assert.strictEqual(validateItem(invalidDoseItem).valid, false);

// Custom medicine without customName should fail
const invalidCustomItem = {
  ...validItem,
  medicineId: '__other__',
  customName: '',
};
assert.strictEqual(validateItem(invalidCustomItem).valid, false);

// Custom medicine with valid customName should pass
const validCustomItem = {
  ...validItem,
  medicineId: '__other__',
  customName: 'Compounded Nifedipine Paste',
};
assert.strictEqual(validateItem(validCustomItem).valid, true);

// Refills > 3 should fail
const invalidRefillsItem = { ...validItem, refills: 4 };
assert.strictEqual(validateItem(invalidRefillsItem).valid, false);

// Prescription level validation
const baseRx: Prescription = {
  id: 'rx-test',
  prescriptionNumber: 'RX-2026-0001',
  patientId: 'pat-1',
  patientName: 'Eleanor Vance',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  date: '2026-10-18',
  diagnosis: 'Hypertension',
  items: [validItem],
  status: 'active',
};

assert.strictEqual(validatePrescription(baseRx).valid, true);

// Zero items should fail
assert.strictEqual(validatePrescription({ ...baseRx, items: [] }).valid, false);

// More than 10 items should fail
const elevenItems = Array(11).fill(validItem).map((it, idx) => ({ ...it, id: `item-${idx}` }));
assert.strictEqual(validatePrescription({ ...baseRx, items: elevenItems }).valid, false);

// Missing diagnosis should fail
assert.strictEqual(validatePrescription({ ...baseRx, diagnosis: '' }).valid, false);

// ---------------------------------------------------------------------------
// 4. Legacy Prescription Migration
// ---------------------------------------------------------------------------
console.log('  4. Testing legacy prescription migration...');

const legacyRx: any = {
  id: 'rx-old-1',
  prescriptionNumber: 'RX-2026-0001',
  patientId: 'pat-1',
  patientName: 'Eleanor Vance',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  date: '2026-08-01',
  diagnosis: 'Hypertension',
  medicines: [
    'Amlodipine Besylate 5mg once daily',
    'Hydrochlorothiazide 25mg daily morning',
  ],
};

const migrated = migrateLegacyPrescription(legacyRx, INITIAL_FORMULARY);
assert.strictEqual(migrated.items.length, 2);
assert.strictEqual(migrated.status, 'active');
assert.strictEqual(migrated.items[0].medicineName, 'Amlodipine Besylate');
assert.strictEqual(migrated.items[1].medicineName, 'Hydrochlorothiazide');

// ---------------------------------------------------------------------------
// 5. Allergy Checks (Penicillin, Sulfa, Aspirin/NSAID, Unmapped)
// ---------------------------------------------------------------------------
console.log('  5. Testing allergy checking engine...');

// 5a. Penicillin allergy vs Amoxicillin
const amoxItem: PrescriptionItem = {
  id: 'it-amox',
  medicineId: 'med-23',
  medicineName: 'Amoxicillin Trihydrate',
  strength: '500 mg',
  form: 'Capsule',
  route: 'Oral',
  dose: { amount: 1, unit: 'capsule' },
  frequency: 'Three times daily',
  timing: 'After food',
  duration: '10 days',
  quantity: 30,
  refills: 0,
  instructions: '',
};

const amoxAllergyResult = checkAllergies(['Penicillin'], [amoxItem], INITIAL_FORMULARY);
assert.strictEqual(amoxAllergyResult.length, 1);
assert.strictEqual(amoxAllergyResult[0].allergen, 'Penicillin');
assert.strictEqual(amoxAllergyResult[0].medicine, 'Amoxicillin Trihydrate');
assert.ok(amoxAllergyResult[0].message.includes('cross-reactivity'));

// 5b. Sulfa allergy vs Sulfamethoxazole & Bactrim
const sulfaItem: PrescriptionItem = {
  id: 'it-sulfa',
  medicineId: 'med-28',
  medicineName: 'Sulfamethoxazole and Trimethoprim',
  strength: '800 mg / 160 mg',
  form: 'Tablet',
  route: 'Oral',
  dose: { amount: 1, unit: 'tablet' },
  frequency: 'Twice daily',
  timing: 'After food',
  duration: '10 days',
  quantity: 20,
  refills: 0,
  instructions: '',
};

const sulfaAllergyResult = checkAllergies(['Sulfa'], [sulfaItem], INITIAL_FORMULARY);
assert.strictEqual(sulfaAllergyResult.length, 1);
assert.strictEqual(sulfaAllergyResult[0].allergen, 'Sulfa');

// 5c. Aspirin allergy vs Ibuprofen (NSAID cross-reactivity)
const ibuprofenItem: PrescriptionItem = {
  id: 'it-ibu',
  medicineId: 'med-30',
  medicineName: 'Ibuprofen',
  strength: '400 mg',
  form: 'Tablet',
  route: 'Oral',
  dose: { amount: 1, unit: 'tablet' },
  frequency: 'Three times daily',
  timing: 'With food',
  duration: '5 days',
  quantity: 15,
  refills: 0,
  instructions: '',
};

const aspirinAllergyResult = checkAllergies(['Aspirin'], [ibuprofenItem], INITIAL_FORMULARY);
assert.strictEqual(aspirinAllergyResult.length, 1);
assert.strictEqual(aspirinAllergyResult[0].allergen, 'Aspirin');
assert.strictEqual(aspirinAllergyResult[0].medicine, 'Ibuprofen');

// 5d. Unmapped allergy warning (e.g. Peanuts, Latex)
const unmappedResult = checkAllergies(['Peanuts'], [validItem], INITIAL_FORMULARY);
assert.strictEqual(unmappedResult.length, 1);
assert.strictEqual(unmappedResult[0].allergen, 'Peanuts');
assert.ok(unmappedResult[0].message.includes('Check manually'));

// 5e. No allergies -> empty results
const noAllergyResult = checkAllergies([], [amoxItem], INITIAL_FORMULARY);
assert.strictEqual(noAllergyResult.length, 0);

// ---------------------------------------------------------------------------
// 6. Duplicate Detection (Same Medicine & Same Drug Class)
// ---------------------------------------------------------------------------
console.log('  6. Testing duplicate medication and drug class detection...');

const activeRxList: Prescription[] = [
  {
    id: 'rx-active-1',
    prescriptionNumber: 'RX-2026-0001',
    patientId: 'pat-1',
    patientName: 'Eleanor Vance',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: '2026-10-15',
    diagnosis: 'Hypertension',
    items: [
      {
        id: 'it-aml',
        medicineId: 'med-1',
        medicineName: 'Amlodipine Besylate',
        strength: '5 mg',
        form: 'Tablet',
        route: 'Oral',
        dose: { amount: 1, unit: 'tablet' },
        frequency: 'Once daily',
        timing: 'Morning',
        duration: '30 days',
        quantity: 30,
        refills: 0,
        instructions: '',
      },
    ],
    status: 'active',
  },
];

const now = new Date('2026-10-18T10:00:00Z');

// 6a. Prescribing the same medicine while actively taking it
const duplicateDrugResult = checkDuplicates([validItem], activeRxList, INITIAL_FORMULARY, now);
assert.strictEqual(duplicateDrugResult.length, 1);
assert.strictEqual(duplicateDrugResult[0].type, 'same_medicine');

// 6b. Prescribing a different drug in the same class (Hydrochlorothiazide is antihypertensive)
const hctzItem: PrescriptionItem = {
  id: 'it-hctz',
  medicineId: 'med-2',
  medicineName: 'Hydrochlorothiazide',
  strength: '25 mg',
  form: 'Tablet',
  route: 'Oral',
  dose: { amount: 1, unit: 'tablet' },
  frequency: 'Once daily',
  timing: 'Morning',
  duration: '30 days',
  quantity: 30,
  refills: 0,
  instructions: '',
};

const duplicateClassResult = checkDuplicates([hctzItem], activeRxList, INITIAL_FORMULARY, now);
assert.strictEqual(duplicateClassResult.length, 1);
assert.strictEqual(duplicateClassResult[0].type, 'same_class');

// 6c. If prescription is cancelled, it should NOT trigger duplicate warning
const cancelledRxList: Prescription[] = [
  {
    ...activeRxList[0],
    status: 'cancelled',
  },
];
const noDupForCancelled = checkDuplicates([validItem], cancelledRxList, INITIAL_FORMULARY, now);
assert.strictEqual(noDupForCancelled.length, 0);

// ---------------------------------------------------------------------------
// 7. activeMedications Boundary & Expiration Evaluation
// ---------------------------------------------------------------------------
console.log('  7. Testing activeMedications duration and boundary calculations...');

const prescriptionPast: Prescription = {
  id: 'rx-past',
  prescriptionNumber: 'RX-2026-0002',
  patientId: 'pat-1',
  patientName: 'Eleanor Vance',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  date: '2026-10-01', // 17 days ago
  diagnosis: 'Acute Bronchitis',
  items: [
    {
      id: 'it-past-amox',
      medicineId: 'med-23',
      medicineName: 'Amoxicillin Trihydrate',
      strength: '500 mg',
      form: 'Capsule',
      route: 'Oral',
      dose: { amount: 1, unit: 'capsule' },
      frequency: 'Three times daily',
      timing: 'After food',
      duration: '10 days', // expired 7 days ago
      quantity: 30,
      refills: 0,
      instructions: '',
    },
  ],
  status: 'active',
};

const prescriptionOngoing: Prescription = {
  id: 'rx-ongoing',
  prescriptionNumber: 'RX-2026-0003',
  patientId: 'pat-1',
  patientName: 'Eleanor Vance',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  date: '2026-09-01',
  diagnosis: 'Hypertension',
  items: [
    {
      id: 'it-ongoing-aml',
      medicineId: 'med-1',
      medicineName: 'Amlodipine Besylate',
      strength: '5 mg',
      form: 'Tablet',
      route: 'Oral',
      dose: { amount: 1, unit: 'tablet' },
      frequency: 'Once daily',
      timing: 'Morning',
      duration: 'Ongoing',
      quantity: 30,
      refills: 2,
      instructions: '',
    },
  ],
  status: 'active',
};

const activeList = activeMedications('pat-1', [prescriptionPast, prescriptionOngoing], now);
// Amoxicillin expired, so only Amlodipine should be active
assert.strictEqual(activeList.length, 1);
assert.strictEqual(activeList[0], 'Amlodipine Besylate');

// Cancelled ongoing prescription should NOT be active
const cancelledOngoing: Prescription = {
  ...prescriptionOngoing,
  status: 'cancelled',
};
const activeListCancelled = activeMedications('pat-1', [cancelledOngoing], now);
assert.strictEqual(activeListCancelled.length, 0);

// ---------------------------------------------------------------------------
// 8. Permissions Tests (canPrescribe and canCancelPrescription)
// ---------------------------------------------------------------------------
console.log('  8. Testing prescribing and cancellation permissions...');

const doctorUser: User = {
  id: 'doc-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  role: 'doctor',
  capabilities: ['prescriptionAuthoring', 'emrRecordsAccess', 'consultationWorkstation'],
};

const otherDoctorUser: User = {
  id: 'doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  role: 'doctor',
  capabilities: ['prescriptionAuthoring', 'emrRecordsAccess', 'consultationWorkstation'],
};

const receptionistUser: User = {
  id: 'usr-rec-1',
  name: 'Priya Sharma',
  email: 'p.sharma@beaconclinic.com',
  role: 'receptionist',
  capabilities: ['prescriptionAuthoring', 'patientRegistration'],
};

const adminUser: User = {
  id: 'usr-admin',
  name: 'Dr. Marcus Vance (Admin)',
  email: 'admin@beaconclinic.com',
  role: 'admin',
  capabilities: ['administrativeAccess'],
};

const patientUser: User = {
  id: 'usr-pat-1',
  name: 'Eleanor Vance',
  email: 'eleanor.vance@outpatient.clinic',
  role: 'patient',
  patientId: 'pat-1',
};

const mockAssignments: PatientAssignment[] = [
  {
    id: 'asgn-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    from: '2026-01-01',
    to: null,
    transferredBy: 'System',
    reason: 'Initial assignment',
  },
];

// Assigned physician with capabilities can prescribe
assert.strictEqual(
  canPrescribe(doctorUser, 'pat-1', mockAssignments, INITIAL_MODULES),
  true,
  'Assigned physician with prescriptionAuthoring should be allowed to prescribe'
);

// Unassigned physician cannot prescribe
assert.strictEqual(
  canPrescribe(otherDoctorUser, 'pat-1', mockAssignments, INITIAL_MODULES),
  false,
  'Unassigned physician cannot prescribe'
);

// Doctor without prescriptionAuthoring cannot prescribe
const doctorWithoutPresc: User = {
  id: 'doc-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  role: 'doctor',
  capabilities: ['emrRecordsAccess', 'consultationWorkstation'],
};
const modulesWithoutPrescribing = INITIAL_MODULES.map((m) =>
  m.id === 'mod-clinical'
    ? { ...m, accessIds: m.accessIds.filter((a) => a !== 'prescriptionAuthoring') }
    : m
);
assert.strictEqual(
  canPrescribe(doctorWithoutPresc, 'pat-1', mockAssignments, modulesWithoutPrescribing),
  false,
  'Doctor without prescriptionAuthoring capability cannot prescribe'
);

// Receptionist cannot prescribe even with capability
assert.strictEqual(
  canPrescribe(receptionistUser, 'pat-1', mockAssignments, INITIAL_MODULES),
  false,
  'Receptionist can never prescribe'
);

// canCancelPrescription tests
const rxToCancel: Prescription = {
  id: 'rx-cancel-test',
  prescriptionNumber: 'RX-2026-9999',
  patientId: 'pat-1',
  patientName: 'Eleanor Vance',
  doctorId: 'doc-1',
  doctorName: 'Dr. Marcus Vance',
  date: '2026-10-18',
  diagnosis: 'Hypertension',
  items: [validItem],
  status: 'active',
};

// Original issuing doctor can cancel
assert.strictEqual(
  canCancelPrescription(doctorUser, rxToCancel, INITIAL_MODULES),
  true,
  'Original issuing doctor can cancel prescription'
);

// Administrator can cancel
assert.strictEqual(
  canCancelPrescription(adminUser, rxToCancel, INITIAL_MODULES),
  true,
  'Administrator with administrativeAccess can cancel prescription'
);

// Different doctor cannot cancel
assert.strictEqual(
  canCancelPrescription(otherDoctorUser, rxToCancel, INITIAL_MODULES),
  false,
  'Non-issuing, non-admin doctor cannot cancel prescription'
);

// Receptionist cannot cancel
assert.strictEqual(
  canCancelPrescription(receptionistUser, rxToCancel, INITIAL_MODULES),
  false,
  'Receptionist cannot cancel prescription'
);

// Patient cannot cancel
assert.strictEqual(
  canCancelPrescription(patientUser, rxToCancel, INITIAL_MODULES),
  false,
  'Patient cannot cancel prescription'
);

// ---------------------------------------------------------------------------
// 9. Prescription Data Scoping
// ---------------------------------------------------------------------------
console.log('  9. Testing prescription data scoping across roles...');

const allPrescriptions: Prescription[] = [
  rxToCancel,
  {
    id: 'rx-other-patient',
    prescriptionNumber: 'RX-2026-0004',
    patientId: 'pat-2',
    patientName: 'Arthur Pendelton',
    doctorId: 'doc-2',
    doctorName: 'Dr. Nathan Hayes',
    date: '2026-10-18',
    diagnosis: 'Type 2 Diabetes',
    items: [sampleItem2],
    status: 'active',
  },
];

// Receptionist sees 0 prescriptions
const receptionistScoped = getScopedPrescriptions(receptionistUser, allPrescriptions, mockAssignments);
assert.strictEqual(receptionistScoped.length, 0, 'Receptionist must see 0 prescriptions');

// Patient sees only their own prescriptions
const patientScoped = getScopedPrescriptions(patientUser, allPrescriptions, mockAssignments);
assert.strictEqual(patientScoped.length, 1, 'Patient must see only their own prescriptions');
assert.strictEqual(patientScoped[0].patientId, 'pat-1', 'Patient scoped prescriptions must match patient ID');

// Doctor sees prescriptions clinic-wide
const doctorScoped = getScopedPrescriptions(doctorUser, allPrescriptions, mockAssignments);
assert.strictEqual(doctorScoped.length, 2, 'Doctor must see clinic prescriptions in master ledger');

console.log('[TEST] All 9 prescribing and formulary test suites PASSED successfully.');
