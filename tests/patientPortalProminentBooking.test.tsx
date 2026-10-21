import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientPortal } from '../src/views/PatientPortal';
import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { BillingContext } from '../src/context/BillingContext';
import { AttendanceContext } from '../src/context/AttendanceContext';
import { ThemeContext } from '../src/context/ThemeContext';
import { NotificationContext } from '../src/context/NotificationContext';
import { MAX_ACTIVE_BOOKINGS } from '../src/lib/scheduling';
import { formatCurrency, CURRENCY_SYMBOL } from '../src/lib/money';
import { formatLocalDate } from '../src/lib/time';
import {
  INITIAL_MODULES,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_DOCTORS,
} from '../src/data/mockData';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from '../src/data/billingSeed';
import { INITIAL_SHIFTS, INITIAL_ATTENDANCE_RECORDS, INITIAL_LEAVE_REQUESTS } from '../src/data/attendanceSeed';
import { User, Appointment } from '../src/types';
import { Invoice as BillingInvoice } from '../src/types/billing';

const linkedPatientUser: User = {
  id: 'usr-pat-1',
  name: 'Eleanor Wright',
  email: 'eleanor.wright@email.com',
  phone: '+1 (555) 234-5678',
  role: 'patient',
  title: 'Patient',
  department: 'Outpatient',
  badgeNumber: 'MRN-84291',
  patientId: 'pat-1',
};

const unlinkedPatientUser: User = {
  id: 'usr-pat-unlinked',
  name: 'Unlinked Jane',
  email: 'jane.unlinked@email.com',
  phone: '+1 (555) 999-0001',
  role: 'patient',
  claimPending: true,
};

function renderPortal(options?: {
  currentUser?: User;
  appointments?: Appointment[];
  invoices?: BillingInvoice[];
  activeTab?: string;
}) {
  const currentUser = options?.currentUser || linkedPatientUser;
  const appointments = options?.appointments || INITIAL_APPOINTMENTS;
  const invoices = options?.invoices || INITIAL_SEED_INVOICES;

  const authVal: any = {
    currentUser,
    currentRole: currentUser.role,
    isAuthenticated: true,
    switchRole: () => {},
    isRoleSuspended: () => false,
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  };

  const clinicVal: any = {
    patients: INITIAL_PATIENTS,
    appointments,
    prescriptions: INITIAL_PRESCRIPTIONS,
    doctors: INITIAL_DOCTORS,
    vitals: [],
    patientAssignments: [{ patientId: 'pat-1', doctorId: 'doc-1' }],
    modules: INITIAL_MODULES,
    accessCatalog: [],
    pendingApprovals: [],
    bookAppointment: vi.fn().mockReturnValue({ success: true }),
    rescheduleAppointment: vi.fn().mockReturnValue({ success: true }),
    cancelAppointment: vi.fn().mockReturnValue({ success: true }),
    checkInAppointment: vi.fn(),
    checkInWalkIn: vi.fn(),
    registerPatient: vi.fn(),
    updatePatientVitals: vi.fn(),
    addPrescription: vi.fn(),
    cancelPrescription: vi.fn(),
    dispensePrescription: vi.fn(),
    reassignPatientDoctor: vi.fn(),
    updateAccessModule: vi.fn(),
    createAccessModule: vi.fn(),
    deleteAccessModule: vi.fn(),
    provisionStaffAccount: vi.fn(),
    approvePendingStaff: vi.fn(),
    rejectPendingStaff: vi.fn(),
    suspendStaffUser: vi.fn(),
    reinstateStaffUser: vi.fn(),
    deleteStaffUser: vi.fn(),
    refreshData: vi.fn(),
  };

  const billingVal: any = {
    invoices,
    payments: INITIAL_SEED_PAYMENTS,
    recordPayment: vi.fn().mockResolvedValue({ success: true, data: { id: 'pay-1', receiptNumber: 'RCT-001' } }),
    recordPortalPayment: vi.fn().mockResolvedValue({ success: true, data: { id: 'pay-1', receiptNumber: 'RCT-001', amount: 5000 } }),
    voidInvoice: vi.fn(),
    applyDiscount: vi.fn(),
    reversePayment: vi.fn(),
    addCharge: vi.fn(),
    getReceipt: vi.fn().mockReturnValue({
      id: 'rc-1',
      receiptNumber: 'RCT-001',
      invoiceNumber: 'INV-2026-0001',
      patientName: 'Eleanor Wright',
      amount: 5000,
      method: 'card',
      issuedAt: new Date().toISOString(),
      collectedBy: 'Online Portal',
    }),
  };

  const attendanceVal: any = {
    shifts: INITIAL_SHIFTS,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    isClockedIn: () => true,
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    submitLeaveRequest: vi.fn(),
    decideLeaveRequest: vi.fn(),
    correctRecord: vi.fn(),
    setStaffShift: vi.fn(),
  };

  const themeVal: any = {
    theme: 'light',
    toggleTheme: vi.fn(),
  };

  const notificationVal: any = {
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clearAll: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authVal}>
      <ClinicContext.Provider value={clinicVal}>
        <BillingContext.Provider value={billingVal}>
          <AttendanceContext.Provider value={attendanceVal}>
            <ThemeContext.Provider value={themeVal}>
              <NotificationContext.Provider value={notificationVal}>
                <PatientPortal activeTab={options?.activeTab || 'appointments'} />
              </NotificationContext.Provider>
            </ThemeContext.Provider>
          </AttendanceContext.Provider>
        </BillingContext.Provider>
      </ClinicContext.Provider>
    </AuthContext.Provider>
  );
}

