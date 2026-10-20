import { Patient } from '../types';
import { PendingStaffApproval } from '../data/mockData';
import {
  SESSION_STANDARD_DURATION_MS,
  SESSION_REMEMBER_DURATION_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  PASSWORD_MIN_LENGTH,
  PBKDF2_ITERATIONS,
} from './authConstants';
import { SessionData, Account } from '../types/storage';

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.subtle) {
    return (globalThis as any).crypto.subtle;
  }
  throw new Error('Web Crypto API is not available in current environment');
}

function getRandomValues(buffer: Uint8Array): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(buffer);
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
    return (globalThis as any).crypto.getRandomValues(buffer);
  }
  throw new Error('Secure random generation is not available');
}

export function generateSaltHex(lengthBytes = 16): string {
  const bytes = new Uint8Array(lengthBytes);
  getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(
  password: string,
  saltHex?: string,
  iterations = PBKDF2_ITERATIONS
): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = saltHex || generateSaltHex();
  const subtle = getSubtleCrypto();

  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  const saltBuffer = hexToBytes(salt);

  const baseKey = await subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const hash = bytesToHex(new Uint8Array(derivedBits));
  return { hash, salt, iterations };
}

export async function verifyPassword(
  password: string,
  storedOrHash: { hash: string; salt: string; iterations: number } | string,
  salt?: string,
  iterations?: number
): Promise<boolean> {
  const targetHash = typeof storedOrHash === 'string' ? storedOrHash : storedOrHash.hash;
  const targetSalt = typeof storedOrHash === 'string' ? salt : storedOrHash.salt;
  const targetIterations = typeof storedOrHash === 'string' ? iterations : storedOrHash.iterations;

  const { hash: computedHash } = await hashPassword(
    password,
    targetSalt,
    targetIterations
  );
  return computedHash.toLowerCase() === targetHash.toLowerCase();
}

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one letter.',
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number.',
    };
  }
  return { valid: true };
}

export function isAccountLocked(account: Account, now = Date.now()): { locked: boolean; remainingMinutes?: number } {
  if (account.lockedUntil && account.lockedUntil > now) {
    const remainingMs = account.lockedUntil - now;
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
    return { locked: true, remainingMinutes };
  }
  return { locked: false };
}

export function registerFailedLogin(account: Account, now = Date.now()): Partial<Account> {
  const attempts = (account.failedLoginAttempts || 0) + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginAttempts: attempts,
      lockedUntil: now + LOCKOUT_DURATION_MS,
    };
  }
  return {
    failedLoginAttempts: attempts,
  };
}

export function resetFailedLogin(): Partial<Account> {
  return {
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
}

export function createSession(userId: string, rememberMe: boolean, now = Date.now()): SessionData {
  const duration = rememberMe ? SESSION_REMEMBER_DURATION_MS : SESSION_STANDARD_DURATION_MS;
  return {
    userId,
    expiresAt: now + duration,
    lastActiveAt: now,
    rememberMe,
  };
}

export function isSessionValid(session: SessionData, now = Date.now()): { valid: boolean; reason?: string } {
  if (now > session.expiresAt) {
    return { valid: false, reason: 'Session has expired. Please sign in again.' };
  }
  if (now - session.lastActiveAt > SESSION_INACTIVITY_TIMEOUT_MS) {
    return { valid: false, reason: 'Signed out due to 30 minutes of inactivity.' };
  }
  return { valid: true };
}

export function touchSession(session: SessionData, now = Date.now()): SessionData {
  return {
    ...session,
    lastActiveAt: now,
  };
}

/**
 * Detects duplicate patient records by phone number or by matching full name and date of birth.
 */
export function findMatchingPatient(
  patients: Patient[],
  phone: string,
  fullName: string,
  dob: string
): Patient | undefined {
  const cleanPhone = phone ? phone.trim() : '';
  const cleanName = fullName ? fullName.trim().toLowerCase() : '';
  return patients.find((p) => {
    const matchPhone = cleanPhone !== '' && p.phone === cleanPhone;
    const patFullName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
    const matchNameAndDob = patFullName === cleanName && p.dob === dob;
    return matchPhone || matchNameAndDob;
  });
}

/**
 * Builds a pending staff approval application with role badge.
 */
export function createStaffSignupRequest(params: {
  roleRequested: 'doctor' | 'receptionist';
  fullName: string;
  jobTitle: string;
  department: string;
  notes?: string;
  requestedAt?: string;
}): PendingStaffApproval {
  const prefix = params.roleRequested === 'doctor' ? 'DOC' : 'REC';
  const badgeNumber = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
  return {
    id: `pend-${Date.now()}`,
    role: params.roleRequested,
    staffName: params.fullName,
    staffTitle: params.jobTitle,
    department: params.department,
    badgeNumber,
    requestedAt: params.requestedAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
    notes: params.notes || 'Online sign-up request; clearance pending administrator authorization.',
  };
}
