import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppLayout } from '../src/components/layout/AppLayout';
import { Navbar } from '../src/components/layout/Navbar';
import { ProfileView } from '../src/views/ProfileView';
import { PatientPortal } from '../src/views/PatientPortal';
import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { BillingContext } from '../src/context/BillingContext';
import { AttendanceContext } from '../src/context/AttendanceContext';
import { ThemeContext } from '../src/context/ThemeContext';
import { NotificationContext } from '../src/context/NotificationContext';
import { getRepository } from '../src/data/storage';
import {
  PASSWORD_POLICY,
  SESSION_INACTIVITY_TIMEOUT_MS,
  LOCKOUT_DURATION_MS,
} from '../src/lib/authConstants';
import {
  getPasswordPolicyText,
  getSessionSecurityText,
  validatePasswordPolicy,
} from '../src/lib/auth';
import { INITIAL_MODULES, INITIAL_PATIENTS, INITIAL_APPOINTMENTS, INITIAL_PRESCRIPTIONS, INITIAL_DOCTORS } from '../src/data/mockData';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from '../src/data/billingSeed';
import { INITIAL_SHIFTS, INITIAL_ATTENDANCE_RECORDS, INITIAL_LEAVE_REQUESTS } from '../src/data/attendanceSeed';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { User, Patient, AccessAuditLogEntry } from '../src/types';
import { Account } from '../src/types/storage';

const mdUser: User = {
  id: 'usr-doc-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  phone: '+1 (555) 100-2001',
  role: 'md',
  title: 'Managing Director & Chief Physician',
  department: 'Internal Medicine & Management',
  badgeNumber: 'MD-001',
  isOriginalAdmin: true,
};

const doctorUser: User = {
  id: 'usr-doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  phone: '+1 (555) 100-2002',
  role: 'doctor',
  title: 'Staff Consulting Physician',
  department: 'General Medicine & Triage',
  badgeNumber: 'DOC-102',
};

const receptionistUser: User = {
  id: 'usr-rec-1',
  name: 'Priya Sharma',
  email: 'p.sharma@beaconclinic.com',
  phone: '+1 (555) 100-3001',
  role: 'receptionist',
  title: 'Front Desk Coordinator',
  department: 'Reception & Triage',
  badgeNumber: 'REC-301',
};

