import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env
const envText = fs.readFileSync('C:/Users/raadi/Downloads/CMS/.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or Key not found in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

// Password hashes from storage.ts
const SEED_ACCOUNT_HASHES = {
  md: {
    hash: 'd0bc09d4a015a6767fbf1d89f4422d920272cdb39b908f2188b9fc2d812f9762',
    salt: '0999a0ef8f7235d088c383097bacad09',
    iterations: 100000,
  },
  receptionist: {
    hash: '6823bfb05eba6bb3b53fd61c8889da29f9b92d345d5193c90c2c8cca1a68c945',
    salt: 'a5037347f90e2e93a8ef52a8147abd9f',
    iterations: 100000,
  },
  patient: {
    hash: '246d36bcaf1032247ea27338b72c345ee9734111499f4e44d7b164563a73ed2e',
    salt: 'e3a24c1910e202db3fc2225405273592',
    iterations: 100000,
  },
};

const today = new Date().toISOString().split('T')[0];
const now = new Date().toISOString();

// 1. Staff: 1 Doctor + 1 Receptionist + 3 Outpatient Directory Entries
const staff = [
  {
    id: 'doc-1',
    role: 'doctor',
    staffName: 'Dr. Marcus Vance',
    staffTitle: 'Managing Director & Chief Physician',
    department: 'Internal Medicine & General Practice',
    badgeNumber: 'DOC-101',
    status: 'granted',
    lastUpdated: '2026-10-27 08:00',
    updatedBy: 'System Superadmin',
    reason: 'Managing Director clinical leadership',
    moduleIds: ['mod-admin', 'mod-clinical'],
    consultationFee: 12000,
    specialization: 'Internal Medicine & Cardiology',
    permissions: [
      { id: 'perm-admin', name: 'Administrative Access', description: 'Promote to clinic administrator', enabled: true },
      { id: 'perm-consult', name: 'Consultation Workstation', description: 'Conduct patient visits', enabled: true },
      { id: 'perm-emr', name: 'EMR Records Access', description: 'Review medical records', enabled: true },
      { id: 'perm-presc', name: 'Prescription Authoring', description: 'Generate prescriptions', enabled: true },
      { id: 'perm-schedule', name: 'Consulting Calendar', description: 'Manage personal schedule', enabled: true },
    ]
  },
  {
    id: 'rec-1',
    role: 'receptionist',
    staffName: 'Priya Sharma',
    staffTitle: 'Front Desk Lead Coordinator',
    department: 'Front Desk & Admissions',
    badgeNumber: 'REC-301',
    status: 'granted',
    lastUpdated: '2026-10-27 08:00',
    updatedBy: 'Dr. Marcus Vance (Managing Director)',
    reason: 'Admissions and triage lead',
    moduleIds: ['mod-frontdesk'],
    permissions: [
      { id: 'perm-register', name: 'Patient Registration', description: 'Enroll new outpatients', enabled: true },
      { id: 'perm-checkin', name: 'Patient Check-in', description: 'Check in waiting patients', enabled: true },
      { id: 'perm-payment', name: 'Payment Recording', description: 'Record payments', enabled: true },
    ]
  },
  {
    id: 'acc-pat-1',
    role: 'patient',
    staffName: 'Eleanor Wright',
    staffTitle: 'Registered Patient Portal',
    department: 'Outpatient Care',
    badgeNumber: 'MRN-84291',
    status: 'granted',
    lastUpdated: '2026-10-27 08:00',
    updatedBy: 'Priya Sharma (Front Desk Lead Coordinator)',
    reason: 'Verified outpatient medical record',
    moduleIds: [],
    permissions: []
  },
  {
    id: 'acc-pat-2',
    role: 'patient',
    staffName: 'James Miller',
    staffTitle: 'Registered Patient Portal',
    department: 'Outpatient Care',
    badgeNumber: 'MRN-84292',
    status: 'granted',
    lastUpdated: '2026-10-27 08:00',
    updatedBy: 'Priya Sharma (Front Desk Lead Coordinator)',
    reason: 'Verified outpatient medical record',
    moduleIds: [],
    permissions: []
  },
  {
    id: 'acc-pat-3',
    role: 'patient',
    staffName: 'Clara Thornton',
    staffTitle: 'Registered Patient Portal',
    department: 'Outpatient Care',
    badgeNumber: 'MRN-84293',
    status: 'granted',
    lastUpdated: '2026-10-27 08:00',
    updatedBy: 'Priya Sharma (Front Desk Lead Coordinator)',
    reason: 'Verified outpatient medical record',
    moduleIds: [],
    permissions: []
  }
];

// 2. Patients: 3 Patients
const patients = [
  {
    id: 'pat-1',
    mrn: 'MRN-84291',
    firstName: 'Eleanor',
    lastName: 'Wright',
    gender: 'female',
    dob: '1985-04-12',
    age: 41,
    phone: '+1 (555) 234-5678',
    email: 'eleanor.wright@example.com',
    address: '742 Evergreen Terrace, Suite 4B',
    bloodGroup: 'A+',
    allergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Hypertension', 'Mild Asthma'],
    emergencyContact: {
      name: 'Robert Wright',
      relationship: 'Spouse',
      phone: '+1 (555) 234-5679'
    },
    registeredDate: today,
    registeredAt: now,
    status: 'active',
    registeredBy: { id: 'rec-1', name: 'Priya Sharma' },
    source: 'reception'
  },
  {
    id: 'pat-2',
    mrn: 'MRN-84292',
    firstName: 'James',
    lastName: 'Miller',
    gender: 'male',
    dob: '1972-09-20',
    age: 54,
    phone: '+1 (555) 876-5432',
    email: 'j.miller@example.com',
    address: '1088 Elm Boulevard, Apt 12',
    bloodGroup: 'O+',
    allergies: ['Aspirin'],
    chronicConditions: ['Type 2 Diabetes'],
    emergencyContact: {
      name: 'Sarah Miller',
      relationship: 'Daughter',
      phone: '+1 (555) 876-5433'
    },
    registeredDate: today,
    registeredAt: now,
    status: 'active',
    registeredBy: { id: 'rec-1', name: 'Priya Sharma' },
    source: 'reception'
  },
  {
    id: 'pat-3',
    mrn: 'MRN-84293',
    firstName: 'Clara',
    lastName: 'Thornton',
    gender: 'female',
    dob: '1997-02-15',
    age: 29,
    phone: '+1 (555) 345-6789',
    email: 'clara.t@example.com',
    address: '52 Ocean View Avenue',
    bloodGroup: 'B+',
    allergies: [],
    chronicConditions: [],
    emergencyContact: {
      name: 'David Thornton',
      relationship: 'Brother',
      phone: '+1 (555) 345-6780'
    },
    registeredDate: today,
    registeredAt: now,
    status: 'active',
    registeredBy: { id: 'rec-1', name: 'Priya Sharma' },
    source: 'walk_in'
  }
];

// 3. User Accounts for Authentication
const accounts = [
  {
    id: 'acc-md',
    username: 'md',
    email: 'm.vance@beaconclinic.com',
    fullName: 'Dr. Marcus Vance',
    phone: '+1 (555) 018-9922',
    role: 'doctor',
    passwordHash: SEED_ACCOUNT_HASHES.md.hash,
    passwordSalt: SEED_ACCOUNT_HASHES.md.salt,
    passwordIterations: SEED_ACCOUNT_HASHES.md.iterations,
    status: 'active',
    failedLoginAttempts: 0,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'acc-receptionist',
    username: 'receptionist',
    email: 'receptionist@beaconclinic.com',
    fullName: 'Priya Sharma',
    phone: '+1 (555) 014-4421',
    role: 'receptionist',
    passwordHash: SEED_ACCOUNT_HASHES.receptionist.hash,
    passwordSalt: SEED_ACCOUNT_HASHES.receptionist.salt,
    passwordIterations: SEED_ACCOUNT_HASHES.receptionist.iterations,
    status: 'active',
    failedLoginAttempts: 0,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'acc-patient',
    username: 'patient',
    email: 'eleanor.wright@example.com',
    fullName: 'Eleanor Wright',
    phone: '+1 (555) 234-5678',
    role: 'patient',
    passwordHash: SEED_ACCOUNT_HASHES.patient.hash,
    passwordSalt: SEED_ACCOUNT_HASHES.patient.salt,
    passwordIterations: SEED_ACCOUNT_HASHES.patient.iterations,
    status: 'active',
    linkedPatientId: 'pat-1',
    failedLoginAttempts: 0,
    createdAt: now,
    updatedAt: now
  }
];

// 4. Appointments
const appointments = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    patientPhone: '+1 (555) 234-5678',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: today,
    time: '09:00',
    timeBucket: '09:00 - 10:00',
    reason: 'Hypertension routine follow-up and prescription review',
    status: 'completed',
    tokenNumber: 1,
    checkedInBy: { id: 'rec-1', name: 'Priya Sharma' },
    bookedBy: { id: 'rec-1', name: 'Priya Sharma' },
    bookedAt: now,
    createdAt: now
  },
  {
    id: 'apt-2',
    patientId: 'pat-2',
    patientName: 'James Miller',
    patientPhone: '+1 (555) 876-5432',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: today,
    time: '10:30',
    timeBucket: '10:00 - 11:00',
    reason: 'Diabetic routine check and blood sugar monitoring',
    status: 'in_consultation',
    tokenNumber: 2,
    checkedInBy: { id: 'rec-1', name: 'Priya Sharma' },
    bookedBy: { id: 'rec-1', name: 'Priya Sharma' },
    bookedAt: now,
    createdAt: now
  },
  {
    id: 'apt-3',
    patientId: 'pat-3',
    patientName: 'Clara Thornton',
    patientPhone: '+1 (555) 345-6789',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: today,
    time: '11:15',
    timeBucket: '11:00 - 12:00',
    reason: 'Seasonal respiratory allergies and mild cough',
    status: 'waiting',
    tokenNumber: 3,
    checkedInBy: { id: 'rec-1', name: 'Priya Sharma' },
    bookedBy: { id: 'rec-1', name: 'Priya Sharma' },
    bookedAt: now,
    createdAt: now
  }
];

