/**
 * Doctor Name Formatting Engine (Milestone M9.5).
 *
 * Guarantees that "Dr." prefix is never doubled or repeated,
 * regardless of whether the source name already includes "Dr.",
 * "Dr", "Doctor", or multiple prefixes.
 */

export function formatDoctorName(
  input: string | { name?: string } | null | undefined
): string {
  if (!input) return '';
  const raw = typeof input === 'object' ? (input.name || '') : String(input);
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Strip all leading variations of "Dr.", "Dr", "Doctor" repeated one or more times
  const stripped = trimmed.replace(/^((Dr\.?|Doctor)\s*)+/i, '').trim();
  if (!stripped) return 'Dr.';
  return `Dr. ${stripped}`;
}
