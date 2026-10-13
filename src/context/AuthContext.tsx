import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '@/types';
import { DEMO_USERS } from '@/data/mockData';

export interface RoleMeta {
  role: UserRole;
  label: string;
  department: string;
  description: string;
}

export const ALL_ROLES: RoleMeta[] = [
  {
    role: 'clinic_admin',
    label: 'Clinic Admin',
    department: 'Administration',
    description: 'Clinic operations, doctors, patient directory, and operational analytics.',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    department: 'Clinical Care',
    description: 'Patient consultations, diagnostic notes, electronic prescriptions, and lab orders.',
  },
  {
    role: 'patient',
    label: 'Patient',
    department: 'Patient Portal',
    description: 'Personal appointments, active prescriptions, lab reports, and billing receipts.',
  },
  {
    role: 'receptionist',
    label: 'Receptionist',
    department: 'Front Desk',
    description: 'Appointment booking, patient check-in, token issuance, and queue coordination.',
  },
  {
    role: 'nurse',
    label: 'Nurse',
    department: 'Triage & Nursing',
    description: 'Vital signs recording, patient triage, preparation, and nursing observations.',
  },
  {
    role: 'pharmacist',
    label: 'Pharmacist',
    department: 'Pharmacy',
    description: 'Prescription dispensing, drug fulfillment, stock levels, and medicine inventory.',
  },
  {
    role: 'accountant',
    label: 'Accountant',
    department: 'Billing & Finance',
    description: 'Invoicing, payment processing, fee collections, and financial summaries.',
  },
  {
    role: 'lab_technician',
    label: 'Lab Technician',
    department: 'Diagnostic Laboratory',
    description: 'Sample collection, specimen testing, diagnostic results, and reference ranges.',
  },
];

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  availableRoles: RoleMeta[];
  isAuthenticated: boolean;
  loginAs: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('clinic_admin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const currentUser = DEMO_USERS[currentRole] || DEMO_USERS.clinic_admin;

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    setIsAuthenticated(true);
  };

  const loginAs = (role: UserRole) => {
    setCurrentRole(role);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        availableRoles: ALL_ROLES,
        isAuthenticated,
        loginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

