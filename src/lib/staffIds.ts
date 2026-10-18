/**
 * Canonical Staff Identifiers and Resolution Engine (Milestone M9.5).
 *
 * Rules:
 * - One canonical staff ID per staff member: the account ID (e.g. 'acc-doc-1').
 * - Resolver resolves any user ID, doctor ID, badge number, email, or entity
 *   to its canonical staff ID.
 * - Raw ID string comparisons across permissions, selectors, attendance,
 *   scheduling, prescribing, and dashboard are replaced by this resolver.
 */

export const CANONICAL_STAFF_IDS = {
  VANCE: 'acc-doc-1',
  HAYES: 'acc-doc-2',
  REED: 'acc-doc-3',
  SHARMA: 'acc-rec-1',
  KIM: 'acc-rec-2',
} as const;

export type CanonicalStaffId = typeof CANONICAL_STAFF_IDS[keyof typeof CANONICAL_STAFF_IDS] | string;

export interface StaffEntityLike {
  id?: string;
  badgeNumber?: string;
  email?: string;
  staffName?: string;
  name?: string;
  role?: string;
}

/**
 * Resolves any staff identifier (user id, doctor id, badge, email, or object)
 * to its canonical staff account ID.
 */
export function resolveStaffId(
  input: string | StaffEntityLike | null | undefined
): string | null {
  if (!input) return null;

  if (typeof input === 'object') {
    // If input is an object, check known fields
    if (input.id) {
      const fromId = resolveStaffId(input.id);
      if (fromId) return fromId;
    }
    if (input.badgeNumber) {
      const fromBadge = resolveStaffId(input.badgeNumber);
      if (fromBadge) return fromBadge;
    }
    if (input.email) {
      const fromEmail = resolveStaffId(input.email);
      if (fromEmail) return fromEmail;
    }
    return null;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // 1. Dr. Marcus Vance
  if (
    raw === 'acc-doc-1' ||
    raw === 'usr-doc-1' ||
    raw === 'doc-1' ||
    raw === 'usr-1' ||
    raw === 'MD-001' ||
    raw.toLowerCase() === 'm.vance@beaconclinic.com' ||
    raw === 'md'
  ) {
    return CANONICAL_STAFF_IDS.VANCE;
  }

  // 2. Dr. Nathan Hayes
  if (
    raw === 'acc-doc-2' ||
    raw === 'usr-doc-2' ||
    raw === 'doc-2' ||
    raw === 'DOC-102' ||
    raw.toLowerCase() === 'n.hayes@beaconclinic.com' ||
    raw === 'doctor'
  ) {
    return CANONICAL_STAFF_IDS.HAYES;
  }

  // 3. Dr. Sophia Reed
  if (
    raw === 'acc-doc-3' ||
    raw === 'usr-doc-3' ||
    raw === 'doc-3' ||
    raw === 'DOC-103' ||
    raw.toLowerCase() === 's.reed@beaconclinic.com'
  ) {
    return CANONICAL_STAFF_IDS.REED;
  }

  // 4. Priya Sharma
  if (
    raw === 'acc-rec-1' ||
    raw === 'usr-rec-1' ||
    raw === 'REC-301' ||
    raw.toLowerCase() === 'p.sharma@beaconclinic.com' ||
    raw.toLowerCase() === 'receptionist@beaconclinic.com' ||
    raw === 'receptionist'
  ) {
    return CANONICAL_STAFF_IDS.SHARMA;
  }

  // 5. David Kim
  if (
    raw === 'acc-rec-2' ||
    raw === 'usr-rec-2' ||
    raw === 'REC-302' ||
    raw.toLowerCase() === 'd.kim@beaconclinic.com' ||
    raw === 'receptionist2'
  ) {
    return CANONICAL_STAFF_IDS.KIM;
  }

  // Explicitly reject patient IDs
  if (
    raw.startsWith('pat-') ||
    raw.startsWith('usr-pat-') ||
    raw.startsWith('acc-pat-') ||
    raw.startsWith('MRN-')
  ) {
    return null;
  }

  // 6. Generic patterns for dynamic/newly provisioned staff
  if (
    raw.startsWith('acc-doc-') ||
    raw.startsWith('acc-rec-') ||
    raw.startsWith('acc-admin-') ||
    raw.startsWith('acc-staff-')
  ) {
    return raw;
  }
  if (raw.startsWith('usr-doc-')) {
    return raw.replace('usr-doc-', 'acc-doc-');
  }
  if (raw.startsWith('usr-rec-')) {
    return raw.replace('usr-rec-', 'acc-rec-');
  }
  if (raw.startsWith('doc-')) {
    return `acc-doc-${raw.replace('doc-', '')}`;
  }

  return null;
}

/**
 * Resolves doctor ID ('doc-1', 'doc-2', 'doc-3') from any staff identifier or entity.
 * Returns null if the person is not a doctor.
 */
export function resolveDoctorId(
  input: string | StaffEntityLike | null | undefined
): string | null {
  const staffId = resolveStaffId(input);
  if (!staffId) return null;

  if (staffId === CANONICAL_STAFF_IDS.VANCE) return 'doc-1';
  if (staffId === CANONICAL_STAFF_IDS.HAYES) return 'doc-2';
  if (staffId === CANONICAL_STAFF_IDS.REED) return 'doc-3';

  if (staffId.startsWith('acc-doc-')) {
    return `doc-${staffId.replace('acc-doc-', '')}`;
  }

  return null;
}

/**
 * Returns true if both identifiers or entities refer to the same staff member.
 */
export function isSameStaff(
  a: string | StaffEntityLike | null | undefined,
  b: string | StaffEntityLike | null | undefined
): boolean {
  const staffA = resolveStaffId(a);
  const staffB = resolveStaffId(b);
  return Boolean(staffA && staffB && staffA === staffB);
}