const patientUser: User = {
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

function renderWithProviders(ui: React.ReactNode, options?: { currentUser?: User; theme?: string }) {
  const currentUser = options?.currentUser || mdUser;
  const currentTheme = options?.theme || 'light';

  const authVal: any = {
    currentUser,
    currentRole: currentUser.role,
    isAuthenticated: true,
    switchRole: () => {},
    isRoleSuspended: () => false,
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
    changePassword: vi.fn().mockResolvedValue({ success: true }),
    verifyCurrentPassword: vi.fn().mockImplementation(async (pass: string) => pass === 'ValidCurrent1'),
  };

  const clinicVal: any = {
    modules: INITIAL_MODULES,
    patients: INITIAL_PATIENTS,
    appointments: INITIAL_APPOINTMENTS,
    prescriptions: INITIAL_PRESCRIPTIONS,
    medicines: INITIAL_FORMULARY,
    doctors: INITIAL_DOCTORS,
    patientAssignments: [],
    accessAuditLog: [],
    customAccesses: [],
    vitals: [],
    addPatient: vi.fn(),
    updatePatient: vi.fn(),
    addAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    addPrescription: vi.fn(),
    updatePrescription: vi.fn(),
    bookAppointment: vi.fn(),
    cancelAppointmentAction: vi.fn(),
    rescheduleAppointmentAction: vi.fn(),
  };

  const billingVal: any = {
    invoices: INITIAL_SEED_INVOICES,
    payments: INITIAL_SEED_PAYMENTS,
    createInvoice: vi.fn(),
    recordPayment: vi.fn(),
    getInvoiceById: (id: string) => INITIAL_SEED_INVOICES.find((i) => i.id === id),
    getDailyCollections: () => ({ cash: 0, card: 0, upi: 0, portal: 0, total: 0 }),
    recordPortalPayment: vi.fn(),
    getReceipt: vi.fn(),
  };

  const attendanceVal: any = {
    shifts: INITIAL_SHIFTS,
    records: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    submitLeaveRequest: vi.fn(),
    updateLeaveRequestStatus: vi.fn(),
    refreshRecords: vi.fn(),
    getCanonicalStaffId: (id?: string) => id || 'acc-md',
    getStaffShift: () => undefined,
    getTodayRecord: () => undefined,
  };

  const themeVal: any = {
    theme: currentTheme,
    toggleTheme: vi.fn(),
  };

  const notificationVal: any = {
    notifications: [],
    userNotifications: [],
    unreadCount: 0,
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismissNotification: vi.fn(),
  };

  return {
    ...render(
      <ThemeContext.Provider value={themeVal}>
        <AuthContext.Provider value={authVal}>
          <ClinicContext.Provider value={clinicVal}>
            <BillingContext.Provider value={billingVal}>
              <AttendanceContext.Provider value={attendanceVal}>
                <NotificationContext.Provider value={notificationVal}>
                  {ui}
                </NotificationContext.Provider>
              </AttendanceContext.Provider>
            </BillingContext.Provider>
          </ClinicContext.Provider>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    ),
    authVal,
    clinicVal,
    themeVal,
  };
}

describe('M10.1: User Menu, Profile Routing & Content by Role', () => {
  beforeEach(async () => {
    window.history.replaceState({}, '', '/');
    const repoAccounts = getRepository<Account>('accounts');
    const repoPatients = getRepository<Patient>('patients');
    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
    await repoAccounts.clear();
    await repoPatients.clear();
    await repoLedger.clear();

    await repoAccounts.create({
      id: 'usr-doc-1',
      username: 'm.vance@beaconclinic.com',
      email: 'm.vance@beaconclinic.com',
      fullName: 'Dr. Marcus Vance',
      phone: '+1 (555) 100-2001',
      role: 'md',
      passwordHash: 'hash',
      passwordSalt: 'salt',
      passwordIterations: 100000,
      status: 'active',
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await repoAccounts.create({
      id: 'usr-pat-1',
      username: 'eleanor.wright@email.com',
      email: 'eleanor.wright@email.com',
      fullName: 'Eleanor Wright',
      phone: '+1 (555) 234-5678',
      role: 'patient',
      passwordHash: 'hash',
      passwordSalt: 'salt',
      passwordIterations: 100000,
      status: 'active',
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('1. User Menu WAI-ARIA and Keyboard Navigation', () => {
    it('renders role="menu" and role="menuitem" buttons when opened', () => {
      renderWithProviders(<Navbar />);
      const avatarBtn = screen.getByLabelText('User profile menu');
      expect(avatarBtn).toBeDefined();
      expect(screen.queryByRole('menu')).toBeNull();

      fireEvent.click(avatarBtn);
      const menu = screen.getByRole('menu');
      expect(menu).toBeDefined();

      const items = screen.getAllByRole('menuitem');
      expect(items.length).toBe(4);
      expect(items[0].textContent).toContain('Profile');
      expect(items[1].textContent).toContain('Settings');
      expect(items[2].textContent).toContain('Theme');
      expect(items[3].textContent).toContain('Log Out');
    });

    it('navigates menu items with ArrowUp, ArrowDown, Home, and End keys', () => {
      renderWithProviders(<Navbar />);
      const avatarBtn = screen.getByLabelText('User profile menu');

      // Open via ArrowDown on button
      fireEvent.keyDown(avatarBtn, { key: 'ArrowDown' });
      const menu = screen.getByRole('menu');
      expect(menu).toBeDefined();

      const items = screen.getAllByRole('menuitem');

      // ArrowDown to next items
      fireEvent.keyDown(menu, { key: 'ArrowDown' }); // index 1: Settings
      expect(document.activeElement).toBe(items[1]);

      fireEvent.keyDown(menu, { key: 'ArrowDown' }); // index 2: Theme
      expect(document.activeElement).toBe(items[2]);

      fireEvent.keyDown(menu, { key: 'ArrowDown' }); // index 3: Log Out
      expect(document.activeElement).toBe(items[3]);

      // Wrap around
      fireEvent.keyDown(menu, { key: 'ArrowDown' }); // wraps to index 0: Profile
      expect(document.activeElement).toBe(items[0]);

      // ArrowUp
      fireEvent.keyDown(menu, { key: 'ArrowUp' }); // wraps to index 3: Log Out
      expect(document.activeElement).toBe(items[3]);

      // Home & End
      fireEvent.keyDown(menu, { key: 'Home' });
      expect(document.activeElement).toBe(items[0]);

      fireEvent.keyDown(menu, { key: 'End' });
      expect(document.activeElement).toBe(items[3]);
    });

    it('closes menu and returns focus to avatar button on Escape, and closes on Tab', () => {
      renderWithProviders(<Navbar />);
      const avatarBtn = screen.getByLabelText('User profile menu');

      fireEvent.click(avatarBtn);
      expect(screen.getByRole('menu')).toBeDefined();

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(avatarBtn);

      // Open again and press Tab
      fireEvent.click(avatarBtn);
      expect(screen.getByRole('menu')).toBeDefined();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('shows Theme label and the current value once', () => {
      renderWithProviders(<Navbar />, { theme: 'dark' });
      const avatarBtn = screen.getByLabelText('User profile menu');
      fireEvent.click(avatarBtn);

      const items = screen.getAllByRole('menuitem');
      const themeItem = items[2];
      expect(themeItem.textContent).toContain('Theme');
      expect(themeItem.textContent).toContain('Dark');
      // Must not contain duplicate "Theme: Dark Mode" text
      expect(themeItem.textContent).not.toContain('Dark Mode');
    });

    it('has aria-current="page" on Profile menu item when currently on profile page', () => {
      renderWithProviders(<Navbar activeTab="profile" />);
      const avatarBtn = screen.getByLabelText('User profile menu');
      fireEvent.click(avatarBtn);

      const profileItem = screen.getAllByRole('menuitem')[0];
      expect(profileItem.getAttribute('aria-current')).toBe('page');
    });
  });

  describe('2. Routing and Navigation to /profile', () => {
    it('routes to /profile and focuses heading for each role', async () => {
      const roles = [mdUser, doctorUser, receptionistUser, patientUser];

      for (const role of roles) {
        window.history.replaceState({}, '', '/');
        const { unmount } = renderWithProviders(<AppLayout />, { currentUser: role });

        const avatarBtn = screen.getByLabelText('User profile menu');
        fireEvent.click(avatarBtn);

        const profileItem = screen.getAllByRole('menuitem')[0];
        fireEvent.click(profileItem);

        // Menu closes
        expect(screen.queryByRole('menu')).toBeNull();

        // Heading is displayed
        const heading = await screen.findByRole('heading', { name: 'My Profile' });
        expect(heading).toBeDefined();

        unmount();
      }
    });

    it('removes Profile tab from Patient Portal and redirects old profile tab link', async () => {
      // Patient sidebar only has Appointments, Records, Prescriptions, Invoices
      renderWithProviders(<AppLayout />, { currentUser: patientUser });
      expect(screen.queryByText('My Profile', { selector: 'nav *' })).toBeNull();
      expect(screen.getByText('Appointments')).toBeDefined();
      expect(screen.getByText('Records')).toBeDefined();
      expect(screen.getByText('Prescriptions')).toBeDefined();
      expect(screen.getByText('Invoices')).toBeDefined();
    });

    it('redirects old initialActiveTab="profile" in PatientPortal to /profile', () => {
      renderWithProviders(<PatientPortal activeTab="profile" />, { currentUser: patientUser });
      expect(window.location.pathname).toBe('/profile');
    });
  });

  describe('3. Content by Role in ProfileView', () => {
    it('renders Contact Details and Security & Password for linked Patient with emergency contact', () => {
      renderWithProviders(<ProfileView />, { currentUser: patientUser });

      // Two cards
      expect(screen.getByText('Contact Details')).toBeDefined();
      expect(screen.getByText('Security & Password')).toBeDefined();

      // Patient contact fields
      expect(screen.getByLabelText('Phone Number')).toBeDefined();
      expect(screen.getByLabelText('Address')).toBeDefined();
      expect(screen.getByLabelText('Emergency Contact Name')).toBeDefined();
      expect(screen.getByLabelText('Emergency Contact Relationship')).toBeDefined();
      expect(screen.getByLabelText('Emergency Contact Phone')).toBeDefined();
      expect(screen.getByLabelText('Email Address')).toBeDefined();

      // No staff read-only rows
      expect(screen.queryByText('Staff ID')).toBeNull();
      expect(screen.queryByText('To change these details, ask an administrator.')).toBeNull();
    });

    it('renders read-only rows and phone/email only for Staff without emergency contact', () => {
      renderWithProviders(<ProfileView />, { currentUser: mdUser });

      expect(screen.getByText('Contact Details')).toBeDefined();
      expect(screen.getByText('Security & Password')).toBeDefined();

      // Read-only rows
      expect(screen.getByText('Staff ID')).toBeDefined();
      expect(screen.getByText('Job title')).toBeDefined();
      expect(screen.getByText('Department')).toBeDefined();
      expect(screen.getByText('Roles')).toBeDefined();
      expect(screen.getByText('To change these details, ask an administrator.')).toBeDefined();

      // Editable fields for staff: phone and email only
      expect(screen.getByLabelText('Phone Number')).toBeDefined();
      expect(screen.getByLabelText('Email Address')).toBeDefined();

      // No patient emergency contact fields
      expect(screen.queryByLabelText('Emergency Contact Name')).toBeNull();
      expect(screen.queryByLabelText('Emergency Contact Relationship')).toBeNull();
      expect(screen.queryByLabelText('Address')).toBeNull();
    });

    it('renders ONLY Security & Password card for unlinked Patient', () => {
      renderWithProviders(<ProfileView />, { currentUser: unlinkedPatientUser });

      expect(screen.queryByText('Contact Details')).toBeNull();
      expect(screen.getByText('Security & Password')).toBeDefined();
      expect(screen.getByLabelText('Current Password')).toBeDefined();
      expect(screen.getByLabelText('New Password')).toBeDefined();
      expect(screen.getByLabelText('Confirm New Password')).toBeDefined();
    });
  });

  describe('4. Form Behavior, Validation, and Security', () => {
    it('disables Save Contact Details until a value changes', () => {
      renderWithProviders(<ProfileView />, { currentUser: mdUser });
      const saveBtn = screen.getByRole('button', { name: 'Save Contact Details' }) as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);

      const phoneInput = screen.getByLabelText('Phone Number');
      fireEvent.change(phoneInput, { target: { value: '+1 (555) 111-2222' } });
      expect(saveBtn.disabled).toBe(false);
    });

    it('requires Current Password when email is changed', async () => {
      renderWithProviders(<ProfileView />, { currentUser: mdUser });
      const emailInput = screen.getByLabelText('Email Address');

      // Initially no contact current password input
      expect(document.getElementById('profile-contact-password')).toBeNull();

      fireEvent.change(emailInput, { target: { value: 'new.marcus@beaconclinic.com' } });

      // Contact current password input appears
      const currentPassInput = document.getElementById('profile-contact-password');
      expect(currentPassInput).not.toBeNull();

      const saveBtn = screen.getByRole('button', { name: 'Save Contact Details' });
      fireEvent.click(saveBtn);

      // Inline error required
      expect(await screen.findByText('Current password is required to confirm an email change.')).toBeDefined();
    });

    it('enforces unique email and phone against existing accounts', async () => {
      renderWithProviders(<ProfileView />, { currentUser: mdUser });

      const emailInput = screen.getByLabelText('Email Address');
      fireEvent.change(emailInput, { target: { value: 'eleanor.wright@email.com' } }); // duplicate email

      const passInput = document.getElementById('profile-contact-password');
      expect(passInput).not.toBeNull();
      fireEvent.change(passInput!, { target: { value: 'ValidCurrent1' } });

      const saveBtn = screen.getByRole('button', { name: 'Save Contact Details' });
      fireEvent.click(saveBtn);

      expect(await screen.findByText('An account with this email address already exists.')).toBeDefined();
    });

    it('provides 44px touch targets on password show/hide buttons', () => {
      renderWithProviders(<ProfileView />, { currentUser: mdUser });

      const showButtons = screen.getAllByLabelText(/Show|Hide/);
      expect(showButtons.length).toBeGreaterThanOrEqual(3);

      showButtons.forEach((btn) => {
        expect(btn.className).toContain('w-11');
        expect(btn.className).toContain('h-11');
      });
    });

    it('derives password policy text and session security text from constants', () => {
      const policyText = getPasswordPolicyText();
      const sessionText = getSessionSecurityText();

      expect(policyText).toBe('At least 10 characters, with a letter and a number.');
      expect(policyText).toContain(String(PASSWORD_POLICY.minLength));

      expect(sessionText).toContain(`${SESSION_INACTIVITY_TIMEOUT_MS / 60000} minutes`);
      expect(sessionText).toContain(`${LOCKOUT_DURATION_MS / 60000} minutes`);

      // Validator test
      expect(validatePasswordPolicy('short1').valid).toBe(false);
      expect(validatePasswordPolicy('allletterslong').valid).toBe(false);
      expect(validatePasswordPolicy('1234567890').valid).toBe(false);
      expect(validatePasswordPolicy('ValidPassword10').valid).toBe(true);
    });

    it('writes ledger entries without exposing passwords', async () => {
      renderWithProviders(<ProfileView />, { currentUser: mdUser });

      const phoneInput = screen.getByLabelText('Phone Number');
      fireEvent.change(phoneInput, { target: { value: '+1 (555) 777-8888' } });

      const saveBtn = screen.getByRole('button', { name: 'Save Contact Details' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Contact details updated successfully.').length).toBeGreaterThanOrEqual(1);
      });

      const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
      const entries = await repoLedger.list();
      const profileEntry = entries.find((e) => e.action === 'profile_updated');
      expect(profileEntry).toBeDefined();
      expect(profileEntry?.description).not.toContain('password');
      expect(JSON.stringify(profileEntry)).not.toContain('ValidCurrent1');
    });

    it('prompts "Discard changes?" modal when navigating away with unsaved edits', async () => {
      renderWithProviders(<AppLayout />, { currentUser: mdUser });

      // Navigate to profile
      const avatarBtn = screen.getByLabelText('User profile menu');
      fireEvent.click(avatarBtn);
      const profileItem = screen.getAllByRole('menuitem')[0];
      fireEvent.click(profileItem);

      await screen.findByRole('heading', { name: 'My Profile' });

      // Make dirty
      const phoneInput = screen.getByLabelText('Phone Number');
      fireEvent.change(phoneInput, { target: { value: '+1 (555) 999-8888' } });

      // Click dashboard in sidebar
      const dashboardLink = screen.getByText('Dashboard');
      fireEvent.click(dashboardLink);

      // Discard changes dialog appears
      expect(await screen.findByText('Discard changes?')).toBeDefined();
      expect(screen.getByText('Keep editing')).toBeDefined();
      expect(screen.getByText('Discard')).toBeDefined();

      // Click Keep editing: remains on Profile
      fireEvent.click(screen.getByText('Keep editing'));
      expect(screen.queryByText('Discard changes?')).toBeNull();
      expect(screen.getByRole('heading', { name: 'My Profile' })).toBeDefined();

      // Click Discard: navigates to Dashboard
      fireEvent.click(dashboardLink);
      expect(await screen.findByText('Discard changes?')).toBeDefined();
      fireEvent.click(screen.getByText('Discard'));

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'My Profile' })).toBeNull();
      });
    });
  });
});
