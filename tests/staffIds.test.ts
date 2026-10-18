import { describe, it, expect } from 'vitest';
import {
  CANONICAL_STAFF_IDS,
  resolveStaffId,
  resolveDoctorId,
  isSameStaff,
} from '@/lib/staffIds';
import { DEMO_USERS, INITIAL_DOCTORS } from '@/data/mockData';

describe('Canonical Staff IDs & Resolver (Milestone M9.5)', () => {
  it('maps every seeded staff member from user ID to canonical staff ID', () => {
    // 1. Dr. Marcus Vance
    expect(resolveStaffId('usr-doc-1')).toBe(CANONICAL_STAFF_IDS.VANCE);
    expect(resolveStaffId('doc-1')).toBe(CANONICAL_STAFF_IDS.VANCE);
    expect(resolveStaffId('usr-1')).toBe(CANONICAL_STAFF_IDS.VANCE);
    expect(resolveStaffId('MD-001')).toBe(CANONICAL_STAFF_IDS.VANCE);
    expect(resolveStaffId('m.vance@beaconclinic.com')).toBe(CANONICAL_STAFF_IDS.VANCE);
    expect(resolveStaffId(DEMO_USERS.md)).toBe(CANONICAL_STAFF_IDS.VANCE);

    // 2. Dr. Nathan Hayes
    expect(resolveStaffId('usr-doc-2')).toBe(CANONICAL_STAFF_IDS.HAYES);
    expect(resolveStaffId('doc-2')).toBe(CANONICAL_STAFF_IDS.HAYES);
    expect(resolveStaffId('DOC-102')).toBe(CANONICAL_STAFF_IDS.HAYES);
    expect(resolveStaffId('n.hayes@beaconclinic.com')).toBe(CANONICAL_STAFF_IDS.HAYES);
    expect(resolveStaffId(DEMO_USERS.doctor)).toBe(CANONICAL_STAFF_IDS.HAYES);

    // 3. Dr. Sophia Reed
    expect(resolveStaffId('usr-doc-3')).toBe(CANONICAL_STAFF_IDS.REED);
    expect(resolveStaffId('doc-3')).toBe(CANONICAL_STAFF_IDS.REED);
    expect(resolveStaffId('DOC-103')).toBe(CANONICAL_STAFF_IDS.REED);
    expect(resolveStaffId('s.reed@beaconclinic.com')).toBe(CANONICAL_STAFF_IDS.REED);
    expect(resolveStaffId(INITIAL_DOCTORS[2])).toBe(CANONICAL_STAFF_IDS.REED);

    // 4. Priya Sharma
    expect(resolveStaffId('usr-rec-1')).toBe(CANONICAL_STAFF_IDS.SHARMA);
    expect(resolveStaffId('acc-rec-1')).toBe(CANONICAL_STAFF_IDS.SHARMA);
    expect(resolveStaffId('REC-301')).toBe(CANONICAL_STAFF_IDS.SHARMA);
    expect(resolveStaffId('p.sharma@beaconclinic.com')).toBe(CANONICAL_STAFF_IDS.SHARMA);
    expect(resolveStaffId(DEMO_USERS.receptionist)).toBe(CANONICAL_STAFF_IDS.SHARMA);

    // 5. David Kim
    expect(resolveStaffId('usr-rec-2')).toBe(CANONICAL_STAFF_IDS.KIM);
    expect(resolveStaffId('acc-rec-2')).toBe(CANONICAL_STAFF_IDS.KIM);
    expect(resolveStaffId('REC-302')).toBe(CANONICAL_STAFF_IDS.KIM);
    expect(resolveStaffId('d.kim@beaconclinic.com')).toBe(CANONICAL_STAFF_IDS.KIM);
    expect(resolveStaffId(DEMO_USERS.receptionist2)).toBe(CANONICAL_STAFF_IDS.KIM);
  });

  it('resolves doctor IDs accurately for physicians and returns null for non-doctors', () => {
    expect(resolveDoctorId('usr-doc-1')).toBe('doc-1');
    expect(resolveDoctorId('acc-doc-1')).toBe('doc-1');
    expect(resolveDoctorId('doc-1')).toBe('doc-1');

    expect(resolveDoctorId('usr-doc-2')).toBe('doc-2');
    expect(resolveDoctorId('acc-doc-2')).toBe('doc-2');
    expect(resolveDoctorId('doc-2')).toBe('doc-2');

    expect(resolveDoctorId('usr-doc-3')).toBe('doc-3');
    expect(resolveDoctorId('acc-doc-3')).toBe('doc-3');
    expect(resolveDoctorId('doc-3')).toBe('doc-3');

    // Non-doctors return null
    expect(resolveDoctorId('usr-rec-1')).toBeNull();
    expect(resolveDoctorId('acc-rec-1')).toBeNull();
    expect(resolveDoctorId('usr-rec-2')).toBeNull();
    expect(resolveDoctorId('acc-rec-2')).toBeNull();
    expect(resolveDoctorId('pat-1')).toBeNull();
  });

  it('determines isSameStaff across aliases', () => {
    expect(isSameStaff('usr-doc-1', 'doc-1')).toBe(true);
    expect(isSameStaff('acc-doc-1', 'MD-001')).toBe(true);
    expect(isSameStaff('usr-doc-2', 'acc-doc-2')).toBe(true);
    expect(isSameStaff('doc-2', 'n.hayes@beaconclinic.com')).toBe(true);
    expect(isSameStaff('usr-rec-1', 'REC-301')).toBe(true);
    expect(isSameStaff('usr-rec-2', 'acc-rec-2')).toBe(true);

    // Different staff
    expect(isSameStaff('usr-doc-1', 'usr-doc-2')).toBe(false);
    expect(isSameStaff('usr-rec-1', 'usr-rec-2')).toBe(false);
    expect(isSameStaff('usr-doc-2', 'usr-rec-1')).toBe(false);
  });

  it('returns null for patients and unrecognized IDs', () => {
    expect(resolveStaffId('pat-1')).toBeNull();
    expect(resolveStaffId('usr-pat-1')).toBeNull();
    expect(resolveStaffId('random-id')).toBeNull();
    expect(resolveStaffId(null)).toBeNull();
    expect(resolveStaffId(undefined)).toBeNull();
  });
});