// 5. Visits
const visits = [
  {
    id: 'vis-1',
    appointmentId: 'apt-1',
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: today,
    time: '09:15',
    reason: 'Blood pressure routine monitoring and medication refill',
    chiefComplaint: 'Blood pressure routine monitoring and medication refill',
    vitals: {
      systolicBp: 128,
      diastolicBp: 82,
      heartRateBpm: 74,
      oxygenSaturationPct: 98,
      temperatureCelsius: 36.8
    },
    notes: 'Primary essential hypertension, well controlled. Continue current therapy. Prescribed 30-day refill.',
    status: 'completed'
  }
];

// 6. Formulary Medicines
const formulary = [
  { id: 'med-1', name: 'Amoxicillin', genericName: 'Amoxicillin', dosage: '500mg', form: 'capsule', category: 'Antibiotic', stock: 120, unitPrice: 1500 },
  { id: 'med-2', name: 'Paracetamol', genericName: 'Acetaminophen', dosage: '650mg', form: 'tablet', category: 'Analgesic', stock: 250, unitPrice: 500 },
  { id: 'med-3', name: 'Amlodipine', genericName: 'Amlodipine Besylate', dosage: '5mg', form: 'tablet', category: 'Antihypertensive', stock: 180, unitPrice: 1200 },
  { id: 'med-4', name: 'Metformin', genericName: 'Metformin HCl', dosage: '500mg', form: 'tablet', category: 'Antidiabetic', stock: 200, unitPrice: 1000 },
  { id: 'med-5', name: 'Cetirizine', genericName: 'Cetirizine HCl', dosage: '10mg', form: 'tablet', category: 'Antihistamine', stock: 140, unitPrice: 800 },
  { id: 'med-6', name: 'Omeprazole', genericName: 'Omeprazole', dosage: '20mg', form: 'capsule', category: 'Antacid', stock: 160, unitPrice: 1400 }
];

