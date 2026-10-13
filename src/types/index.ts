export type UserRole =
  | 'clinic_admin'
  | 'doctor'
  | 'patient'
  | 'receptionist'
  | 'nurse'
  | 'pharmacist'
  | 'accountant'
  | 'lab_technician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  title?: string;
  badgeNumber?: string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
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
  bloodGroup: BloodGroup;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: EmergencyContact;
  registeredDate: string;
  status: 'active' | 'inactive';
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

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  dispensed: boolean;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  date: string;
  diagnosis: string;
  items: PrescriptionItem[];
  status: 'pending' | 'partially_dispensed' | 'dispensed';
  dispensedBy?: string;
  dispensedAt?: string;
}

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

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  genericName: string;
  category: 'tablet' | 'syrup' | 'injection' | 'consumable' | 'equipment';
  currentStock: number;
  minStockLevel: number;
  unit: string;
  unitPrice: number;
  expiryDate: string;
  batchNumber: string;
  manufacturer: string;
  location: string;
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

