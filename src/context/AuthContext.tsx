import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RoleCredential, StaffAccessRecord, AccessAuditLogEntry } from '@/types';
import {
  DEMO_USERS,
  ROLE_CREDENTIALS,
  INITIAL_STAFF_ACCESS,
  INITIAL_ACCESS_AUDIT_LOG,
} from '@/data/mockData';
import {
  canGrantAdmin,
  canRevokeAdmin,
  canDeleteStaff,
} from '@/lib/permissions';
import { getRepository } from '@/data/storage';
import {
  hashPassword,
  verifyPassword,
  isSessionValid,
  touchSession,
  validatePasswordPolicy,
  isAccountLocked,
  registerFailedLogin,
  resetFailedLogin,
  findMatchingPatient,
  createStaffSignupRequest,
} from '@/lib/auth';
import { Account, ClaimRequest } from '@/types/storage';
import { STORAGE_KEY_PREFIX, SESSION_STORAGE_KEY } from '@/lib/authConstants';
import { Patient } from '@/types';
import { formatLocalDate } from '@/lib/time';
import { login as authServiceLogin, audienceOf, AuthService, type AuthAudience, type LoginResultCode, type LoginResult } from '@/services/authService';
import { clearRememberedLastPage } from '@/lib/navigation';
export { audienceOf, AuthService, type AuthAudience, type LoginResultCode, type LoginResult };
import { PendingStaffApproval } from '@/data/mockData';

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

// LoginResult imported and re-exported from @/services/authService

export interface SignUpPatientParams {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
}

export interface SignUpStaffParams {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  jobTitle: string;
  department: string;
  roleRequested: 'doctor' | 'receptionist';
}

