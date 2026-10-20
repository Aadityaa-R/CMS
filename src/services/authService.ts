import { UserRole, AccessAuditLogEntry } from '../types';
import { Account } from '../types/storage';
import { getRepository } from '../data/storage';
import { ROLE_CREDENTIALS } from '../data/mockData';
import {
  hashPassword,
  verifyPassword,
  isAccountLocked,
  registerFailedLogin,
  resetFailedLogin,
  createSession,
} from '../lib/auth';
import { SESSION_STORAGE_KEY } from '../lib/authConstants';

export type AuthAudience = 'patient' | 'staff';

export type LoginResultCode =
  | 'success'
  | 'invalid'
  | 'locked'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'wrongPortal';

export interface LoginResult {
  code: LoginResultCode;
  success: boolean;
  error?: string;
  matchedRole?: UserRole;
  completeNavigation?: () => void;
  expectedAudience?: AuthAudience;
}

export interface LoginOptions {
  deferAuth?: boolean;
  isRoleSuspended?: (role: UserRole) => boolean;
  onLoginSuccess?: (account: Account) => void;
}

/**
 * Returns the canonical audience for an account, user, role name, or object.
 * Single source of truth for portal audience classification.
 */
export function audienceOf(
  account: { role?: string } | string | null | undefined
): AuthAudience {
  if (!account) return 'staff';
  const role = typeof account === 'string' ? account.toLowerCase() : account.role?.toLowerCase();
  if (role === 'patient') {
    return 'patient';
  }
  return 'staff';
}

/**
 * Authenticates an account against the repository and specified audience portal.
 * Checks password first to prevent account existence disclosure.
 */
export async function login(
  identifier: string,
  password: string,
  audience: AuthAudience = 'staff',
  rememberMe = true,
  options?: LoginOptions
): Promise<LoginResult> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const now = Date.now();

  if (!cleanId || !cleanPass) {
    return {
      code: 'invalid',
      success: false,
      error: 'Incorrect username, email, or password.',
    };
  }

  const repoAccounts = getRepository<Account>('accounts');
  const accounts = await repoAccounts.list();

  let account = accounts.find((a) => {
    const matchUser = a.username.toLowerCase() === cleanId;
    const matchEmail = a.email.toLowerCase() === cleanId;
    const matchRole = a.role.toLowerCase() === cleanId;
    const matchMdAlias =
      a.role === 'md' &&
      (cleanId === 'admin' ||
        cleanId === 'admin@beaconclinic.com' ||
        cleanId === 'm.vance' ||
        cleanId === 'md');
    return matchUser || matchEmail || matchRole || matchMdAlias;
  });

  if (!account) {
    // Check fallback against ROLE_CREDENTIALS for demo roles
    const cred = ROLE_CREDENTIALS.find((c) => {
      const matchUser = c.username.toLowerCase() === cleanId;
      const matchEmail = c.email.toLowerCase() === cleanId;
      const matchRole = c.role.toLowerCase() === cleanId;
      const matchMdAlias =
        c.role === 'md' &&
        (cleanId === 'admin' ||
          cleanId === 'admin@beaconclinic.com' ||
          cleanId === 'm.vance' ||
          cleanId === 'md');
      return matchUser || matchEmail || matchRole || matchMdAlias;
    });

    if (cred) {
      const { hash, salt, iterations } = await hashPassword(cred.password);
      account = {
        id: `acc-${cred.username}`,
        username: cred.username.toLowerCase(),
        email: cred.email.toLowerCase(),
        fullName: cred.fullName,
        phone: '+1 (555) 234-5678',
        role: cred.role,
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: iterations,
        status: 'active',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repoAccounts.create(account);
    }
  }

  if (!account) {
    return {
      code: 'invalid',
      success: false,
      error: 'Incorrect username, email, or password.',
    };
  }

  // Check account lockout
  const lockStatus = isAccountLocked(account, now);
  if (lockStatus.locked) {
    return {
      code: 'locked',
      success: false,
      error: `Account is temporarily locked due to too many failed attempts. Please try again in ${lockStatus.remainingMinutes} minute(s).`,
    };
  }

  // Verify password with PBKDF2
  const isPasswordValid = await verifyPassword(cleanPass, {
    hash: account.passwordHash,
    salt: account.passwordSalt,
    iterations: account.passwordIterations,
  });

  if (!isPasswordValid) {
    const failedUpdate = registerFailedLogin(account, now);
    await repoAccounts.update(account.id, failedUpdate);

    if (failedUpdate.lockedUntil) {
      try {
        const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
        await repoLedger.create({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          targetRole: account.role,
          targetStaffName: account.fullName,
          targetUserId: account.id,
          action: 'account_locked',
          description: `Account ${account.username} locked due to 5 failed login attempts.`,
          authorizedBy: 'System Security Watchdog',
        });
      } catch {
        // Safe fallback
      }
      return {
        code: 'locked',
        success: false,
        error: 'Account locked due to 5 failed attempts. Please try again in 5 minutes.',
      };
    }

    return {
      code: 'invalid',
      success: false,
      error: 'Incorrect username, email, or password.',
    };
  }

  // Password is valid: check audience portal match
  const targetAudience = audienceOf(account);
  if (targetAudience !== audience) {
    const msg =
      targetAudience === 'staff'
        ? 'This is a clinic staff account. Use the Clinic Staff option.'
        : 'This is a patient account. Use the Patient option.';
    return {
      code: 'wrongPortal',
      success: false,
      expectedAudience: targetAudience,
      error: msg,
    };
  }

  // Reset failed login attempts upon valid authentication
  await repoAccounts.update(account.id, resetFailedLogin());

  // Check account and role clearance status
  if (account.status === 'revoked') {
    return {
      code: 'suspended',
      success: false,
      error: `Access Suspended: Station credentials for ${account.fullName} have been revoked by the Managing Director.`,
    };
  }
  if (account.status === 'pending') {
    return {
      code: 'pending',
      success: false,
      error: 'Your request is waiting for approval.',
    };
  }
  if (account.status === 'rejected') {
    return {
      code: 'rejected',
      success: false,
      error: `Your request was not approved: ${account.rejectionReason || 'Application declined by clinic administrator'}.`,
    };
  }
  if (account.claimPending) {
    return {
      code: 'pending',
      success: false,
      error: 'Your account is waiting to be linked to your clinic record.',
    };
  }

  if (options?.isRoleSuspended && options.isRoleSuspended(account.role)) {
    return {
      code: 'suspended',
      success: false,
      error: 'Access Suspended: Station credentials have been revoked by the Managing Director (Dr. Marcus Vance).',
    };
  }

  // Create and record session
  const session = createSession(account.id, rememberMe, now);
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Local storage fallback
  }

  try {
    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
    await repoLedger.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      targetRole: account.role,
      targetStaffName: account.fullName,
      targetUserId: account.id,
      action: 'user_login',
      description: `User ${account.username} (${account.fullName}) authenticated into station with role ${account.role}.`,
      authorizedBy: account.fullName,
    });
  } catch {
    // Ledger storage fallback
  }

  if (options?.onLoginSuccess) {
    options.onLoginSuccess(account);
  }

  return {
    code: 'success',
    success: true,
    matchedRole: account.role,
    completeNavigation: () => {},
  };
}

export const AuthService = {
  login,
  audienceOf,
};
