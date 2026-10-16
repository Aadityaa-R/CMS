export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type LeaveType = 'Casual' | 'Sick' | 'Other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type DaySheetCode = 'P' | 'A' | 'LV' | 'OFF' | '-';

export interface Shift {
  id: string;
  staffId: string;
  staffName?: string;
  days: DayOfWeek[];
  start: string; // HH:mm format, e.g. '09:00'
  end: string; // HH:mm format, e.g. '16:30'
  graceMinutes: number; // default 15
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // ISO string e.g. 2026-10-16T09:05:00.000Z
  clockOut: string | null; // ISO string e.g. 2026-10-16T16:35:00.000Z
  note?: string;
  correctedBy?: string;
  correctionReason?: string;
  correctedAt?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName?: string;
  type: LeaveType;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  requestedAt: string; // ISO string
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

export interface StaffMonthlySummary {
  staffId: string;
  staffName: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  offDays: number;
  totalHoursWorked: number;
  dailyCodes: Record<number, DaySheetCode>;
}

export interface MonthlyAttendanceSummary {
  year: number;
  month: number; // 1-12
  daysInMonth: number;
  staffSummaries: StaffMonthlySummary[];
}
