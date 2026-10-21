import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RowActions, RowActionItem } from '@/components/ui/RowActions';
import { DoctorView } from '@/views/DoctorView';
import { PatientPortal } from '@/views/PatientPortal';
import { ClinicContext } from '@/context/ClinicContext';
import { AuthContext } from '@/context/AuthContext';
import { BillingContext } from '@/context/BillingContext';
import {
  DEMO_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_MODULES,
} from '@/data/mockData';
import { User, Appointment, PatientAssignment } from '@/types';
import { formatLocalDate } from '@/lib/time';

const mockDoctorUser = DEMO_USERS.md;

// pat-3 = Sophia Chen, pat-4 = Arthur Pendleton, pat-5 = Liam Bennett
const mockAssignments: PatientAssignment[] = [
  {
    id: 'asg-3',
    patientId: 'pat-3',
    doctorId: 'doc-1',
    from: '2026-01-01T08:00:00Z',
    to: null,
    transferredBy: 'system',
    reason: 'Initial assignment',
  },
  {
    id: 'asg-4',
    patientId: 'pat-4',
    doctorId: 'doc-1',
    from: '2026-01-01T08:00:00Z',
    to: null,
    transferredBy: 'system',
    reason: 'Initial assignment',
  },
  {
    id: 'asg-5',
    patientId: 'pat-5',
    doctorId: 'doc-1',
    from: '2026-01-01T08:00:00Z',
    to: null,
    transferredBy: 'system',
    reason: 'Initial assignment',
  },
];

function createMockClinicContext(overrides: Record<string, any> = {}): any {
  return {
    patients: INITIAL_PATIENTS,
    doctors: INITIAL_DOCTORS,
    appointments: [],
    prescriptions: [],
    patientAssignments: mockAssignments,
    modules: INITIAL_MODULES,
    customAccesses: [],
    vitalsRecords: [],
    medicines: [],
    currentUser: mockDoctorUser,
    addPatient: () => {},
    updatePatient: () => {},
    addAppointment: () => {},
    updateAppointmentStatus: () => {},
    rescheduleAppointment: () => {},
    transferPatient: () => {},
    createModule: () => {},
    updateModule: () => {},
    deleteModule: () => {},
    assignModuleMember: () => {},
    removeModuleMember: () => {},
    includeModuleAccess: () => {},
    removeModuleAccess: () => {},
    createAccess: () => {},
    addAuditLogEntry: () => {},
    addVitalsRecord: () => {},
    addPrescription: () => {},
    cancelPrescription: () => {},
    addMedicine: () => {},
    updateMedicine: () => {},
    ...overrides,
  };
}

function createMockAuthContext(user: User = mockDoctorUser): any {
  return {
    currentUser: user,
    currentRole: user.role,
    isAuthenticated: true,
    login: async () => true,
    logout: () => {},
    switchRole: () => {},
    switchUser: () => {},
    changePassword: async () => ({ success: true }),
    getEffectiveAccesses: () => [],
    hasCapability: () => true,
  };
}

