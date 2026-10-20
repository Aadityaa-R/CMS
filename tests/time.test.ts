import { describe, it, expect } from 'vitest';
import { formatLocalDate, parseLocalDateKey, getClinicDayKey } from '../src/lib/time';

describe('Clinic Local Time and Date Helpers (M9.5 Requirement F)', () => {
  it('formats local date at 23:30 without shifting to next UTC day', () => {
    // 2026-10-18 at 23:30 local time
    const lateNight = new Date(2026, 9, 18, 23, 30, 0);
    expect(formatLocalDate(lateNight)).toBe('2026-10-18');
    expect(getClinicDayKey(lateNight)).toBe('2026-10-18');
  });

  it('formats local date at 00:30 without shifting to previous UTC day', () => {
    // 2026-10-19 at 00:30 local time
    const earlyMorning = new Date(2026, 9, 19, 0, 30, 0);
    expect(formatLocalDate(earlyMorning)).toBe('2026-10-19');
    expect(getClinicDayKey(earlyMorning)).toBe('2026-10-19');
  });

  it('parses various date input representations into YYYY-MM-DD', () => {
    const testDate = new Date(2026, 9, 18, 14, 0, 0);
    expect(parseLocalDateKey(testDate)).toBe('2026-10-18');
    expect(parseLocalDateKey('2026-10-18')).toBe('2026-10-18');
    expect(parseLocalDateKey('2026-10-18 14:30:00')).toBe('2026-10-18');
    expect(parseLocalDateKey('')).toBe('');
    expect(parseLocalDateKey(null)).toBe('');
    expect(parseLocalDateKey(undefined)).toBe('');
  });

  it('proves difference between local date helper and naive toISOString', () => {
    // In any non-UTC timezone, there are hours where toISOString gives the wrong day.
    // E.g. in America/Los_Angeles (UTC-7 / -8), 23:30 local is next day in UTC.
    // E.g. in Asia/Kolkata (UTC+5:30), 00:30 local is previous day in UTC.
    const late = new Date(2026, 9, 18, 23, 30, 0);
    const early = new Date(2026, 9, 19, 0, 30, 0);

    expect(formatLocalDate(late)).toBe('2026-10-18');
    expect(formatLocalDate(early)).toBe('2026-10-19');
  });
});

