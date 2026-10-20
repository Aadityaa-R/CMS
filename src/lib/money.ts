/**
 * Money and Minor Unit Currency Module (Milestone M9.5).
 *
 * Rules:
 * - Integer minor units (paisa/cents) only across all domains.
 * - Single formatCurrency function formatting minor units into ₹X.XX.
 * - Zero "legacy units" branch.
 * - Doctor consultation fees converted to integer minor units with migration.
 */

/**
 * Formats an amount in integer minor units (paisa/cents) into a standard Indian Rupee currency string.
 * Examples:
 * - 12000 -> "₹120.00"
 * - 9050 -> "₹90.50"
 * - 0 -> "₹0.00"
 * - -500 -> "-₹5.00"
 */
export function formatCurrency(cents: number): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return '₹0.00';
  }
  const isNegative = cents < 0;
  const absCents = Math.round(Math.abs(cents));
  const rupees = Math.floor(absCents / 100);
  const remainder = absCents % 100;

  const rupeesFormatted = rupees.toLocaleString('en-IN');
  const remainderFormatted = String(remainder).padStart(2, '0');

  const formatted = `₹${rupeesFormatted}.${remainderFormatted}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Ensures an amount is an integer minor unit (cents).
 * Rounds to the nearest integer.
 */
export function toCents(amount: number): number {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0;
  }
  return Math.round(amount);
}

/**
 * Converts a consultation fee to integer cents.
 * If fee is less than 1000 (legacy dollar amount such as 120 or 90),
 * it converts it to cents (e.g. 120 -> 12000).
 * If already in cents (e.g. 12000), it returns the integer cents directly.
 */
export function migrateConsultationFee(fee: number | null | undefined): number {
  if (fee === null || fee === undefined || isNaN(fee)) {
    return 0;
  }
  if (fee > 0 && fee < 1000) {
    return Math.round(fee * 100);
  }
  return Math.round(fee);
}