// 7. Prescriptions
const prescriptions = [
  {
    id: 'rx-1',
    visitId: 'vis-1',
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: today,
    status: 'active',
    items: [
      {
        id: 'rx-item-1',
        medicineId: 'med-3',
        medicineName: 'Amlodipine 5mg',
        dosage: '5mg',
        frequency: 'Once daily (morning)',
        duration: '30 days',
        instructions: 'Take after breakfast with water'
      }
    ],
    issuedAt: now
  }
];

// 8. Invoices & Payments
const invoices = [
  {
    id: 'inv-1',
    number: 'INV-2026-001',
    patientId: 'pat-1',
    patientName: 'Eleanor Wright',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    issuedAt: now,
    status: 'paid',
    items: [
      { id: 'item-1', description: 'Consultation Fee — Dr. Marcus Vance', amount: 12000, kind: 'consultation' }
    ],
    createdBy: { id: 'rec-1', name: 'Priya Sharma' }
  },
  {
    id: 'inv-2',
    number: 'INV-2026-002',
    patientId: 'pat-2',
    patientName: 'James Miller',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    issuedAt: now,
    status: 'unpaid',
    items: [
      { id: 'item-2', description: 'Consultation Fee — Dr. Marcus Vance', amount: 12000, kind: 'consultation' }
    ],
    createdBy: { id: 'rec-1', name: 'Priya Sharma' }
  }
];