describe('M10.3: Row Actions Cleanup and Helper Text Elimination', () => {
  describe('1. Shared RowActions Component', () => {
    it('renders the given actions in exact order without helper text', () => {
      const actions: RowActionItem[] = [
        { label: 'Admit to Desk', onClick: () => {} },
        { label: 'Prescribe', onClick: () => {} },
        { label: 'Transfer', onClick: () => {} },
      ];

      render(<RowActions actions={actions} subject="Sophia Chen" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0].textContent).toContain('Admit to Desk');
      expect(buttons[1].textContent).toContain('Prescribe');
      expect(buttons[2].textContent).toContain('Transfer');

      // No helper or explanatory text should exist in the container
      expect(screen.queryByText(/not checked in/i)).toBeNull();
      expect(screen.queryByText(/changes close/i)).toBeNull();
    });

    it('sets accessible names with the row subject', () => {
      const actions: RowActionItem[] = [
        { label: 'Prescribe', onClick: () => {} },
        { label: 'Transfer', onClick: () => {} },
      ];

      render(<RowActions actions={actions} subject="Sophia Chen" />);

      expect(screen.getByRole('button', { name: 'Prescribe for Sophia Chen' })).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Transfer for Sophia Chen' })).not.toBeNull();
    });

    it('enforces min-w-[6.5rem] on all action buttons and supports wrapping', () => {
      const actions: RowActionItem[] = [
        { label: 'Edit', onClick: () => {} },
      ];

      render(<RowActions actions={actions} subject="Item" />);

      const btn = screen.getByRole('button', { name: 'Edit for Item' });
      expect(btn.className).toContain('min-w-[6.5rem]');
    });

    it('renders nothing for an empty actions list or when all actions are disabled/hidden', () => {
      const { container: emptyContainer } = render(<RowActions actions={[]} subject="Nobody" />);
      expect(emptyContainer.firstChild).toBeNull();

      const { container: disabledContainer } = render(
        <RowActions
          actions={[
            { label: 'Hidden Action', onClick: () => {}, hidden: true },
            { label: 'Disabled Action', onClick: () => {}, disabled: true },
          ]}
          subject="Nobody"
        />
      );
      expect(disabledContainer.firstChild).toBeNull();
    });
  });

  describe('2. Doctor Patients Tab: Today Column & Action Ordering', () => {
    it('derives correct Today column text for each appointment status today', () => {
      const todayStr = formatLocalDate();

      const appointments: Appointment[] = [
        {
          id: 'apt-1',
          appointmentNumber: 'APT-1',
          patientId: 'pat-3',
          patientName: 'Sophia Chen',
          patientPhone: '555-1001',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T10:00:00`,
          status: 'checked_in',
          reasonForVisit: 'Consultation',
          tokenNumber: 1,
          department: 'Cardiology',
          durationMinutes: 30,
        },
        {
          id: 'apt-2',
          appointmentNumber: 'APT-2',
          patientId: 'pat-4',
          patientName: 'Arthur Pendleton',
          patientPhone: '555-1002',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T11:00:00`,
          status: 'scheduled',
          reasonForVisit: 'Follow up',
          tokenNumber: 2,
          department: 'Cardiology',
          durationMinutes: 30,
        },
      ];

      const clinicCtx = createMockClinicContext({ appointments });
      const authCtx = createMockAuthContext(mockDoctorUser);

      render(
        <AuthContext.Provider value={authCtx}>
          <ClinicContext.Provider value={clinicCtx}>
            <DoctorView activeTab="patients" />
          </ClinicContext.Provider>
        </AuthContext.Provider>
      );

      // pat-3 (Sophia Chen) is Checked in today
      const row1 = screen.getByText('Sophia Chen').closest('tr');
      expect(row1).not.toBeNull();
      expect(within(row1!).getByText('Checked in')).not.toBeNull();

      // pat-4 (Arthur Pendleton) is Scheduled today -> displays "Not checked in"
      const row2 = screen.getByText('Arthur Pendleton').closest('tr');
      expect(row2).not.toBeNull();
      expect(within(row2!).getByText('Not checked in')).not.toBeNull();

      // pat-5 (Liam Bennett) has no visit today -> displays "No visit today"
      const row3 = screen.getByText('Liam Bennett').closest('tr');
      expect(row3).not.toBeNull();
      expect(within(row3!).getByText('No visit today')).not.toBeNull();
    });

    it('shows Admit to Desk first only when patient is Checked in or In consultation', () => {
      const todayStr = formatLocalDate();

      const appointments: Appointment[] = [
        {
          id: 'apt-1',
          appointmentNumber: 'APT-1',
          patientId: 'pat-3',
          patientName: 'Sophia Chen',
          patientPhone: '555-1001',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T10:00:00`,
          status: 'checked_in',
          reasonForVisit: 'Consultation',
          tokenNumber: 1,
          department: 'Cardiology',
          durationMinutes: 30,
        },
        {
          id: 'apt-2',
          appointmentNumber: 'APT-2',
          patientId: 'pat-4',
          patientName: 'Arthur Pendleton',
          patientPhone: '555-1002',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T11:00:00`,
          status: 'scheduled',
          reasonForVisit: 'Follow up',
          tokenNumber: 2,
          department: 'Cardiology',
          durationMinutes: 30,
        },
      ];

      const clinicCtx = createMockClinicContext({ appointments });
      const authCtx = createMockAuthContext(mockDoctorUser);

      render(
        <AuthContext.Provider value={authCtx}>
          <ClinicContext.Provider value={clinicCtx}>
            <DoctorView activeTab="patients" />
          </ClinicContext.Provider>
        </AuthContext.Provider>
      );

      // pat-3 (Sophia Chen) is Checked in -> Admit to Desk is shown first
      const row1 = screen.getByText('Sophia Chen').closest('tr')!;
      const row1Buttons = within(row1).getAllByRole('button');
      expect(row1Buttons[0].textContent).toContain('Admit to Desk');

      // pat-4 (Arthur Pendleton) is Scheduled -> Admit to Desk is NOT shown; no disabled button and no helper text
      const row2 = screen.getByText('Arthur Pendleton').closest('tr')!;
      expect(within(row2).queryByRole('button', { name: /Admit/i })).toBeNull();
      expect(within(row2).queryByText(/Patient has not been checked in/i)).toBeNull();
      expect(within(row2).queryByText(/No active appointment/i)).toBeNull();
    });
  });

  describe('3. Doctor Worklist: Start Consultation Scoped to Checked In', () => {
    it('shows Start Consultation only for rows with status Checked In', () => {
      const todayStr = formatLocalDate();

      const appointments: Appointment[] = [
        {
          id: 'apt-101',
          appointmentNumber: 'APT-101',
          patientId: 'pat-3',
          patientName: 'Sophia Chen',
          patientPhone: '555-1001',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T09:30:00`,
          status: 'checked_in',
          reasonForVisit: 'Fever',
          tokenNumber: 1,
          department: 'Cardiology',
          durationMinutes: 30,
        },
        {
          id: 'apt-102',
          appointmentNumber: 'APT-102',
          patientId: 'pat-4',
          patientName: 'Arthur Pendleton',
          patientPhone: '555-1002',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T10:15:00`,
          status: 'scheduled',
          reasonForVisit: 'Routine check',
          tokenNumber: 2,
          department: 'Cardiology',
          durationMinutes: 30,
        },
      ];

      const clinicCtx = createMockClinicContext({ appointments });
      const authCtx = createMockAuthContext(mockDoctorUser);

      render(
        <AuthContext.Provider value={authCtx}>
          <ClinicContext.Provider value={clinicCtx}>
            <DoctorView activeTab="overview" />
          </ClinicContext.Provider>
        </AuthContext.Provider>
      );

      // Checked In appointment: renders Start Consultation
      expect(screen.getByRole('button', { name: 'Start consultation for Sophia Chen' })).not.toBeNull();

      // Scheduled appointment: renders View File only, Start Consultation is NOT rendered, and no helper text
      const scheduledRow = screen.getByText('Arthur Pendleton').closest('tr')!;
      expect(within(scheduledRow).getByRole('button', { name: 'View file for Arthur Pendleton' })).not.toBeNull();
      expect(within(scheduledRow).queryByRole('button', { name: /Start consultation/i })).toBeNull();
      expect(within(scheduledRow).queryByText(/Not checked in yet/i)).toBeNull();
    });
  });

  describe('4. Patient Portal: Appointment Actions & Post-Cutoff Indicator', () => {
    it('shows Reschedule and Cancel before cutoff, and hides them with Status line after cutoff', () => {
      const todayStr = formatLocalDate();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tomorrowStr = formatLocalDate(tomorrow);

      // Appointment 1: Tomorrow (well before 2-hour cutoff, can modify)
      const futureApt: Appointment = {
        id: 'apt-portal-1',
        appointmentNumber: 'APT-P1',
        patientId: 'pat-3',
        patientName: 'Sophia Chen',
        patientPhone: '555-1001',
        doctorId: 'doc-1',
        doctorName: 'Dr. Marcus Vance',
        dateTime: `${tomorrowStr}T12:00:00`,
        status: 'scheduled',
        reasonForVisit: 'Future checkup',
        tokenNumber: 10,
        department: 'Cardiology',
        durationMinutes: 30,
      };

      // Appointment 2: Earlier today (today at 00:00, past 2-hour cutoff)
      const pastCutoffApt: Appointment = {
        id: 'apt-portal-2',
        appointmentNumber: 'APT-P2',
        patientId: 'pat-3',
        patientName: 'Sophia Chen',
        patientPhone: '555-1001',
        doctorId: 'doc-1',
        doctorName: 'Dr. Marcus Vance',
        dateTime: `${todayStr}T00:00:00`,
        status: 'scheduled',
        reasonForVisit: 'Urgent consultation',
        tokenNumber: 11,
        department: 'Cardiology',
        durationMinutes: 30,
      };

      const patientUser: User = {
        ...DEMO_USERS.patient,
        id: 'usr-pat-3',
        patientId: 'pat-3',
        name: 'Sophia Chen',
        email: 'sophia.chen@example.com',
      };

      const clinicCtx = createMockClinicContext({
        appointments: [futureApt, pastCutoffApt],
      });
      const authCtx = createMockAuthContext(patientUser);

      render(
        <AuthContext.Provider value={authCtx}>
          <ClinicContext.Provider value={clinicCtx}>
            <BillingContext.Provider value={{ invoices: [], payments: [], receipts: [], recordPayment: async () => null, reversePayment: async () => null } as any}>
              <PatientPortal activeTab="appointments" />
            </BillingContext.Provider>
          </ClinicContext.Provider>
        </AuthContext.Provider>
      );

      // Future appointment before cutoff: Reschedule and Cancel are visible
      const futureRow = screen.getByText('Future checkup').closest('tr')!;
      expect(within(futureRow).getByRole('button', { name: /Reschedule/i })).not.toBeNull();
      expect(within(futureRow).getByRole('button', { name: /Cancel/i })).not.toBeNull();
      expect(within(futureRow).queryByText(/Changes closed/i)).toBeNull();

      // Past cutoff appointment: Reschedule and Cancel are hidden, Status cell displays "Changes closed. Call the clinic."
      const cutoffRow = screen.getByText('Urgent consultation').closest('tr')!;
      expect(within(cutoffRow).queryByRole('button', { name: /Reschedule/i })).toBeNull();
      expect(within(cutoffRow).queryByRole('button', { name: /Cancel/i })).toBeNull();
      expect(within(cutoffRow).getByText('Changes closed. Call the clinic.')).not.toBeNull();
      // Old helper text is gone
      expect(within(cutoffRow).queryByText(/Changes close 2 hours before appointment/i)).toBeNull();
    });
  });

  describe('5. Table Row Scanner: No Disabled Button with Sibling Helper Text', () => {
    it('verifies that no table row contains both a disabled button and a sibling helper text', () => {
      const todayStr = formatLocalDate();

      const appointments: Appointment[] = [
        {
          id: 'apt-1',
          appointmentNumber: 'APT-1',
          patientId: 'pat-3',
          patientName: 'Sophia Chen',
          patientPhone: '555-1001',
          doctorId: 'doc-1',
          doctorName: 'Dr. Marcus Vance',
          dateTime: `${todayStr}T09:00:00`,
          status: 'scheduled',
          reasonForVisit: 'General',
          tokenNumber: 1,
          department: 'Cardiology',
          durationMinutes: 30,
        },
      ];

      const clinicCtx = createMockClinicContext({ appointments });
      const authCtx = createMockAuthContext(mockDoctorUser);

      const { container } = render(
        <AuthContext.Provider value={authCtx}>
          <ClinicContext.Provider value={clinicCtx}>
            <DoctorView activeTab="patients" />
          </ClinicContext.Provider>
        </AuthContext.Provider>
      );

      // Query all table rows
      const rows = container.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        const disabledButtons = row.querySelectorAll('button[disabled]');
        if (disabledButtons.length > 0) {
          // If any disabled button exists in a table row, ensure no helper text spans exist beside it
          const helperTexts = row.querySelectorAll('span.text-xs, span.text-\\[0\\.6875rem\\], span.text-\\[0\\.625rem\\]');
          expect(helperTexts.length).toBe(0);
        }
      });
    });
  });
});

