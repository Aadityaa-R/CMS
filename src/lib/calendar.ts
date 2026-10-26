/**
 * Calendar Engine for Reception Appointment Calendar and Walk-in Sheet.
 * Pure functions only; `now` is passed as a parameter; no React dependencies.
 */

import { Appointment, Doctor } from '@/types';
import { Shift, LeaveRequest } from '@/types/attendance';
import { SLOT_MINUTES, minutesToTime } from '@/lib/scheduling';
import { getDoctorCanonicalStaffId, isDoctorAvailable } from '@/lib/availability';
import { isOnLeave, dayOfWeek, timeToMinutes } from '@/lib/attendance';
import { formatLocalDate } from '@/lib/time';

export type CalendarCellState = 'free' | 'booked' | 'off' | 'leave' | 'past-free';

export interface CalendarCell {
  state: CalendarCellState;
  appointment?: Appointment;
  slotTime: string;
  date: string;
  doctorId: string;
}

export interface DayGridRow {
  slotTime: string;
  startMinutes: number;
  endMinutes: number;
  cells: Record<string, CalendarCell>;
}

export interface DayGrid {
  date: string;
  doctors: Doctor[];
  slots: string[];
  rows: DayGridRow[];
}

export interface WeekGridRow {
  slotTime: string;
  startMinutes: number;
  endMinutes: number;
  cells: Record<string, CalendarCell>; // date (YYYY-MM-DD) -> CalendarCell
}

export interface WeekGrid {
  doctorId: string;
  weekStart: string;
  days: string[]; // 7 dates (YYYY-MM-DD)
  slots: string[];
  rows: WeekGridRow[];
}

export interface WalkInBucket {
  time: string; // "09:00"
  label: string; // "09:00 - 10:00"
  startMinutes: number;
  endMinutes: number;
  appointments: Appointment[];
  byDoctor: Record<string, Appointment[]>;
}

export interface WaitStats {
  count: number;
  average: number;
  longest: number;
}

/**
 * Add days to a YYYY-MM-DD date string without timezone offset issues.
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Computes wait time in minutes for a walk-in appointment.
 * For a patient still waiting (status 'checked_in'), counts up to `now`.
 * For a patient seen ('in_consultation' or 'completed'), counts between check-in and consultation.
 */
export function getWalkInWaitMinutes(apt: Appointment, now: Date): number {
  const checkInStr = apt.checkedInAt || apt.dateTime;
  if (!checkInStr) return 0;
  const checkInTime = new Date(checkInStr).getTime();
  if (isNaN(checkInTime)) return 0;

  if (apt.status === 'checked_in') {
    return Math.max(0, Math.floor((now.getTime() - checkInTime) / 60000));
  }

  if (apt.dateTime && apt.checkedInAt && apt.dateTime > apt.checkedInAt) {
    const startConsultTime = new Date(apt.dateTime).getTime();
    return Math.max(0, Math.floor((startConsultTime - checkInTime) / 60000));
  }

  return Math.max(0, Math.floor((now.getTime() - checkInTime) / 60000));
}

/**
 * Checks if a slot time has already passed relative to `now`.
 */
