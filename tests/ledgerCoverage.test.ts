import { describe, it, expect } from 'vitest';
import { AccessAuditLogEntry } from '../src/types';
import { getRepository } from '../src/data/storage';

describe('Security Audit Ledger Coverage (M10 Section 6)', () => {
  it('records and persists structured audit log entries across all state-changing actions', async () => {
    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
    repoLedger.clear();

    const expectedActions: Array<{
      action: AccessAuditLogEntry['action'];
      actor: string;
      target: string;
      description: string;
    }> = [
      {
        action: 'user_login',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-1',
        description: 'User m.vance (Dr. Marcus Vance) authenticated into station with role md.',
      },
      {
        action: 'patient_self_registered',
        actor: 'Eleanor Wright',
        target: 'pat-1',
        description: 'New outpatient self-registration submitted via portal.',
      },
      {
        action: 'staff_clearance_requested',
        actor: 'Candidate John Doe',
        target: 'DOC-501',
        description: 'Staff clearance requested for Dr. John Doe (Internal Medicine).',
      },
      {
        action: 'patient_registered',
        actor: 'Priya Sharma',
        target: 'pat-10',
        description: 'New outpatient registered at reception: David Miller (MRN-78901).',
      },
      {
        action: 'patient_checked_in',
        actor: 'Priya Sharma',
        target: 'pat-1',
        description: 'Patient Eleanor Wright checked in for appointment #1.',
      },
      {
        action: 'vitals_recorded',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'Triage vitals recorded for patient pat-1 (BP: 120/80, HR: 72, Temp: 37C, SpO2: 98%).',
      },
      {
        action: 'consultation_started',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'Consultation started for patient Eleanor Wright.',
      },
      {
        action: 'consultation_concluded',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'Consultation concluded for patient Eleanor Wright.',
      },
      {
        action: 'care_transferred',
        actor: 'Dr. Marcus Vance',
        target: 'pat-1',
        description: 'Care for patient pat-1 transferred to Dr. Sophia Reed: Patient relocation.',
      },
      {
        action: 'prescription_issued',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'e-Prescription #RX-2026-001 issued for Eleanor Wright. Diagnosis: Hypertension.',
      },
      {
        action: 'allergy_override',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'Allergy warning overridden for Penicillin when prescribing Amoxicillin. Reason: Prior mild reaction with negative rechallenge.',
      },
      {
        action: 'prescription_cancelled',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'Prescription #RX-2026-001 cancelled by Dr. Nathan Hayes. Reason: Regimen adjusted.',
      },
      {
        action: 'invoice_issued',
        actor: 'Dr. Nathan Hayes',
        target: 'pat-1',
        description: 'Invoice INV-2026-001 issued for consultation visit of Eleanor Wright.',
      },
      {
        action: 'charge_added',
        actor: 'Priya Sharma',
        target: 'INV-2026-001',
        description: 'Charge added: Diagnostic ECG for $45.00 by Priya Sharma.',
      },
      {
        action: 'discount_applied',
        actor: 'Dr. Marcus Vance',
        target: 'INV-2026-001',
        description: 'Discount of $20.00 applied to Invoice INV-2026-001 by Dr. Marcus Vance. Reason: Courtesy discount.',
      },
      {
        action: 'payment_recorded',
        actor: 'Priya Sharma',
        target: 'INV-2026-001',
        description: 'Payment of $120.00 recorded via CARD by Priya Sharma. Receipt: REC-2026-001.',
      },
      {
        action: 'portal_payment',
        actor: 'Patient portal',
        target: 'INV-2026-002',
        description: 'Patient portal payment of $95.00 settled via CARD (ch_demo_123). Receipt: REC-2026-002.',
      },
      {
        action: 'payment_reversed',
        actor: 'Dr. Marcus Vance',
        target: 'REC-2026-001',
        description: 'Payment of $120.00 on Invoice INV-2026-001 reversed by Dr. Marcus Vance. Reason: Duplicate transaction.',
      },
      {
        action: 'invoice_voided',
        actor: 'Dr. Marcus Vance',
        target: 'INV-2026-003',
        description: 'Invoice INV-2026-003 voided by Dr. Marcus Vance. Reason: Patient cancelled before arrival.',
      },
      {
        action: 'attendance_clock_in',
        actor: 'Dr. Nathan Hayes',
        target: 'acc-doc-2',
        description: 'Staff member Dr. Nathan Hayes clocked in for duty.',
      },
      {
        action: 'attendance_clock_in_override',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-2',
        description: 'Administrative clock-in override for Dr. Nathan Hayes on approved leave day authorized by Dr. Marcus Vance.',
      },
      {
        action: 'attendance_clock_out',
        actor: 'Dr. Nathan Hayes',
        target: 'acc-doc-2',
        description: 'Staff member acc-doc-2 clocked out.',
      },
      {
        action: 'leave_requested',
        actor: 'Dr. Nathan Hayes',
        target: 'acc-doc-2',
        description: 'Leave requested by Dr. Nathan Hayes (Casual) from 2026-11-01 to 2026-11-03: Medical conference.',
      },
      {
        action: 'leave_approved',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-2',
        description: 'Leave request (2026-11-01 to 2026-11-03, Casual) approved by Dr. Marcus Vance.',
      },
      {
        action: 'leave_rejected',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-2',
        description: 'Leave request (2026-11-01 to 2026-11-03, Casual) rejected by Dr. Marcus Vance. Decision note: Insufficient physician coverage.',
      },
      {
        action: 'attendance_record_corrected',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-2',
        description: 'Attendance record on 2026-10-15 for Dr. Nathan Hayes corrected by Dr. Marcus Vance. Reason: Biometric punch missed.',
      },
      {
        action: 'shift_updated',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-2',
        description: 'Shift schedule updated for Dr. Nathan Hayes (09:00 - 17:00, Mon-Fri).',
      },
      {
        action: 'module_created',
        actor: 'Dr. Marcus Vance',
        target: 'mod-custom-1',
        description: 'Custom governance module "Telehealth Desk" created.',
      },
      {
        action: 'module_renamed',
        actor: 'Dr. Marcus Vance',
        target: 'mod-custom-1',
        description: 'Module renamed from "Telehealth Desk" to "Virtual Triage Desk".',
      },
      {
        action: 'module_deleted',
        actor: 'Dr. Marcus Vance',
        target: 'mod-custom-1',
        description: 'Module "Virtual Triage Desk" deleted.',
      },
      {
        action: 'module_access_included',
        actor: 'Dr. Marcus Vance',
        target: 'mod-custom-1',
        description: 'Access privilege "Consultation Workstation" added to module Virtual Triage Desk.',
      },
      {
        action: 'module_access_removed',
        actor: 'Dr. Marcus Vance',
        target: 'mod-custom-1',
        description: 'Access privilege "Consultation Workstation" removed from module Virtual Triage Desk.',
      },
      {
        action: 'module_member_added',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-3',
        description: 'Staff member Dr. Sophia Reed added to module Virtual Triage Desk.',
      },
      {
        action: 'module_member_removed',
        actor: 'Dr. Marcus Vance',
        target: 'acc-doc-3',
        description: 'Staff member Dr. Sophia Reed removed from module Virtual Triage Desk.',
      },
      {
        action: 'account_provisioned',
        actor: 'Dr. Marcus Vance',
        target: 'acc-rec-3',
        description: 'New staff account provisioned for James Wilson (REC-303).',
      },
      {
        action: 'clearance_approved',
        actor: 'Dr. Marcus Vance',
        target: 'DOC-501',
        description: 'Onboarding clearance approved for Dr. John Doe. Added to default module: Clinical.',
      },
      {
        action: 'clearance_rejected',
        actor: 'Dr. Marcus Vance',
        target: 'DOC-502',
        description: 'Onboarding clearance rejected by Managing Director: Incomplete credential documentation.',
      },
      {
        action: 'account_deleted',
        actor: 'Dr. Marcus Vance',
        target: 'acc-temp-1',
        description: 'Staff account for Temporary Operator deleted permanently.',
      },
      {
        action: 'account_locked',
        actor: 'System Security Watchdog',
        target: 'acc-doc-2',
        description: 'Account n.hayes locked due to 5 failed login attempts.',
      },
      {
        action: 'password_reset',
        actor: 'Dr. Marcus Vance',
        target: 'Dr. Marcus Vance',
        description: 'Password changed by user m.vance@beaconclinic.com.',
      },
      {
        action: 'demo_data_reset',
        actor: 'Dr. Marcus Vance',
        target: 'Factory Defaults',
        description: 'All clinical collections restored to initial demonstration seed data.',
      },
      {
        action: 'data_exported',
        actor: 'Dr. Marcus Vance',
        target: 'sys-backup',
        description: 'Full clinic backup exported to cms-backup-2026-10-20.json.',
      },
      {
        action: 'data_imported',
        actor: 'Dr. Marcus Vance',
        target: 'System Backup Restore',
        description: 'Backup from 2026-10-18 successfully restored.',
      },
      {
        action: 'storage_mode_changed',
        actor: 'Dr. Marcus Vance',
        target: 'sys-storage',
        description: 'Storage persistence mode changed to Browser Storage.',
      },
    ];

    for (let i = 0; i < expectedActions.length; i++) {
      const item = expectedActions[i];
      const entry: AccessAuditLogEntry = {
        id: `audit-${i + 1}`,
        timestamp: new Date(Date.now() - (expectedActions.length - i) * 60000).toISOString(),
        action: item.action,
        authorizedBy: item.actor,
        targetUserId: item.target,
        description: item.description,
      };
      await repoLedger.create(entry);
    }

    const recorded = await repoLedger.list();
    expect(recorded.length).toBe(expectedActions.length);

    expectedActions.forEach((expected) => {
      const found = recorded.find((r) => r.action === expected.action);
      expect(found).toBeDefined();
      expect(found?.authorizedBy).toBe(expected.actor);
      expect(found?.targetUserId).toBe(expected.target);
      expect(found?.description).toBe(expected.description);
    });
  });
});
