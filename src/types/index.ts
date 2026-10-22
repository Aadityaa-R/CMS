export type UserRole =
  | 'md'
  | 'doctor'
  | 'receptionist'
  | 'patient'
  | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  title?: string;
  badgeNumber?: string;
  isOriginalAdmin?: boolean;
  patientId?: string;
  claimPending?: boolean;
  status?: string;
  moduleIds?: string[];
}

export interface PatientAssignment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  from: string;
  to: string | null;
  transferredBy: string;
  reason: string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface PreviousVitals {
  recordedAt: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  oxygenSaturationPct?: number;
  temperatureCelsius?: number;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  bloodGroup?: BloodGroup;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: EmergencyContact;
  registeredDate: string;
  status: 'active' | 'inactive';
  lastVisitDate?: string;
  currentMedications?: string[];
  previousVitals?: PreviousVitals;
  registeredAt?: string;
  registeredBy?: { id: string; name: string } | null;
  source?: 'walk_in' | 'reception' | 'web' | 'online' | string;
  createdAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  department: string;
  phone: string;
  email: string;
  consultationFee: number;
  availableDays: string[];
  consultationHours: string;
  status: 'active' | 'on_leave' | 'inactive';
  roomNumber: string;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentSource = 'walk_in' | 'reception' | 'web';

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  dateTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reasonForVisit: string;
  tokenNumber: number;
  notes?: string;
  source?: AppointmentSource;
  checkedInAt?: string | null;
  checkedInBy?: { id: string; name: string } | null;
  bookedBy?: { id: string; name: string } | null;
  cancelledBy?: { id: string; name: string } | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  rescheduledFrom?: string | null;
  needsReschedule?: boolean;
  consultationRoom?: string;
  chiefComplaint?: string;
}

export interface InAppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'booking' | 'cancellation' | 'reschedule' | 'leave' | 'general' | 'checkin' | 'completion' | string;
  read: boolean;
  createdAt: string;
  linkTab?: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;
  systolicBp: number;
  diastolicBp: number;
  heartRateBpm: number;
  temperatureCelsius: number;
  respiratoryRate: number;
  oxygenSaturationPct: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
}

export * from './prescribing';

export type LabTestStatus =
  | 'ordered'
  | 'sample_collected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface LabTest {
  id: string;
  testOrderNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  testName: string;
  category: string;
  sampleType: string;
  status: LabTestStatus;
  orderedAt: string;
  sampleCollectedAt?: string;
  completedAt?: string;
  technicianName?: string;
  result?: string;
  referenceRange?: string;
  unit?: string;
  clinicalNotes?: string;
  priority: 'routine' | 'urgent' | 'stat';
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'consultation' | 'medication' | 'lab_test' | 'procedure' | 'room';
  unitPrice: number;
  quantity: number;
  total: number;
}

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'insurance' | 'bank_transfer' | 'upi';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method?: PaymentMethod;
  notes?: string;
}


export interface ClinicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  diagnosis: string;
  treatmentPlan: string;
  vitalSigns?: VitalSigns;
}

export interface RoleCredential {
  role: UserRole;
  username: string;
  email: string;
  password: string;
  label: string;
  department: string;
  fullName: string;
  description: string;
}

export type StandardCapability =
  | 'administrativeAccess'
  | 'consultationWorkstation'
  | 'emrRecordsAccess'
  | 'prescriptionAuthoring'
  | 'consultingCalendar'
  | 'patientRegistration'
  | 'patientCheckIn'
  | 'paymentRecording'
  | 'attendanceManagement'
  | (string & {});

export interface AccessModule {
  id: string;
  name: string;
  description?: string;
  accessIds: StandardCapability[];
  memberIds: string[];
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
}

export interface StaffPermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface StaffAccessRecord {
  id: string;
  role: UserRole;
  staffName: string;
  staffTitle: string;
  department: string;
  badgeNumber: string;
  status: 'granted' | 'revoked';
  lastUpdated: string;
  updatedBy: string;
  reason?: string;
  permissions?: StaffPermission[];
  moduleIds?: string[];
  isOriginalAdmin?: boolean;
}

export interface AccessAuditLogEntry {
  id: string;
  timestamp: string;
  targetRole?: UserRole | 'system' | string;
  targetStaffName?: string;
  targetUserId?: string;
  capability?: string;
  oldState?: string;
  newState?: string;
  action:
    | 'access_granted'
    | 'access_revoked'
    | 'permission_updated'
    | 'security_override'
    | 'account_deleted'
    | 'clearance_rejected'
    | 'module_created'
    | 'module_renamed'
    | 'module_deleted'
    | 'module_access_included'
    | 'module_access_removed'
    | 'module_member_added'
    | 'module_member_removed'
    | 'leave_approved'
    | 'leave_rejected'
    | 'attendance_record_corrected'
    | 'shift_updated'
    | 'attendance_clock_in_override'
    | 'patient_registered'
    | 'patient_checked_in'
    | 'walkin_checked_in'
    | 'appointment_scheduled'
    | 'storage_mode_changed'
    | 'data_exported'
    | 'data_restored'
    | 'data_restored_undo'
    | 'demo_data_reset'
    | 'account_link_approved'
    | 'account_link_rejected'
    | 'account_claim_requested'
    | 'patient_self_registered'
    | 'staff_clearance_requested'
    | 'capability_granted'
    | 'capability_revoked'
    | 'account_provisioned'
    | 'payment_recorded'
    | 'portal_payment'
    | 'charge_added'
    | 'discount_applied'
    | 'invoice_voided'
    | 'payment_reversed'
    | 'user_login'
    | 'account_locked'
    | 'account_unlocked'
    | 'password_reset'
    | 'clearance_approved'
    | 'attendance_clock_in'
    | 'attendance_clock_out'
    | 'leave_requested'
    | 'appointment_cancelled'
    | 'appointment_rescheduled'
    | 'vitals_recorded'
    | 'consultation_started'
    | 'consultation_concluded'
    | 'care_transferred'
    | 'patient_assigned'
    | 'prescription_issued'
    | 'prescription_cancelled'
    | 'allergy_override'
    | 'data_imported'
    | 'invoice_issued'
    | string;
  description?: string;
  details?: string;
  subject?: string;
  role?: string;
  authorizedBy: string;
}


