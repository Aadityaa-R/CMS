import { describe, it, expect } from 'vitest';
import {
  formatRegimen,
  calculateQuantity,
  validatePrescription,
  validateItem,
  checkDuplicates,
  activeMedications,
  migrateLegacyPrescription,
} from '../src/lib/prescribing';
import {
  canPrescribe,
  canCancelPrescription,
  canViewPrescription,
} from '../src/lib/permissions';
import { getScopedPrescriptions } from '../src/lib/selectors';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { INITIAL_MODULES } from '../src/data/mockData';
import { Prescription, PrescriptionItem } from '../src/types/prescribing';
import { User, PatientAssignment } from '../src/types';

describe('Prescriptions and Formulary Engine (M8 & M9.5 Hardening)', () => {
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

  describe('formatRegimen', () => {
    it('formats standard sentences correctly', () => {
      expect(formatRegimen(sampleItem1)).toBe(
        'Amlodipine Besylate 5 mg tablet, 1 tablet, once daily in the morning, for 30 days, 0 refills.'
      );
    });

    it('formats ongoing duration and refills correctly', () => {
      expect(formatRegimen(sampleItem2)).toBe(
        'Metformin Hydrochloride Extended Release 500 mg tablet, 2 tablets, twice daily with food, for ongoing, 2 refills.'
      );
    });
  });

  describe('calculateQuantity', () => {
    it('calculates quantities for various frequencies and durations', () => {
      expect(calculateQuantity(1, 'Once daily', '30 days')).toBe(30);
      expect(calculateQuantity(1, 'Twice daily', '14 days')).toBe(28);
      expect(calculateQuantity(2, 'Three times daily', '10 days')).toBe(60);
      expect(calculateQuantity(1, 'Four times daily', '7 days')).toBe(28);
      expect(calculateQuantity(1, 'Every 8 hours', '5 days')).toBe(15);
      expect(calculateQuantity(1, 'At bedtime', '30 days')).toBe(30);
      expect(calculateQuantity(1, 'As needed', '30 days')).toBe(30);
      expect(calculateQuantity(1, 'Once daily', 'Ongoing')).toBe(30);
      expect(calculateQuantity(2, 'Twice daily', 'Ongoing')).toBe(120);
      expect(calculateQuantity(1.5, 'Once daily', '7 days')).toBe(11);
    });
  });

  describe('Validation Rules', () => {
    it('validates single prescription item fields', () => {
      expect(validateItem(validItem).valid).toBe(true);
      expect(validateItem({ ...validItem, dose: { amount: 0, unit: 'tablet' } }).valid).toBe(false);
      expect(validateItem({ ...validItem, medicineId: '__other__', customName: '' }).valid).toBe(false);
      expect(validateItem({ ...validItem, medicineId: '__other__', customName: 'Compounded Paste' }).valid).toBe(true);
      expect(validateItem({ ...validItem, refills: 4 }).valid).toBe(false);
    });

    it('validates entire prescription', () => {
      expect(validatePrescription(baseRx).valid).toBe(true);
      expect(validatePrescription({ ...baseRx, items: [] }).valid).toBe(false);
      const elevenItems = Array(11).fill(validItem).map((it, idx) => ({ ...it, id: `item-${idx}` }));
      expect(validatePrescription({ ...baseRx, items: elevenItems }).valid).toBe(false);
      expect(validatePrescription({ ...baseRx, diagnosis: '' }).valid).toBe(false);
    });
  });

  describe('Legacy Prescription Migration', () => {
    it('migrates legacy text prescriptions to structured items', () => {
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
      expect(migrated.items.length).toBe(2);
      expect(migrated.status).toBe('active');
      expect(migrated.items[0].medicineName).toBe('Amlodipine Besylate');
      expect(migrated.items[1].medicineName).toBe('Hydrochlorothiazide');
    });
  });

  describe('Duplicate Detection and Active Medications', () => {
    const activeRxList: Prescription[] = [baseRx];
    const testNow = new Date('2026-10-18T10:00:00Z');

    it('detects duplicate drug and duplicate drug class', () => {
      const dupDrug = checkDuplicates([validItem], activeRxList, INITIAL_FORMULARY, testNow);
      expect(dupDrug.length).toBe(1);
      expect(dupDrug[0].type).toBe('same_medicine');

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
      const dupClass = checkDuplicates([hctzItem], activeRxList, INITIAL_FORMULARY, testNow);
      expect(dupClass.length).toBe(1);
      expect(dupClass[0].type).toBe('same_class');

      const cancelledRxList: Prescription[] = [{ ...baseRx, status: 'cancelled' }];
      expect(checkDuplicates([validItem], cancelledRxList, INITIAL_FORMULARY, testNow).length).toBe(0);
    });

    it('calculates active medications accurately by date boundary', () => {
      const pastRx: Prescription = {
        ...baseRx,
        id: 'rx-past',
        date: '2026-10-01',
        items: [{ ...validItem, duration: '10 days' }], // expired 2026-10-11
      };
      const ongoingRx: Prescription = {
        ...baseRx,
        id: 'rx-ongoing',
        date: '2026-09-01',
        items: [{ ...validItem, duration: 'Ongoing' }],
      };
      const active = activeMedications('pat-1', [pastRx, ongoingRx], testNow);
      expect(active).toEqual(['Amlodipine Besylate']);

      const cancelledOngoing: Prescription = { ...ongoingRx, status: 'cancelled' };
      expect(activeMedications('pat-1', [cancelledOngoing], testNow)).toEqual([]);
    });
  });

  describe('Prescription Scoping and Authorization (M9.5 Requirement D)', () => {
    const docHayes: User = {
      id: 'acc-doc-2',
      name: 'Dr. Nathan Hayes',
      email: 'n.hayes@beaconclinic.com',
      role: 'doctor',
      moduleIds: ['mod-clinical'],
      status: 'active',
    };

    const docReed: User = {
      id: 'acc-doc-3',
      name: 'Dr. Clara Reed',
      email: 'c.reed@beaconclinic.com',
      role: 'doctor',
      moduleIds: ['mod-clinical'],
      status: 'active',
    };

    const mdUser: User = {
      id: 'acc-doc-1',
      name: 'Dr. Marcus Vance',
      email: 'm.vance@beaconclinic.com',
      role: 'doctor',
      moduleIds: ['mod-clinical', 'mod-management'],
      status: 'active',
    };

    const receptionist: User = {
      id: 'acc-rec-1',
      name: 'Priya Sharma',
      email: 'p.sharma@beaconclinic.com',
      role: 'receptionist',
      moduleIds: ['mod-front-desk'],
      status: 'active',
    };

    const patient1: User = {
      id: 'usr-pat-1',
      name: 'Eleanor Vance',
      email: 'eleanor.vance@outpatient.clinic',
      role: 'patient',
      patientId: 'pat-1',
    };

    const patient2: User = {
      id: 'usr-pat-2',
      name: 'Arthur Pendelton',
      email: 'arthur.p@outpatient.clinic',
      role: 'patient',
      patientId: 'pat-2',
    };

    const assignments: PatientAssignment[] = [
      {
        id: 'asgn-1',
        patientId: 'pat-1',
        doctorId: 'doc-2', // Hayes is assigned to Eleanor Vance (pat-1)
        from: '2026-01-01',
        to: null,
        transferredBy: 'System',
        reason: 'Initial assignment',
      },
      {
        id: 'asgn-2',
        patientId: 'pat-2',
        doctorId: 'doc-3', // Reed is assigned to Arthur Pendelton (pat-2)
        from: '2026-01-01',
        to: null,
        transferredBy: 'System',
        reason: 'Initial assignment',
      },
    ];

    const rxHayesForPat1: Prescription = {
      id: 'rx-hayes-1',
      prescriptionNumber: 'RX-2026-0101',
      patientId: 'pat-1',
      patientName: 'Eleanor Vance',
      doctorId: 'doc-2',
      doctorName: 'Dr. Nathan Hayes',
      date: '2026-10-18',
      diagnosis: 'Hypertension',
      items: [validItem],
      status: 'active',
    };

    const rxReedForPat2: Prescription = {
      id: 'rx-reed-1',
      prescriptionNumber: 'RX-2026-0102',
      patientId: 'pat-2',
      patientName: 'Arthur Pendelton',
      doctorId: 'doc-3',
      doctorName: 'Dr. Clara Reed',
      date: '2026-10-18',
      diagnosis: 'Type 2 Diabetes',
      items: [sampleItem2],
      status: 'active',
    };

    const allPrescriptions = [rxHayesForPat1, rxReedForPat2];

    it('Hayes sees only prescriptions for their assigned patient, not Reed patients', () => {
      const hayesScoped = getScopedPrescriptions(docHayes, allPrescriptions, assignments, INITIAL_MODULES);
      expect(hayesScoped.map((r) => r.id)).toEqual(['rx-hayes-1']);
      expect(canViewPrescription(docHayes, rxHayesForPat1, assignments, INITIAL_MODULES)).toBe(true);
      expect(canViewPrescription(docHayes, rxReedForPat2, assignments, INITIAL_MODULES)).toBe(false);
    });

    it('Reed sees only prescriptions for their assigned patient, not Hayes patients', () => {
      const reedScoped = getScopedPrescriptions(docReed, allPrescriptions, assignments, INITIAL_MODULES);
      expect(reedScoped.map((r) => r.id)).toEqual(['rx-reed-1']);
      expect(canViewPrescription(docReed, rxReedForPat2, assignments, INITIAL_MODULES)).toBe(true);
      expect(canViewPrescription(docReed, rxHayesForPat1, assignments, INITIAL_MODULES)).toBe(false);
    });

    it('MD sees all prescriptions clinic-wide', () => {
      const mdScoped = getScopedPrescriptions(mdUser, allPrescriptions, assignments, INITIAL_MODULES);
      expect(mdScoped.length).toBe(2);
      expect(canViewPrescription(mdUser, rxHayesForPat1, assignments, INITIAL_MODULES)).toBe(true);
      expect(canViewPrescription(mdUser, rxReedForPat2, assignments, INITIAL_MODULES)).toBe(true);
    });

    it('Doctor sees prescriptions they authored even if patient is reassigned', () => {
      // Suppose Eleanor Vance was reassigned to Dr. Reed, but Dr. Hayes was original author
      const reassigned: PatientAssignment[] = [
        {
          id: 'asgn-reassigned',
          patientId: 'pat-1',
          doctorId: 'doc-3', // Reed is now assigned
          from: '2026-10-18',
          to: null,
          transferredBy: 'Admin',
          reason: 'Doctor vacation',
        },
      ];
      // Hayes is the author of rxHayesForPat1
      expect(canViewPrescription(docHayes, rxHayesForPat1, reassigned, INITIAL_MODULES)).toBe(true);
    });

    it('Receptionist sees zero prescriptions', () => {
      const recScoped = getScopedPrescriptions(receptionist, allPrescriptions, assignments, INITIAL_MODULES);
      expect(recScoped.length).toBe(0);
      expect(canViewPrescription(receptionist, rxHayesForPat1, assignments, INITIAL_MODULES)).toBe(false);
    });

    it('Patient sees only their own prescriptions', () => {
      const p1Scoped = getScopedPrescriptions(patient1, allPrescriptions, assignments, INITIAL_MODULES);
      expect(p1Scoped.map((r) => r.id)).toEqual(['rx-hayes-1']);

      const p2Scoped = getScopedPrescriptions(patient2, allPrescriptions, assignments, INITIAL_MODULES);
      expect(p2Scoped.map((r) => r.id)).toEqual(['rx-reed-1']);
    });

    it('canPrescribe requires doctor staff with authoring, emr, and active assignment', () => {
      // Hayes is assigned to pat-1 -> can prescribe
      expect(canPrescribe(docHayes, 'pat-1', assignments, INITIAL_MODULES)).toBe(true);
      // Hayes is not assigned to pat-2 -> cannot prescribe
      expect(canPrescribe(docHayes, 'pat-2', assignments, INITIAL_MODULES)).toBe(false);
      // Receptionist cannot prescribe
      expect(canPrescribe(receptionist, 'pat-1', assignments, INITIAL_MODULES)).toBe(false);
    });

    it('canCancelPrescription permits issuing author or admin only', () => {
      // Author Hayes can cancel
      expect(canCancelPrescription(docHayes, rxHayesForPat1, INITIAL_MODULES)).toBe(true);
      // Admin MD can cancel
      expect(canCancelPrescription(mdUser, rxHayesForPat1, INITIAL_MODULES)).toBe(true);
      // Non-author doctor Reed cannot cancel
      expect(canCancelPrescription(docReed, rxHayesForPat1, INITIAL_MODULES)).toBe(false);
      // Receptionist cannot cancel
      expect(canCancelPrescription(receptionist, rxHayesForPat1, INITIAL_MODULES)).toBe(false);
      // Patient cannot cancel
      expect(canCancelPrescription(patient1, rxHayesForPat1, INITIAL_MODULES)).toBe(false);
    });
  });
});
