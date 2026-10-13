import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RoleCredential } from '@/types';
import { DEMO_USERS, ROLE_CREDENTIALS } from '@/data/mockData';

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

interface LoginResult {
  success: boolean;
  error?: string;
  matchedRole?: UserRole;
}

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  availableRoles: RoleMeta[];
  roleCredentials: RoleCredential[];
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => LoginResult;
  loginAs: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const savedRole = sessionStorage.getItem('cms_auth_role') as UserRole;
    return savedRole && DEMO_USERS[savedRole] ? savedRole : 'clinic_admin';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('cms_authenticated') === 'true';
  });

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.setItem('cms_auth_role', currentRole);
      sessionStorage.setItem('cms_authenticated', 'true');
    } else {
      sessionStorage.removeItem('cms_auth_role');
      sessionStorage.removeItem('cms_authenticated');
    }
  }, [currentRole, isAuthenticated]);

  const [userProfiles, setUserProfiles] = useState<Record<UserRole, User>>(() => {
    try {
      const saved = sessionStorage.getItem('cms_user_profiles');
      if (saved) {
        return { ...DEMO_USERS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEMO_USERS;
  });

  const currentUser = userProfiles[currentRole] || DEMO_USERS[currentRole] || DEMO_USERS.clinic_admin;

  const updateCurrentUser = (updates: Partial<User>) => {
    setUserProfiles((prev) => {
      const existingUser = prev[currentRole] || DEMO_USERS[currentRole];
      const updatedUser: User = {
        ...existingUser,
        ...updates,
      };
      const nextProfiles = {
        ...prev,
        [currentRole]: updatedUser,
      };
      try {
        sessionStorage.setItem('cms_user_profiles', JSON.stringify(nextProfiles));
      } catch {
        // Fallback
      }
      return nextProfiles;
    });
  };

  const login = (identifier: string, password: string): LoginResult => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    // Match by username, email, or role key
    const match = ROLE_CREDENTIALS.find((cred) => {
      const matchUser = cred.username.toLowerCase() === cleanId;
      const matchEmail = cred.email.toLowerCase() === cleanId;
      const matchRole = cred.role.toLowerCase() === cleanId;
      return matchUser || matchEmail || matchRole;
    });

    if (!match) {
      return {
        success: false,
        error: 'No account found matching this username or email address.',
      };
    }

    // Check password (supports the role's designated password or password123 as secondary fallback)
    const isPasswordValid = match.password === cleanPass || cleanPass === 'password123';

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      };
    }

    setCurrentRole(match.role);
    setIsAuthenticated(true);
    return { success: true, matchedRole: match.role };
  };

  const loginAs = (role: UserRole) => {
    if (DEMO_USERS[role]) {
      setCurrentRole(role);
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cms_auth_role');
    sessionStorage.removeItem('cms_authenticated');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        availableRoles: ALL_ROLES,
        roleCredentials: ROLE_CREDENTIALS,
        isAuthenticated,
        login,
        loginAs,
        switchRole: loginAs,
        updateCurrentUser,
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
