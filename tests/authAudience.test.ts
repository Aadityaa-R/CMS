import { describe, it, expect, beforeEach } from 'vitest';
import { audienceOf, login, AuthService } from '../src/services/authService';
import { getRepository, resetDemoData } from '../src/data/storage';
import { Account } from '../src/types/storage';

describe('Authentication Audience Selector and Portal Routing (M9.7)', () => {
  beforeEach(async () => {
    await resetDemoData('Auth Audience Test Suite');
  });

  describe('audienceOf(account)', () => {
    it('correctly maps roles and accounts to their canonical audience', () => {
      // Patient roles
      expect(audienceOf('patient')).toBe('patient');
      expect(audienceOf({ role: 'patient' })).toBe('patient');
      expect(audienceOf({ role: 'PATIENT' })).toBe('patient');

      // Clinic staff roles
      expect(audienceOf('md')).toBe('staff');
      expect(audienceOf('doctor')).toBe('staff');
      expect(audienceOf('receptionist')).toBe('staff');
      expect(audienceOf('admin')).toBe('staff');

      expect(audienceOf({ role: 'md' })).toBe('staff');
      expect(audienceOf({ role: 'doctor' })).toBe('staff');
      expect(audienceOf({ role: 'receptionist' })).toBe('staff');
      expect(audienceOf({ role: 'admin' })).toBe('staff');

      // Future/custom staff roles default to staff
      expect(audienceOf('nurse')).toBe('staff');
      expect(audienceOf('radiologist')).toBe('staff');
      expect(audienceOf({ role: 'surgeon' })).toBe('staff');

      // Nullish fallbacks
      expect(audienceOf(null)).toBe('staff');
      expect(audienceOf(undefined)).toBe('staff');
      expect(audienceOf({} as any)).toBe('staff');

      // AuthService object parity
      expect(AuthService.audienceOf('patient')).toBe('patient');
      expect(AuthService.audienceOf('doctor')).toBe('staff');
    });
  });

  describe('login(identifier, password, audience)', () => {
    it('returns success when credentials and portal audience match', async () => {
      // Staff login on staff tab
      const staffRes = await login('doctor', 'Doctor@123', 'staff');
      expect(staffRes.success).toBe(true);
      expect(staffRes.code).toBe('success');
      expect(staffRes.matchedRole).toBe('doctor');

      // Patient login on patient tab
      const patientRes = await login('patient', 'Patient@123', 'patient');
      expect(patientRes.success).toBe(true);
      expect(patientRes.code).toBe('success');
      expect(patientRes.matchedRole).toBe('patient');
    });

    it('returns wrongPortal only when password is correct for an account of the other audience', async () => {
      // Patient trying to sign in on staff tab with correct password
      const patientOnStaff = await login('patient', 'Patient@123', 'staff');
      expect(patientOnStaff.success).toBe(false);
      expect(patientOnStaff.code).toBe('wrongPortal');
      expect(patientOnStaff.expectedAudience).toBe('patient');
      expect(patientOnStaff.error).toBe('This is a patient account. Use the Patient option.');

      // Staff trying to sign in on patient tab with correct password
      const doctorOnPatient = await login('doctor', 'Doctor@123', 'patient');
      expect(doctorOnPatient.success).toBe(false);
      expect(doctorOnPatient.code).toBe('wrongPortal');
      expect(doctorOnPatient.expectedAudience).toBe('staff');
      expect(doctorOnPatient.error).toBe('This is a clinic staff account. Use the Clinic Staff option.');

      // MD trying to sign in on patient tab with correct password
      const mdOnPatient = await login('md', 'Doctor@123', 'patient');
      expect(mdOnPatient.success).toBe(false);
      expect(mdOnPatient.code).toBe('wrongPortal');
      expect(mdOnPatient.expectedAudience).toBe('staff');
      expect(mdOnPatient.error).toBe('This is a clinic staff account. Use the Clinic Staff option.');
    });

    it('returns generic invalid for a wrong password on either audience and never discloses account existence', async () => {
      // Staff account with wrong password on staff tab
      const staffWrongPass = await login('doctor', 'WrongPassword@999', 'staff');
      expect(staffWrongPass.success).toBe(false);
      expect(staffWrongPass.code).toBe('invalid');
      expect(staffWrongPass.error).toBe('Incorrect username, email, or password.');

      // Staff account with wrong password on patient tab (must NOT return wrongPortal!)
      const staffWrongOnPatient = await login('doctor', 'WrongPassword@999', 'patient');
      expect(staffWrongOnPatient.success).toBe(false);
      expect(staffWrongOnPatient.code).toBe('invalid');
      expect(staffWrongOnPatient.error).toBe('Incorrect username, email, or password.');

      // Patient account with wrong password on staff tab (must NOT return wrongPortal!)
      const patientWrongOnStaff = await login('patient', 'WrongPassword@999', 'staff');
      expect(patientWrongOnStaff.success).toBe(false);
      expect(patientWrongOnStaff.code).toBe('invalid');
      expect(patientWrongOnStaff.error).toBe('Incorrect username, email, or password.');

      // Non-existent account
      const ghost = await login('nonexistent_user', 'AnyPassword@123', 'staff');
      expect(ghost.success).toBe(false);
      expect(ghost.code).toBe('invalid');
      expect(ghost.error).toBe('Incorrect username, email, or password.');
    });

    it('does not increment failed attempts or cause lockout on wrongPortal', async () => {
      // Repeat wrongPortal attempt 6 times with correct password
      for (let i = 0; i < 6; i++) {
        const res = await login('doctor', 'Doctor@123', 'patient');
        expect(res.code).toBe('wrongPortal');
      }

      // Check account record in storage: failedLoginAttempts must still be 0
      const repoAccounts = getRepository<Account>('accounts');
      const accounts = await repoAccounts.list();
      const docAccount = accounts.find((a) => a.username === 'doctor');
      expect(docAccount?.failedLoginAttempts).toBe(0);
      expect(docAccount?.lockedUntil).toBeNull();

      // Immediately succeeds on the correct portal
      const validStaff = await login('doctor', 'Doctor@123', 'staff');
      expect(validStaff.success).toBe(true);
      expect(validStaff.code).toBe('success');
    });

    it('enforces lockout after 5 consecutive failed password attempts', async () => {
      // Attempt 5 incorrect passwords on doctor account
      for (let i = 0; i < 4; i++) {
        const res = await login('doctor', 'WrongPass@1', 'staff');
        expect(res.code).toBe('invalid');
      }

      // 5th attempt locks the account
      const fifthRes = await login('doctor', 'WrongPass@1', 'staff');
      expect(fifthRes.code).toBe('locked');
      expect(fifthRes.error).toContain('Account locked due to 5 failed attempts');

      // Subsequent attempt with correct password is still rejected as locked
      const lockedRes = await login('doctor', 'Doctor@123', 'staff');
      expect(lockedRes.code).toBe('locked');
      expect(lockedRes.error).toContain('temporarily locked');
    });
  });
});

