import { describe, it, expect } from 'vitest';
import { checkAllergies } from '../src/lib/prescribing';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { PrescriptionItem } from '../src/types/prescribing';

describe('Allergy Checking Engine (M9.5 Requirement G)', () => {
  const amoxItem: PrescriptionItem = {
    id: 'it-amox',
    medicineId: 'med-23',
    medicineName: 'Amoxicillin Trihydrate',
    strength: '500 mg',
    form: 'Capsule',
    route: 'Oral',
    dose: { amount: 1, unit: 'capsule' },
    frequency: 'Three times daily',
    timing: 'After food',
    duration: '10 days',
    quantity: 30,
    refills: 0,
    instructions: '',
  };

  const sulfaItem: PrescriptionItem = {
    id: 'it-sulfa',
    medicineId: 'med-28',
    medicineName: 'Sulfamethoxazole and Trimethoprim',
    strength: '800 mg / 160 mg',
    form: 'Tablet',
    route: 'Oral',
    dose: { amount: 1, unit: 'tablet' },
    frequency: 'Twice daily',
    timing: 'After food',
    duration: '10 days',
    quantity: 20,
    refills: 0,
    instructions: '',
  };

  const ibuprofenItem: PrescriptionItem = {
    id: 'it-ibu',
    medicineId: 'med-30',
    medicineName: 'Ibuprofen',
    strength: '400 mg',
    form: 'Tablet',
    route: 'Oral',
    dose: { amount: 1, unit: 'tablet' },
    frequency: 'Three times daily',
    timing: 'With food',
    duration: '5 days',
    quantity: 15,
    refills: 0,
    instructions: '',
  };

  const amlodipineItem: PrescriptionItem = {
    id: 'it-aml',
    medicineId: 'med-1',
    medicineName: 'Amlodipine Besylate',
    strength: '5 mg',
    form: 'Tablet',
    route: 'Oral',
    dose: { amount: 1, unit: 'tablet' },
    frequency: 'Once daily',
    timing: 'Morning',
    duration: '30 days',
    quantity: 30,
    refills: 0,
    instructions: '',
  };

  it('separates matches from unchecked allergies', () => {
    // Penicillin has rule match with Amoxicillin. Peanuts has no rule.
    const result = checkAllergies(['Penicillin', 'Peanuts'], [amoxItem], INITIAL_FORMULARY);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].allergen).toBe('Penicillin');
    expect(result.matches[0].medicine).toBe('Amoxicillin Trihydrate');
    expect(result.unchecked).toEqual(['Peanuts']);
  });

  it('detects Sulfa and NSAID class cross-reactivity matches', () => {
    const sulfaResult = checkAllergies(['Sulfa'], [sulfaItem], INITIAL_FORMULARY);
    expect(sulfaResult.matches.length).toBe(1);
    expect(sulfaResult.matches[0].allergen).toBe('Sulfa');
    expect(sulfaResult.unchecked.length).toBe(0);

    const aspirinResult = checkAllergies(['Aspirin'], [ibuprofenItem], INITIAL_FORMULARY);
    expect(aspirinResult.matches.length).toBe(1);
    expect(aspirinResult.matches[0].allergen).toBe('Aspirin');
    expect(aspirinResult.matches[0].medicine).toBe('Ibuprofen');
    expect(aspirinResult.unchecked.length).toBe(0);
  });

  it('places unmapped allergies in unchecked list without creating matches', () => {
    const result = checkAllergies(['Peanuts', 'Latex'], [amlodipineItem], INITIAL_FORMULARY);
    expect(result.matches.length).toBe(0);
    expect(result.unchecked).toEqual(['Peanuts', 'Latex']);
  });

  it('ignores none and none recorded entries', () => {
    const result1 = checkAllergies(['None'], [amoxItem], INITIAL_FORMULARY);
    expect(result1.matches.length).toBe(0);
    expect(result1.unchecked.length).toBe(0);

    const result2 = checkAllergies(['none recorded'], [amoxItem], INITIAL_FORMULARY);
    expect(result2.matches.length).toBe(0);
    expect(result2.unchecked.length).toBe(0);
  });

  it('matches allergy equal to drug name with case and punctuation variations', () => {
    const ciproItem: PrescriptionItem = {
      id: 'it-cipro',
      medicineId: 'med-26',
      medicineName: 'Ciprofloxacin Hydrochloride',
      strength: '500 mg',
      form: 'Tablet',
      route: 'Oral',
      dose: { amount: 1, unit: 'tablet' },
      frequency: 'Twice daily',
      timing: 'After food',
      duration: '7 days',
      quantity: 14,
      refills: 0,
      instructions: '',
    };

    // Punctuation variant
    const resPunctuation = checkAllergies(['Cipro-floxacin'], [ciproItem], INITIAL_FORMULARY);
    expect(resPunctuation.matches.length).toBe(1);
    expect(resPunctuation.matches[0].medicine).toBe('Ciprofloxacin Hydrochloride');
    expect(resPunctuation.unchecked.length).toBe(0);

    // Case variant
    const resCase = checkAllergies(['CIPROFLOXACIN'], [ciproItem], INITIAL_FORMULARY);
    expect(resCase.matches.length).toBe(1);
    expect(resCase.matches[0].medicine).toBe('Ciprofloxacin Hydrochloride');
    expect(resCase.unchecked.length).toBe(0);
  });

  it('matches custom medicines by name', () => {
    const customItem: PrescriptionItem = {
      id: 'it-custom-1',
      medicineId: '__other__',
      customName: 'Compounded Nifedipine Paste',
      strength: '2%',
      form: 'Cream',
      route: 'Topical',
      dose: { amount: 1, unit: 'application' },
      frequency: 'Once daily',
      timing: 'Any time',
      duration: '14 days',
      quantity: 1,
      refills: 0,
      instructions: '',
    };

    const res = checkAllergies(['Nifedipine'], [customItem], INITIAL_FORMULARY);
    expect(res.matches.length).toBe(1);
    expect(res.matches[0].allergen).toBe('Nifedipine');
    expect(res.matches[0].medicine).toBe('Compounded Nifedipine Paste');
    expect(res.unchecked.length).toBe(0);
  });
});
