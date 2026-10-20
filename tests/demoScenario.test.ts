import { describe, it, expect } from 'vitest';
import { generateDemoScenario } from '../src/data/demoScenario';
import { calculateDashboardMetrics } from '../src/lib/dashboardMetrics';
import { formatLocalDate } from '../src/lib/time';
import { isSameStaff } from '../src/lib/staffIds';

describe('Demonstration Scenario Generator (M10 Section 7)', () => {
  const refDate = new Date(2026, 9, 20, 10, 30, 0); // 2026-10-20 10:30 local time
  const scenario = generateDemoScenario(refDate);

  describe('Staff Accounts and Identity Constraints', () => {
    it('seeds exactly 5 staff accounts: MD Vance, Dr. Hayes, Dr. Reed, Priya Sharma, and David Kim', () => {
      expect(scenario.staff.length).toBe(5);
      const names = scenario.staff.map((s) => s.staffName);
      expect(names).toContain('Dr. Marcus Vance');
      expect(names).toContain('Dr. Nathan Hayes');
      expect(names).toContain('Dr. Sophia Reed');
      expect(names).toContain('Priya Sharma');
      expect(names).toContain('David Kim');
    });

    it('ensures no two staff members have the same name', () => {
      const staffNames = scenario.staff.map((s) => s.staffName);
      const uniqueNames = new Set(staffNames);
      expect(uniqueNames.size).toBe(scenario.staff.length);
    });

    it('ensures no patient shares any staff member name', () => {
      const staffNames = scenario.staff.map((s) => s.staffName.toLowerCase());
      const staffNameParts = new Set<string>();
      staffNames.forEach((n) => {
        n.replace(/dr\.?\s+/gi, '')
          .split(/\s+/)
          .forEach((part: string) => {
            if (part.length > 2) staffNameParts.add(part);
          });
      });

      for (const pt of scenario.patients) {
        const ptFirst = pt.firstName.toLowerCase();
        const ptLast = pt.lastName.toLowerCase();
        expect(staffNameParts.has(ptFirst)).toBe(false);
        expect(staffNameParts.has(ptLast)).toBe(false);
      }
    });
  });

  describe('Patient Registry and Clinical Conditions', () => {
    it('seeds between 6 and 8 patients', () => {
      expect(scenario.patients.length).toBeGreaterThanOrEqual(6);
      expect(scenario.patients.length).toBeLessThanOrEqual(8);
    });

    it('seeds at least one patient with a penicillin allergy', () => {
      const withPenicillin = scenario.patients.filter((p) =>
        p.allergies?.some((a) => a.toLowerCase().includes('penicillin'))
      );
      expect(withPenicillin.length).toBeGreaterThanOrEqual(1);
      expect(withPenicillin[0].id).toBe('pat-1');
      expect(withPenicillin[0].firstName).toBe('Eleanor');
    });

    it('seeds at least one patient on an ongoing antihypertensive', () => {
      const withAntihypertensive = scenario.patients.filter((p) =>
        p.currentMedications?.some((m) =>
          m.toLowerCase().includes('amlodipine') ||
          m.toLowerCase().includes('hydrochlorothiazide') ||
          m.toLowerCase().includes('lisinopril')
        )
      );
      expect(withAntihypertensive.length).toBeGreaterThanOrEqual(1);
    });

    it('seeds at least one patient with an outstanding invoice', () => {
      const unpaidInvoices = scenario.invoices.filter((inv) => inv.status === 'unpaid');
      expect(unpaidInvoices.length).toBeGreaterThanOrEqual(1);
      const patientIds = unpaidInvoices.map((inv) => inv.patientId);
      const matchingPatients = scenario.patients.filter((p) => patientIds.includes(p.id));
      expect(matchingPatients.length).toBeGreaterThanOrEqual(1);
    });

    it('seeds at least one patient scheduled for today and one waiting in the lounge', () => {
      const todayStr = formatLocalDate(refDate);
      const todayApts = scenario.appointments.filter((a) => a.dateTime.startsWith(todayStr));

      // In clinic workflow, waiting in the lounge corresponds to status 'checked_in'
      const waiting = todayApts.filter((a) => a.status === 'checked_in');
      const scheduled = todayApts.filter((a) => a.status === 'scheduled');

      expect(waiting.length).toBeGreaterThanOrEqual(1);
      expect(scheduled.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Appointment Queue and Clinical Workflow Distribution', () => {
    it('has exactly 1 waiting, 1 in consultation, 1 completed with Rx and invoice, 1 booked later today, and 1 no-show from yesterday', () => {
      const todayStr = formatLocalDate(refDate);
      const yesterdayStr = formatLocalDate(new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - 1));

      const todayApts = scenario.appointments.filter((a) => a.dateTime.startsWith(todayStr));
      const yesterdayApts = scenario.appointments.filter((a) => a.dateTime.startsWith(yesterdayStr));

      const waiting = todayApts.filter((a) => a.status === 'checked_in');
      const inConsult = todayApts.filter((a) => a.status === 'in_consultation');
      const completed = todayApts.filter((a) => a.status === 'completed');
      const booked = todayApts.filter((a) => a.status === 'scheduled');
      const noShowYesterday = yesterdayApts.filter((a) => a.status === 'no_show');

      expect(waiting.length).toBe(1);
      expect(inConsult.length).toBe(1);
      expect(completed.length).toBe(1);
      expect(booked.length).toBe(1);
      expect(noShowYesterday.length).toBe(1);

      // Verify the completed appointment has a corresponding prescription and invoice
      const completedApt = completed[0];
      const matchingRx = scenario.prescriptions.find((r) => r.patientId === completedApt.patientId);
      expect(matchingRx).toBeDefined();
      expect(matchingRx?.date.startsWith(todayStr)).toBe(true);

      const matchingInv = scenario.invoices.find((i) => i.patientId === completedApt.patientId);
      expect(matchingInv).toBeDefined();
      expect(matchingInv?.issuedAt.startsWith(todayStr)).toBe(true);
    });
  });

  describe('Operational Approvals, Leaves, and Aging Invoices', () => {
    it('has exactly 1 pending staff clearance request', () => {
      expect(scenario.pendingApprovals.length).toBe(1);
      expect(scenario.pendingApprovals[0].staffName).toBe('Dr. Clara Oswald');
    });

    it('has exactly 1 pending leave request', () => {
      const pendingLeaves = scenario.leaveRequests.filter((l) => l.status === 'pending');
      expect(pendingLeaves.length).toBe(1);
      expect(pendingLeaves[0].staffName).toBe('Priya Sharma');
    });

    it('has exactly 1 unpaid invoice > 30 days old', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const oldUnpaidInvoices = scenario.invoices.filter((inv) => {
        if (inv.status !== 'unpaid') return false;
        const invTime = new Date(inv.issuedAt).getTime();
        return refDate.getTime() - invTime > thirtyDaysMs;
      });

      expect(oldUnpaidInvoices.length).toBe(1);
      expect(oldUnpaidInvoices[0].number).toBe('INV-2026-089');
      expect(oldUnpaidInvoices[0].patientName).toBe('Robert Chen');
    });
  });

  describe('Needs Attention Dashboard Widget', () => {
    it('has non-zero items for every category in the Needs Attention widget for admin user', () => {
      const metrics = calculateDashboardMetrics({
        patients: scenario.patients,
        appointments: scenario.appointments,
        invoices: scenario.invoices,
        payments: scenario.payments,
        prescriptions: scenario.prescriptions,
        doctors: scenario.doctors,
        pendingClearances: scenario.pendingApprovals,
        claimRequests: scenario.claimRequests,
        shifts: scenario.shifts,
        attendanceRecords: scenario.attendanceRecords,
        leaves: scenario.leaveRequests,
        patientAssignments: scenario.patientAssignments,
        modules: scenario.modules,
        dateRange: 'today',
        chartBucket: 'day',
        now: refDate,
        currentUser: {
          id: 'acc-doc-1',
          name: 'Dr. Marcus Vance',
          email: 'm.vance@beaconclinic.com',
          role: 'md',
        },
      });

      const categories = metrics.needsAttention.map((item) => item.id);
      expect(categories).toContain('clearances');
      expect(categories).toContain('leaves');
      expect(categories).toContain('claims');
      expect(categories).toContain('reschedule');
      expect(categories).toContain('unpaid_30');

      for (const item of metrics.needsAttention) {
        expect(item.count).toBeGreaterThan(0);
      }
    });
  });

  describe('Core Business Invariants and Relationships', () => {
    it('ensures no unassigned patient has a completed visit', () => {
      const completedApts = scenario.appointments.filter((a) => a.status === 'completed');
      for (const apt of completedApts) {
        const activeAssignment = scenario.patientAssignments.find(
          (pa) => pa.patientId === apt.patientId && pa.to === null
        );
        expect(activeAssignment).toBeDefined();
        expect(activeAssignment?.doctorId).toBeTruthy();
      }
    });

    it('ensures no doctor prescribes without an active assignment', () => {
      for (const rx of scenario.prescriptions) {
        const activeAssignment = scenario.patientAssignments.find(
          (pa) => pa.patientId === rx.patientId && pa.to === null
        );
        expect(activeAssignment).toBeDefined();
        // The doctor issuing the prescription must be the assigned doctor
        const matchesDoctor = isSameStaff(activeAssignment!.doctorId, rx.doctorId);
        expect(matchesDoctor).toBe(true);
      }
    });

    it('ensures money is integer minor units (cents) everywhere with no floating point currency', () => {
      // 1. Doctors consultation fee
      for (const doc of scenario.doctors) {
        expect(Number.isInteger(doc.consultationFee)).toBe(true);
        expect(doc.consultationFee % 1).toBe(0);
        expect(doc.consultationFee).toBeGreaterThanOrEqual(100);
      }

      // 2. Invoices items and totals
      for (const inv of scenario.invoices) {
        for (const item of inv.items) {
          expect(Number.isInteger(item.amount)).toBe(true);
          expect(item.amount % 1).toBe(0);
        }
      }

      // 3. Payments
      for (const pay of scenario.payments) {
        expect(Number.isInteger(pay.amount)).toBe(true);
        expect(pay.amount % 1).toBe(0);
      }

      // 4. Pending clearance fees
      for (const pend of scenario.pendingApprovals) {
        if (pend.consultationFee !== undefined) {
          expect(Number.isInteger(pend.consultationFee)).toBe(true);
          expect(pend.consultationFee % 1).toBe(0);
        }
      }
    });

    it('ensures no string contains any emoji characters across the entire dataset', () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
      const emojiViolations: string[] = [];

      function scanObject(obj: any, path: string) {
        if (!obj) return;
        if (typeof obj === 'string') {
          if (emojiRegex.test(obj)) {
            emojiViolations.push(`${path}: "${obj}"`);
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, idx) => scanObject(item, `${path}[${idx}]`));
        } else if (typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            scanObject(obj[key], `${path}.${key}`);
          }
        }
      }

      scanObject(scenario, 'scenario');
      expect(emojiViolations).toEqual([]);
    });
  });
});
