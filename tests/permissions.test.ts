import { describe, it, expect } from 'vitest';
import {
  getEffectiveAccesses,
  hasCapability,
  isAdmin,
  canRemoveMember,
  canDeleteStaff,
} from '@/lib/permissions';
import {
  INITIAL_MODULES,
  INITIAL_STAFF_ACCESS,
  DEMO_USERS,
} from '@/data/mockData';
import { AccessModule, User } from '@/types';
import { CANONICAL_STAFF_IDS } from '@/lib/staffIds';

describe('One Source of Truth for Access (Milestone M9.5)', () => {
  it('derives access strictly from module membership and active status', () => {
    // Receptionist in Reception module has registration, check-in, payment recording
    const recUser: User = {
      ...DEMO_USERS.receptionist,
      id: 'acc-rec-1',
      status: 'active',
    };
    expect(hasCapability(recUser, 'patientRegistration', INITIAL_MODULES)).toBe(true);
    expect(hasCapability(recUser, 'patientCheckIn', INITIAL_MODULES)).toBe(true);
    expect(hasCapability(recUser, 'paymentRecording', INITIAL_MODULES)).toBe(true);
    expect(hasCapability(recUser, 'emrRecordsAccess', INITIAL_MODULES)).toBe(false);
    expect(isAdmin(recUser, INITIAL_MODULES)).toBe(false);
  });

  it('ensures a leftover capabilities field grants nothing', () => {
    // User with empty module memberships but a legacy capabilities array
    const legacyUser: any = {
      id: 'acc-test-1',
      name: 'Test Staff',
      email: 'test@beaconclinic.com',
      role: 'receptionist',
      status: 'active',
      capabilities: ['administrativeAccess', 'emrRecordsAccess', 'paymentRecording'],
    };

    // With zero module memberships, capabilities array grants zero access
    const effective = getEffectiveAccesses(legacyUser, []);
    expect(effective).toEqual([]);
    expect(hasCapability(legacyUser, 'administrativeAccess', [])).toBe(false);
    expect(hasCapability(legacyUser, 'emrRecordsAccess', [])).toBe(false);
    expect(hasCapability(legacyUser, 'paymentRecording', [])).toBe(false);
    expect(isAdmin(legacyUser, [])).toBe(false);
  });

  it('ensures a role name alone grants nothing', () => {
    const doctorWithoutModules: User = {
      id: 'acc-doc-test',
      name: 'Dr. Test Physician',
      email: 'doc.test@beaconclinic.com',
      role: 'doctor',
      status: 'active',
    };

    const effective = getEffectiveAccesses(doctorWithoutModules, []);
    expect(effective).toEqual([]);
    expect(hasCapability(doctorWithoutModules, 'consultationWorkstation', [])).toBe(false);
    expect(hasCapability(doctorWithoutModules, 'emrRecordsAccess', [])).toBe(false);
    expect(hasCapability(doctorWithoutModules, 'prescriptionAuthoring', [])).toBe(false);
  });

  it('ensures a receptionist in no module cannot record payments or view billing', () => {
    const bareReceptionist: User = {
      id: 'acc-rec-bare',
      name: 'Unassigned Receptionist',
      email: 'bare.rec@beaconclinic.com',
      role: 'receptionist',
      status: 'active',
    };

    expect(hasCapability(bareReceptionist, 'paymentRecording', [])).toBe(false);
    expect(hasCapability(bareReceptionist, 'patientCheckIn', [])).toBe(false);
    expect(isAdmin(bareReceptionist, [])).toBe(false);
  });

  it('ensures a doctor in no module sees no clinical data', () => {
    const bareDoctor: User = {
      id: 'acc-doc-bare',
      name: 'Dr. Bare Physician',
      email: 'bare.doc@beaconclinic.com',
      role: 'doctor',
      status: 'active',
    };

    expect(hasCapability(bareDoctor, 'emrRecordsAccess', [])).toBe(false);
    expect(hasCapability(bareDoctor, 'consultationWorkstation', [])).toBe(false);
    expect(hasCapability(bareDoctor, 'prescriptionAuthoring', [])).toBe(false);
  });

  it('ensures removing membership removes access immediately', () => {
    const hayes: User = {
      ...DEMO_USERS.doctor,
      id: 'acc-doc-2',
      status: 'active',
    };

    // In initial modules, Hayes has EMR access via Clinical Consultations module
    expect(hasCapability(hayes, 'emrRecordsAccess', INITIAL_MODULES)).toBe(true);

    // After removing Hayes from all modules
    const modulesWithoutHayes: AccessModule[] = INITIAL_MODULES.map((m) => ({
      ...m,
      memberIds: m.memberIds.filter((id) => id !== 'acc-doc-2' && id !== 'usr-doc-2' && id !== 'doc-2'),
    }));

    expect(hasCapability(hayes, 'emrRecordsAccess', modulesWithoutHayes)).toBe(false);
    expect(hasCapability(hayes, 'prescriptionAuthoring', modulesWithoutHayes)).toBe(false);
  });

  it('ensures the original MD stays admin while account is active', () => {
    const vance: User = {
      ...DEMO_USERS.md,
      id: CANONICAL_STAFF_IDS.VANCE,
      status: 'active',
    };

    // Even if passed an empty modules array, the original MD retains administrativeAccess
    expect(hasCapability(vance, 'administrativeAccess', [])).toBe(true);
    expect(isAdmin(vance, [])).toBe(true);

    // But if revoked or suspended, account has zero access
    const suspendedVance: User = {
      ...vance,
      status: 'suspended',
    };
    expect(hasCapability(suspendedVance, 'administrativeAccess', INITIAL_MODULES)).toBe(false);
    expect(isAdmin(suspendedVance, INITIAL_MODULES)).toBe(false);
  });

  it('prevents removing original MD from administration module', () => {
    const adminModule = INITIAL_MODULES.find((m) => m.id === 'mod-admin')!;
    const originalMD = INITIAL_STAFF_ACCESS.find((s) => s.id === 'acc-doc-1')!;

    const result = canRemoveMember(DEMO_USERS.md, adminModule, originalMD, INITIAL_MODULES, INITIAL_STAFF_ACCESS);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Original Managing Director cannot be removed');
  });

  it('prevents deleting original MD staff record', () => {
    const originalMD = INITIAL_STAFF_ACCESS.find((s) => s.id === 'acc-doc-1')!;
    const result = canDeleteStaff(DEMO_USERS.md, originalMD, INITIAL_STAFF_ACCESS, INITIAL_MODULES);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Original Managing Director account cannot be deleted');
  });

  it('enforces prescription authoring is strictly granted to doctor staff type', () => {
    // If a receptionist is mistakenly placed into a module containing prescriptionAuthoring
    const rogueModule: AccessModule = {
      id: 'mod-rogue',
      name: 'Rogue Module',
      isSystem: false,
      memberIds: ['acc-rec-1'],
      accessIds: ['prescriptionAuthoring', 'emrRecordsAccess'],
      createdAt: '2026-10-18T00:00:00Z',
      createdBy: 'acc-doc-1',
    };

    const recUser: User = {
      ...DEMO_USERS.receptionist,
      id: 'acc-rec-1',
      status: 'active',
    };

    const accesses = getEffectiveAccesses(recUser, [rogueModule]);
    expect(accesses.includes('prescriptionAuthoring')).toBe(false);
    expect(accesses.includes('emrRecordsAccess')).toBe(true);
  });
});
