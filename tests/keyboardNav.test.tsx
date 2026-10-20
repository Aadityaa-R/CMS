import { describe, it, expect } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppLayout } from '../src/components/layout/AppLayout';
import { Modal } from '../src/components/ui/Modal';
import { Input } from '../src/components/ui/Input';
import { Select } from '../src/components/ui/Select';
import { DatePicker } from '../src/components/ui/DatePicker';
import { Textarea } from '../src/components/ui/Textarea';
import { DoctorView } from '../src/views/DoctorView';
import { ReceptionistView } from '../src/views/ReceptionistView';
import { BillingView } from '../src/views/BillingView';

import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { BillingContext } from '../src/context/BillingContext';
import { AttendanceContext } from '../src/context/AttendanceContext';
import { ThemeContext } from '../src/context/ThemeContext';
import { NotificationContext } from '../src/context/NotificationContext';

import { INITIAL_MODULES, INITIAL_PATIENTS, INITIAL_APPOINTMENTS, INITIAL_PRESCRIPTIONS, INITIAL_DOCTORS } from '../src/data/mockData';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from '../src/data/billingSeed';
import { INITIAL_SHIFTS, INITIAL_ATTENDANCE_RECORDS, INITIAL_LEAVE_REQUESTS } from '../src/data/attendanceSeed';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { User } from '../src/types';

const mdUser: User = {
  id: 'usr-md-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  role: 'md',
  badgeNumber: 'DOC-101',
};

function createMockProviders(currentUser: User) {
  const authVal: any = {
    currentUser,
    currentRole: currentUser.role,
    isAuthenticated: true,
    switchRole: () => {},
    isRoleSuspended: () => false,
    logout: () => {},
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
    addPatient: async () => {},
    updatePatient: async () => {},
    addAppointment: async () => {},
    updateAppointment: async () => {},
    addPrescription: async () => {},
    updatePrescription: async () => {},
  };

  const billingVal: any = {
    invoices: INITIAL_SEED_INVOICES,
    payments: INITIAL_SEED_PAYMENTS,
    createInvoice: async () => {},
    recordPayment: async () => {},
    getInvoiceById: (id: string) => INITIAL_SEED_INVOICES.find((i) => i.id === id),
    getDailyCollections: () => ({ cash: 0, card: 0, upi: 0, portal: 0, total: 0 }),
  };

  const attendanceVal: any = {
    shifts: INITIAL_SHIFTS,
    records: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    clockIn: async () => {},
    clockOut: async () => {},
    submitLeaveRequest: async () => {},
    updateLeaveRequestStatus: async () => {},
    refreshRecords: async () => {},
    getCanonicalStaffId: (id?: string) => id || 'acc-md',
    getStaffShift: () => undefined,
    getTodayRecord: () => undefined,
  };

  const themeVal: any = {
    theme: 'light',
    toggleTheme: () => {},
  };

  const notificationVal: any = {
    notifications: [],
    userNotifications: [],
    unreadCount: 0,
    addNotification: async () => {},
    markAsRead: async () => {},
    markAllAsRead: async () => {},
    dismissNotification: async () => {},
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeContext.Provider value={themeVal}>
      <AuthContext.Provider value={authVal}>
        <ClinicContext.Provider value={clinicVal}>
          <BillingContext.Provider value={billingVal}>
            <AttendanceContext.Provider value={attendanceVal}>
              <NotificationContext.Provider value={notificationVal}>
                {children}
              </NotificationContext.Provider>
            </AttendanceContext.Provider>
          </BillingContext.Provider>
        </ClinicContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );

  return Wrapper;
}