export function isSlotInPast(date: string, slotTime: string, now: Date): boolean {
  const todayStr = formatLocalDate(now);
  if (date < todayStr) return true;
  if (date > todayStr) return false;
  const slotMinutes = timeToMinutes(slotTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes < nowMinutes;
}

/**
 * Builds the day grid for a given date across doctors.
 * Rows are slots from the earliest shift start to latest shift end that day.
 * Returns states: free, booked (with appointment), off, leave, past-free.
 * Reuses isDoctorAvailable, isOnLeave, and scheduling rules.
 */
export function buildDayGrid(
  date: string,
  doctors: Doctor[],
  shifts: Shift[],
  leaves: LeaveRequest[],
  appointments: Appointment[],
  slotMinutes: number = SLOT_MINUTES,
  now: Date = new Date()
): DayGrid {
  const dow = dayOfWeek(date);
  const canonicalIds = new Set(doctors.map((d) => getDoctorCanonicalStaffId(d.id)));

  // Shifts of active doctors working on this day of week
  const dayShifts = shifts.filter(
    (s) => canonicalIds.has(s.staffId) && s.days.includes(dow)
  );

  let earliestStart = 9 * 60; // 09:00 fallback
  let latestEnd = 17 * 60; // 17:00 fallback

  if (dayShifts.length > 0) {
    earliestStart = Math.min(...dayShifts.map((s) => timeToMinutes(s.start)));
    latestEnd = Math.max(...dayShifts.map((s) => timeToMinutes(s.end)));
  }

  // Pre-filter active non-walk-in appointments on this date
  const bookedAppointments = appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    if (a.source === 'walk_in') return false; // walk-ins do not occupy booked slots
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    return aptDate === date;
  });

  const slots: string[] = [];
  for (let m = earliestStart; m + slotMinutes <= latestEnd; m += slotMinutes) {
    slots.push(minutesToTime(m));
  }

  const rows: DayGridRow[] = slots.map((slotTime) => {
    const startMinutes = timeToMinutes(slotTime);
    const endMinutes = startMinutes + slotMinutes;
    const cells: Record<string, CalendarCell> = {};

    doctors.forEach((doc) => {
      const canonicalId = getDoctorCanonicalStaffId(doc.id);

      // Check general doctor availability on this date
      const availableToday = isDoctorAvailable(doc.id, date, shifts, [], leaves);
      if (!availableToday) {
        if (isOnLeave(canonicalId, date, leaves)) {
          cells[doc.id] = {
            state: 'leave',
            slotTime,
            date,
            doctorId: doc.id,
          };
        } else {
          cells[doc.id] = {
            state: 'off',
            slotTime,
            date,
            doctorId: doc.id,
          };
        }
        return;
      }

      // Check doctor shift hours for this day
      const docShift = shifts.find(
        (s) => s.staffId === canonicalId && s.days.includes(dow)
      );

      if (!docShift) {
        cells[doc.id] = {
          state: 'off',
          slotTime,
          date,
          doctorId: doc.id,
        };
        return;
      }

      const shiftStartMin = timeToMinutes(docShift.start);
      const shiftEndMin = timeToMinutes(docShift.end);

      if (startMinutes < shiftStartMin || endMinutes > shiftEndMin) {
        cells[doc.id] = {
          state: 'off',
          slotTime,
          date,
          doctorId: doc.id,
        };
        return;
      }

      // 3. Check booked appointment
      const matchedApt = bookedAppointments.find((a) => {
        const aptDocCanonical = getDoctorCanonicalStaffId(a.doctorId);
        if (aptDocCanonical !== canonicalId && a.doctorId !== doc.id) return false;
        const aptTimeStr = a.dateTime.slice(11, 16);
        const aStart = timeToMinutes(aptTimeStr);
        const aDuration = a.durationMinutes || slotMinutes;
        const aEnd = aStart + aDuration;
        return startMinutes < aEnd && endMinutes > aStart;
      });

      if (matchedApt) {
        cells[doc.id] = {
          state: 'booked',
          appointment: matchedApt,
          slotTime,
          date,
          doctorId: doc.id,
        };
        return;
      }

      // 4. Free vs Past-Free
      if (isSlotInPast(date, slotTime, now)) {
        cells[doc.id] = {
          state: 'past-free',
          slotTime,
          date,
          doctorId: doc.id,
        };
      } else {
        cells[doc.id] = {
          state: 'free',
          slotTime,
          date,
          doctorId: doc.id,
        };
      }
    });

    return {
      slotTime,
      startMinutes,
      endMinutes,
      cells,
    };
  });

  return {
    date,
    doctors,
    slots,
    rows,
  };
}

/**
 * Builds the week grid for a single doctor across 7 days starting at weekStart.
 * Supports flexible argument order to match dayGrid or specialized call.
 */
