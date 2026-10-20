import { describe, it, expect } from 'vitest';
import {
  getDateRangeBounds,
  calculateDashboardMetrics,
  calculateDailySummary,
  generateDailySummaryCsv,
} from '../src/lib/dashboardMetrics';
import {
  User,
  Patient,
  Appointment,
} from '../src/types';
import { Invoice, Payment } from '../src/types/billing';
import { INITIAL_MODULES } from '../src/data/mockData';
import { formatLocalDate } from '../src/lib/time';

describe('Dashboard Metrics Engine (M9.5 Requirement H)', () => {
  const refDate = new Date(2026, 9, 15, 12, 0, 0); // 2026-10-15 12:00:00 local time

  describe('Date Range Presets and Boundary Calculations', () => {
    it('computes exact bounds for "today"', () => {
      const bounds = getDateRangeBounds('today', refDate);
      expect(formatLocalDate(bounds.startDate)).toBe('2026-10-15');
      expect(formatLocalDate(bounds.endDate)).toBe('2026-10-15');
      expect(bounds.startDate.getHours()).toBe(0);
      expect(bounds.endDate.getHours()).toBe(23);
      expect(bounds.endDate.getMinutes()).toBe(59);
    });

    it('computes exact bounds for "last_7_days" (inclusive 7 calendar days)', () => {
      const bounds = getDateRangeBounds('last_7_days', refDate);
      expect(formatLocalDate(bounds.startDate)).toBe('2026-10-09');
      expect(formatLocalDate(bounds.endDate)).toBe('2026-10-15');
    });

    it('computes exact bounds for "this_month"', () => {
      const bounds = getDateRangeBounds('this_month', refDate);
      expect(formatLocalDate(bounds.startDate)).toBe('2026-10-01');
      expect(formatLocalDate(bounds.endDate)).toBe('2026-10-15');
    });

    it('computes exact bounds for "last_30_days"', () => {
      const bounds = getDateRangeBounds('last_30_days', refDate);
      expect(formatLocalDate(bounds.startDate)).toBe('2026-09-16');
      expect(formatLocalDate(bounds.endDate)).toBe('2026-10-15');
    });
  });

  describe('Exact Figure Computations from Deterministic Fixtures', () => {
    // Hand-computed fixture
    const fixturePatients: Patient[] = [
      {
        id: 'pat-1',
        mrn: 'MRN-001',
        firstName: 'Eleanor',
        lastName: 'Vance',
        dob: '1988-04-12',
        age: 38,
        gender: 'female',
        phone: '555-0101',
        email: 'e.vance@example.com',
        address: '123 Main St',
        bloodGroup: 'O+',
        allergies: [],
        chronicConditions: [],
        emergencyContact: { name: 'Emergency', relationship: 'Spouse', phone: '555-0199' },
        status: 'active',
        registeredDate: '2026-10-15',
        registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        createdAt: '2026-10-15T09:00:00Z',
      },
      {
        id: 'pat-2',
        mrn: 'MRN-002',
        firstName: 'Arthur',
        lastName: 'Dent',
        dob: '1980-01-01',
        age: 46,
        gender: 'male',
        phone: '555-0102',
        email: 'a.dent@example.com',
        address: '456 Elm St',
        bloodGroup: 'A+',
        allergies: [],
        chronicConditions: [],
        emergencyContact: { name: 'Emergency', relationship: 'Spouse', phone: '555-0199' },
        status: 'active',
        registeredDate: '2026-10-15',
        registeredBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        createdAt: '2026-10-15T09:30:00Z',
      },
      {
        id: 'pat-3',
        mrn: 'MRN-003',
        firstName: 'Ford',
        lastName: 'Prefect',
        dob: '1975-05-05',
        age: 51,
        gender: 'male',
        phone: '555-0103',
        email: 'f.prefect@example.com',
        address: '789 Oak St',
        bloodGroup: 'B+',
        allergies: [],
        chronicConditions: [],
        emergencyContact: { name: 'Emergency', relationship: 'Spouse', phone: '555-0199' },
        status: 'active',
        registeredDate: '2026-10-01',
        registeredBy: { id: 'acc-rec-2', name: 'Receptionist Two' },
        createdAt: '2026-10-01T09:00:00Z',
      },
    ];

    const fixtureAppointments: Appointment[] = [
      // Appt 1: Completed visit today at 10:00 (checked in by Priya)
      {
        id: 'apt-1',
        appointmentNumber: 'APT-1',
        patientId: 'pat-1',
        patientName: 'Eleanor Vance',
        patientPhone: '555-0101',
        doctorId: 'doc-2',
        doctorName: 'Dr. Nathan Hayes',
        department: 'General Medicine',
        dateTime: '2026-10-15T10:00:00',
        durationMinutes: 30,
        status: 'completed',
        reasonForVisit: 'Consultation',
        tokenNumber: 1,
        consultationRoom: 'Exam 1',
        checkedInBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        checkedInAt: '2026-10-15T09:50:00',
      },
      // Appt 2: Missed visit (scheduled at 11:00, refDate is 12:00, never checked in)
      {
        id: 'apt-2',
        appointmentNumber: 'APT-2',
        patientId: 'pat-2',
        patientName: 'Arthur Dent',
        patientPhone: '555-0102',
        doctorId: 'doc-2',
        doctorName: 'Dr. Nathan Hayes',
        department: 'General Medicine',
        dateTime: '2026-10-15T11:00:00',
        durationMinutes: 30,
        status: 'scheduled',
        reasonForVisit: 'Consultation',
        tokenNumber: 2,
        consultationRoom: 'Exam 1',
      },
      // Appt 3: Cancelled visit today (must be excluded from Appointments count)
      {
        id: 'apt-3',
        appointmentNumber: 'APT-3',
        patientId: 'pat-3',
        patientName: 'Ford Prefect',
        patientPhone: '555-0103',
        doctorId: 'doc-3',
        doctorName: 'Dr. Clara Reed',
        department: 'General Medicine',
        dateTime: '2026-10-15T14:00:00',
        durationMinutes: 30,
        status: 'cancelled',
        reasonForVisit: 'Consultation',
        tokenNumber: 3,
        consultationRoom: 'Exam 2',
      },
      // Appt 4: Future scheduled visit today at 15:00
      {
        id: 'apt-4',
        appointmentNumber: 'APT-4',
        patientId: 'pat-3',
        patientName: 'Ford Prefect',
        patientPhone: '555-0103',
        doctorId: 'doc-3',
        doctorName: 'Dr. Clara Reed',
        department: 'General Medicine',
        dateTime: '2026-10-15T15:00:00',
        durationMinutes: 30,
        status: 'scheduled',
        reasonForVisit: 'Consultation',
        tokenNumber: 4,
        consultationRoom: 'Exam 2',
      },
    ];

    const fixtureInvoices: Invoice[] = [
      // Inv 1: $100.00 (10000 cents) issued today, partially paid
      {
        id: 'inv-1',
        number: 'INV-2026-0001',
        patientId: 'pat-1',
        patientName: 'Eleanor Vance',
        doctorId: 'doc-2',
        issuedAt: '2026-10-15T10:30:00Z',
        items: [{ id: 'ii-1', description: 'Consultation', kind: 'consultation', amount: 10000 }],
        status: 'unpaid',
        createdBy: 'Admin',
      },
      // Inv 2: $50.00 (5000 cents) issued today, unpaid
      {
        id: 'inv-2',
        number: 'INV-2026-0002',
        patientId: 'pat-2',
        patientName: 'Arthur Dent',
        doctorId: 'doc-2',
        issuedAt: '2026-10-15T11:30:00Z',
        items: [{ id: 'ii-2', description: 'Lab panel', kind: 'charge', amount: 5000 }],
        status: 'unpaid',
        createdBy: 'Admin',
      },
      // Inv 3: $80.00 (8000 cents) VOID invoice (must be excluded from Billed)
      {
        id: 'inv-3',
        number: 'INV-2026-0003',
        patientId: 'pat-3',
        patientName: 'Ford Prefect',
        doctorId: 'doc-3',
        issuedAt: '2026-10-15T12:00:00Z',
        items: [{ id: 'ii-3', description: 'Cancelled test', kind: 'charge', amount: 8000 }],
        status: 'void',
        createdBy: 'Admin',
      },
    ];

    const fixturePayments: Payment[] = [
      // Pay 1: $100.00 received today
      {
        id: 'pay-1',
        receiptNumber: 'REC-001',
        invoiceId: 'inv-1',
        amount: 10000,
        method: 'card',
        receivedAt: '2026-10-15T10:35:00Z',
        receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        kind: 'payment',
      },
      // Pay 2: $20.00 reversal today
      {
        id: 'pay-2',
        receiptNumber: 'REC-002-REV',
        invoiceId: 'inv-1',
        amount: 2000,
        method: 'card',
        receivedAt: '2026-10-15T11:00:00Z',
        receivedBy: { id: 'acc-rec-1', name: 'Priya Sharma' },
        kind: 'reversal',
      },
    ];

    const adminUser: User = {
      id: 'acc-doc-1',
      name: 'Dr. Marcus Vance',
      email: 'm.vance@beaconclinic.com',
      role: 'doctor',
      moduleIds: ['mod-clinical', 'mod-management', 'mod-front-desk', 'mod-billing'],
      status: 'active',
    };

    it('computes exact hand-calculated figures for clinic summary', () => {
      const metrics = calculateDashboardMetrics({
        patients: fixturePatients,
        appointments: fixtureAppointments,
        invoices: fixtureInvoices,
        payments: fixturePayments,
        prescriptions: [],
        doctors: [],
        users: [adminUser],
        currentUser: adminUser,
        dateRange: 'today',
        now: refDate,
        modules: INITIAL_MODULES,
      });

      const getFig = (lbl: string) => metrics.summaryFigures.find((f) => f.label === lbl);

      // 1. Appointments = 3 (apt-1, apt-2, apt-4; cancelled apt-3 excluded)
      expect(getFig('Appointments')?.value).toBe(3);

      // 2. Visits = 1 (apt-1 completed)
      expect(getFig('Visits')?.value).toBe(1);

      // 3. Missed Appointments = 1 (apt-2 scheduled at 11:00, refDate is 12:00, not checked in)
      expect(getFig('Missed Appointments')?.value).toBe(1);

      // 4. New Patients = 2 (pat-1, pat-2 registered today)
      expect(getFig('New Patients')?.value).toBe(2);

      // 5. Billed = 15000 cents (inv-1: 10000 + inv-2: 5000; void inv-3 excluded)
      expect(getFig('Billed')?.value).toBe(15000);
      expect(getFig('Billed')?.formattedValue).toBe('₹150.00');

      // 6. Collected = 8000 cents (pay-1: 10000 - reversal pay-2: 2000)
      expect(getFig('Collected')?.value).toBe(8000);
      expect(getFig('Collected')?.formattedValue).toBe('₹80.00');

      // 7. Outstanding now = 7000 cents (inv-1 balance 2000 + inv-2 balance 5000)
      expect(getFig('Outstanding now')?.value).toBe(7000);
      expect(getFig('Outstanding now')?.formattedValue).toBe('₹70.00');
    });

    it('computes exact receptionist check-ins and registrations by hand', () => {
      const daily = calculateDailySummary({
        user: adminUser,
        targetDate: '2026-10-15',
        now: refDate,
        patients: fixturePatients,
        appointments: fixtureAppointments,
        invoices: fixtureInvoices,
        payments: fixturePayments,
        prescriptions: [],
        doctors: [],
        users: [adminUser],
        shifts: [],
        attendanceRecords: [],
        leaves: [],
        modules: INITIAL_MODULES,
      });

      expect(daily.byReceptionist).toBeDefined();
      const priyaRow = daily.byReceptionist?.find(
        (r) => r.receptionistId === 'acc-rec-1' || r.receptionistName === 'Priya Sharma'
      );

      expect(priyaRow).toBeDefined();
      expect(priyaRow?.registrations).toBe(2); // pat-1, pat-2
      expect(priyaRow?.checkIns).toBe(1); // apt-1
    });
  });

  describe('CSV Generation and Accessibility', () => {
    it('generates valid RFC 4180 CSV export content', () => {
      const csv = generateDailySummaryCsv({
        date: '2026-10-15',
        formattedDate: 'Oct 15, 2026',
        hasActivity: true,
        patients: {
          registrations: 2,
          checkIns: 1,
          completedVisits: 1,
          cancellations: 1,
          noShows: 1,
          onlineBookings: 0,
        },
        byDoctor: [
          {
            doctorId: 'doc-2',
            doctorName: 'Dr. Nathan Hayes',
            booked: 2,
            checkedIn: 1,
            completed: 1,
            prescriptions: 0,
          },
        ],
        byReceptionist: [
          {
            receptionistId: 'acc-rec-1',
            receptionistName: 'Priya Sharma',
            registrations: 2,
            checkIns: 1,
            bookings: 0,
            paymentsCount: 1,
            paymentsTotalCents: 8000,
            formattedPaymentsTotal: '₹80.00',
          },
        ],
        collections: {
          isMyCollections: false,
          cashCents: 0,
          cardCents: 8000,
          upiCents: 0,
          portalCents: 0,
          reversalsCents: 2000,
          netTotalCents: 8000,
          dailyBilledCents: 15000,
          cashToHandOverCents: 0,
          formattedCash: '₹0.00',
          formattedCard: '₹80.00',
          formattedUpi: '₹0.00',
          formattedPortal: '₹0.00',
          formattedReversals: '₹20.00',
          formattedNetTotal: '₹80.00',
          formattedDailyBilled: '₹150.00',
          formattedCashToHandOver: '₹0.00',
        },
      });

      expect(csv).toContain('"Beacon Health Clinic - Daily Summary"');
      expect(csv).toContain('"Date","2026-10-15"');
      expect(csv).toContain('"New Registrations",2');
      expect(csv).toContain('"Dr. Nathan Hayes",2,1,1,0');
      expect(csv).toContain('"Priya Sharma",2,1,0,"1 (₹80.00)"');
      expect(csv).toContain('"Net Total","₹80.00"');
    });
  });
});