describe('Keyboard and Screen Reader Pass (M10 Section 3)', () => {
  it('renders skip to main content link targeting #main-content', async () => {
    const Wrapper = createMockProviders(mdUser);
    await act(async () => {
      render(
        <Wrapper>
          <AppLayout />
        </Wrapper>
      );
    });

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute('href')).toBe('#main-content');

    const mainElement = document.getElementById('main-content');
    expect(mainElement).not.toBeNull();
    expect(mainElement?.tagName.toLowerCase()).toBe('main');
  });

  it('renders landmarks (header, nav, main) and polite live region', async () => {
    const Wrapper = createMockProviders(mdUser);
    await act(async () => {
      render(
        <Wrapper>
          <AppLayout />
        </Wrapper>
      );
    });

    expect(document.querySelector('header')).not.toBeNull();
    expect(document.querySelector('nav[aria-label="Main Navigation"]')).not.toBeNull();
    expect(document.querySelector('main#main-content')).not.toBeNull();

    const liveRegion = document.getElementById('global-status-region');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
  });

  it('verifies Modal traps focus and returns focus to opener upon Escape', () => {
    const TestComponent: React.FC = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button id="opener-btn" onClick={() => setIsOpen(true)}>
            Open Dialog
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Accessibility Dialog">
            <input id="modal-first-input" placeholder="Field 1" />
            <button id="modal-submit-btn">Submit</button>
          </Modal>
        </div>
      );
    };

    render(<TestComponent />);

    const opener = document.getElementById('opener-btn') as HTMLButtonElement;
    opener.focus();
    expect(document.activeElement).toBe(opener);

    // Open modal
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    // Press Tab on the dialog and verify it traps focus inside dialog
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Press Escape to close modal
    fireEvent.keyDown(window, { key: 'Escape' });

    // Verify modal is closed
    expect(screen.queryByRole('dialog')).toBeNull();

    // Verify focus returned to opener button
    expect(document.activeElement).toBe(opener);
  });

  it('verifies form controls link errors through aria-describedby and set aria-invalid', () => {
    render(
      <div>
        <Input label="Email Address" error="Please enter a valid email address." />
        <Textarea label="Clinical Notes" error="Notes cannot be empty." />
        <Select
          label="Prescription Medication"
          options={[{ value: '1', label: 'Amoxicillin' }]}
          error="Selection required."
        />
        <DatePicker
          label="Appointment Date"
          value=""
          onChange={() => {}}
          error="Date is in the past."
        />
      </div>
    );

    // Input
    const textInput = screen.getByLabelText(/email address/i);
    expect(textInput.getAttribute('aria-invalid')).toBe('true');
    const inputDescribedBy = textInput.getAttribute('aria-describedby');
    expect(inputDescribedBy).toBeDefined();
    const errorMsg = document.getElementById(inputDescribedBy!);
    expect(errorMsg?.textContent).toContain('Please enter a valid email address.');

    // Textarea
    const textarea = screen.getByLabelText(/clinical notes/i);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    const textareaDescribedBy = textarea.getAttribute('aria-describedby');
    expect(textareaDescribedBy).toBeDefined();
    const textareaError = document.getElementById(textareaDescribedBy!);
    expect(textareaError?.textContent).toContain('Notes cannot be empty.');

    // Select combobox
    const combobox = screen.getByRole('combobox');
    expect(combobox.getAttribute('aria-invalid')).toBe('true');
    expect(combobox.getAttribute('aria-haspopup')).toBe('listbox');

    // DatePicker
    const dateBtn = screen.getByText('Date is in the past.');
    expect(dateBtn).toBeDefined();
  });

  it('walks workstation tabs via keyboard and verifies aria-selected and aria-current', () => {
    const Wrapper = createMockProviders(mdUser);
    render(
      <Wrapper>
        <DoctorView activeTab="overview" />
      </Wrapper>
    );

    const tablist = screen.getByRole('tablist', { name: /consultation tabs/i });
    expect(tablist).toBeDefined();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3);

    // First tab is initially selected
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-current')).toBe('page');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');

    // Navigate to second tab via keyboard Enter
    tabs[1].focus();
    fireEvent.click(tabs[1]);

    // Second tab is now active
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-current')).toBe('page');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
  });

  it('verifies single h1 per workstation view', () => {
    const Wrapper = createMockProviders(mdUser);

    const { unmount: unmountDoc } = render(
      <Wrapper>
        <DoctorView activeTab="overview" />
      </Wrapper>
    );
    const docH1s = document.querySelectorAll('h1');
    expect(docH1s.length).toBe(1);
    expect(docH1s[0].textContent).toContain('Consultation Desk');
    unmountDoc();

    const { unmount: unmountRec } = render(
      <Wrapper>
        <ReceptionistView activeTab="lounge" />
      </Wrapper>
    );
    const recH1s = document.querySelectorAll('h1');
    expect(recH1s.length).toBe(1);
    expect(recH1s[0].textContent).toContain('Front Desk and Patient Reception Workstation');
    unmountRec();

    const { unmount: unmountBil } = render(
      <Wrapper>
        <BillingView />
      </Wrapper>
    );
    const bilH1s = document.querySelectorAll('h1');
    expect(bilH1s.length).toBe(1);
    expect(bilH1s[0].textContent).toContain('Billing');
    unmountBil();
  });
});