describe('M10.2: Patient Portal Prominent Book Appointment & Dashboard Refinement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Prominent Book Appointment Button', () => {
    it('appears exactly once, before summary figures in DOM order, as the only primary button', () => {
      const { container } = renderPortal();

      // Exactly one Book Appointment button on the page
      const bookButtons = screen.getAllByRole('button', { name: 'Book Appointment' });
      expect(bookButtons.length).toBe(1);
      const bookButton = bookButtons[0];

      // Verifies styling tokens: min-height 3.5rem (56px >= 44px), px-8 (2rem), text-lg (1.125rem), font-semibold
      expect(bookButton.className).toContain('min-h-[3.5rem]');
      expect(bookButton.className).toContain('px-8');
      expect(bookButton.className).toContain('text-lg');
      expect(bookButton.className).toContain('font-semibold');
      // Full width below 640px
      expect(bookButton.className).toContain('w-full');
      expect(bookButton.className).toContain('sm:w-auto');

      // It is the ONLY filled (primary) button on the page
      const allButtons = container.querySelectorAll('button');
      const primaryButtons = Array.from(allButtons).filter((btn) =>
        btn.classList.contains('bg-teal-600')
      );
      expect(primaryButtons.length).toBe(1);
      expect(primaryButtons[0]).toBe(bookButton);

      // DOM order: appears directly under page title and BEFORE the summary figures
      const pageHeading = screen.getByRole('heading', { level: 1, name: 'My Health Portal' });
      const nextAppointmentText = screen.getByText('Next Appointment');

      expect(pageHeading.compareDocumentPosition(bookButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(bookButton.compareDocumentPosition(nextAppointmentText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Counts row "Upcoming (X) • Past (Y)" is completely removed
      expect(screen.queryByText(/Upcoming \(\d+\)/)).toBeNull();
    });

    it('opens the Book Consultation Modal and restores focus upon closing', async () => {
      renderPortal();

      const bookButton = screen.getByRole('button', { name: 'Book Appointment' });
      fireEvent.keyDown(bookButton, { key: 'Enter' });
      fireEvent.click(bookButton);

      // Modal is displayed
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Book Consultation')).toBeDefined();

      // Close modal using Cancel button
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(bookButton);
      });
    });
  });

  describe('2. Disabled States & Plain Helper Text', () => {
    it('disables Book Appointment with helper text when patient account is unlinked', () => {
      renderPortal({ currentUser: unlinkedPatientUser });

      const bookButton = screen.getByRole('button', { name: 'Book Appointment' });
      expect((bookButton as HTMLButtonElement).disabled).toBe(true);

      const helperText = screen.getAllByText('Your account is waiting to be linked to your clinic record.');
      expect(helperText.length).toBeGreaterThanOrEqual(1);
    });

    it('disables Book Appointment with helper text when at active booking limit', () => {
      const todayStr = formatLocalDate(new Date());
      const maxAppointments: Appointment[] = [
        {
          id: 'apt-limit-1',
          appointmentNumber: 'APT-L1',
          patientId: 'pat-1',
          patientName: 'Eleanor Wright',
          patientPhone: '+1 (555) 234-5678',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          department: 'Internal Medicine',
          dateTime: `${todayStr}T14:00:00`,
          durationMinutes: 20,
          status: 'scheduled',
          source: 'web',
          tokenNumber: 10,
          reasonForVisit: 'Consultation 1',
        },
        {
          id: 'apt-limit-2',
          appointmentNumber: 'APT-L2',
          patientId: 'pat-1',
          patientName: 'Eleanor Wright',
          patientPhone: '+1 (555) 234-5678',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          department: 'Internal Medicine',
          dateTime: `${todayStr}T16:00:00`,
          durationMinutes: 20,
          status: 'scheduled',
          source: 'web',
          tokenNumber: 11,
          reasonForVisit: 'Consultation 2',
        },
      ];

      renderPortal({ appointments: maxAppointments });

      const bookButton = screen.getByRole('button', { name: 'Book Appointment' });
      expect((bookButton as HTMLButtonElement).disabled).toBe(true);

      expect(screen.getByText(`You already have ${MAX_ACTIVE_BOOKINGS} upcoming appointments.`)).toBeDefined();
    });
  });

  describe('3. Pay Balance Button', () => {
    it('shows outline Pay Balance button when balance > 0 and opens Pay Now modal for oldest unpaid invoice', () => {
      const unpaidInvoices: BillingInvoice[] = [
        {
          id: 'inv-unpaid-1',
          number: 'INV-2026-0001',
          patientId: 'pat-1',
          doctorId: 'doc-1',
          issuedAt: '2026-10-01T10:00:00Z',
          items: [{ id: 'it-1', description: 'Consultation', amount: 10000, kind: 'charge' }],
          status: 'unpaid',
          createdBy: 'system',
        },
        {
          id: 'inv-unpaid-2',
          number: 'INV-2026-0002',
          patientId: 'pat-1',
          doctorId: 'doc-1',
          issuedAt: '2026-10-05T10:00:00Z',
          items: [{ id: 'it-2', description: 'Consultation', amount: 8000, kind: 'charge' }],
          status: 'unpaid',
          createdBy: 'system',
        },
      ];

      renderPortal({ invoices: unpaidInvoices });

      const payBalanceBtn = screen.getByRole('button', { name: 'Pay Balance' });
      expect(payBalanceBtn).toBeDefined();
      expect(payBalanceBtn.className).toContain('border-slate-300'); // outline style

      fireEvent.click(payBalanceBtn);

      // Opens Pay Now Modal targeting oldest invoice INV-2026-0001
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Pay Invoice: INV-2026-0001/)).toBeDefined();
    });

    it('hides Pay Balance button when total balance due is zero', () => {
      const paidInvoices: BillingInvoice[] = [
        {
          id: 'inv-paid-1',
          number: 'INV-2026-0001',
          patientId: 'pat-1',
          doctorId: 'doc-1',
          issuedAt: '2026-10-01T10:00:00Z',
          items: [],
          status: 'paid',
          createdBy: 'system',
        },
      ];

      renderPortal({ invoices: paidInvoices });

      expect(screen.queryByRole('button', { name: 'Pay Balance' })).toBeNull();
    });
  });

  describe('4. Upcoming and Past Filtering by Date and Status', () => {
    it('moves past open appointments to Past with status "Not concluded"', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
      const yesterdayStr = formatLocalDate(yesterday);
      const todayStr = formatLocalDate(today);

      const mixedAppointments: Appointment[] = [
        {
          id: 'apt-yesterday-open',
          appointmentNumber: 'APT-OLD-1',
          patientId: 'pat-1',
          patientName: 'Eleanor Wright',
          patientPhone: '+1 (555) 234-5678',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          department: 'Internal Medicine',
          dateTime: `${yesterdayStr}T10:00:00`,
          durationMinutes: 20,
          status: 'in_consultation', // open status from yesterday
          source: 'web',
          tokenNumber: 1,
          reasonForVisit: 'Unconcluded visit from yesterday',
        },
        {
          id: 'apt-today-open',
          appointmentNumber: 'APT-NEW-1',
          patientId: 'pat-1',
          patientName: 'Eleanor Wright',
          patientPhone: '+1 (555) 234-5678',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          department: 'Internal Medicine',
          dateTime: `${todayStr}T15:00:00`,
          durationMinutes: 20,
          status: 'scheduled', // today's open appointment
          source: 'web',
          tokenNumber: 2,
          reasonForVisit: 'Active today consultation',
        },
        {
          id: 'apt-completed',
          appointmentNumber: 'APT-DONE-1',
          patientId: 'pat-1',
          patientName: 'Eleanor Wright',
          patientPhone: '+1 (555) 234-5678',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          department: 'Internal Medicine',
          dateTime: `${yesterdayStr}T09:00:00`,
          durationMinutes: 20,
          status: 'completed',
          source: 'web',
          tokenNumber: 3,
          reasonForVisit: 'Concluded yesterday checkup',
        },
      ];

      renderPortal({ appointments: mixedAppointments });

      // Upcoming Appointments table: holds only appointments for today or later
      expect(screen.getByText('Active today consultation')).toBeDefined();

      // Past Appointments table: holds completed appointment and past open appointment with "Not concluded"
      expect(screen.getByText('Not concluded')).toBeDefined();
      expect(screen.getByText('Completed')).toBeDefined();
    });
  });

  describe('5. Currency Module & Symbol Consistency', () => {
    it('uses configured CURRENCY_SYMBOL across all formatted currency amounts', () => {
      expect(CURRENCY_SYMBOL).toBe('₹');
      expect(formatCurrency(10000)).toBe('₹100.00');
      expect(formatCurrency(0)).toBe('₹0.00');
      expect(formatCurrency(-500)).toBe('-₹5.00');
    });
  });
});