const payments = [
  {
    id: 'pay-1',
    invoiceId: 'inv-1',
    receiptNumber: 'RCT-1001',
    amount: 12000,
    method: 'card',
    kind: 'payment',
    receivedAt: now,
    receivedBy: { id: 'rec-1', name: 'Priya Sharma' },
    reference: 'AUTH-VISA-9821'
  }
];

// 9. Roles / Modules
const roles = [
  {
    id: 'mod-admin',
    name: 'Executive Administration',
    description: 'System governance, user provisioning, security ledger & policy enforcement',
    accessIds: ['administrativeAccess', 'consultationWorkstation', 'patientRegistration', 'patientCheckIn', 'paymentRecording'],
    memberIds: ['doc-1']
  },
  {
    id: 'mod-clinical',
    name: 'Clinical Consultations',
    description: 'Outpatient clinical desk, vitals documentation & electronic prescribing',
    accessIds: ['consultationWorkstation', 'prescribingAuthoring', 'consultationCalendar'],
    memberIds: ['doc-1']
  },
  {
    id: 'mod-frontdesk',
    name: 'Front Desk Admissions',
    description: 'Patient check-in, token dispatch, visit scheduling & payment recording',
    accessIds: ['patientRegistration', 'patientCheckIn', 'paymentRecording', 'consultationCalendar'],
    memberIds: ['rec-1']
  }
];

// 10. Patient Assignments
const patient_assignments = [
  { id: 'asgn-1', patientId: 'pat-1', doctorId: 'doc-1', assignedDate: today },
  { id: 'asgn-2', patientId: 'pat-2', doctorId: 'doc-1', assignedDate: today },
  { id: 'asgn-3', patientId: 'pat-3', doctorId: 'doc-1', assignedDate: today }
];

// 11. Attendance
const attendance = [
  {
    id: 'att-1',
    staffId: 'doc-1',
    staffName: 'Dr. Marcus Vance',
    date: today,
    clockIn: '08:30',
    status: 'present',
    hoursWorked: 3.5
  },
  {
    id: 'att-2',
    staffId: 'rec-1',
    staffName: 'Priya Sharma',
    date: today,
    clockIn: '08:00',
    status: 'present',
    hoursWorked: 4.0
  }
];

// 12. Leave Requests
const leave_requests = [
  {
    id: 'leave-1',
    staffId: 'rec-1',
    staffName: 'Priya Sharma',
    type: 'Casual',
    fromDate: '2026-11-05',
    toDate: '2026-11-06',
    reason: 'Family event and personal commitment',
    status: 'pending',
    requestedAt: now,
    decidedBy: null,
    decidedAt: null,
    decisionNote: null
  }
];

// 13. Shifts
const shifts = [
  {
    id: 'shift-1',
    staffId: 'doc-1',
    staffName: 'Dr. Marcus Vance',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '08:30',
    end: '17:00',
    graceMinutes: 15
  },
  {
    id: 'shift-2',
    staffId: 'rec-1',
    staffName: 'Priya Sharma',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    start: '08:00',
    end: '16:30',
    graceMinutes: 15
  }
];

// 14. Approvals (Pending staff clearance request)
const approvals = [
  {
    id: 'pend-doc-1',
    role: 'doctor',
    staffName: 'Dr. Clara Oswald',
    staffTitle: 'Staff Consulting Physician',
    department: 'Pediatric & Family Medicine',
    badgeNumber: 'DOC-104',
    specialization: 'Pediatrics',
    consultationFee: 11000,
    requestedAt: now,
    notes: 'Board certified pediatrician seeking clinical workstation access clearance.'
  }
];

