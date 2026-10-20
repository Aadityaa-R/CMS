import { describe, it } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { DashboardView } from '../src/views/DashboardView';
import { DoctorView } from '../src/views/DoctorView';
import { ReceptionistView } from '../src/views/ReceptionistView';
import { AccessControlView } from '../src/views/AccessControlView';
import { AttendanceView } from '../src/views/AttendanceView';
import { BillingView } from '../src/views/BillingView';
import { PatientPortal } from '../src/views/PatientPortal';
import { LoginView } from '../src/views/LoginView';
import { SignUpView } from '../src/views/SignUpView';

import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { BillingContext } from '../src/context/BillingContext';
import { AttendanceContext } from '../src/context/AttendanceContext';
import { ThemeContext } from '../src/context/ThemeContext';
import { NotificationContext } from '../src/context/NotificationContext';

import { INITIAL_MODULES, INITIAL_PATIENTS, INITIAL_APPOINTMENTS, INITIAL_PRESCRIPTIONS } from '../src/data/mockData';
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

const docHayes: User = {
  id: 'usr-doc-2',
  name: 'Dr. Nathan Hayes',
  email: 'n.hayes@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-102',
};

const receptionistUser: User = {
  id: 'usr-rec-1',
  name: 'Priya Sharma',
  email: 'p.sharma@beaconclinic.com',
  role: 'receptionist',
  badgeNumber: 'REC-201',
};

const patientUser: User = {
  id: 'usr-pat-1',
  name: 'Eleanor Wright',
  email: 'e.wright@example.com',
  role: 'patient',
  patientId: 'pat-1',
};

const docReed: User = {
  id: 'usr-doc-3',
  name: 'Dr. Sophia Reed',
  email: 's.reed@beaconclinic.com',
  role: 'doctor',
  badgeNumber: 'DOC-103',
};

const receptionist2User: User = {
  id: 'usr-rec-2',
  name: 'David Kim',
  email: 'd.kim@beaconclinic.com',
  role: 'receptionist',
  badgeNumber: 'REC-202',
};

const patientJamesUser: User = {
  id: 'usr-pat-2',
  name: 'James Miller',
  email: 'j.miller@example.com',
  role: 'patient',
  patientId: 'pat-2',
};

