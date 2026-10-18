import { describe, it, expect } from 'vitest';
import { Appointment, Patient, User, PatientAssignment } from '../src/types';
import {
  calculateWaitTimeMinutes,
  formatCheckedInBy,
  formatRegisteredBy,
  validateWalkInExistingArrival,
  validateBookedArrival,
  getTodayIntakeLogs,
} from '../src/lib/reception';
import {
  scopePatientForReceptionist,
  scopeAppointmentForReceptionist,
} from '../src/lib/permissions';

describe('Reception Workstation and Intake Flows (M4 & M9.5 Hardening)', () => {
  const receptionistUser: User = {
    id: 'acc-rec-1',
    name: 'Priya Sharma',
    email: 'p.sharma@beaconclinic.com',
    role: 'receptionist',
    moduleIds: ['mod-front-desk'],
    status: 'active',
  };

  const sampleClinicalPatient: Patient = {
    id: 'pat-test-1',
    mrn: 'MRN-99991',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'male',
    dob: '1980-05-20',
    age: 46,
    phone: '+1 (555) 123-4567',
    email: 'john.doe@test.com',
    address: '123 Test St',
    bloodGroup: 'AB+',
    allergies: ['Penicillin', 'Sulfa'],
    chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    currentMedications: ['Metformin', 'Lisinopril'],
    emergencyContact: { name: 'Emergency Contact', relationship: 'Spouse', phone: '+1 555-9999' },
    status: 'active',
    registeredDate: '2026-10-16',
    createdAt: '2026-10-16T08:30:00',
  };

  const sampleApt: Appointment = {
    id: 'apt-sample-1',
    appointmentNumber: 'APT-2026-0001',
    patientId: 'pat-test-1',
    patientName: 'John Doe',
    patientPhone: '+1 (555) 123-4567',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    department: 'General Medicine',
    dateTime: '2026-10-16T09:00:00',
    durationMinutes: 30,
    status: 'scheduled',
    reasonForVisit: 'General checkup',
    tokenNumber: 1,
    consultationRoom: 'Exam Room 1',
  };

  describe('Clinical Field Stripping for Receptionist', () => {
    it('strips clinical fields while preserving demographics', () => {
      const scoped = scopePatientForReceptionist(sampleClinicalPatient);
      expect(scoped.allergies).toEqual([]);
      expect(scoped.chronicConditions).toEqual([]);
      expect(scoped.currentMedications).toEqual([]);
      expect(scoped.bloodGroup).toBeUndefined();
      expect(scoped.firstName).toBe('John');
      expect(scoped.mrn).toBe('MRN-99991');
    });

    it('strips clinical consultation notes from appointments', () => {
      const aptWithNotes: Appointment = {
        ...sampleApt,
        chiefComplaint: 'Chest tightness',
        notes: 'Clinical observations: elevated troponin',
      };
      const scopedApt = scopeAppointmentForReceptionist(aptWithNotes);
      expect(scopedApt.notes).toBeUndefined();
      expect(scopedApt.patientName).toBe('John Doe');
    });
  });

  describe('Arrival Flow Validations', () => {
    const existingPatientAssignments: PatientAssignment[] = [
      {
        id: 'asgn-1',
        patientId: 'pat-1',
        doctorId: 'doc-1', // Dr. Vance (Mon-Fri)
        from: '2026-01-01',
        to: null,
        transferredBy: 'Admin',
        reason: 'Initial assignment',
      },
    ];

    it('validates walk-in arrival with available assigned doctor', () => {
      // Friday 2026-10-16 (Dr. Vance working)
      const res = validateWalkInExistingArrival(
        receptionistUser,
        'pat-1',
        existingPatientAssignments,
        '2026-10-16'
      );
      expect(res.allowed).toBe(true);
    });

    it('rejects walk-in arrival when assigned doctor is not on duty', () => {
      // Sunday 2026-10-18 (Dr. Vance off-duty)
      const res = validateWalkInExistingArrival(
        receptionistUser,
        'pat-1',
        existingPatientAssignments,
        '2026-10-18'
      );
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe(
        'Assigned doctor is not available today. Reassignment requires an administrator.'
      );
    });

    it('validates booked arrival for today', () => {
      const bookedApt: Appointment = {
        ...sampleApt,
        dateTime: '2026-10-16T11:00:00',
        status: 'scheduled',
      };
      const res = validateBookedArrival(receptionistUser, bookedApt, '2026-10-16');
      expect(res.allowed).toBe(true);

      const wrongDateRes = validateBookedArrival(receptionistUser, bookedApt, '2026-10-17');
      expect(wrongDateRes.allowed).toBe(false);
    });
  });

  describe('Wait Time and Name Formatting Helpers', () => {
    it('calculates wait time in minutes accurately', () => {
      const refTime = new Date('2026-10-16T10:30:00Z');
      const checkInTime = '2026-10-16T10:15:00Z';
      expect(calculateWaitTimeMinutes(checkInTime, refTime)).toBe(15);
      expect(calculateWaitTimeMinutes(null, refTime)).toBe(0);
    });

    it('formats checkedInBy and registeredBy actor display names', () => {
      expect(formatCheckedInBy({ id: 'acc-rec-1', name: 'Priya Sharma' })).toBe('Priya Sharma');
      expect(formatCheckedInBy(null)).toBe('Not recorded');
      expect(formatRegisteredBy({ id: 'acc-rec-2', name: 'David Kim' })).toBe('David Kim');
      expect(formatRegisteredBy(null)).toBe('Not recorded');
    });
  });

  describe('Intake Registry Log and Doctor Name Normalization (M9.5 Requirement E)', () => {
    it('formats intake log with single "Dr." prefix (never "Dr. Dr.")', () => {
      const todayPatients: Patient[] = [
        {
          ...sampleClinicalPatient,
          id: 'pat-today-1',
          registeredAt: '2026-10-16T08:30:00',
          registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        },
      ];

      const todayAppointmentsList: Appointment[] = [
        {
          ...sampleApt,
          id: 'apt-today-1',
          doctorName: 'Dr. Marcus Vance', // Already prefixed with "Dr."
          dateTime: '2026-10-16T09:00:00',
          status: 'checked_in',
          tokenNumber: 1,
          checkedInAt: '2026-10-16T08:45:00',
          checkedInBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        },
      ];

      const logs = getTodayIntakeLogs(todayPatients, todayAppointmentsList, '2026-10-16');

      expect(logs.length).toBe(2);
      expect(logs[0].type).toBe('Check-in');
      expect(logs[1].type).toBe('Registration');

      // Crucial fix: Must be "Token #1 - Dr. Marcus Vance", NOT "Token #1 - Dr. Dr. Marcus Vance"
      expect(logs[0].details).toBe('Token #1 - Dr. Marcus Vance');
      expect(logs[1].details).toBe('MRN: MRN-99991');
    });
  });
});
