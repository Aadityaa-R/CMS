/**
 * Clinic Local Date & Time Helpers (Milestone M9.5).
 *
 * Rules:
 * - One local-date helper used for every day key.
 * - Payments, collections, attendance, appointments, and dashboard ranges
 *   use the clinic's local day (YYYY-MM-DD), never UTC toISOString().
 * - Accurately computes day keys at day boundaries (23:30 and 00:30)
 *   in all time zones (UTC, America/Los_Angeles, Asia/Kolkata).
 */

/**
 * Returns a 'YYYY-MM-DD' date string for a given Date in its local time.
 * Defaults to current local date if not specified.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts or parses a 'YYYY-MM-DD' date string from any date representation
 * (Date object, ISO 8601 string, or date string).
 */
export function parseLocalDateKey(input: string | Date | null | undefined): string {
  if (!input) return '';
  if (input instanceof Date) {
    return formatLocalDate(input);
  }
  const str = String(input).trim();
  if (!str) return '';
  if (str.includes('T')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }
    return str.split('T')[0];
  }
  if (str.includes(' ')) {
    return str.split(' ')[0];
  }
  return str;
}

/**
 * Returns the clinic's active local day key (YYYY-MM-DD).
 */
export function getClinicDayKey(now: Date = new Date()): string {
  return formatLocalDate(now);
}
