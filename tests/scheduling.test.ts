import { describe, it, expect } from 'vitest';
import {
  SLOT_MINUTES,
  BOOKING_LEAD_MINUTES,
  BOOKING_WINDOW_DAYS,
  CANCEL_CUTOFF_MINUTES,
  MAX_ACTIVE_BOOKINGS,
  minutesToTime,
  getAvailableSlots,
  validateBooking,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  appointmentsAffectedByLeave,
} from '../src/lib/scheduling';
import { Shift, LeaveRequest } from '../src/types/attendance';
import { Appointment } from '../src/types';

describe('Scheduling and Online Booking Engine (M7 & M9.5 Hardening)', () => {
  const mockShifts: Shift[] = [
    {
      id: 'sh-1',
      staffId: 'acc-doc-1',
      staffName: 'Dr. Marcus Vance',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start: '09:00',
      end: '17:00',
      graceMinutes: 15,
    },
    {
      id: 'sh-2',
      staffId: 'acc-doc-2',
      staffName: 'Dr. Nathan Hayes',
      days: ['Mon', 'Wed', 'Fri'],
      start: '10:00',
      end: '14:00',
      graceMinutes: 15,
    },
  ];

  const mockLeaves: LeaveRequest[] = [
    {
      id: 'lv-1',
      staffId: 'acc-doc-1',
      staffName: 'Dr. Marcus Vance',
      fromDate: '2026-10-21',
      toDate: '2026-10-22',
      reason: 'Medical Conference',
      type: 'Other',
      status: 'approved',
      requestedAt: '2026-10-15T08:00:00.000Z',
    },
  ];

  const refNow = new Date('2026-10-19T06:00:00');

  function createTestAppointment(overrides: Partial<Appointment>): Appointment {
    return {
      id: 'apt-test',
      appointmentNumber: 'APT-2026-001',
      patientId: 'pat-1',
      patientName: 'Test Patient',
      patientPhone: '+1 (555) 000-0000',
      doctorId: 'doc-1',
      doctorName: 'Dr. Marcus Vance',
      department: 'General Medicine',
      dateTime: '2026-10-19T10:00:00',
      durationMinutes: 20,
      status: 'scheduled',
      reasonForVisit: 'Consultation',
      tokenNumber: 1,
      ...overrides,
    };
  }

  describe('Scheduling Constants and Helpers', () => {
    it('enforces standardized scheduling parameters', () => {
      expect(SLOT_MINUTES).toBe(20);
      expect(BOOKING_LEAD_MINUTES).toBe(120);
      expect(BOOKING_WINDOW_DAYS).toBe(30);
      expect(CANCEL_CUTOFF_MINUTES).toBe(120);
      expect(MAX_ACTIVE_BOOKINGS).toBe(2);

      expect(minutesToTime(540)).toBe('09:00');
      expect(minutesToTime(560)).toBe('09:20');
      expect(minutesToTime(1020)).toBe('17:00');
    });

    it('books appointment cleanly using bookAppointment', () => {
      const booked = bookAppointment(
        {
          patientId: 'pat-1',
          patientName: 'Test Patient',
          patientPhone: '+1 555-0000',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          department: 'General Medicine',
          date: '2026-10-20',
          time: '10:00',
          reasonForVisit: 'Consultation',
        },
        []
      );
      expect(booked.status).toBe('scheduled');
      expect(booked.dateTime).toBe('2026-10-20T10:00:00');
      expect(booked.appointmentNumber).toBe('APT-2026-001');
    });
  });

  describe('Slot Generation Across Shifts and Leaves', () => {
    it('generates 24 twenty-minute slots on a standard working day', () => {
      const slots = getAvailableSlots('doc-1', '2026-10-19', [], mockShifts, mockLeaves, refNow);
      expect(slots.length).toBe(24);
      expect(slots[0]).toBe('09:00');
      expect(slots[slots.length - 1]).toBe('16:40');
    });

    it('generates zero slots on off-duty days, leaves, past dates, and beyond window', () => {
      // Off-duty day
      expect(getAvailableSlots('doc-1', '2026-10-24', [], mockShifts, mockLeaves, refNow).length).toBe(0);
      // Approved leave day
      expect(getAvailableSlots('doc-1', '2026-10-21', [], mockShifts, mockLeaves, refNow).length).toBe(0);
      // Past date
      expect(getAvailableSlots('doc-1', '2026-10-18', [], mockShifts, mockLeaves, refNow).length).toBe(0);
      // Beyond 30 days
      expect(getAvailableSlots('doc-1', '2026-12-01', [], mockShifts, mockLeaves, refNow).length).toBe(0);
    });

    it('filters out slots within 120-minute lead time', () => {
      const refMorning = new Date('2026-10-19T08:30:00');
      const slots = getAvailableSlots('doc-1', '2026-10-19', [], mockShifts, mockLeaves, refMorning);
      expect(slots.includes('09:00')).toBe(false);
      expect(slots.includes('10:20')).toBe(false);
      expect(slots.includes('10:40')).toBe(true);
    });
  });

  describe('Collision Detection and Booking Validation', () => {
    const existingAppointments: Appointment[] = [
      createTestAppointment({
        id: 'apt-1',
        appointmentNumber: 'APT-2026-001',
        dateTime: '2026-10-19T11:00:00',
        status: 'scheduled',
      }),
      createTestAppointment({
        id: 'apt-2',
        appointmentNumber: 'APT-2026-002',
        dateTime: '2026-10-19T14:00:00',
        status: 'cancelled', // Cancelled slot must remain open
      }),
    ];

    it('omits occupied slots and keeps cancelled slots free', () => {
      const slots = getAvailableSlots('doc-1', '2026-10-19', existingAppointments, mockShifts, mockLeaves, refNow);
      expect(slots.includes('11:00')).toBe(false);
      expect(slots.includes('14:00')).toBe(true);
    });

    it('validates booking requests and prevents double booking', () => {
      const valid = validateBooking('doc-1', '2026-10-19', '11:20', 'pat-1', existingAppointments, mockShifts, mockLeaves, refNow);
      expect(valid.allowed).toBe(true);

      const conflict = validateBooking('doc-1', '2026-10-19', '11:00', 'pat-2', existingAppointments, mockShifts, mockLeaves, refNow);
      expect(conflict.allowed).toBe(false);
    });

    it('enforces maximum 2 active bookings per patient', () => {
      const patientTwoActive: Appointment[] = [
        createTestAppointment({
          id: 'apt-p1',
          patientId: 'pat-99',
          doctorId: 'doc-1',
          dateTime: '2026-10-20T10:00:00',
          status: 'scheduled',
        }),
        createTestAppointment({
          id: 'apt-p2',
          patientId: 'pat-99',
          doctorId: 'doc-2',
          dateTime: '2026-10-23T11:00:00',
          status: 'scheduled',
        }),
      ];
      const thirdBooking = validateBooking('doc-1', '2026-10-20', '14:00', 'pat-99', patientTwoActive, mockShifts, mockLeaves, refNow);
      expect(thirdBooking.allowed).toBe(false);
      expect(thirdBooking.reason).toMatch(/maximum of 2 active bookings/i);
    });
  });

  describe('Cancellation, Rescheduling, and Leave Impact', () => {
    const targetApt: Appointment = createTestAppointment({
      id: 'apt-target',
      appointmentNumber: 'APT-2026-099',
      dateTime: '2026-10-19T10:00:00',
      reasonForVisit: 'Consultation',
      status: 'scheduled',
    });

    it('enforces 2-hour cancellation cutoff for patients with staff override', () => {
      // 4 hours before -> success
      const ok = cancelAppointment(targetApt, { id: 'usr-pat-1', name: 'Eleanor', role: 'patient' }, refNow, 'Conflict');
      expect(ok.success).toBe(true);
      expect(ok.appointment?.status).toBe('cancelled');

      // 1 hour before -> patient rejected
      const lateNow = new Date('2026-10-19T09:00:00');
      const rejected = cancelAppointment(targetApt, { id: 'usr-pat-1', name: 'Eleanor', role: 'patient' }, lateNow, 'Last min');
      expect(rejected.success).toBe(false);
      expect(rejected.error).toMatch(/within 2 hours/i);

      // Staff override allows cancellation within 2 hours with reason
      const staffOk = cancelAppointment(targetApt, { id: 'acc-rec-1', name: 'Priya', role: 'receptionist' }, lateNow, 'Emergency');
      expect(staffOk.success).toBe(true);

      // Staff without reason rejected
      const staffNoReason = cancelAppointment(targetApt, { id: 'acc-rec-1', name: 'Priya', role: 'receptionist' }, lateNow, '');
      expect(staffNoReason.success).toBe(false);
    });

    it('handles atomic rescheduling', () => {
      const resOk = rescheduleAppointment(
        targetApt,
        '2026-10-20',
        '10:40',
        { id: 'usr-pat-1', name: 'Eleanor', role: 'patient' },
        [targetApt],
        mockShifts,
        mockLeaves,
        refNow
      );
      expect(resOk.success).toBe(true);
      expect(resOk.cancelledAppointment?.status).toBe('cancelled');
      expect(resOk.newAppointment?.status).toBe('scheduled');
      expect(resOk.newAppointment?.dateTime).toBe('2026-10-20T10:40:00');
      expect(resOk.newAppointment?.rescheduledFrom).toBe('apt-target');
    });

    it('accurately identifies appointments affected by doctor leave', () => {
      const leaveApts: Appointment[] = [
        createTestAppointment({
          id: 'apt-lv-1',
          doctorId: 'doc-1',
          dateTime: '2026-10-21T09:20:00',
          status: 'scheduled',
        }),
        createTestAppointment({
          id: 'apt-lv-2',
          doctorId: 'doc-1',
          dateTime: '2026-10-22T14:00:00',
          status: 'scheduled',
        }),
        createTestAppointment({
          id: 'apt-lv-3',
          doctorId: 'doc-2', // Different doctor
          dateTime: '2026-10-21T11:00:00',
          status: 'scheduled',
        }),
      ];
      const affected = appointmentsAffectedByLeave('doc-1', '2026-10-21', '2026-10-22', leaveApts);
      expect(affected.length).toBe(2);
      expect(affected.map((a) => a.id)).toEqual(['apt-lv-1', 'apt-lv-2']);
    });
  });
});
