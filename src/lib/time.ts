/**
 * Clinic Local Date & Time Helpers (Milestone M9.5, M10.4).
 *
 * Rules:
 * - One local-date helper (formatLocalDate) used for every day key and storage query.
 * - One canonical formatDate (e.g. "15 Oct 2026") helper used for all display.
 * - One canonical formatTime (24-hour, "09:30") helper used for all display.
 * - Accurately computes day keys at day boundaries in all time zones.
 */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Returns a 'YYYY-MM-DD' date string for a given Date in its local time.
 * Defaults to current local date if not specified.
 * Used strictly for storage, keys, and boundary calculations.
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
  if (!str) return '—';
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

/**
 * Formats any date input into canonical clinic display format: "15 Oct 2026".
 * Day is without leading zero, three-letter month, four-digit year.
 * Handles Date objects, ISO strings, YYYY-MM-DD strings.
 */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else {
    const str = String(input).trim();
    if (!str) return '—';
    const datePart = str.includes('T') ? str.split('T')[0] : str.includes(' ') ? str.split(' ')[0] : str;
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, day] = datePart.split('-').map(Number);
      d = new Date(y, m - 1, day, 12, 0, 0);
    } else {
      d = new Date(str);
    }
  }
  if (isNaN(d.getTime())) return String(input);
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats any time input into canonical 24-hour clinic display format: "09:30".
 * Handles Date objects, ISO strings, HH:MM strings.
 */
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '—';
    const h = String(input.getHours()).padStart(2, '0');
    const m = String(input.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const str = String(input).trim();
  if (!str) return '';

  // Check 12-hour AM/PM string, e.g. "9:30 AM", "02:15 PM"
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // Check simple HH:MM or H:MM
  const simpleMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (simpleMatch) {
    const hours = simpleMatch[1].padStart(2, '0');
    const minutes = simpleMatch[2];
    return `${hours}:${minutes}`;
  }

  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    const timePart = str.split('T')[1];
    if (timePart) {
      const subMatch = timePart.match(/^(\d{1,2}):(\d{2})/);
      if (subMatch) {
        return `${subMatch[1].padStart(2, '0')}:${subMatch[2]}`;
      }
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  return str;
}
