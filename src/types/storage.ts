import {
  UserRole,
  StaffAccessRecord,
  AccessAuditLogEntry,
  Patient,
  Appointment,
  Prescription,
  PatientAssignment,
  AccessModule,
} from './index';
import { Invoice, Payment } from './billing';
import { Shift, AttendanceRecord, LeaveRequest } from './attendance';
import { PendingStaffApproval } from '../data/mockData';

export interface Account {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  status: 'active' | 'revoked' | 'pending' | 'rejected';
  rejectionReason?: string;
  claimPending?: boolean;
  linkedPatientId?: string;
  failedLoginAttempts: number;
  lockedUntil?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimRequest {
  id: string;
  accountId: string;
  accountEmail: string;
  accountPhone: string;
  accountName: string;
  dob: string;
  existingPatientId: string;
  existingMrn: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionNote?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface StorageSettings {
  mode: 'browser' | 'memory';
  schemaVersion: number;
  lastSaved: string;
}

export interface SessionData {
  userId: string;
  expiresAt: number;
  lastActiveAt: number;
  rememberMe: boolean;
}

export interface BackupCollections {
  accounts: Account[];
  staff: StaffAccessRecord[];
  patients: Patient[];
  assignments: PatientAssignment[];
  appointments: Appointment[];
  visits: any[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  leave: LeaveRequest[];
  shifts: Shift[];
  roles: AccessModule[];
  approvals: PendingStaffApproval[];
  claimRequests: ClaimRequest[];
  ledger: AccessAuditLogEntry[];
  settings: StorageSettings;
}

export interface BackupData {
  schemaVersion: number;
  SCHEMA_VERSION?: number;
  appVersion?: string;
  exportedAt: string;
  collections: BackupCollections;
}

export type CollectionName = keyof BackupCollections;