// 15. Claim Requests (Patient portal account linkage)
const claim_requests = [
  {
    id: 'claim-1',
    accountId: 'acc-patient-2',
    accountEmail: 'j.miller@example.com',
    accountPhone: '+1 (555) 876-5432',
    accountName: 'James Miller',
    dob: '1972-09-20',
    existingPatientId: 'pat-2',
    existingMrn: 'MRN-84292',
    requestedAt: now,
    status: 'pending',
    decisionNote: 'Patient portal registration self-claim for medical records access.',
    decidedBy: null,
    decidedAt: null
  }
];

// 16. Security Ledger
const ledger = [
  {
    id: `audit-${Date.now()}-1`,
    timestamp: now,
    action: 'clinic_initialized',
    subject: 'Beacon Health Clinic',
    role: 'system',
    details: 'System database initialized with core staff and verified outpatient directory.',
    authorizedBy: 'System Superadmin'
  },
  {
    id: `audit-${Date.now()}-2`,
    timestamp: now,
    action: 'access_granted',
    subject: 'Dr. Marcus Vance',
    role: 'doctor',
    details: 'Executive governance clearance granted to Managing Director.',
    authorizedBy: 'System Superadmin'
  },
  {
    id: `audit-${Date.now()}-3`,
    timestamp: now,
    action: 'access_granted',
    subject: 'Priya Sharma',
    role: 'receptionist',
    details: 'Front desk admissions and intake clearance granted.',
    authorizedBy: 'Dr. Marcus Vance (Managing Director)'
  }
];

// 17. Notifications
const notifications = [
  {
    id: 'notif-1',
    recipientId: 'acc-md',
    title: 'Clinic Initialized',
    message: 'Welcome Dr. Vance. The clinic database is live with 3 scheduled patients today.',
    type: 'general',
    read: false,
    createdAt: now,
    linkTab: 'dashboard'
  },
  {
    id: 'notif-2',
    recipientId: 'acc-receptionist',
    title: 'Admissions Active',
    message: 'Front desk queue active: 1 patient waiting, 1 in consultation.',
    type: 'general',
    read: false,
    createdAt: now,
    linkTab: 'dashboard'
  }
];

// Execute minimal seeding
async function seedMinimal() {
  console.log('====================================================');
  console.log('Seeding Minimal Dataset into ALL Supabase Tables...');
  console.log('URL:', url);
  console.log('Target: 1 Doctor, 1 Receptionist, 3 Patients');
  console.log('====================================================');

  const tablesToSeed = [
    { table: 'accounts', items: accounts },
    { table: 'staff', items: staff },
    { table: 'patients', items: patients },
    { table: 'patient_assignments', items: patient_assignments },
    { table: 'appointments', items: appointments },
    { table: 'visits', items: visits },
    { table: 'prescriptions', items: prescriptions },
    { table: 'invoices', items: invoices },
    { table: 'payments', items: payments },
    { table: 'attendance', items: attendance },
    { table: 'leave_requests', items: leave_requests },
    { table: 'shifts', items: shifts },
    { table: 'roles', items: roles },
    { table: 'approvals', items: approvals },
    { table: 'claim_requests', items: claim_requests },
    { table: 'ledger', items: ledger },
    { table: 'notifications', items: notifications },
    { table: 'formulary', items: formulary }
  ];

  for (const { table, items } of tablesToSeed) {
    // 1. Clear existing rows
    const { error: clearError } = await supabase.from(table).delete().neq('id', '');
    if (clearError) {
      console.warn(`Warning clearing table '${table}':`, clearError.message);
    }

    // 2. Insert minimal items
    if (items.length > 0) {
      const rows = items.map((item) => ({
        id: item.id,
        data: item,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from(table).upsert(rows);
      if (insertError) {
        console.error(`Error inserting into '${table}':`, insertError.message);
      } else {
        console.log(`✓ Table '${table}': ${items.length} records inserted.`);
      }
    }
  }

  console.log('\nAll tables seeded with minimal connected data successfully!');
}

seedMinimal().catch(console.error);