export function buildWeekGrid(
  doctorId: string,
  weekStart: string,
  arg3: Doctor[] | Shift[],
  arg4: Shift[] | LeaveRequest[],
  arg5: LeaveRequest[] | Appointment[],
  arg6?: Appointment[] | number,
  arg7?: number | Date,
  arg8?: Date
): WeekGrid {
  let shifts: Shift[];
  let leaves: LeaveRequest[];
  let appointments: Appointment[];
  let slotMinutes: number = SLOT_MINUTES;
  let now: Date = new Date();

  // Inspect arguments to detect whether `doctors` was passed as 3rd arg
  if (Array.isArray(arg3) && arg3.length > 0 && 'specialization' in arg3[0]) {
    // Signature: (doctorId, weekStart, doctors, shifts, leaves, appointments, slotMinutes, now)
    shifts = (arg4 as Shift[]) || [];
    leaves = (arg5 as LeaveRequest[]) || [];
    appointments = (arg6 as Appointment[]) || [];
    if (typeof arg7 === 'number') slotMinutes = arg7;
    if (arg8 instanceof Date) now = arg8;
  } else {
    // Signature: (doctorId, weekStart, shifts, leaves, appointments, slotMinutes, now)
    shifts = (arg3 as Shift[]) || [];
    leaves = (arg4 as LeaveRequest[]) || [];
    appointments = (arg5 as Appointment[]) || [];
    if (typeof arg6 === 'number') slotMinutes = arg6;
    if (arg7 instanceof Date) now = arg7;
  }

  const canonicalId = getDoctorCanonicalStaffId(doctorId);
  const doctorShifts = shifts.filter((s) => s.staffId === canonicalId);

  let earliestStart = 9 * 60;
  let latestEnd = 17 * 60;

  if (doctorShifts.length > 0) {
    earliestStart = Math.min(...doctorShifts.map((s) => timeToMinutes(s.start)));
    latestEnd = Math.max(...doctorShifts.map((s) => timeToMinutes(s.end)));
  }

  const slots: string[] = [];
  for (let m = earliestStart; m + slotMinutes <= latestEnd; m += slotMinutes) {
    slots.push(minutesToTime(m));
  }

  // 7 days from weekStart
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }

  // Pre-filter active non-walk-in appointments for this doctor in this week
  const weekStartStr = days[0];
  const weekEndStr = days[6];
  const bookedAppointments = appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    if (a.source === 'walk_in') return false;
    const aptDocCanonical = getDoctorCanonicalStaffId(a.doctorId);
    if (aptDocCanonical !== canonicalId && a.doctorId !== doctorId) return false;
    const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
    return aptDate >= weekStartStr && aptDate <= weekEndStr;
  });

  const rows: WeekGridRow[] = slots.map((slotTime) => {
    const startMinutes = timeToMinutes(slotTime);
    const endMinutes = startMinutes + slotMinutes;
    const cells: Record<string, CalendarCell> = {};

    days.forEach((date) => {
      const dow = dayOfWeek(date);

      // Check general doctor availability on this date
      const availableOnDate = isDoctorAvailable(doctorId, date, shifts, [], leaves);
      if (!availableOnDate) {
        if (isOnLeave(canonicalId, date, leaves)) {
          cells[date] = {
            state: 'leave',
            slotTime,
            date,
            doctorId,
          };
        } else {
          cells[date] = {
            state: 'off',
            slotTime,
            date,
            doctorId,
          };
        }
        return;
      }

      // Check shift hours on this day
      const docShift = doctorShifts.find((s) => s.days.includes(dow));
      if (!docShift) {
        cells[date] = {
          state: 'off',
          slotTime,
          date,
          doctorId,
        };
        return;
      }

      const shiftStartMin = timeToMinutes(docShift.start);
      const shiftEndMin = timeToMinutes(docShift.end);

      if (startMinutes < shiftStartMin || endMinutes > shiftEndMin) {
        cells[date] = {
          state: 'off',
          slotTime,
          date,
          doctorId,
        };
        return;
      }

      // 3. Booked
      const matchedApt = bookedAppointments.find((a) => {
        const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
        if (aptDate !== date) return false;
        const aptTimeStr = a.dateTime.slice(11, 16);
        const aStart = timeToMinutes(aptTimeStr);
        const aDuration = a.durationMinutes || slotMinutes;
        const aEnd = aStart + aDuration;
        return startMinutes < aEnd && endMinutes > aStart;
      });

      if (matchedApt) {
        cells[date] = {
          state: 'booked',
          appointment: matchedApt,
          slotTime,
          date,
          doctorId,
        };
        return;
      }

      // 4. Free vs Past-Free
      if (isSlotInPast(date, slotTime, now)) {
        cells[date] = {
          state: 'past-free',
          slotTime,
          date,
          doctorId,
        };
      } else {
        cells[date] = {
          state: 'free',
          slotTime,
          date,
          doctorId,
        };
      }
    });

    return {
      slotTime,
      startMinutes,
      endMinutes,
      cells,
    };
  });

  return {
    doctorId,
    weekStart,
    days,
    slots,
    rows,
  };
}

