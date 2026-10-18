/**
 * Clinic Management System - Prescribing and Formulary Types
 *
 * Notice: The formulary, medication dosages, and allergy rules contained in this
 * application are demonstration data only and do not constitute clinical guidance.
 */

export type DrugClass =
  | 'analgesic'
  | 'antibiotic'
  | 'antihypertensive'
  | 'antidiabetic'
  | 'lipid_lowering'
  | 'gastric'
  | 'respiratory'
  | 'antihistamine'
  | 'vitamin'
  | 'other';

export type MedicineForm =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Inhaler'
  | 'Cream'
  | 'Drops'
  | 'Injection';

export type FrequencyOption =
  | 'Once daily'
  | 'Twice daily'
  | 'Three times daily'
  | 'Four times daily'
  | 'Every 8 hours'
  | 'At bedtime'
  | 'As needed';

export type TimingOption =
  | 'Before food'
  | 'After food'
  | 'With food'
  | 'Morning'
  | 'Evening'
  | 'Any time';

export interface Medicine {
  id: string;
  genericName: string;
  brandNames?: string[];
  drugClass: DrugClass;
  form: MedicineForm;
  strengths: string[];
  defaultRoute: string;
  active: boolean;
}

export interface PrescriptionDose {
  amount: number;
  unit: string;
}

export interface PrescriptionItem {
  id: string;
  medicineId: string; // or '__other__' when custom
  customName?: string;
  medicineName?: string; // friendly name / legacy fallback
  dosage?: string; // legacy dosage string
  strength: string;
  form: MedicineForm;
  route: string;
  dose: PrescriptionDose;
  frequency: FrequencyOption;
  timing: TimingOption;
  duration: string; // e.g. '3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing'
  quantity: number;
  refills: number; // 0 to 3
  instructions: string; // max 200 characters
  dispensed?: boolean;
  legacyText?: string;
}

export interface AllergyOverride {
  allergen: string;
  medicine: string;
  reason: string;
}

export type PrescriptionStatus =
  | 'active'
  | 'cancelled'
  | 'pending'
  | 'partially_dispensed'
  | 'dispensed';

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  visitId?: string;
  date: string; // YYYY-MM-DD
  diagnosis: string;
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  cancelledBy?: {
    id: string;
    name: string;
    role?: string;
  };
  cancelledAt?: string;
  cancelReason?: string;
  allergyOverrides?: AllergyOverride[];
  dispensedBy?: string;
  dispensedAt?: string;
}

export interface AllergenRule {
  allergenKey: string;
  targetClasses?: DrugClass[];
  targetMedicines?: string[]; // normalized names
  warningMessage: string;
}

export interface AllergyCheckResult {
  allergen: string;
  medicine: string;
  message: string;
  isCustomRule?: boolean;
}

export interface DuplicateWarning {
  type: 'same_medicine' | 'same_class';
  medicine: string;
  message: string;
}

