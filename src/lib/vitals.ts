/**
 * Clinical Triage Vitals Ranges and Reference Markers (Milestone M9.5).
 *
 * Rules:
 * - Pure functions with strict boundaries.
 * - Supports strings, numbers, decimals, and non-numeric inputs.
 * - Single source of truth for vitals ranges across DoctorView and tests.
 */

export interface VitalRange {
  min: number;
  max: number;
}

export const NORMAL_VITAL_RANGES: Record<
  'systolicBp' | 'diastolicBp' | 'heartRateBpm' | 'oxygenSaturationPct' | 'temperatureCelsius',
  VitalRange
> = {
  systolicBp: { min: 90, max: 139 },
  diastolicBp: { min: 60, max: 89 },
  heartRateBpm: { min: 60, max: 100 },
  oxygenSaturationPct: { min: 95, max: 100 },
  temperatureCelsius: { min: 36.0, max: 37.9 },
};

/**
 * Returns 'Low', 'High', or null for a given vital value against its normal range.
 * Values equal to min or max are considered normal (returns null).
 */
export function getVitalMarker(
  value: string | number | null | undefined,
  range: VitalRange
): 'High' | 'Low' | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  if (isNaN(num)) return null;
  if (num < range.min) return 'Low';
  if (num > range.max) return 'High';
  return null;
}

/**
 * Formats a vital label with its reference marker suffix (e.g. 'Systolic High', 'Diastolic Low').
 */
export function getVitalLabel(
  baseLabel: string,
  value: string | number | null | undefined,
  range: VitalRange
): string {
  const marker = getVitalMarker(value, range);
  if (!marker) return baseLabel;
  return `${baseLabel} ${marker}`;
}