/**
 * Groups walk-in check-ins by bucket (checkedInAt) and doctor.
 */
export function walkInBuckets(
  date: string,
  appointments: Appointment[],
  bucketMinutes: number = 60
): WalkInBucket[] {
  // Filter walk-in appointments for this date
  const dayWalkIns = appointments.filter((a) => {
    if (a.source !== 'walk_in') return false;
    const checkInDate = (a.checkedInAt || a.dateTime || '').slice(0, 10);
    return checkInDate === date;
  });

  // Calculate day range for one-hour buckets (default 08:00 - 18:00 or expand based on appointments)
  let minHour = 8;
  let maxHour = 18;

  dayWalkIns.forEach((a) => {
    const timeStr = (a.checkedInAt || a.dateTime || '').slice(11, 16);
    if (timeStr) {
      const min = timeToMinutes(timeStr);
      const h = Math.floor(min / 60);
      if (h < minHour) minHour = Math.max(0, h);
      if (h + 1 > maxHour) maxHour = Math.min(24, h + 1);
    }
  });

  const buckets: WalkInBucket[] = [];
  const startMinute = minHour * 60;
  const endMinute = maxHour * 60;

  for (let bStart = startMinute; bStart < endMinute; bStart += bucketMinutes) {
    const bEnd = bStart + bucketMinutes;
    const timeStr = minutesToTime(bStart);
    const endStr = minutesToTime(bEnd);
    const label = `${timeStr} - ${endStr}`;

    const bucketApts = dayWalkIns.filter((a) => {
      const aTimeStr = (a.checkedInAt || a.dateTime || '').slice(11, 16);
      if (!aTimeStr) return false;
      const aMin = timeToMinutes(aTimeStr);
      return aMin >= bStart && aMin < bEnd;
    });

    const byDoctor: Record<string, Appointment[]> = {};
    bucketApts.forEach((a) => {
      if (!byDoctor[a.doctorId]) {
        byDoctor[a.doctorId] = [];
      }
      byDoctor[a.doctorId].push(a);
    });

    // Sort walk-ins in each doctor bucket by token number
    Object.keys(byDoctor).forEach((docId) => {
      byDoctor[docId].sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
    });

    buckets.push({
      time: timeStr,
      label,
      startMinutes: bStart,
      endMinutes: bEnd,
      appointments: bucketApts,
      byDoctor,
    });
  }

  return buckets;
}

/**
 * Computes wait statistics (count, average and longest wait in minutes)
 * for walk-in appointments on a given date.
 */
export function waitStats(
  date: string,
  appointments: Appointment[],
  now: Date
): WaitStats {
  const dayWalkIns = appointments.filter((a) => {
    if (a.source !== 'walk_in') return false;
    if (a.status === 'cancelled') return false;
    const checkInDate = (a.checkedInAt || a.dateTime || '').slice(0, 10);
    return checkInDate === date;
  });

  if (dayWalkIns.length === 0) {
    return {
      count: 0,
      average: 0,
      longest: 0,
    };
  }

  const waitTimes = dayWalkIns.map((a) => getWalkInWaitMinutes(a, now));
  const count = waitTimes.length;
  const sum = waitTimes.reduce((acc, val) => acc + val, 0);
  const average = Math.round(sum / count);
  const longest = Math.max(...waitTimes, 0);

  return {
    count,
    average,
    longest,
  };
}

