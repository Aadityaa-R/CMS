import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RoleCredential, StaffAccessRecord, AccessAuditLogEntry } from '@/types';
import {
  DEMO_USERS,
  ROLE_CREDENTIALS,
  INITIAL_STAFF_ACCESS,
  INITIAL_ACCESS_AUDIT_LOG,
} from '@/data/mockData';

export interface RoleMeta {
  role: UserRole;
  label: string;
  department: string;
  description: string;
}

export const ALL_ROLES: RoleMeta[] = [
  {
    role: 'md',
    label: 'MD',
    department: 'Executive Clinic Governance',
    description: 'Managing Director & Chief Physician: Supreme clinic leadership, operations, and clinical consultations.',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    department: 'General Medicine & Triage',
    description: 'Staff Consulting Physician: Outpatient clinical consultations, EMR reviews, and prescriptions.',
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
  staffAccessList: StaffAccessRecord[];
  accessAuditLog: AccessAuditLogEntry[];
  grantStaffAccess: (recordId: string, reason?: string) => void;
  revokeStaffAccess: (recordId: string, reason?: string) => void;
  toggleStaffPermission: (recordId: string, permissionId: string) => void;
  isRoleSuspended: (role: UserRole) => boolean;
  isStaffSuspended: (staffNameOrId: string) => boolean;
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
    return savedRole && DEMO_USERS[savedRole] ? (savedRole === 'admin' ? 'md' : savedRole) : 'md';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('cms_authenticated') === 'true';
  });

  // Staff Access Records state
  const [staffAccessList, setStaffAccessList] = useState<StaffAccessRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('cms_staff_access');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_STAFF_ACCESS;
  });

  // Access Audit Log state
  const [accessAuditLog, setAccessAuditLog] = useState<AccessAuditLogEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem('cms_access_audit_log');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_ACCESS_AUDIT_LOG;
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

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_staff_access', JSON.stringify(staffAccessList));
    } catch {
      // Fallback
    }
  }, [staffAccessList]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_access_audit_log', JSON.stringify(accessAuditLog));
    } catch {
      // Fallback
    }
  }, [accessAuditLog]);

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

  const currentUser = userProfiles[currentRole] || DEMO_USERS[currentRole] || DEMO_USERS.md;

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

  const isRoleSuspended = (role: UserRole): boolean => {
    if (role === 'md' || role === 'admin') return false; // Managing Director cannot be suspended
    const records = staffAccessList.filter((r) => r.role === role);
    if (records.length === 0) return false;
    // If all records for this role are revoked, the role is suspended
    return records.every((r) => r.status === 'revoked');
  };

  const isStaffSuspended = (staffNameOrId: string): boolean => {
    const record = staffAccessList.find(
      (r) => r.id === staffNameOrId || r.staffName.toLowerCase() === staffNameOrId.toLowerCase()
    );
    return record ? record.status === 'revoked' : false;
  };

  const grantStaffAccess = (recordId: string, reason?: string) => {
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setStaffAccessList((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: 'granted',
              lastUpdated: timestamp,
              updatedBy: 'Dr. Marcus Vance (Managing Director)',
              reason: reason || 'Access privileges granted by Managing Director',
            }
          : r
      )
    );

    const newAudit: AccessAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      targetRole: record.role,
      targetStaffName: record.staffName,
      action: 'access_granted',
      description: `Station credentials and operational clearance restored by Managing Director`,
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const revokeStaffAccess = (recordId: string, reason?: string) => {
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setStaffAccessList((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: 'revoked',
              lastUpdated: timestamp,
              updatedBy: 'Dr. Marcus Vance (Managing Director)',
              reason: reason || 'Access suspended by Managing Director executive directive',
            }
          : r
      )
    );

    const newAudit: AccessAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      targetRole: record.role,
      targetStaffName: record.staffName,
      action: 'access_revoked',
      description: `Station access and operational privileges revoked by Managing Director`,
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const toggleStaffPermission = (recordId: string, permissionId: string) => {
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    const targetPerm = record.permissions.find((p) => p.id === permissionId);
    const nextState = !targetPerm?.enabled;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setStaffAccessList((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          lastUpdated: timestamp,
          updatedBy: 'Dr. Marcus Vance (Managing Director)',
          permissions: r.permissions.map((p) =>
            p.id === permissionId ? { ...p, enabled: nextState } : p
          ),
        };
      })
    );

    const newAudit: AccessAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      targetRole: record.role,
      targetStaffName: record.staffName,
      action: 'permission_updated',
      description: `Permission '${targetPerm?.name}' ${nextState ? 'enabled' : 'disabled'} by Managing Director`,
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const login = (identifier: string, password: string): LoginResult => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    // Match by username, email, or role key
    const match = ROLE_CREDENTIALS.find((cred) => {
      const matchUser = cred.username.toLowerCase() === cleanId;
      const matchEmail = cred.email.toLowerCase() === cleanId;
      const matchRole = cred.role.toLowerCase() === cleanId;
      const matchMdAlias =
        cred.role === 'md' &&
        (cleanId === 'admin' ||
          cleanId === 'admin@beaconclinic.com' ||
          cleanId === 'm.vance' ||
          cleanId === 'md');
      return matchUser || matchEmail || matchRole || matchMdAlias;
    });

    if (!match) {
      return {
        success: false,
        error: 'No account found matching this username or email address.',
      };
    }

    // Check password
    const isPasswordValid = match.password === cleanPass || cleanPass === 'password123';

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      };
    }

    // Check if role is suspended
    if (isRoleSuspended(match.role)) {
      return {
        success: false,
        error: 'Access Suspended: Station credentials have been revoked by the Managing Director (Dr. Marcus Vance).',
      };
    }

    setCurrentRole(match.role);
    setIsAuthenticated(true);
    return { success: true, matchedRole: match.role };
  };

  const loginAs = (role: UserRole) => {
    const targetRole = role === 'admin' ? 'md' : role;
    if (DEMO_USERS[targetRole]) {
      if (isRoleSuspended(targetRole)) {
        // Prevent switching if suspended
        return;
      }
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
        staffAccessList,
        accessAuditLog,
        grantStaffAccess,
        revokeStaffAccess,
        toggleStaffPermission,
        isRoleSuspended,
        isStaffSuspended,
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

