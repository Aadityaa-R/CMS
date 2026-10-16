import { StandardCapability } from '@/types';

export interface AccessItem {
  id: StandardCapability;
  label: string;
  description: string;
}

/**
 * Fixed catalog of system access privileges.
 * Designed so later milestones can add entries in this single file.
 * Administrators cannot invent new access identifiers.
 */
export const ACCESS_CATALOG: AccessItem[] = [
  {
    id: 'administrativeAccess',
    label: 'Administrative Access',
    description: 'Clinic configuration, staff access control, module governance, and master security ledger authority.',
  },
  {
    id: 'consultationWorkstation',
    label: 'Consultation Workstation',
    description: 'Conduct patient visits, clinical assessments, vitals recording, and manage consultation triage.',
  },
  {
    id: 'emrRecordsAccess',
    label: 'EMR Records Access',
    description: 'Review patient medical records, chronic conditions history, clinical notes, and diagnostic vitals.',
  },
  {
    id: 'prescriptionAuthoring',
    label: 'Prescription Authoring',
    description: 'Generate, sign, and dispense electronic outpatient prescriptions (applies to doctors only; requires EMR access).',
  },
  {
    id: 'consultingCalendar',
    label: 'Consulting Calendar',
    description: 'Manage attending physician schedule, appointment slots, and view the patient consultation queue.',
  },
  {
    id: 'patientRegistration',
    label: 'Patient Registration',
    description: 'Enroll new outpatients, verify demographic profiles, and generate permanent Medical Record Numbers (MRN).',
  },
  {
    id: 'patientCheckIn',
    label: 'Patient Check-in',
    description: 'Queue admission, triage status assignment, and token dispatch for arriving clinic patients.',
  },
  {
    id: 'paymentRecording',
    label: 'Payment Recording',
    description: 'Record patient consultation fee payments, issue billing receipts, and handle cashier collections.',
  },
  {
    id: 'attendanceManagement',
    label: 'Attendance Management',
    description: 'View clinic-wide staff attendance, approve or reject leave, set staff shifts, and correct attendance records.',
  },
];

export function registerCustomAccess(item: AccessItem): void {
  if (!ACCESS_CATALOG.some((a) => a.id === item.id)) {
    ACCESS_CATALOG.push(item);
  }
}

export function getAccessItem(id: StandardCapability | string): AccessItem | undefined {
  return ACCESS_CATALOG.find((item) => item.id === id);
}

export function isValidAccessId(id: string): id is StandardCapability {
  return ACCESS_CATALOG.some((item) => item.id === id);
}