export interface SignUpResult {
  success: boolean;
  error?: string;
  claimPending?: boolean;
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
  login: (identifier: string, password: string, audienceOrRememberMe?: AuthAudience | boolean, rememberMeOrOptions?: boolean | { deferAuth?: boolean }, options?: { deferAuth?: boolean }) => Promise<LoginResult>;
  loginAs: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  signUpPatient: (params: SignUpPatientParams) => Promise<SignUpResult>;
  signUpStaff: (params: SignUpStaffParams) => Promise<SignUpResult>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  logout: (notice?: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      if (params.get('view') === 'signup' || params.get('view') === 'login' || params.get('demo') !== null) {
        return false;
      }
      if (sessionStorage.getItem('cms_authenticated') === 'true') {
        return true;
      }
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (isSessionValid(session).valid) {
          return true;
        }
      }
      if (params.get('role') && params.get('role') !== 'staff' && DEMO_USERS[params.get('role')!]) {
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  });

  // Staff Access Records state
  const [staffAccessList, setStaffAccessList] = useState<StaffAccessRecord[]>(INITIAL_STAFF_ACCESS);

  // Access Audit Log state
  const [accessAuditLog, setAccessAuditLog] = useState<AccessAuditLogEntry[]>(INITIAL_ACCESS_AUDIT_LOG);

  // Load staff and ledger from repository on startup
  useEffect(() => {
    const loadFromRepo = async () => {
      try {
        const staffRepo = getRepository<StaffAccessRecord>('staff');
        const ledgerRepo = getRepository<AccessAuditLogEntry>('ledger');
        const [savedStaff, savedLedger] = await Promise.all([
          staffRepo.list(),
          ledgerRepo.list(),
        ]);
        if (savedStaff.length > 0) {
          setStaffAccessList(savedStaff);
        }
        if (savedLedger.length > 0) {
          setAccessAuditLog(savedLedger);
        }
      } catch {
        // Fallback
      }
    };
    loadFromRepo();
  }, []);

  // Cross-tab storage synchronization
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === `${STORAGE_KEY_PREFIX}staff`) {
        const staffRepo = getRepository<StaffAccessRecord>('staff');
        const latest = await staffRepo.list();
        setStaffAccessList(latest);
      }
      if (e.key === `${STORAGE_KEY_PREFIX}ledger`) {
        const ledgerRepo = getRepository<AccessAuditLogEntry>('ledger');
        const latest = await ledgerRepo.list();
        setAccessAuditLog(latest);
      }
      if (e.key === SESSION_STORAGE_KEY && !e.newValue) {
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Session activity tracker & timeout enforcement
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return;
        const session = JSON.parse(raw);
        const validation = isSessionValid(session);
        if (!validation.valid) {
          logout(validation.reason);
        }
      } catch {
        // Ignore
      }
    };

    const handleUserActivity = () => {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return;
        const session = JSON.parse(raw);
        const updated = touchSession(session);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    };

    const interval = setInterval(checkSession, 15000);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [isAuthenticated]);

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

  // Persist staffAccessList write-through
  const saveStaffList = (nextList: StaffAccessRecord[]) => {
    setStaffAccessList(nextList);
    const repo = getRepository<StaffAccessRecord>('staff');
    repo.replaceAll(nextList).catch(() => {});
  };

  // Persist accessAuditLog write-through
  const saveAuditLog = (nextLog: AccessAuditLogEntry[]) => {
    setAccessAuditLog(nextLog);
    const repo = getRepository<AccessAuditLogEntry>('ledger');
    repo.replaceAll(nextLog).catch(() => {});
  };

  // User profiles state
  const [userProfiles, setUserProfiles] = useState<Record<string, User>>(DEMO_USERS);

  const baseUser = DEMO_USERS[activeUserKey] || userProfiles[currentRole] || DEMO_USERS[currentRole] || DEMO_USERS.md;
  const currentStaffRecord = staffAccessList.find(
    (s) => s.id === baseUser.id || s.badgeNumber === baseUser.badgeNumber || s.staffName === baseUser.name
  );



  const currentUser: User = {
    ...baseUser,
    isOriginalAdmin: baseUser.isOriginalAdmin || currentStaffRecord?.isOriginalAdmin || false,
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setUserProfiles((prev) => {
      const existingUser = prev[currentRole] || DEMO_USERS[currentRole];
      const updatedUser: User = {
        ...existingUser,
        ...updates,
      };
      return {
        ...prev,
        [currentRole]: updatedUser,
      };
    });
  };

  const grantStaffAccess = (recordId: string, reason?: string) => {
    const target = staffAccessList.find((s) => s.id === recordId);
    if (!target) return;

    const nextList = staffAccessList.map((record) =>
      record.id === recordId
        ? {
            ...record,
            status: 'granted' as const,
            grantedAt: formatLocalDate(),
            grantedBy: currentUser.name,
          }
        : record
    );
    saveStaffList(nextList);

    addAuditLogEntry({
      targetRole: target.role,
      targetStaffName: target.staffName,
      targetUserId: target.id,
      action: 'access_granted',
      description: reason || `Access clearance restored for ${target.staffName} (${target.badgeNumber})`,
      authorizedBy: currentUser.name,
    });
  };

  const revokeStaffAccess = (recordId: string, reason?: string) => {
    const target = staffAccessList.find((s) => s.id === recordId);
    if (!target) return;

    if (target.isOriginalAdmin) {
      return;
    }

    const nextList = staffAccessList.map((record) =>
      record.id === recordId
        ? {
            ...record,
            status: 'revoked' as const,
            revocationReason: reason || 'Access revoked by Administrator',
          }
        : record
    );
    saveStaffList(nextList);

    addAuditLogEntry({
      targetRole: target.role,
      targetStaffName: target.staffName,
      targetUserId: target.id,
      action: 'access_revoked',
      description: reason || `Access clearance suspended for ${target.staffName} (${target.badgeNumber})`,
      authorizedBy: currentUser.name,
    });
  };

  const deleteStaffAccount = (recordId: string, reason?: string) => {
    const target = staffAccessList.find((s) => s.id === recordId);
    if (!target) return;

    if (target.isOriginalAdmin) {
      return;
    }
    if (!canDeleteStaff(currentUser, target, staffAccessList)) {
      return;
    }

    const nextList = staffAccessList.filter((s) => s.id !== recordId);
    saveStaffList(nextList);

    addAuditLogEntry({
      targetRole: target.role,
      targetStaffName: target.staffName,
      targetUserId: target.id,
      action: 'account_deleted',
      description: reason || `Account permanently deleted for ${target.staffName} (${target.badgeNumber})`,
      authorizedBy: currentUser.name,
    });
  };

  const toggleStaffPermission = (recordId: string, permissionId: string) => {
    const target = staffAccessList.find((s) => s.id === recordId);
    if (!target) return;

    const currentPerms = (target.permissions as any) || {};
    if (permissionId === 'perm-admin') {
      const willBeEnabled = !currentPerms[permissionId];
      if (willBeEnabled && !canGrantAdmin(currentUser, target)) return;
      if (!willBeEnabled && !canRevokeAdmin(currentUser, target, staffAccessList)) return;
    }

    const nextList = staffAccessList.map((record) => {
      if (record.id !== recordId) return record;
      const recPerms = (record.permissions as any) || {};
      const currentVal = Boolean(recPerms[permissionId]);
      return {
        ...record,
        permissions: {
          ...recPerms,
          [permissionId]: !currentVal,
        } as any,
      };
    });
    saveStaffList(nextList);

    const oldState = Boolean(currentPerms[permissionId]) ? 'granted' : 'revoked';
    const newState = !Boolean(currentPerms[permissionId]) ? 'granted' : 'revoked';

    addAuditLogEntry({
      targetRole: target.role,
      targetStaffName: target.staffName,
      targetUserId: target.id,
      capability: permissionId,
      oldState,
      newState,
      action: newState === 'granted' ? 'capability_granted' : 'capability_revoked',
      description: `Permission ${permissionId} ${newState} for ${target.staffName}`,
      authorizedBy: currentUser.name,
    });
  };

  const updateStaffCapabilities = (
    recordId: string,
    updates: Array<{ permissionId: string; enabled: boolean }>,
    actingAdmin?: string
  ) => {
    const target = staffAccessList.find((s) => s.id === recordId);
    if (!target) return;

    const currentPerms = (target.permissions as any) || {};
    const newPermissions = { ...currentPerms };
    updates.forEach((u) => {
      newPermissions[u.permissionId] = u.enabled;
    });

    const nextList = staffAccessList.map((r) =>
      r.id === recordId ? { ...r, permissions: newPermissions } : r
    );
    saveStaffList(nextList);

    const adminName = actingAdmin || currentUser.name;
    updates.forEach((u) => {
      const oldVal = Boolean(currentPerms[u.permissionId]);
      if (oldVal !== u.enabled) {
        addAuditLogEntry({
          targetRole: target.role,
          targetStaffName: target.staffName,
          targetUserId: target.id,
          capability: u.permissionId,
          oldState: oldVal ? 'granted' : 'revoked',
          newState: u.enabled ? 'granted' : 'revoked',
          action: u.enabled ? 'capability_granted' : 'capability_revoked',
          description: `Direct capability ${u.permissionId} ${u.enabled ? 'granted' : 'revoked'} for ${target.staffName}`,
          authorizedBy: adminName,
        });
      }
    });
  };

  const addStaffAccount = (record: StaffAccessRecord, auditDescription?: string) => {
    const nextList = [record, ...staffAccessList];
    saveStaffList(nextList);

    addAuditLogEntry({
      targetRole: record.role,
      targetStaffName: record.staffName,
      targetUserId: record.id,
      action: 'account_provisioned',
      description: auditDescription || `New staff account provisioned for ${record.staffName} (${record.badgeNumber})`,
      authorizedBy: currentUser.name,
    });
  };

  const isRoleSuspended = (role: UserRole): boolean => {
    if (role === 'md') return false;
    const roleStaff = staffAccessList.filter((s) => s.role === role);
    if (roleStaff.length === 0) return false;
    return roleStaff.every((s) => s.status === 'revoked');
  };

  const isStaffSuspended = (staffNameOrId: string): boolean => {
    const record = staffAccessList.find(
      (s) =>
        s.id === staffNameOrId ||
        s.staffName.toLowerCase() === staffNameOrId.toLowerCase() ||
        s.badgeNumber.toLowerCase() === staffNameOrId.toLowerCase()
    );
    return record?.status === 'revoked';
  };

  const addAuditLogEntry = (
    entry: Omit<AccessAuditLogEntry, 'id' | 'timestamp' | 'authorizedBy'> & {
      id?: string;
      timestamp?: string;
      authorizedBy?: string;
    }
  ) => {
    const newAudit: AccessAuditLogEntry = {
      id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      targetRole: entry.targetRole,
      targetStaffName: entry.targetStaffName,
      targetUserId: entry.targetUserId,
      capability: entry.capability,
      oldState: entry.oldState,
      newState: entry.newState,
      action: entry.action,
      description: entry.description,
      authorizedBy: entry.authorizedBy || currentUser.name || 'Dr. Marcus Vance (Managing Director)',
    };
    saveAuditLog([newAudit, ...accessAuditLog]);
  };

  const login = async (
    identifier: string,
    password: string,
    audienceOrRememberMe: AuthAudience | boolean = 'staff',
    rememberMeOrOptions?: boolean | { deferAuth?: boolean },
    maybeOptions?: { deferAuth?: boolean }
  ): Promise<LoginResult> => {
    let audience: AuthAudience = 'staff';
    let rememberMe = true;
    let options: { deferAuth?: boolean } | undefined;

    if (typeof audienceOrRememberMe === 'string') {
      audience = audienceOrRememberMe;
      if (typeof rememberMeOrOptions === 'boolean') {
        rememberMe = rememberMeOrOptions;
        options = maybeOptions;
      } else {
        options = rememberMeOrOptions;
      }
    } else {
      rememberMe = audienceOrRememberMe;
      options = typeof rememberMeOrOptions === 'object' ? rememberMeOrOptions : maybeOptions;
    }

    const result = await authServiceLogin(identifier, password, audience, rememberMe, {
      deferAuth: options?.deferAuth,
      isRoleSuspended,
      onLoginSuccess: (account) => {
        setCurrentRole(account.role);
        setActiveUserKey(account.username in DEMO_USERS ? account.username : account.role);
        sessionStorage.setItem('cms_auth_user_key', account.username in DEMO_USERS ? account.username : account.role);
      },
    });

    if (result.success) {
      const completeNavigation = () => {
        const targetAudience = audienceOf(result.matchedRole || audience);
        clearRememberedLastPage();
        try {
          const pathname = window.location.pathname.startsWith('/profile') ? '/' : window.location.pathname;
          window.history.replaceState(
            {},
            '',
            `${pathname}?as=${targetAudience}&tab=dashboard`
          );
        } catch {}
        setIsAuthenticated(true);
      };
      if (!options?.deferAuth) {
        completeNavigation();
      }
      return {
        ...result,
        completeNavigation,
      };
    }

    return result;
  };

  const signUpPatient = async (params: SignUpPatientParams): Promise<SignUpResult> => {
    const repoAccounts = getRepository<Account>('accounts');
    const repoPatients = getRepository<Patient>('patients');
    const repoClaimRequests = getRepository<ClaimRequest>('claimRequests');
    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.phone.trim();
    const accounts = await repoAccounts.list();

    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    if (accounts.some((a) => a.phone === cleanPhone)) {
      return { success: false, error: 'An account with this phone number already exists.' };
    }

    const { hash, salt, iterations } = await hashPassword(params.password);
    const now = new Date().toISOString();

    const existingPatients = await repoPatients.list();
    const matchedPatient = findMatchingPatient(existingPatients, cleanPhone, params.fullName, params.dob);

    const accountId = `acc-pat-${Date.now()}`;

    if (matchedPatient) {
      const newAccount: Account = {
        id: accountId,
        username: cleanEmail,
        email: cleanEmail,
        fullName: params.fullName,
        phone: cleanPhone,
        role: 'patient',
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: iterations,
        status: 'active',
        claimPending: true,
        linkedPatientId: matchedPatient.id,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
      await repoAccounts.create(newAccount);

      const claimReq: ClaimRequest = {
        id: `claim-${Date.now()}`,
        accountId,
        accountEmail: cleanEmail,
        accountPhone: cleanPhone,
        accountName: params.fullName,
        dob: params.dob,
        existingPatientId: matchedPatient.id,
        existingMrn: matchedPatient.mrn,
        requestedAt: now,
        status: 'pending',
      };
      await repoClaimRequests.create(claimReq);

      await repoLedger.create({
        id: `audit-${Date.now()}`,
        timestamp: now,
        action: 'account_claim_requested',
        subject: params.fullName,
        role: 'patient',
        details: `Account claim submitted for existing patient ${matchedPatient.mrn}`,
        authorizedBy: 'Patient Self-Registration',
      });

      return { success: true, claimPending: true };
    } else {
      let maxMrn = 84300;
      existingPatients.forEach((p) => {
        const num = parseInt(p.mrn.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxMrn) maxMrn = num;
      });
      const newMrn = `MRN-${maxMrn + 1}`;

      const birthYear = parseInt(params.dob.split('-')[0], 10);
      const age = isNaN(birthYear) ? 30 : Math.max(0, new Date().getFullYear() - birthYear);

      const nameParts = params.fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Patient';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const newPatId = `pat-${Date.now()}`;
      const newPatient: Patient = {
        id: newPatId,
        mrn: newMrn,
        firstName,
        lastName,
        dob: params.dob,
        age,
        gender: params.gender,
        phone: cleanPhone,
        email: cleanEmail,
        address: 'Outpatient Address',
        allergies: [],
        chronicConditions: [],
        emergencyContact: {
          name: 'Primary Contact',
          relationship: 'Contact',
          phone: cleanPhone,
        },
        source: 'online',
        registeredDate: now.split('T')[0],
        status: 'active',
        registeredAt: now,
        registeredBy: { id: 'self', name: 'self' },
      };
      await repoPatients.create(newPatient);

      const newAccount: Account = {
        id: accountId,
        username: cleanEmail,
        email: cleanEmail,
        fullName: params.fullName,
        phone: cleanPhone,
        role: 'patient',
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: iterations,
        status: 'active',
        claimPending: false,
        linkedPatientId: newPatId,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
      await repoAccounts.create(newAccount);

      await repoLedger.create({
        id: `audit-${Date.now()}`,
        timestamp: now,
        action: 'patient_self_registered',
        subject: params.fullName,
        role: 'patient',
        details: `Self-registered patient account with MRN ${newMrn}`,
        authorizedBy: 'Patient Self-Registration',
      });

      return { success: true, claimPending: false };
    }
  };

  const signUpStaff = async (params: SignUpStaffParams): Promise<SignUpResult> => {
    if (params.roleRequested !== 'doctor' && params.roleRequested !== 'receptionist') {
      return { success: false, error: 'Invalid staff role requested.' };
    }

    const repoAccounts = getRepository<Account>('accounts');
    const repoApprovals = getRepository<PendingStaffApproval>('approvals');
    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.phone.trim();
    const accounts = await repoAccounts.list();

    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    if (accounts.some((a) => a.phone === cleanPhone)) {
      return { success: false, error: 'An account with this phone number already exists.' };
    }

    const { hash, salt, iterations } = await hashPassword(params.password);
    const now = new Date().toISOString();
    const accountId = `acc-staff-${Date.now()}`;

    const newAccount: Account = {
      id: accountId,
      username: cleanEmail,
      email: cleanEmail,
      fullName: params.fullName,
      phone: cleanPhone,
      role: params.roleRequested,
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
      status: 'pending',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };
    await repoAccounts.create(newAccount);

    const approvalReq = createStaffSignupRequest({
      roleRequested: params.roleRequested,
      fullName: params.fullName,
      jobTitle: params.jobTitle,
      department: params.department,
    });
    await repoApprovals.create(approvalReq);

    await repoLedger.create({
      id: `audit-${Date.now()}`,
      timestamp: now,
      action: 'staff_clearance_requested',
      subject: params.fullName,
      role: params.roleRequested,
      details: `Staff clearance application submitted for role ${params.roleRequested}`,
      authorizedBy: 'Staff Self-Registration',
    });

    return { success: true };
  };

  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    const cleanPass = password.trim();
    if (!cleanPass) return false;

    const repoAccounts = getRepository<Account>('accounts');
    const accounts = await repoAccounts.list();
    const currentEmail = currentUser.email.toLowerCase();
    const currentName = currentUser.name.toLowerCase();

    const account = accounts.find(
      (a) =>
        a.email.toLowerCase() === currentEmail ||
        a.username.toLowerCase() === currentEmail ||
        a.fullName.toLowerCase() === currentName
    );

    if (account) {
      return verifyPassword(
        cleanPass,
        account.passwordHash,
        account.passwordSalt,
        account.passwordIterations
      );
    }

    const cred = ROLE_CREDENTIALS.find(
      (c) =>
        c.role === currentRole ||
        c.email.toLowerCase() === currentEmail ||
        c.fullName.toLowerCase() === currentName
    );
    if (cred) {
      return cleanPass === cred.password;
    }

    return false;
  };

  const changePassword = async (
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const policyResult = validatePasswordPolicy(newPass);
    if (!policyResult.valid) {
      return {
        success: false,
        error: policyResult.error || 'Password does not satisfy security policy.',
      };
    }

    const repoAccounts = getRepository<Account>('accounts');
    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
    const accounts = await repoAccounts.list();
    const currentEmail = currentUser.email.toLowerCase();
    const currentName = currentUser.name.toLowerCase();

    const existingAccount = accounts.find(
      (a) =>
        a.email.toLowerCase() === currentEmail ||
        a.username.toLowerCase() === currentEmail ||
        a.fullName.toLowerCase() === currentName
    );

    if (existingAccount) {
      const lockStatus = isAccountLocked(existingAccount);
      if (lockStatus.locked) {
        return {
          success: false,
          error: `Account is locked. Please try again in ${lockStatus.remainingMinutes || 5} minute(s).`,
        };
      }
    }

    const isCurrentValid = await verifyCurrentPassword(currentPass);
    if (!isCurrentValid) {
      if (existingAccount) {
        const failedUpdate = registerFailedLogin(existingAccount);
        await repoAccounts.update(existingAccount.id, failedUpdate);
        if (failedUpdate.lockedUntil) {
          try {
            await repoLedger.create({
              id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              timestamp: new Date().toISOString(),
              targetRole: existingAccount.role,
              targetStaffName: existingAccount.fullName,
              targetUserId: existingAccount.id,
              action: 'account_locked',
              description: `Account ${existingAccount.username} locked due to 5 failed login attempts.`,
              authorizedBy: 'System Security Watchdog',
            });
          } catch {
            // Safe fallback
          }
          return {
            success: false,
            error: 'Account locked due to 5 failed attempts. Please try again in 5 minutes.',
          };
        }
      }
      return { success: false, error: 'Current password is incorrect.' };
    }

    const { hash, salt, iterations } = await hashPassword(newPass);
    const now = new Date().toISOString();

    if (existingAccount) {
      const updatedAccount: Account = {
        ...existingAccount,
        ...resetFailedLogin(),
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: iterations,
        updatedAt: now,
      };
      await repoAccounts.update(existingAccount.id, updatedAccount);
    } else {
      const newAccount: Account = {
        id: `acc-${Date.now()}`,
        username: currentUser.email.toLowerCase(),
        email: currentUser.email.toLowerCase(),
        fullName: currentUser.name,
        phone: (currentUser as any).phone || '',
        role: currentRole,
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: iterations,
        status: 'active',
        claimPending: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
      await repoAccounts.create(newAccount);
    }

    await repoLedger.create({
      id: `audit-${Date.now()}`,
      timestamp: now,
      action: 'password_reset',
      subject: currentUser.name,
      role: currentRole,
      details: `Password changed by user ${currentUser.email}`,
      authorizedBy: currentUser.name,
    });

    return { success: true };
  };

  const loginAs = (role: UserRole) => {
    const targetRole = role === 'admin' ? 'md' : role;
    if (DEMO_USERS[targetRole]) {
      if (isRoleSuspended(targetRole)) {
        return;
      }
      const targetAudience = targetRole === 'patient' ? 'patient' : 'staff';
      clearRememberedLastPage();
      try {
        const pathname = window.location.pathname.startsWith('/profile') ? '/' : window.location.pathname;
        window.history.replaceState(
          {},
          '',
          `${pathname}?as=${targetAudience}&tab=dashboard`
        );
      } catch {}
      setCurrentRole(targetRole);
      setActiveUserKey(targetRole);
      sessionStorage.setItem('cms_auth_user_key', targetRole);
      setIsAuthenticated(true);
    }
  };

  const switchRole = (role: UserRole) => {
    loginAs(role);
  };

  const logout = (notice?: string) => {
    setIsAuthenticated(false);
    clearRememberedLastPage();
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      if (notice) {
        sessionStorage.setItem('cms_auth_notice', notice);
      }
    } catch {
      // Ignore
    }
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
        switchRole,
        updateCurrentUser,
        signUpPatient,
        signUpStaff,
        changePassword,
        verifyCurrentPassword,
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
