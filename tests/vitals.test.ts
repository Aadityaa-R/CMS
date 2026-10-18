import { describe, it, expect } from 'vitest';
import {
  NORMAL_VITAL_RANGES,
  getVitalMarker,
  getVitalLabel,
} from '../src/lib/vitals';

describe('Clinical Triage Vitals Reference Ranges (M9.5 Requirement H)', () => {
  describe('Systolic Blood Pressure (90-139 mmHg)', () => {
    const range = NORMAL_VITAL_RANGES.systolicBp;

    it('identifies normal, boundary, low, and high values', () => {
      expect(getVitalMarker(120, range)).toBeNull();
      expect(getVitalMarker(90, range)).toBeNull(); // Lower boundary
      expect(getVitalMarker(139, range)).toBeNull(); // Upper boundary
      expect(getVitalMarker(89, range)).toBe('Low');
      expect(getVitalMarker(140, range)).toBe('High');
      expect(getVitalMarker(160, range)).toBe('High');
      expect(getVitalMarker(75, range)).toBe('Low');
    });

    it('applies label suffix correctly', () => {
      expect(getVitalLabel('BP Systolic (mmHg)', 160, range)).toBe('BP Systolic (mmHg) High');
      expect(getVitalLabel('BP Systolic (mmHg)', 80, range)).toBe('BP Systolic (mmHg) Low');
      expect(getVitalLabel('BP Systolic (mmHg)', 120, range)).toBe('BP Systolic (mmHg)');
    });
  });

  describe('Diastolic Blood Pressure (60-89 mmHg)', () => {
    const range = NORMAL_VITAL_RANGES.diastolicBp;

    it('identifies normal, boundary, low, and high values', () => {
      expect(getVitalMarker(80, range)).toBeNull();
      expect(getVitalMarker(60, range)).toBeNull(); // Lower boundary
      expect(getVitalMarker(89, range)).toBeNull(); // Upper boundary
      expect(getVitalMarker(59, range)).toBe('Low');
      expect(getVitalMarker(90, range)).toBe('High');
      expect(getVitalMarker(95, range)).toBe('High');
      expect(getVitalMarker(55, range)).toBe('Low');
    });

    it('applies label suffix correctly', () => {
      expect(getVitalLabel('BP Diastolic (mmHg)', 95, range)).toBe('BP Diastolic (mmHg) High');
      expect(getVitalLabel('BP Diastolic (mmHg)', 55, range)).toBe('BP Diastolic (mmHg) Low');
      expect(getVitalLabel('BP Diastolic (mmHg)', 75, range)).toBe('BP Diastolic (mmHg)');
    });
  });

  describe('Heart Rate (60-100 bpm)', () => {
    const range = NORMAL_VITAL_RANGES.heartRateBpm;

    it('identifies normal, boundary, low, and high values', () => {
      expect(getVitalMarker(72, range)).toBeNull();
      expect(getVitalMarker(60, range)).toBeNull(); // Lower boundary
      expect(getVitalMarker(100, range)).toBeNull(); // Upper boundary
      expect(getVitalMarker(59, range)).toBe('Low');
      expect(getVitalMarker(50, range)).toBe('Low');
      expect(getVitalMarker(101, range)).toBe('High');
      expect(getVitalMarker(115, range)).toBe('High');
    });

    it('applies label suffix correctly', () => {
      expect(getVitalLabel('Heart Rate (bpm)', 50, range)).toBe('Heart Rate (bpm) Low');
      expect(getVitalLabel('Heart Rate (bpm)', 110, range)).toBe('Heart Rate (bpm) High');
      expect(getVitalLabel('Heart Rate (bpm)', 72, range)).toBe('Heart Rate (bpm)');
    });
  });

  describe('Oxygen Saturation (95-100 %)', () => {
    const range = NORMAL_VITAL_RANGES.oxygenSaturationPct;

    it('identifies normal, boundary, and low values including decimals', () => {
      expect(getVitalMarker(98, range)).toBeNull();
      expect(getVitalMarker(95, range)).toBeNull(); // Lower boundary
      expect(getVitalMarker(100, range)).toBeNull(); // Upper boundary
      expect(getVitalMarker(94.9, range)).toBe('Low');
      expect(getVitalMarker(92, range)).toBe('Low');
      expect(getVitalMarker(100.1, range)).toBe('High');
    });
  });

  describe('Temperature (36.0-37.9 Celsius)', () => {
    const range = NORMAL_VITAL_RANGES.temperatureCelsius;

    it('identifies normal, boundary, low, and high decimal values', () => {
      expect(getVitalMarker(36.8, range)).toBeNull();
      expect(getVitalMarker(36.0, range)).toBeNull(); // Lower boundary
      expect(getVitalMarker(37.9, range)).toBeNull(); // Upper boundary
      expect(getVitalMarker(35.9, range)).toBe('Low');
      expect(getVitalMarker(38.0, range)).toBe('High');
      expect(getVitalMarker(39.2, range)).toBe('High');
      expect(getVitalMarker(35.5, range)).toBe('Low');
    });
  });

  describe('Invalid and Non-Numeric Inputs', () => {
    const range = NORMAL_VITAL_RANGES.systolicBp;

    it('gracefully returns null / base label for invalid inputs', () => {
      expect(getVitalMarker('', range)).toBeNull();
      expect(getVitalMarker('   ', range)).toBeNull();
      expect(getVitalMarker(null, range)).toBeNull();
      expect(getVitalMarker(undefined, range)).toBeNull();
      expect(getVitalMarker('abc', range)).toBeNull();
      expect(getVitalMarker('n/a', range)).toBeNull();

      expect(getVitalLabel('Test Label', '', range)).toBe('Test Label');
      expect(getVitalLabel('Test Label', null, range)).toBe('Test Label');
      expect(getVitalLabel('Test Label', 'invalid', range)).toBe('Test Label');
    });
  });
});
