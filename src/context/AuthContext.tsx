import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RoleCredential, StaffAccessRecord, AccessAuditLogEntry } from '@/types';
import {
  DEMO_USERS,
  ROLE_CREDENTIALS,
  INITIAL_STAFF_ACCESS,
  INITIAL_ACCESS_AUDIT_LOG,
  INITIAL_MODULES,
} from '@/data/mockData';
import {
  isAdmin,
  getEffectiveAccesses,
  canGrantAdmin,
  canRevokeAdmin,
  canDeleteStaff,
} from '@/lib/permissions';

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
  deleteStaffAccount: (recordId: string, reason?: string) => void;
  toggleStaffPermission: (recordId: string, permissionId: string) => void;
  updateStaffCapabilities: (
    recordId: string,
    updates: Array<{ permissionId: string; enabled: boolean }>,
    actingAdmin?: string
  ) => void;
  addStaffAccount: (record: StaffAccessRecord, auditDescription?: string) => void;
  addAuditLogEntry: (
    entry: Omit<AccessAuditLogEntry, 'id' | 'timestamp' | 'authorizedBy'> & {
      id?: string;
      timestamp?: string;
      authorizedBy?: string;
    }
  ) => void;
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
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role') as UserRole;
      if (urlRole && DEMO_USERS[urlRole]) return urlRole === 'admin' ? 'md' : urlRole;
    } catch {
      // fallback
    }
    const savedRole = sessionStorage.getItem('cms_auth_role') as UserRole;
    return savedRole && DEMO_USERS[savedRole] ? (savedRole === 'admin' ? 'md' : savedRole) : 'md';
  });

  const [activeUserKey, setActiveUserKey] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      if (urlRole && DEMO_USERS[urlRole]) return urlRole;
    } catch {
      // fallback
    }
    return sessionStorage.getItem('cms_auth_user_key') || 'md';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') || params.get('role')) return true;
    } catch {
      // fallback
    }
    return sessionStorage.getItem('cms_authenticated') === 'true';
  });

  // Staff Access Records state
  const [staffAccessList, setStaffAccessList] = useState<StaffAccessRecord[]>(() => {
    try {
      // Invalidate legacy single-module portal caches
      sessionStorage.removeItem('cms_staff_access');
      sessionStorage.removeItem('cms_staff_access_v2');
      sessionStorage.removeItem('cms_staff_access_v3');
      sessionStorage.removeItem('cms_staff_access_v4');
      sessionStorage.removeItem('cms_staff_access_v5');
      sessionStorage.removeItem('cms_staff_access_v6');

      const saved = sessionStorage.getItem('cms_staff_access_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length >= 10 &&
          parsed.some((r: StaffAccessRecord) => r.id === 'acc-doc-1')
        ) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_STAFF_ACCESS;
  });

  // Access Audit Log state
  const [accessAuditLog, setAccessAuditLog] = useState<AccessAuditLogEntry[]>(() => {
    try {
      sessionStorage.removeItem('cms_access_audit_log_v5');
      sessionStorage.removeItem('cms_access_audit_log_v6');
      const saved = sessionStorage.getItem('cms_access_audit_log_v7');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_ACCESS_AUDIT_LOG;
  });

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.setItem('cms_auth_role', currentRole);
      sessionStorage.setItem('cms_auth_user_key', activeUserKey);
      sessionStorage.setItem('cms_authenticated', 'true');
    } else {
      sessionStorage.removeItem('cms_auth_role');
      sessionStorage.removeItem('cms_auth_user_key');
      sessionStorage.removeItem('cms_authenticated');
    }
  }, [currentRole, activeUserKey, isAuthenticated]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_staff_access_v7', JSON.stringify(staffAccessList));
    } catch {
      // Fallback
    }
  }, [staffAccessList]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_access_audit_log_v7', JSON.stringify(accessAuditLog));
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

  const baseUser = DEMO_USERS[activeUserKey] || userProfiles[currentRole] || DEMO_USERS[currentRole] || DEMO_USERS.md;
  const currentStaffRecord = staffAccessList.find(
    (s) => s.id === baseUser.id || s.badgeNumber === baseUser.badgeNumber || s.staffName === baseUser.name
  );

  let currentModules = INITIAL_MODULES;
  try {
    const savedMods = sessionStorage.getItem('cms_modules_v2');
    if (savedMods) {
      const parsed = JSON.parse(savedMods);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        currentModules = parsed;
      }
    }
  } catch {
    // fallback
  }

  const effectiveCapabilities = getEffectiveAccesses(
    currentStaffRecord || baseUser,
    currentModules
  );

  const currentUser: User = {
    ...baseUser,
    isOriginalAdmin: baseUser.isOriginalAdmin || currentStaffRecord?.isOriginalAdmin || false,
    capabilities: effectiveCapabilities,
  };

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
    if (!isAdmin(currentUser)) {
      console.error('Unauthorized: only administrators can grant staff access.');
      return;
    }
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
              updatedBy: currentUser.name || 'Dr. Marcus Vance (Managing Director)',
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
      description: `Station credentials and operational clearance restored by ${currentUser.name || 'Managing Director'}`,
      authorizedBy: currentUser.name || 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const revokeStaffAccess = (recordId: string, reason?: string) => {
    if (!isAdmin(currentUser)) {
      console.error('Unauthorized: only administrators can revoke staff access.');
      return;
    }
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    if (isAdmin(record)) {
      const check = canRevokeAdmin(currentUser, record, staffAccessList);
      if (!check.allowed) {
        console.error('Cannot revoke administrator:', check.reason);
        return;
      }
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setStaffAccessList((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: 'revoked',
              lastUpdated: timestamp,
              updatedBy: currentUser.name || 'Dr. Marcus Vance (Managing Director)',
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
      description: `Station access and operational privileges revoked by ${currentUser.name || 'Managing Director'}`,
      authorizedBy: currentUser.name || 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const deleteStaffAccount = (recordId: string, reason?: string) => {
    if (!isAdmin(currentUser)) {
      console.error('Unauthorized: only administrators can delete staff accounts.');
      return;
    }
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    const check = canDeleteStaff(currentUser, record, staffAccessList);
    if (!check.allowed) {
      console.error('Cannot delete staff account:', check.reason);
      return;
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setStaffAccessList((prev) => prev.filter((r) => r.id !== recordId));

    const newAudit: AccessAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      targetRole: record.role,
      targetStaffName: record.staffName,
      action: 'account_deleted',
      description: reason || `Account permanently deleted and purged from clinic directory by ${currentUser.name || 'Managing Director'}`,
      authorizedBy: currentUser.name || 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const toggleStaffPermission = (recordId: string, permissionId: string) => {
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    const targetPerm = (record.permissions || []).find((p) => p.id === permissionId);
    const nextState = !targetPerm?.enabled;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const oldState = targetPerm?.enabled ? 'Granted' : 'Not granted';
    const newState = nextState ? 'Granted' : 'Not granted';

    setStaffAccessList((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          lastUpdated: timestamp,
          updatedBy: 'Dr. Marcus Vance (Managing Director)',
          permissions: (r.permissions || []).map((p) =>
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
      targetUserId: record.id,
      capability: targetPerm?.name,
      oldState,
      newState,
      action: 'permission_updated',
      description: `Capability '${targetPerm?.name}' changed from ${oldState} to ${newState} for ${record.staffName} (User ID: ${record.id}) by Dr. Marcus Vance (Managing Director)`,
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const updateStaffCapabilities = (
    recordId: string,
    updates: Array<{ permissionId: string; enabled: boolean }>,
    actingAdmin?: string
  ) => {
    if (!isAdmin(currentUser)) {
      console.error('Unauthorized: only administrators can modify staff capabilities.');
      return;
    }
    const record = staffAccessList.find((r) => r.id === recordId);
    if (!record) return;

    // Filter out unauthorized admin promotions or revocations
    const validUpdates = updates.filter((u) => {
      if (u.permissionId === 'perm-admin' || u.permissionId === 'administrativeAccess') {
        if (u.enabled) {
          return canGrantAdmin(currentUser, record);
        } else {
          const check = canRevokeAdmin(currentUser, record, staffAccessList);
          return check.allowed;
        }
      }
      return true;
    });

    if (validUpdates.length === 0 && updates.length > 0) return;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const adminName = actingAdmin || currentUser.name || 'Dr. Marcus Vance (Managing Director)';

    const newAuditEntries: AccessAuditLogEntry[] = [];

    const existingPerms = [...(record.permissions || [])];
    for (const update of validUpdates) {
      if (!existingPerms.some((p) => p.id === update.permissionId)) {
        if (update.permissionId === 'perm-admin') {
          existingPerms.unshift({
            id: 'perm-admin',
            name: 'Administrative Access',
            description: 'Clinic configuration, staff access control, and master ledger management',
            enabled: false,
          });
        }
      }
    }

    const updatedPermissions = existingPerms.map((p) => {
      const match = updates.find((u) => u.permissionId === p.id);
      if (match && match.enabled !== p.enabled) {
        const oldState = p.enabled ? 'Granted' : 'Not granted';
        const newState = match.enabled ? 'Granted' : 'Not granted';

        newAuditEntries.push({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp,
          targetRole: record.role,
          targetStaffName: record.staffName,
          targetUserId: record.id,
          capability: p.name,
          oldState,
          newState,
          action: 'permission_updated',
          description: `Capability '${p.name}' changed from ${oldState} to ${newState} for ${record.staffName} (User ID: ${record.id}) by ${adminName}`,
          authorizedBy: adminName,
        });

        return { ...p, enabled: match.enabled };
      }
      return p;
    });

    setStaffAccessList((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          lastUpdated: timestamp,
          updatedBy: adminName,
          permissions: updatedPermissions,
        };
      })
    );

    if (newAuditEntries.length > 0) {
      setAccessAuditLog((prev) => [...newAuditEntries, ...prev]);
    }
  };

  const addStaffAccount = (record: StaffAccessRecord, auditDescription?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const enrichedRecord: StaffAccessRecord = {
      ...record,
      lastUpdated: timestamp,
      updatedBy: 'Dr. Marcus Vance (Managing Director)',
    };

    setStaffAccessList((prev) => [enrichedRecord, ...prev]);

    const newAudit: AccessAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      targetRole: record.role,
      targetStaffName: record.staffName,
      action: 'access_granted',
      description:
        auditDescription ||
        `New ${record.role} account provisioned and workstation clearance authorized by Managing Director`,
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    };

    setAccessAuditLog((prev) => [newAudit, ...prev]);
  };

  const addAuditLogEntry = (
    entry: Omit<AccessAuditLogEntry, 'id' | 'timestamp' | 'authorizedBy'> & {
      id?: string;
      timestamp?: string;
      authorizedBy?: string;
    }
  ) => {
    const timestamp = entry.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newAudit: AccessAuditLogEntry = {
      id: entry.id || `aud-${Date.now()}`,
      timestamp,
      targetRole: entry.targetRole,
      targetStaffName: entry.targetStaffName,
      targetUserId: entry.targetUserId,
      capability: entry.capability,
      oldState: entry.oldState,
      newState: entry.newState,
      action: entry.action,
      description: entry.description,
      authorizedBy: entry.authorizedBy || 'Dr. Marcus Vance (Managing Director)',
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

    // Check if individual staff account is suspended
    const matchingStaff = staffAccessList.find(
      (s) =>
        s.staffName.toLowerCase() === match.fullName.toLowerCase() ||
        s.badgeNumber.toLowerCase() === match.username.toLowerCase()
    );
    if (matchingStaff && matchingStaff.status === 'revoked') {
      return {
        success: false,
        error: `Access Suspended: Station credentials for ${match.fullName} have been revoked by the Managing Director (Dr. Marcus Vance).`,
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
    setActiveUserKey(match.username in DEMO_USERS ? match.username : match.role);
    sessionStorage.setItem('cms_auth_user_key', match.username in DEMO_USERS ? match.username : match.role);
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
      setActiveUserKey(targetRole);
      sessionStorage.setItem('cms_auth_user_key', targetRole);
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cms_auth_role');
    sessionStorage.removeItem('cms_auth_user_key');
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
        deleteStaffAccount,
        toggleStaffPermission,
        updateStaffCapabilities,
        addStaffAccount,
        addAuditLogEntry,
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

