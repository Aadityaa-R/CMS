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
    role: 'doctor',
    label: 'Doctor',
    department: 'Internal Medicine',
    description: 'Lead Consulting Physician: clinical consultations, front desk coordination, and clinic operations.',
  },
  {
    role: 'receptionist',
    label: 'Receptionist',
    department: 'Front Desk',
    description: 'Appointment booking, patient check-in, token issuance, and queue coordination.',
  },
  {
    role: 'patient',
    label: 'Patient',
    department: 'Patient Portal',
    description: 'Personal appointments, active prescriptions, and billing receipts.',
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
    return savedRole && DEMO_USERS[savedRole] ? (savedRole === 'admin' ? 'doctor' : savedRole) : 'doctor';
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

  const currentUser = userProfiles[currentRole] || DEMO_USERS[currentRole] || DEMO_USERS.doctor;

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
      const matchAdminAlias = cred.role === 'doctor' && (cleanId === 'admin' || cleanId === 'admin@beaconclinic.com');
      return matchUser || matchEmail || matchRole || matchAdminAlias;
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
    const targetRole = role === 'admin' ? 'doctor' : role;
    if (DEMO_USERS[targetRole]) {
      setCurrentRole(targetRole);
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
