import { describe, it, expect } from 'vitest';
import { formatDoctorName } from '../src/lib/doctorNames';
import { formatCurrency, migrateConsultationFee, toCents } from '../src/lib/money';

describe('Names and Money Engine (M9.5 Requirement E)', () => {
  describe('formatDoctorName', () => {
    it('never doubles "Dr." when prefix already exists', () => {
      expect(formatDoctorName('Dr. Marcus Vance')).toBe('Dr. Marcus Vance');
      expect(formatDoctorName('Dr. Dr. Marcus Vance')).toBe('Dr. Marcus Vance');
      expect(formatDoctorName('Dr Marcus Vance')).toBe('Dr. Marcus Vance');
      expect(formatDoctorName('Doctor Marcus Vance')).toBe('Dr. Marcus Vance');
      expect(formatDoctorName('Dr. Doctor Marcus Vance')).toBe('Dr. Marcus Vance');
    });

    it('adds "Dr." when no prefix is present', () => {
      expect(formatDoctorName('Marcus Vance')).toBe('Dr. Marcus Vance');
      expect(formatDoctorName('Nathan Hayes')).toBe('Dr. Nathan Hayes');
      expect(formatDoctorName('Clara Reed')).toBe('Dr. Clara Reed');
    });

    it('handles object inputs with name property', () => {
      expect(formatDoctorName({ name: 'Dr. Clara Reed' })).toBe('Dr. Clara Reed');
      expect(formatDoctorName({ name: 'Clara Reed' })).toBe('Dr. Clara Reed');
      expect(formatDoctorName({ name: '' })).toBe('');
    });

    it('handles edge cases gracefully', () => {
      expect(formatDoctorName(null)).toBe('');
      expect(formatDoctorName(undefined)).toBe('');
      expect(formatDoctorName('')).toBe('');
      expect(formatDoctorName('   ')).toBe('');
      expect(formatDoctorName('   Dr.   Marcus Vance   ')).toBe('Dr. Marcus Vance');
    });
  });

  describe('formatCurrency', () => {
    it('formats integer minor units (cents/paisa) to standard currency string', () => {
      expect(formatCurrency(12000)).toBe('₹120.00');
      expect(formatCurrency(9050)).toBe('₹90.50');
      expect(formatCurrency(0)).toBe('₹0.00');
      expect(formatCurrency(-500)).toBe('-₹5.00');
      expect(formatCurrency(99)).toBe('₹0.99');
      expect(formatCurrency(5)).toBe('₹0.05');
      expect(formatCurrency(1234567)).toBe('₹12,345.67');
    });

    it('handles invalid or non-numeric values safely', () => {
      expect(formatCurrency(null as unknown as number)).toBe('₹0.00');
      expect(formatCurrency(undefined as unknown as number)).toBe('₹0.00');
      expect(formatCurrency(NaN)).toBe('₹0.00');
    });
  });

  describe('migrateConsultationFee', () => {
    it('migrates legacy dollar amounts to integer cents', () => {
      expect(migrateConsultationFee(120)).toBe(12000);
      expect(migrateConsultationFee(90)).toBe(9000);
      expect(migrateConsultationFee(150)).toBe(15000);
    });

    it('preserves existing amounts already in cents', () => {
      expect(migrateConsultationFee(12000)).toBe(12000);
      expect(migrateConsultationFee(9000)).toBe(9000);
      expect(migrateConsultationFee(11000)).toBe(11000);
    });

    it('handles edge cases safely', () => {
      expect(migrateConsultationFee(0)).toBe(0);
      expect(migrateConsultationFee(null)).toBe(0);
      expect(migrateConsultationFee(undefined)).toBe(0);
      expect(migrateConsultationFee(NaN)).toBe(0);
    });
  });

  describe('toCents', () => {
    it('rounds numbers to nearest integer minor unit', () => {
      expect(toCents(120.4)).toBe(120);
      expect(toCents(120.6)).toBe(121);
      expect(toCents(null as unknown as number)).toBe(0);
      expect(toCents(undefined as unknown as number)).toBe(0);
      expect(toCents(NaN)).toBe(0);
    });
  });
});

