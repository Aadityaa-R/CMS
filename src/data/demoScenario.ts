import {
  Patient,
  Visit,
  Doctor,
  Appointment,
  InAppNotification,
  AccessAuditLogEntry,
  AccessModule,
  PatientAssignment,
  StaffAccessRecord,
} from '../types';
import { Invoice, Payment } from '../types/billing';
import { Prescription, Medicine } from '../types/prescribing';
import { Account, ClaimRequest } from '../types/storage';
import { Shift, AttendanceRecord, LeaveRequest } from '../types/attendance';
import { PendingStaffApproval } from './mockData';
import { formatLocalDate } from '../lib/time';
import { INITIAL_FORMULARY } from './formularySeed';

export interface DemoScenarioData {
  accounts: Account[];
  staff: StaffAccessRecord[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  payments: Payment[];
  patientAssignments: PatientAssignment[];
  modules: AccessModule[];
  pendingApprovals: PendingStaffApproval[];
  claimRequests: ClaimRequest[];
  leaveRequests: LeaveRequest[];
  shifts: Shift[];
  attendanceRecords: AttendanceRecord[];
  notifications: InAppNotification[];
  visits: Visit[];
  formulary: Medicine[];
  ledger: AccessAuditLogEntry[];
}

// Precomputed PBKDF2 hashes for seed accounts (iterations: 100000)
const SEED_ACCOUNT_HASHES: Record<string, { hash: string; salt: string; iterations: number }> = {
  md: {
    hash: 'd0bc09d4a015a6767fbf1d89f4422d920272cdb39b908f2188b9fc2d812f9762',
    salt: '0999a0ef8f7235d088c383097bacad09',
    iterations: 100000,
  },
  doctor: {
    hash: 'ff7f3630859cccb7c74d210401e1c4f0036e61f246949cd889dae44ee54e3ac4',
    salt: '07578474b57bf6f4105beebedc476d9e',
    iterations: 100000,
  },
  doctor2: {
    hash: 'ff7f3630859cccb7c74d210401e1c4f0036e61f246949cd889dae44ee54e3ac4',
    salt: '07578474b57bf6f4105beebedc476d9e',
    iterations: 100000,
  },
  receptionist: {
    hash: '6823bfb05eba6bb3b53fd61c8889da29f9b92d345d5193c90c2c8cca1a68c945',
    salt: 'a5037347f90e2e93a8ef52a8147abd9f',
    iterations: 100000,
  },
  receptionist2: {
    hash: 'cb4bf9598405cc18d84dab71bc9cb32b51c587c634ae971982f7010f92a163b7',
    salt: '45888ce2d2445d39a471861614dcde59',
    iterations: 100000,
  },
  patient: {
    hash: '246d36bcaf1032247ea27338b72c345ee9734111499f4e44d7b164563a73ed2e',
    salt: 'e3a24c1910e202db3fc2225405273592',
    iterations: 100000,
  },
};

/**
 * Generates the complete demonstration scenario relative to the provided timestamp.
 * Dynamic dates guarantee today and historical offsets reflect realistic clinical activity.
 */
export function generateDemoScenario(now: Date = new Date()): DemoScenarioData {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  function offsetDate(days: number, hours = 9, minutes = 0): Date {
    return new Date(y, m, d + days, hours, minutes, 0, 0);
  }

  function offsetIso(days: number, hours = 9, minutes = 0): string {
    return offsetDate(days, hours, minutes).toISOString();
  }

  function offsetLocal(days: number): string {
    return formatLocalDate(offsetDate(days));
  }

  const todayStr = offsetLocal(0);
  const yesterdayStr = offsetLocal(-1);
  const thirtyFiveDaysAgoIso = offsetIso(-35, 11, 0);

  // 1. Staff Accounts & Credentials
  // Exactly 5 staff: MD Vance, Dr. Hayes, Dr. Reed, Priya Sharma, David Kim
  // Distinct names, no shared names with any patient
  const accounts: Account[] = [
    {
      id: 'acc-md',
      username: 'md',
      email: 'm.vance@beaconclinic.com',
      fullName: 'Dr. Marcus Vance',
      phone: '+1 (555) 100-2001',
      role: 'md',
      passwordHash: SEED_ACCOUNT_HASHES.md.hash,
      passwordSalt: SEED_ACCOUNT_HASHES.md.salt,
      passwordIterations: SEED_ACCOUNT_HASHES.md.iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: offsetIso(-180),
      updatedAt: offsetIso(-180),
    },
    {
      id: 'acc-doctor',
      username: 'doctor',
      email: 'n.hayes@beaconclinic.com',
      fullName: 'Dr. Nathan Hayes',
      phone: '+1 (555) 100-2002',
      role: 'doctor',
      passwordHash: SEED_ACCOUNT_HASHES.doctor.hash,
      passwordSalt: SEED_ACCOUNT_HASHES.doctor.salt,
      passwordIterations: SEED_ACCOUNT_HASHES.doctor.iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: offsetIso(-150),
      updatedAt: offsetIso(-150),
    },
    {
      id: 'acc-doctor2',
      username: 'doctor2',
      email: 's.reed@beaconclinic.com',
      fullName: 'Dr. Sophia Reed',
      phone: '+1 (555) 100-2003',
      role: 'doctor',
      passwordHash: SEED_ACCOUNT_HASHES.doctor2.hash,
      passwordSalt: SEED_ACCOUNT_HASHES.doctor2.salt,
      passwordIterations: SEED_ACCOUNT_HASHES.doctor2.iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: offsetIso(-120),
      updatedAt: offsetIso(-120),
    },
    {
      id: 'acc-receptionist',
      username: 'receptionist',
      email: 'p.sharma@beaconclinic.com',
      fullName: 'Priya Sharma',
      phone: '+1 (555) 100-3001',
      role: 'receptionist',
      passwordHash: SEED_ACCOUNT_HASHES.receptionist.hash,
      passwordSalt: SEED_ACCOUNT_HASHES.receptionist.salt,
      passwordIterations: SEED_ACCOUNT_HASHES.receptionist.iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: offsetIso(-180),
      updatedAt: offsetIso(-180),
    },
    {
      id: 'acc-receptionist2',
      username: 'receptionist2',
      email: 'd.kim@beaconclinic.com',
      fullName: 'David Kim',
      phone: '+1 (555) 100-3002',
      role: 'receptionist',
      passwordHash: SEED_ACCOUNT_HASHES.receptionist2.hash,
      passwordSalt: SEED_ACCOUNT_HASHES.receptionist2.salt,
      passwordIterations: SEED_ACCOUNT_HASHES.receptionist2.iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: offsetIso(-90),
      updatedAt: offsetIso(-90),
    },
    {
      id: 'acc-patient',
      username: 'patient',
      email: 'eleanor.wright@email.com',
      fullName: 'Eleanor Wright',
      phone: '+1 (555) 234-5678',
      role: 'patient',
      passwordHash: SEED_ACCOUNT_HASHES.patient.hash,
      passwordSalt: SEED_ACCOUNT_HASHES.patient.salt,
      passwordIterations: SEED_ACCOUNT_HASHES.patient.iterations,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: offsetIso(-60),
      updatedAt: offsetIso(-60),
    },
  ];

  // 2. Staff Access Records (single source of truth for access)
  const staff: StaffAccessRecord[] = [
    {
      id: 'acc-doc-1',
      role: 'md',
      staffName: 'Dr. Marcus Vance',
      staffTitle: 'Managing Director & Chief Physician',
      department: 'Internal Medicine & Management',
      badgeNumber: 'MD-001',
      status: 'granted',
      isOriginalAdmin: true,
      lastUpdated: offsetLocal(-180),
      updatedBy: 'System Bootstrap',
      reason: 'Original Managing Director and Clinic Administrator',
    },
    {
      id: 'acc-doc-2',
      role: 'doctor',
      staffName: 'Dr. Nathan Hayes',
      staffTitle: 'Staff Consulting Physician',
      department: 'General Medicine & Triage',
      badgeNumber: 'DOC-102',
      status: 'granted',
      lastUpdated: offsetLocal(-150),
      updatedBy: 'Dr. Marcus Vance',
      reason: 'Active consulting clinical staff',
    },
    {
      id: 'acc-doc-3',
      role: 'doctor',
      staffName: 'Dr. Sophia Reed',
      staffTitle: 'Staff Consulting Physician',
      department: 'Outpatient & Family Medicine',
      badgeNumber: 'DOC-103',
      status: 'granted',
      lastUpdated: offsetLocal(-120),
      updatedBy: 'Dr. Marcus Vance',
      reason: 'Active consulting clinical staff',
    },
    {
      id: 'acc-rec-1',
      role: 'receptionist',
      staffName: 'Priya Sharma',
      staffTitle: 'Lead Front Desk Coordinator',
      department: 'Reception & Triage',
      badgeNumber: 'REC-301',
      status: 'granted',
      lastUpdated: offsetLocal(-180),
      updatedBy: 'Dr. Marcus Vance',
      reason: 'Lead reception desk coordinator',
    },
    {
      id: 'acc-rec-2',
      role: 'receptionist',
      staffName: 'David Kim',
      staffTitle: 'Front Desk Intake Specialist',
      department: 'Reception & Triage',
      badgeNumber: 'REC-302',
      status: 'granted',
      lastUpdated: offsetLocal(-90),
      updatedBy: 'Dr. Marcus Vance',
      reason: 'Front desk admissions and intake specialist',
    },
  ];

  // 3. Doctors Registry
  const doctors: Doctor[] = [
    {
      id: 'doc-1',
      name: 'Dr. Marcus Vance',
      specialization: 'Internal Medicine & General Practice',
      qualification: 'MD, FACP',
      department: 'Internal Medicine & Management',
      phone: '+1 (555) 100-2001',
      email: 'm.vance@beaconclinic.com',
      consultationFee: 12000, // 12000 cents ($120.00)
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consultationHours: '09:00 AM - 04:30 PM',
      status: 'active',
      roomNumber: 'Consultation Desk 1',
    },
    {
      id: 'doc-2',
      name: 'Dr. Nathan Hayes',
      specialization: 'General Medicine & Triage',
      qualification: 'MBBS, MD',
      department: 'General Medicine',
      phone: '+1 (555) 100-2002',
      email: 'n.hayes@beaconclinic.com',
      consultationFee: 9000, // 9000 cents ($90.00)
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consultationHours: '09:00 AM - 05:00 PM',
      status: 'active',
      roomNumber: 'Consultation Desk 2',
    },
    {
      id: 'doc-3',
      name: 'Dr. Sophia Reed',
      specialization: 'Outpatient & Family Medicine',
      qualification: 'MBBS, Dip. Card',
      department: 'Family Medicine',
      phone: '+1 (555) 100-2003',
      email: 's.reed@beaconclinic.com',
      consultationFee: 11000, // 11000 cents ($110.00)
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
      consultationHours: '09:30 AM - 04:00 PM',
      status: 'active',
      roomNumber: 'Consultation Desk 3',
    },
  ];

  // 4. Patients Registry
  const patients: Patient[] = [
    {
      id: 'pat-1',
      mrn: 'MRN-84291',
      firstName: 'Eleanor',
      lastName: 'Wright',
      gender: 'female',
      dob: '1985-04-12',
      age: 41,
      phone: '+1 (555) 234-5678',
      email: 'eleanor.wright@email.com',
      address: '742 Evergreen Terrace, Springfield',
      bloodGroup: 'A+',
      allergies: ['Penicillin', 'Peanuts'],
      chronicConditions: ['Mild Hypertension'],
      lastVisitDate: offsetLocal(-14),
      currentMedications: ['Amlodipine Besylate 5mg', 'Hydrochlorothiazide 12.5mg'],
      previousVitals: {
        recordedAt: offsetLocal(-14),
        systolicBp: 132,
        diastolicBp: 86,
        heartRateBpm: 76,
        oxygenSaturationPct: 98,
        temperatureCelsius: 36.9,
      },
      emergencyContact: {
        name: 'Robert Wright',
        relationship: 'Spouse',
        phone: '+1 (555) 234-9988',
      },
      registeredDate: offsetLocal(-60),
      registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      status: 'active',
    },
    {
      id: 'pat-2',
      mrn: 'MRN-84292',
      firstName: 'James',
      lastName: 'Miller',
      gender: 'male',
      dob: '1972-11-03',
      age: 53,
      phone: '+1 (555) 345-6789',
      email: 'james.miller@email.com',
      address: '104 Oak Ridge Way, Riverdale',
      bloodGroup: 'O+',
      allergies: ['Sulfa drugs'],
      chronicConditions: ['Type 2 Diabetes'],
      lastVisitDate: todayStr,
      currentMedications: ['Metformin 500mg'],
      previousVitals: {
        recordedAt: todayStr,
        systolicBp: 128,
        diastolicBp: 82,
        heartRateBpm: 72,
        oxygenSaturationPct: 99,
        temperatureCelsius: 36.7,
      },
      emergencyContact: {
        name: 'Sarah Miller',
        relationship: 'Spouse',
        phone: '+1 (555) 345-9988',
      },
      registeredDate: offsetLocal(-45),
      registeredBy: { id: 'acc-rec-2', name: 'David Kim' },
      status: 'active',
    },
    {
      id: 'pat-3',
      mrn: 'MRN-84293',
      firstName: 'Clara',
      lastName: 'Thornton',
      gender: 'female',
      dob: '1992-07-19',
      age: 34,
      phone: '+1 (555) 456-7890',
      email: 'clara.thornton@email.com',
      address: '58 Maple Street, Highpoint',
      bloodGroup: 'B+',
      allergies: ['Latex'],
      chronicConditions: ['Asthma'],
      lastVisitDate: offsetLocal(-28),
      currentMedications: ['Albuterol Inhaler 90mcg'],
      previousVitals: {
        recordedAt: offsetLocal(-28),
        systolicBp: 118,
        diastolicBp: 78,
        heartRateBpm: 80,
        oxygenSaturationPct: 97,
        temperatureCelsius: 36.8,
      },
      emergencyContact: {
        name: 'George Thornton',
        relationship: 'Sibling',
        phone: '+1 (555) 456-9988',
      },
      registeredDate: offsetLocal(-30),
      registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      status: 'active',
    },
    {
      id: 'pat-4',
      mrn: 'MRN-84294',
      firstName: 'Arthur',
      lastName: 'Dent',
      gender: 'male',
      dob: '1980-01-15',
      age: 46,
      phone: '+1 (555) 567-8901',
      email: 'arthur.dent@email.com',
      address: '42 Cottington Lane, Cottington',
      bloodGroup: 'AB+',
      allergies: [],
      chronicConditions: [],
      lastVisitDate: offsetLocal(-60),
      currentMedications: [],
      emergencyContact: {
        name: 'Ford Prefect',
        relationship: 'Friend',
        phone: '+1 (555) 567-9988',
      },
      registeredDate: offsetLocal(-20),
      registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      status: 'active',
    },
    {
      id: 'pat-5',
      mrn: 'MRN-84295',
      firstName: 'Fiona',
      lastName: 'Gallagher',
      gender: 'female',
      dob: '1997-09-24',
      age: 29,
      phone: '+1 (555) 678-9012',
      email: 'fiona.g@email.com',
      address: '2119 South Wallace, Chicago',
      bloodGroup: 'O-',
      allergies: [],
      chronicConditions: [],
      lastVisitDate: offsetLocal(-40),
      currentMedications: [],
      emergencyContact: {
        name: 'Ian Gallagher',
        relationship: 'Sibling',
        phone: '+1 (555) 678-9988',
      },
      registeredDate: offsetLocal(-15),
      registeredBy: { id: 'acc-rec-2', name: 'David Kim' },
      status: 'active',
    },
    {
      id: 'pat-6',
      mrn: 'MRN-84296',
      firstName: 'Robert',
      lastName: 'Chen',
      gender: 'male',
      dob: '1964-03-30',
      age: 62,
      phone: '+1 (555) 789-0123',
      email: 'robert.chen@email.com',
      address: '88 Harbour View, Seattle',
      bloodGroup: 'A-',
      allergies: ['Aspirin'],
      chronicConditions: ['Hyperlipidemia'],
      lastVisitDate: offsetLocal(-35),
      currentMedications: ['Atorvastatin 20mg'],
      previousVitals: {
        recordedAt: offsetLocal(-35),
        systolicBp: 135,
        diastolicBp: 84,
        heartRateBpm: 70,
        oxygenSaturationPct: 98,
        temperatureCelsius: 36.6,
      },
      emergencyContact: {
        name: 'Lisa Chen',
        relationship: 'Spouse',
        phone: '+1 (555) 789-9988',
      },
      registeredDate: offsetLocal(-40),
      registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      status: 'active',
    },
    {
      id: 'pat-7',
      mrn: 'MRN-84297',
      firstName: 'Maya',
      lastName: 'Lin',
      gender: 'female',
      dob: '1988-12-05',
      age: 37,
      phone: '+1 (555) 890-1234',
      email: 'maya.lin@email.com',
      address: '12 Studio Plaza, New York',
      bloodGroup: 'B-',
      allergies: [],
      chronicConditions: [],
      lastVisitDate: offsetLocal(-5),
      currentMedications: [],
      emergencyContact: {
        name: 'Kevin Lin',
        relationship: 'Spouse',
        phone: '+1 (555) 890-9988',
      },
      registeredDate: offsetLocal(-5),
      registeredBy: { id: 'acc-rec-2', name: 'David Kim' },
      status: 'active',
    },
  ];

  // 5. Patient Primary Physician Assignments
  const patientAssignments: PatientAssignment[] = [
    {
      id: 'asgn-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      from: `${offsetLocal(-60)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'Primary cardiovascular clinical assignment',
    },
    {
      id: 'asgn-2',
      patientId: 'pat-2',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      from: `${offsetLocal(-45)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'Diabetic metabolic management assignment',
    },
    {
      id: 'asgn-3',
      patientId: 'pat-3',
      doctorId: 'doc-2',
      doctorName: 'Dr. Nathan Hayes',
      from: `${offsetLocal(-30)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'Asthma respiratory management assignment',
    },
    {
      id: 'asgn-4',
      patientId: 'pat-4',
      doctorId: 'doc-3',
      doctorName: 'Dr. Sophia Reed',
      from: `${offsetLocal(-20)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'General outpatient family medicine assignment',
    },
    {
      id: 'asgn-5',
      patientId: 'pat-5',
      doctorId: 'doc-2',
      doctorName: 'Dr. Nathan Hayes',
      from: `${offsetLocal(-15)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'General outpatient triage assignment',
    },
    {
      id: 'asgn-6',
      patientId: 'pat-6',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      from: `${offsetLocal(-40)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'Cardiovascular lipid management assignment',
    },
    {
      id: 'asgn-7',
      patientId: 'pat-7',
      doctorId: 'doc-3',
      doctorName: 'Dr. Sophia Reed',
      from: `${offsetLocal(-5)}T09:00:00`,
      to: null,
      transferredBy: 'Dr. Marcus Vance',
      reason: 'Outpatient wellness assignment',
    },
  ];

  // 6. Appointments
  const appointments: Appointment[] = [
    {
      id: 'apt-today-waiting',
      appointmentNumber: 'APT-2026-101',
      patientId: 'pat-3',
      patientName: 'Clara Thornton',
      patientPhone: '+1 (555) 456-7890',
      doctorId: 'doc-2',
      doctorName: 'Dr. Nathan Hayes',
      department: 'General Medicine',
      dateTime: `${todayStr}T10:00:00`,
      durationMinutes: 30,
      status: 'checked_in', // Waiting in lounge
      tokenNumber: 2,
      source: 'walk_in',
      checkedInAt: `${todayStr}T09:45:00`,
      checkedInBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      reasonForVisit: 'Routine asthma check and prescription refill',
      notes: 'Mild wheezing on exertion; requested inhaler evaluation.',
    },
    {
      id: 'apt-today-consultation',
      appointmentNumber: 'APT-2026-102',
      patientId: 'pat-1',
      patientName: 'Eleanor Wright',
      patientPhone: '+1 (555) 234-5678',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      department: 'Internal Medicine',
      dateTime: `${todayStr}T09:30:00`,
      durationMinutes: 30,
      status: 'in_consultation',
      tokenNumber: 1,
      source: 'walk_in',
      checkedInAt: `${todayStr}T09:15:00`,
      checkedInBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      reasonForVisit: 'Blood pressure monitoring and medication review',
      notes: 'Occasional morning lightheadedness; seated BP taken.',
    },
    {
      id: 'apt-today-completed',
      appointmentNumber: 'APT-2026-103',
      patientId: 'pat-2',
      patientName: 'James Miller',
      patientPhone: '+1 (555) 345-6789',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      department: 'Internal Medicine',
      dateTime: `${todayStr}T08:30:00`,
      durationMinutes: 30,
      status: 'completed',
      tokenNumber: 0,
      source: 'reception',
      checkedInAt: `${todayStr}T08:15:00`,
      checkedInBy: { id: 'acc-rec-2', name: 'David Kim' },
      reasonForVisit: 'Follow-up diabetic glucose management',
      notes: 'HbA1c steady; renewed oral hypoglycemic regimen.',
    },
    {
      id: 'apt-today-booked',
      appointmentNumber: 'APT-2026-104',
      patientId: 'pat-4',
      patientName: 'Arthur Dent',
      patientPhone: '+1 (555) 567-8901',
      doctorId: 'doc-3',
      doctorName: 'Dr. Sophia Reed',
      department: 'Family Medicine',
      dateTime: `${todayStr}T15:30:00`,
      durationMinutes: 30,
      status: 'scheduled',
      tokenNumber: 0,
      source: 'reception',
      bookedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
      reasonForVisit: 'General wellness physical examination',
      notes: 'Annual comprehensive preventive health check.',
    },
    {
      id: 'apt-yesterday-noshow',
      appointmentNumber: 'APT-2026-095',
      patientId: 'pat-5',
      patientName: 'Fiona Gallagher',
      patientPhone: '+1 (555) 678-9012',
      doctorId: 'doc-2',
      doctorName: 'Dr. Nathan Hayes',
      department: 'General Medicine',
      dateTime: `${yesterdayStr}T14:00:00`,
      durationMinutes: 30,
      status: 'no_show',
      tokenNumber: 0,
      source: 'reception',
      bookedBy: { id: 'acc-rec-2', name: 'David Kim' },
      reasonForVisit: 'Acute throat irritation consultation',
      notes: 'Patient did not arrive or answer confirmation call.',
      needsReschedule: true,
    },
  ];

  // 7. Electronic Prescriptions
  const prescriptions: Prescription[] = [
    {
      id: 'rx-today-1',
      prescriptionNumber: 'RX-2026-901',
      appointmentId: 'apt-today-completed',
      visitId: 'apt-today-completed',
      patientId: 'pat-2',
      patientName: 'James Miller',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      date: todayStr,
      diagnosis: 'Type 2 Diabetes Mellitus - Glycemic Maintenance',
      status: 'active',
      items: [
        {
          id: 'item-rx-1',
          medicineId: 'med-metformin-500',
          medicineName: 'Metformin Hydrochloride 500mg',
          strength: '500mg',
          form: 'Tablet',
          route: 'oral',
          dose: { amount: 1, unit: 'tablet' },
          frequency: 'Twice daily',
          timing: 'With food',
          duration: '30 days',
          quantity: 60,
          refills: 1,
          instructions: 'Take orally with morning and evening meals',
        },
      ],
    },
    {
      id: 'rx-hist-1',
      prescriptionNumber: 'RX-2026-801',
      patientId: 'pat-1',
      patientName: 'Eleanor Wright',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      date: offsetLocal(-14),
      diagnosis: 'Essential Mild Hypertension',
      status: 'active',
      items: [
        {
          id: 'item-rx-2',
          medicineId: 'med-amlodipine-5',
          medicineName: 'Amlodipine Besylate 5mg',
          strength: '5mg',
          form: 'Tablet',
          route: 'oral',
          dose: { amount: 1, unit: 'tablet' },
          frequency: 'Once daily',
          timing: 'Morning',
          duration: '30 days',
          quantity: 30,
          refills: 2,
          instructions: 'Take in the morning with water',
        },
      ],
    },
  ];

  // 8. Invoices and Financial Ledger
  const invoices: Invoice[] = [
    {
      id: 'inv-today-1',
      number: 'INV-2026-901',
      appointmentId: 'apt-today-completed',
      visitId: 'apt-today-completed',
      patientId: 'pat-2',
      patientName: 'James Miller',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      issuedAt: `${todayStr}T09:05:00`,
      status: 'paid',
      items: [
        {
          id: 'item-today-1',
          description: 'Standard Clinical Consultation',
          amount: 12000, // 12000 cents
          kind: 'consultation',
        },
      ],
      createdBy: { id: 'acc-rec-2', name: 'David Kim' },
    },
    {
      id: 'inv-old-unpaid',
      number: 'INV-2026-089',
      patientId: 'pat-6',
      patientName: 'Robert Chen',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      issuedAt: thirtyFiveDaysAgoIso,
      status: 'unpaid',
      items: [
        {
          id: 'item-old-1',
          description: 'Comprehensive Specialist Consultation',
          amount: 15000, // 15000 cents ($150.00)
          kind: 'consultation',
        },
      ],
      createdBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay-today-1',
      receiptNumber: 'RCT-2026-0901',
      invoiceId: 'inv-today-1',
      amount: 12000, // 12000 cents ($120.00)
      method: 'card',
      kind: 'payment',
      reference: 'TXN-CARD-901',
      receivedAt: `${todayStr}T09:08:00`,
      receivedBy: { id: 'acc-rec-2', name: 'David Kim' },
      note: 'Settled in full via contactless terminal',
    },
  ];

  // 9. System Access Modules (single source of truth for access)
  const modules: AccessModule[] = [
    {
      id: 'mod-clinical',
      name: 'Clinical',
      description: 'Core clinical assessments, outpatient consultations, EMR records, and e-prescribing',
      isSystem: true,
      accessIds: [
        'consultationWorkstation',
        'emrRecordsAccess',
        'prescriptionAuthoring',
        'consultingCalendar',
      ],
      memberIds: ['acc-doc-1', 'acc-doc-2', 'acc-doc-3'],
      createdBy: 'System Bootstrap',
      createdAt: offsetIso(-180),
    },
    {
      id: 'mod-frontdesk',
      name: 'Front Desk',
      description: 'Outpatient arrival intake, patient registration, check-in queue, and payment receipts',
      isSystem: true,
      accessIds: [
        'patientRegistration',
        'patientCheckIn',
        'paymentRecording',
      ],
      memberIds: ['acc-rec-1', 'acc-rec-2'],
      createdBy: 'System Bootstrap',
      createdAt: offsetIso(-180),
    },
    {
      id: 'mod-admin',
      name: 'Administration',
      description: 'Clinic governance, staff access control, module membership, and security ledger management',
      isSystem: true,
      accessIds: [
        'administrativeAccess',
        'attendanceManagement',
      ],
      memberIds: ['acc-doc-1'],
      createdBy: 'System Bootstrap',
      createdAt: offsetIso(-180),
    },
  ];

  // 10. Pending Staff Clearance Request (exactly 1 pending)
  const pendingApprovals: PendingStaffApproval[] = [
    {
      id: 'pend-doc-1',
      role: 'doctor',
      staffName: 'Dr. Clara Oswald',
      staffTitle: 'Staff Consulting Physician',
      department: 'Pediatrics & Adolescent Care',
      badgeNumber: 'DOC-104',
      specialization: 'Pediatrics',
      consultationFee: 11000, // 11000 cents
      requestedAt: `${yesterdayStr} 09:30`,
      notes: 'Board certification in Pediatrics verified; awaiting MD clearance authorization.',
    },
  ];

  // 11. Leave Requests (exactly 1 pending request)
  const leaveRequests: LeaveRequest[] = [
    {
      id: 'leave-pending-1',
      staffId: 'acc-rec-1',
      staffName: 'Priya Sharma',
      type: 'Casual',
      fromDate: offsetLocal(4),
      toDate: offsetLocal(5),
      reason: 'Personal travel and family commitment',
      status: 'pending',
      requestedAt: offsetIso(-1, 14, 20),
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
    },
  ];

  // 12. Account Link Claim Requests (exactly 1 pending request)
  const claimRequests: ClaimRequest[] = [
    {
      id: 'claim-pending-1',
      accountId: 'acc-claim-1',
      accountName: 'Maya Lin',
      accountEmail: 'maya.lin@email.com',
      accountPhone: '+1 (555) 890-1234',
      dob: '1988-12-05',
      existingPatientId: 'pat-7',
      existingMrn: 'MRN-84297',
      status: 'pending',
      requestedAt: offsetIso(-1, 16, 45),
    },
  ];

  // 13. Staff Shifts & Roster
  const shifts: Shift[] = [
    {
      id: 'shift-doc-1',
      staffId: 'acc-doc-1',
      staffName: 'Dr. Marcus Vance',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start: '09:00',
      end: '17:00',
      graceMinutes: 15,
    },
    {
      id: 'shift-doc-2',
      staffId: 'acc-doc-2',
      staffName: 'Dr. Nathan Hayes',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start: '09:00',
      end: '17:00',
      graceMinutes: 15,
    },
    {
      id: 'shift-doc-3',
      staffId: 'acc-doc-3',
      staffName: 'Dr. Sophia Reed',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'],
      start: '09:30',
      end: '16:00',
      graceMinutes: 15,
    },
    {
      id: 'shift-rec-1',
      staffId: 'acc-rec-1',
      staffName: 'Priya Sharma',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start: '08:30',
      end: '17:00',
      graceMinutes: 15,
    },
    {
      id: 'shift-rec-2',
      staffId: 'acc-rec-2',
      staffName: 'David Kim',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start: '08:30',
      end: '17:00',
      graceMinutes: 15,
    },
  ];

  // 14. Attendance Records for Today
  const attendanceRecords: AttendanceRecord[] = [
    {
      id: `att-doc-1-${todayStr}`,
      staffId: 'acc-doc-1',
      staffName: 'Dr. Marcus Vance',
      date: todayStr,
      clockIn: `${todayStr}T08:55:00.000Z`,
      clockOut: null,
    },
    {
      id: `att-doc-2-${todayStr}`,
      staffId: 'acc-doc-2',
      staffName: 'Dr. Nathan Hayes',
      date: todayStr,
      clockIn: `${todayStr}T08:58:00.000Z`,
      clockOut: null,
    },
    {
      id: `att-rec-1-${todayStr}`,
      staffId: 'acc-rec-1',
      staffName: 'Priya Sharma',
      date: todayStr,
      clockIn: `${todayStr}T08:25:00.000Z`,
      clockOut: null,
    },
    {
      id: `att-rec-2-${todayStr}`,
      staffId: 'acc-rec-2',
      staffName: 'David Kim',
      date: todayStr,
      clockIn: `${todayStr}T08:28:00.000Z`,
      clockOut: null,
    },
  ];

  // 15. In-App Notifications
  const notifications: InAppNotification[] = [
    {
      id: 'notif-1',
      recipientId: 'pat-1',
      title: 'Welcome to Beacon Health Patient Portal',
      message: 'You can review clinical visit summaries, medications, and settle invoices online.',
      type: 'general',
      read: false,
      createdAt: offsetIso(-60),
      linkTab: 'appointments',
    },
  ];

  // 16. Security & Audit Ledger
  const ledger: AccessAuditLogEntry[] = [
    {
      id: 'audit-init-1',
      timestamp: offsetIso(-180),
      action: 'system_initialized',
      subject: 'Clinic Operating System',
      role: 'system',
      details: 'Demonstration scenario baseline initialized successfully.',
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    },
    {
      id: 'audit-init-2',
      timestamp: `${todayStr}T08:15:00.000Z`,
      action: 'patient_checked_in',
      subject: 'Patient Check-in',
      role: 'receptionist',
      details: 'Patient James Miller checked in for scheduled consultation.',
      authorizedBy: 'David Kim',
    },
  ];

  // Generate 2 to 5 demo visits per patient with realistic changing vitals
  const visits: Visit[] = [];
  const completedApts = appointments.filter((a) => a.status === 'completed');
  for (const apt of completedApts) {
    visits.push({
      id: `visit-apt-${apt.id}`,
      patientId: apt.patientId,
      appointmentId: apt.id,
      doctorId: apt.doctorId,
      date: apt.dateTime,
      reason: apt.reasonForVisit || 'Routine Clinical Consultation',
      vitals: {
        systolicBp: 122 + ((visits.length * 3) % 20),
        diastolicBp: 80 + ((visits.length * 2) % 12),
        heartRateBpm: 68 + ((visits.length * 5) % 22),
        oxygenSaturationPct: 98 - (visits.length % 2),
        temperatureCelsius: Number((36.6 + (visits.length % 5) * 0.1).toFixed(1)),
      },
      notes: apt.notes || 'Consultation concluded. Vitals within clinical review standards.',
    });
  }

  patients.forEach((p, pIdx) => {
    const existing = visits.filter((v) => v.patientId === p.id);
    const targetCount = 2 + (pIdx % 4); // 2, 3, 4, 5
    const needed = Math.max(0, targetCount - existing.length);

    const reasons = [
      p.chronicConditions?.[0] ? `Follow-up for ${p.chronicConditions[0]}` : 'General Examination',
      'Blood pressure screening and clinical review',
      'Seasonal allergy and respiratory evaluation',
      'Medication efficacy review and refill consultation',
      'Preventative clinical checkup',
    ];

    const baseSys = p.previousVitals?.systolicBp ?? 124;
    const baseDia = p.previousVitals?.diastolicBp ?? 82;
    const baseHr = p.previousVitals?.heartRateBpm ?? 72;
    const baseSpo2 = p.previousVitals?.oxygenSaturationPct ?? 98;
    const baseTemp = p.previousVitals?.temperatureCelsius ?? 36.8;

    for (let i = 0; i < needed; i++) {
      const daysAgo = 18 * (i + 1) + 8 + (pIdx % 6);
      const visitDate = offsetIso(-daysAgo, 9 + ((i + pIdx) % 5), 15);
      const sysDelta = (i % 2 === 0 ? 1 : -1) * (4 + i * 2);
      const diaDelta = (i % 2 === 0 ? 1 : -1) * (2 + i * 2);
      const hrDelta = i % 2 === 0 ? 4 : -3;

      visits.push({
        id: `visit-demo-${p.id}-${i + 1}`,
        patientId: p.id,
        doctorId: patientAssignments.find((a) => a.patientId === p.id)?.doctorId || (i % 2 === 0 ? 'doc-1' : 'doc-2'),
        date: visitDate,
        reason: reasons[i % reasons.length],
        vitals: {
          systolicBp: Math.max(98, Math.min(150, baseSys + sysDelta)),
          diastolicBp: Math.max(62, Math.min(94, baseDia + diaDelta)),
          heartRateBpm: Math.max(62, Math.min(98, baseHr + hrDelta)),
          oxygenSaturationPct: Math.min(100, Math.max(95, baseSpo2 - (i % 2))),
          temperatureCelsius: Number((baseTemp + (i % 2 === 0 ? 0.2 : -0.2)).toFixed(1)),
        },
        notes: `Clinical evaluation for ${p.firstName} ${p.lastName}. Vitals reviewed and treatment plan updated.`,
      });
    }
  });

  return {
    accounts,
    staff,
    doctors,
    patients,
    appointments,
    prescriptions,
    invoices,
    payments,
    patientAssignments,
    modules,
    pendingApprovals,
    claimRequests,
    leaveRequests,
    shifts,
    attendanceRecords,
    notifications,
    formulary: INITIAL_FORMULARY,
    ledger,
    visits,
  };
}