function createMockProviders(currentUser: User, customInvoices = INITIAL_SEED_INVOICES, customPayments = INITIAL_SEED_PAYMENTS) {
  const authVal: any = {
    currentUser,
    currentRole: currentUser.role,
    isAuthenticated: true,
    addAuditLogEntry: () => {},
  };

  const clinicVal: any = {
    modules: INITIAL_MODULES,
    patients: INITIAL_PATIENTS,
    appointments: INITIAL_APPOINTMENTS,
    prescriptions: INITIAL_PRESCRIPTIONS,
    assignments: [
      { id: 'asgn-1', patientId: 'pat-1', doctorId: 'doc-2', active: true, assignedAt: '2026-10-01' },
      { id: 'asgn-2', patientId: 'pat-2', doctorId: 'doc-3', active: true, assignedAt: '2026-10-01' },
    ],
    doctors: [
      { id: 'doc-1', name: 'Dr. Marcus Vance', role: 'md', consultationFee: 12000, active: true },
      { id: 'doc-2', name: 'Dr. Nathan Hayes', role: 'doctor', consultationFee: 9000, active: true },
      { id: 'doc-3', name: 'Dr. Sophia Reed', role: 'doctor', consultationFee: 11000, active: true },
    ],
    formulary: INITIAL_FORMULARY,
    pendingApprovals: [],
    staffAccess: [],
    shifts: INITIAL_SHIFTS,
    records: INITIAL_ATTENDANCE_RECORDS,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    auditLogs: [],
    claimRequests: [],
  };

  const billingVal: any = {
    invoices: customInvoices,
    payments: customPayments,
    recordPayment: async () => ({ success: true }),
    reversePayment: async () => ({ success: true }),
    addCharge: async () => ({ success: true }),
    applyDiscount: async () => ({ success: true }),
    voidInvoice: async () => ({ success: true }),
    getReceipt: () => null,
    getDailyCollections: () => ({ cash: 0, card: 0, upi: 0, portal: 0, total: 0 }),
  };

  const attendanceVal: any = {
    shifts: INITIAL_SHIFTS,
    records: INITIAL_ATTENDANCE_RECORDS,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    recordClockIn: async () => {},
    recordClockOut: async () => {},
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

describe('All Tabs and Roles Safety Audit (M9.5 / fix-payments-blank)', () => {
  it('renders DashboardView for all 4 roles without throwing', async () => {
    for (const user of [mdUser, docHayes, receptionistUser, patientUser]) {
      const Wrapper = createMockProviders(user);
      await act(async () => {
        render(
          <Wrapper>
            <DashboardView onNavigate={() => {}} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all DoctorView tabs without throwing', async () => {
    const Wrapper = createMockProviders(docHayes);
    for (const tab of ['overview', 'patients', 'prescriptions']) {
      await act(async () => {
        render(
          <Wrapper>
            <DoctorView activeTab={tab} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all ReceptionistView tabs without throwing', async () => {
    const Wrapper = createMockProviders(receptionistUser);
    for (const tab of ['lounge', 'appointments', 'patients', 'registry']) {
      await act(async () => {
        render(
          <Wrapper>
            <ReceptionistView activeTab={tab} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all BillingView tabs without throwing', async () => {
    const Wrapper = createMockProviders(mdUser);
    for (const tab of ['invoices', 'payments']) {
      await act(async () => {
        render(
          <Wrapper>
            <BillingView initialTab={tab as any} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all AccessControlView tabs without throwing', async () => {
    const Wrapper = createMockProviders(mdUser);
    for (const tab of ['modules', 'edit_users', 'add_users', 'ledger', 'formulary', 'data']) {
      await act(async () => {
        render(
          <Wrapper>
            <AccessControlView activeTab={tab} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all AttendanceView tabs without throwing', async () => {
    const Wrapper = createMockProviders(mdUser);
    for (const tab of ['today', 'sheet', 'leaves', 'shifts', 'my_attendance']) {
      await act(async () => {
        render(
          <Wrapper>
            <AttendanceView activeTab={tab} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all PatientPortal tabs without throwing', async () => {
    const Wrapper = createMockProviders(patientUser);
    for (const tab of ['appointments', 'records', 'prescriptions', 'invoices', 'profile']) {
      await act(async () => {
        render(
          <Wrapper>
            <PatientPortal activeTab={tab} />
          </Wrapper>
        );
      });
      cleanup();
    }
  });

  it('renders all views safely for Dr. Sophia Reed, David Kim, and James Miller', async () => {
    // Dr. Sophia Reed
    const ReedWrapper = createMockProviders(docReed);
    await act(async () => {
      render(
        <ReedWrapper>
          <DashboardView onNavigate={() => {}} />
          <DoctorView activeTab="overview" />
          <DoctorView activeTab="patients" />
          <DoctorView activeTab="prescriptions" />
          <AttendanceView activeTab="my_attendance" />
        </ReedWrapper>
      );
    });
    cleanup();

    // David Kim (Second receptionist)
    const KimWrapper = createMockProviders(receptionist2User);
    await act(async () => {
      render(
        <KimWrapper>
          <DashboardView onNavigate={() => {}} />
          <ReceptionistView activeTab="lounge" />
          <ReceptionistView activeTab="appointments" />
          <ReceptionistView activeTab="patients" />
          <ReceptionistView activeTab="registry" />
          <BillingView initialTab="payments" />
          <AttendanceView activeTab="my_attendance" />
        </KimWrapper>
      );
    });
    cleanup();

    // James Miller (Completed visit patient)
    const JamesWrapper = createMockProviders(patientJamesUser);
    await act(async () => {
      render(
        <JamesWrapper>
          <DashboardView onNavigate={() => {}} />
          <PatientPortal activeTab="appointments" />
          <PatientPortal activeTab="invoices" />
        </JamesWrapper>
      );
    });
    cleanup();
  });

  it('renders LoginView and SignUpView without throwing', async () => {
    const DefaultWrapper = createMockProviders(patientUser);
    await act(async () => {
      render(
        <DefaultWrapper>
          <LoginView />
          <SignUpView onBackToLogin={() => {}} />
        </DefaultWrapper>
      );
    });
    cleanup();
  });

  it('renders every view safely with unmigrated legacy version-1 data', async () => {
    const legacyInvoices: any[] = [
      {
        id: 'inv-v1',
        invoiceNumber: 'INV-LEGACY-001',
        patientId: 'pat-1',
        patientName: 'Eleanor Wright',
        doctorId: 'doc-1',
        doctorName: 'Dr. Marcus Vance',
        date: '2025-11-20',
        items: [{ id: '1', description: 'Office visit', amount: 95, kind: 'consultation' }],
        status: 'unpaid',
        createdBy: 'Dr. Marcus Vance',
      },
    ];

    const legacyPayments: any[] = [
      {
        id: 'pay-v1',
        invoiceId: 'inv-v1',
        amount: 95,
        method: 'cash',
        date: '2025-11-20',
        receivedBy: 'Priya Sharma',
      },
    ];

    const Wrapper = createMockProviders(mdUser, legacyInvoices, legacyPayments);

    await act(async () => {
      render(
        <Wrapper>
          <DashboardView onNavigate={() => {}} />
          <BillingView initialTab="invoices" />
          <BillingView initialTab="payments" />
          <PatientPortal activeTab="invoices" />
        </Wrapper>
      );
    });
    cleanup();
  });
});
