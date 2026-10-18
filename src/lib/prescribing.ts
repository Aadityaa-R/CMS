/**
 * Clinic Management System - Prescribing Engine
 *
 * Notice: The formulary, medication dosages, and allergy rules contained in this
 * application are demonstration data only and do not constitute clinical guidance.
 */

import {
  Medicine,
  Prescription,
  PrescriptionItem,
  FrequencyOption,
  TimingOption,
  AllergenRule,
  AllergyCheckResult,
  DuplicateWarning,
  DrugClass,
  MedicineForm,
} from '../types/prescribing';

/**
 * Standard allergen rules mapping common reported allergies to formulary drug classes
 * and individual generic/brand names.
 *
 * Note: Demo rules. A clinician should review them.
 */
export const ALLERGEN_RULES: AllergenRule[] = [
  {
    allergenKey: 'penicillin',
    targetClasses: ['antibiotic'],
    targetMedicines: [
      'amoxicillin',
      'amoxicillin trihydrate',
      'penicillin',
      'ampicillin',
      'augmentin',
      'piperacillin',
    ],
    warningMessage: 'Allergy match: Penicillin cross-reactivity with penicillin-class antibiotics.',
  },
  {
    allergenKey: 'sulfa',
    targetClasses: ['antibiotic'],
    targetMedicines: [
      'sulfamethoxazole',
      'trimethoprim',
      'bactrim',
      'septra',
      'sulfamethoxazole and trimethoprim',
    ],
    warningMessage: 'Allergy match: Sulfa allergy match with sulfonamide medications.',
  },
  {
    allergenKey: 'sulfonamide',
    targetClasses: ['antibiotic'],
    targetMedicines: [
      'sulfamethoxazole',
      'trimethoprim',
      'bactrim',
      'septra',
      'sulfamethoxazole and trimethoprim',
    ],
    warningMessage: 'Allergy match: Sulfonamide allergy match with sulfonamide medications.',
  },
  {
    allergenKey: 'aspirin',
    targetClasses: ['analgesic'],
    targetMedicines: [
      'aspirin',
      'ibuprofen',
      'naproxen',
      'naproxen sodium',
      'diclofenac',
      'meloxicam',
      'celecoxib',
    ],
    warningMessage: 'Allergy match: Aspirin cross-reactivity with NSAID class analgesics.',
  },
  {
    allergenKey: 'nsaid',
    targetClasses: ['analgesic'],
    targetMedicines: [
      'aspirin',
      'ibuprofen',
      'naproxen',
      'naproxen sodium',
      'diclofenac',
      'meloxicam',
      'celecoxib',
    ],
    warningMessage: 'Allergy match: NSAID allergy cross-reactivity.',
  },
];

/**
 * Format timing and frequency into natural language phrase.
 */
function formatFrequencyTiming(freq: FrequencyOption, timing: TimingOption): string {
  const f = freq.toLowerCase();
  switch (timing) {
    case 'Morning':
      return `${f} in the morning`;
    case 'Evening':
      return `${f} in the evening`;
    case 'Before food':
      return `${f} before food`;
    case 'After food':
      return `${f} after food`;
    case 'With food':
      return `${f} with food`;
    case 'Any time':
    default:
      return f;
  }
}

/**
 * Format a single prescription item into a standardized human-readable sentence.
 * Used identically across Doctor view, printable prescription, and patient portal.
 *
 * Example:
 * "Amlodipine Besylate 5 mg tablet, 1 tablet, once daily in the morning, for 30 days, 0 refills."
 */
export function formatRegimen(item: PrescriptionItem): string {
  if (item.legacyText && item.legacyText.trim()) {
    return item.legacyText.trim();
  }

  const name = (item.medicineName || item.customName || 'Medication').trim();
  const strength = item.strength ? item.strength.trim() : '';
  const form = item.form ? item.form.toLowerCase().trim() : 'unit';

  const medHeader = strength ? `${name} ${strength} ${form}` : `${name} ${form}`;

  const doseAmount = item.dose?.amount ?? 1;
  const doseUnit = (item.dose?.unit || form).toLowerCase().trim();
  const doseStr = `${doseAmount} ${doseUnit}`;

  const freqTimingStr = formatFrequencyTiming(item.frequency || 'Once daily', item.timing || 'Any time');

  const durationStr = item.duration === 'Ongoing'
    ? 'for ongoing'
    : (item.duration?.toLowerCase().startsWith('for ') ? item.duration : `for ${item.duration || '30 days'}`);
  const refillsCount = item.refills ?? 0;
  const refillsStr = `${refillsCount} ${refillsCount === 1 ? 'refill' : 'refills'}`;

  return `${medHeader}, ${doseStr}, ${freqTimingStr}, ${durationStr}, ${refillsStr}.`;
}

/**
 * Calculate total quantity required based on dose amount, daily frequency, and duration.
 */
export function calculateQuantity(
  doseAmount: number,
  frequency: FrequencyOption,
  duration: string
): number {
  const dosesPerDay: Record<FrequencyOption, number> = {
    'Once daily': 1,
    'Twice daily': 2,
    'Three times daily': 3,
    'Four times daily': 4,
    'Every 8 hours': 3,
    'At bedtime': 1,
    'As needed': 1,
  };

  const multiplier = dosesPerDay[frequency] || 1;
  const cleanAmount = Math.max(0.25, Number(doseAmount) || 1);

  if (duration === 'Ongoing') {
    // Standard 30-day baseline dispense for ongoing regimens
    return Math.ceil(cleanAmount * multiplier * 30);
  }

  const match = duration.match(/(\d+)/);
  const days = match ? parseInt(match[1], 10) : 30;

  return Math.max(1, Math.ceil(cleanAmount * multiplier * days));
}

/**
 * Validate an individual prescription item.
 */
export function validateItem(item: Partial<PrescriptionItem>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const isCustom = item.medicineId === '__other__';
  if (isCustom) {
    if (!item.customName || item.customName.trim().length < 2) {
      errors.push('Custom medicine name is required (at least 2 characters).');
    }
  } else if (!item.medicineId || !item.medicineId.trim()) {
    errors.push('Medicine selection is required.');
  }

  if (!item.strength || !item.strength.trim()) {
    errors.push('Strength is required.');
  }

  if (!item.dose || item.dose.amount <= 0) {
    errors.push('Dose amount must be greater than zero.');
  }

  if (!item.frequency) {
    errors.push('Dosing frequency is required.');
  }

  if (!item.duration || !item.duration.trim()) {
    errors.push('Duration is required.');
  }

  if (item.refills !== undefined && (item.refills < 0 || item.refills > 3)) {
    errors.push('Refills must be between 0 and 3.');
  }

  if (item.instructions && item.instructions.length > 200) {
    errors.push('Instructions must not exceed 200 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete prescription prior to issue.
 */
export function validatePrescription(params: {
  diagnosis: string;
  items: PrescriptionItem[];
  patientId: string;
  doctorId: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.diagnosis || params.diagnosis.trim().length < 3) {
    errors.push('Clinical diagnosis is required (at least 3 characters).');
  }

  if (!params.patientId) {
    errors.push('Patient selection is required.');
  }

  if (!params.doctorId) {
    errors.push('Issuing doctor is required.');
  }

  if (!params.items || params.items.length === 0) {
    errors.push('At least one medication is required.');
  } else if (params.items.length > 10) {
    errors.push('A prescription cannot contain more than 10 medications.');
  }

  // Validate each item
  const seenMedicines = new Set<string>();
  params.items.forEach((item, idx) => {
    const itemValidation = validateItem(item);
    if (!itemValidation.valid) {
      errors.push(`Item ${idx + 1}: ${itemValidation.errors.join(' ')}`);
    }

    const medKey =
      item.medicineId === '__other__'
        ? `custom:${(item.customName || '').trim().toLowerCase()}`
        : `id:${item.medicineId}`;

    if (seenMedicines.has(medKey)) {
      errors.push(`Duplicate medicine: "${item.medicineName || item.customName}" appears more than once.`);
    }
    seenMedicines.add(medKey);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check prescribed items against the patient's recorded allergies.
 *
 * Notice: The allergy check is an aid: it warns and requires a reason to override.
 * It is not a substitute for clinical judgment.
 */
export function checkAllergies(
  allergies: string[],
  items: PrescriptionItem[],
  formulary: Medicine[]
): AllergyCheckResult[] {
  const results: AllergyCheckResult[] = [];
  if (!allergies || allergies.length === 0 || !items || items.length === 0) {
    return results;
  }

  const formularyMap = new Map<string, Medicine>();
  formulary.forEach((m) => formularyMap.set(m.id, m));

  for (const rawAllergy of allergies) {
    const cleanAllergy = rawAllergy.trim().toLowerCase();
    if (!cleanAllergy || cleanAllergy === 'none' || cleanAllergy === 'none recorded') {
      continue;
    }

    // Locate matching rule in ALLERGEN_RULES
    const rule = ALLERGEN_RULES.find((r) => {
      const k = r.allergenKey.toLowerCase();
      return cleanAllergy.includes(k) || k.includes(cleanAllergy);
    });

    if (!rule) {
      // Unmapped allergen: explicit clinician manual check notice
      results.push({
        allergen: rawAllergy.trim(),
        medicine: 'All prescribed items',
        message: `Patient is allergic to ${rawAllergy.trim()}. Check manually.`,
        isCustomRule: true,
      });
      continue;
    }

    // Check each prescribed medication against rule
    for (const item of items) {
      let isMatch = false;
      let matchedMedicineName = item.medicineName || item.customName || 'Custom medication';

      if (item.medicineId === '__other__') {
        const customLower = (item.customName || '').toLowerCase();
        if (rule.targetMedicines?.some((tm) => customLower.includes(tm.toLowerCase()))) {
          isMatch = true;
        }
      } else {
        let med = formularyMap.get(item.medicineId);
        if (!med && item.medicineName) {
          med = formulary.find(
            (m) => m.genericName.toLowerCase() === item.medicineName?.toLowerCase()
          );
        }
        if (med) {
          matchedMedicineName = med.genericName;
          const genericLower = med.genericName.toLowerCase();

          // Check drug class match
          if (rule.targetClasses && rule.targetClasses.includes(med.drugClass)) {
            // If rule has specific target medicines, check those; otherwise class match applies
            if (rule.targetMedicines && rule.targetMedicines.length > 0) {
              if (rule.targetMedicines.some((tm) => genericLower.includes(tm.toLowerCase()))) {
                isMatch = true;
              }
            } else {
              isMatch = true;
            }
          }

          // Check direct name match
          if (!isMatch && rule.targetMedicines) {
            if (rule.targetMedicines.some((tm) => genericLower.includes(tm.toLowerCase()))) {
              isMatch = true;
            }
            if (
              !isMatch &&
              med.brandNames?.some((bn) =>
                rule.targetMedicines?.some((tm) => bn.toLowerCase().includes(tm.toLowerCase()))
              )
            ) {
              isMatch = true;
            }
          }
        } else if (item.medicineName) {
          const nameLower = item.medicineName.toLowerCase();
          if (rule.targetMedicines?.some((tm) => nameLower.includes(tm.toLowerCase()))) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        results.push({
          allergen: rawAllergy.trim(),
          medicine: matchedMedicineName,
          message: rule.warningMessage || `Allergy match: ${rawAllergy.trim()}`,
        });
      }
    }
  }

  return results;
}

/**
 * Check for duplicate medicines or overlapping therapeutic drug classes.
 *
 * Checks:
 * 1. Against the patient's existing active, non-cancelled prescriptions.
 * 2. Intra-prescription duplicates within the new items list.
 */
export function checkDuplicates(
  items: PrescriptionItem[],
  activePrescriptionsOrFormulary?: Prescription[] | Medicine[],
  formularyParam?: Medicine[],
  nowParam: Date = new Date()
): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = [];
  if (!items || items.length === 0) return warnings;

  let activePrescriptions: Prescription[] = [];
  let formulary: Medicine[] = [];
  let now = nowParam;

  if (Array.isArray(activePrescriptionsOrFormulary)) {
    if (
      activePrescriptionsOrFormulary.length > 0 &&
      ('items' in activePrescriptionsOrFormulary[0] || 'prescriptionNumber' in activePrescriptionsOrFormulary[0])
    ) {
      activePrescriptions = activePrescriptionsOrFormulary as Prescription[];
      formulary = formularyParam || [];
    } else {
      formulary = (activePrescriptionsOrFormulary as Medicine[]) || [];
      activePrescriptions = [];
    }
  }

  const formularyMap = new Map<string, Medicine>();
  formulary.forEach((m) => formularyMap.set(m.id, m));

  const getMedClass = (item: PrescriptionItem): DrugClass | undefined => {
    if (item.medicineId && item.medicineId !== '__other__') {
      const m = formularyMap.get(item.medicineId);
      if (m) return m.drugClass;
    }
    const name = (item.medicineName || item.customName || '').toLowerCase();
    const m = formulary.find((x) => x.genericName.toLowerCase() === name);
    return m?.drugClass;
  };

  const getCleanName = (item: PrescriptionItem): string => {
    if (item.medicineId && item.medicineId !== '__other__') {
      const m = formularyMap.get(item.medicineId);
      if (m) return m.genericName;
    }
    return (item.medicineName || item.customName || '').trim();
  };

  // 1. Check against active prescriptions currently taken by the patient
  if (activePrescriptions.length > 0) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    for (const rx of activePrescriptions) {
      if (rx.status === 'cancelled') continue;

      const issueDate = new Date(rx.date || now);
      issueDate.setHours(0, 0, 0, 0);

      for (const activeItem of rx.items) {
        // Expiration check
        const duration = activeItem.duration || '30 days';
        if (duration !== 'Ongoing') {
          const match = duration.match(/(\d+)/);
          const days = match ? parseInt(match[1], 10) : 30;
          const expiryDate = new Date(issueDate);
          expiryDate.setDate(expiryDate.getDate() + days);
          if (today >= expiryDate) {
            continue; // Course has finished
          }
        }

        const activeName = getCleanName(activeItem);
        const activeClass = getMedClass(activeItem);

        for (const item of items) {
          const newName = getCleanName(item);
          const newClass = getMedClass(item);

          if (newName && activeName && newName.toLowerCase() === activeName.toLowerCase()) {
            warnings.push({
              type: 'same_medicine',
              medicine: newName,
              message: `Patient is already actively taking ${activeName}.`,
            });
          } else if (newClass && activeClass && newClass === activeClass) {
            warnings.push({
              type: 'same_class',
              medicine: newName,
              message: `Patient is already taking ${activeName} in therapeutic class "${newClass}".`,
            });
          }
        }
      }
    }
  }

  // 2. Intra-prescription duplicates within the new items list
  const seenMeds = new Map<string, string>();
  const seenClasses = new Map<DrugClass, string[]>();

  for (const item of items) {
    const medName = getCleanName(item);
    const medKey =
      item.medicineId === '__other__'
        ? `custom:${medName.toLowerCase()}`
        : `id:${item.medicineId}`;

    if (seenMeds.has(medKey)) {
      warnings.push({
        type: 'same_medicine',
        medicine: medName,
        message: `Duplicate medicine: ${medName} is prescribed more than once.`,
      });
    } else {
      seenMeds.set(medKey, medName);
    }

    const dClass = getMedClass(item);
    if (dClass) {
      const existingInClass = seenClasses.get(dClass) || [];
      if (existingInClass.length > 0 && !existingInClass.includes(medName)) {
        warnings.push({
          type: 'same_class',
          medicine: medName,
          message: `Duplicate class: Multiple medications in class ${dClass} (${[...existingInClass, medName].join(', ')}).`,
        });
      }
      existingInClass.push(medName);
      seenClasses.set(dClass, existingInClass);
    }
  }

  return warnings;
}

/**
 * Pure calculation to determine active medications for a patient.
 *
 * An item is active if:
 * 1. The parent prescription has status === 'active' (or legacy active statuses).
 * 2. The item has duration === 'Ongoing', OR (prescription issue date + duration in days) >= now (calendar day comparison).
 *
 * Cancelled prescriptions never count.
 */
export function activeMedications(
  patientId: string,
  prescriptions: Prescription[],
  now: Date
): string[] {
  if (!prescriptions || prescriptions.length === 0) return [];

  const nowDateStr = now.toISOString().split('T')[0];
  const nowTime = new Date(`${nowDateStr}T23:59:59.999Z`).getTime();

  const activeMeds = new Set<string>();

  for (const rx of prescriptions) {
    if (rx.patientId !== patientId) continue;
    // Cancelled prescriptions strictly never count
    if (rx.status === 'cancelled') continue;

    const rxDate = rx.date ? new Date(`${rx.date}T00:00:00.000Z`) : now;

    for (const item of rx.items) {
      let isActive = false;

      if (item.duration === 'Ongoing') {
        isActive = true;
      } else {
        const match = (item.duration || '').match(/(\d+)/);
        const days = match ? parseInt(match[1], 10) : 30;
        const expiryTime = rxDate.getTime() + days * 24 * 60 * 60 * 1000;

        if (nowTime <= expiryTime) {
          isActive = true;
        }
      }

      if (isActive) {
        const name = (item.medicineName || item.customName || '').trim();
        if (name) {
          activeMeds.add(name);
        }
      }
    }
  }

  return Array.from(activeMeds);
}

/**
 * Best-effort legacy prescription migration function.
 * Transforms existing seed prescriptions into modern M8 structured prescriptions.
 * Unparsable items preserve legacy text in `legacyText`.
 */
export function migrateLegacyPrescription(
  legacy: any,
  formulary: Medicine[] = []
): Prescription {
  const formularyMap = new Map<string, Medicine>();
  (formulary || []).forEach((m) => {
    formularyMap.set(m.genericName.toLowerCase(), m);
  });

  const rawItemList = legacy.items || legacy.medicines || [];
  const migratedItems: PrescriptionItem[] = rawItemList.map((it: any, idx: number) => {
    if (typeof it === 'string') {
      let parsedName = it;
      const matched = (formulary || []).find((m) =>
        it.toLowerCase().startsWith(m.genericName.toLowerCase())
      );
      if (matched) {
        parsedName = matched.genericName;
      }
      return {
        id: `migrated-${idx}-${Date.now()}`,
        medicineId: matched ? matched.id : '__other__',
        customName: matched ? undefined : it,
        medicineName: parsedName,
        strength: matched ? (matched.strengths[0] || '') : '',
        form: (matched ? matched.form : 'Tablet') as MedicineForm,
        route: matched ? matched.defaultRoute : 'Oral',
        dose: { amount: 1, unit: 'tablet' },
        frequency: 'Once daily' as const,
        timing: 'Any time' as const,
        duration: '30 days',
        quantity: 30,
        refills: 0,
        instructions: '',
        legacyText: it,
      };
    }

    const rawName = (it.medicineName || '').trim();
    const matchedMed = formularyMap.get(rawName.toLowerCase());

    // Extract dosage / strength
    const dosageStr = (it.dosage || '').trim();
    const strength = dosageStr || (matchedMed ? matchedMed.strengths[0] : 'Standard');

    // Parse frequency
    let frequency: FrequencyOption = 'Once daily';
    let timing: TimingOption = 'Any time';
    const freqRaw = (it.frequency || '').toLowerCase();

    if (freqRaw.includes('twice')) frequency = 'Twice daily';
    else if (freqRaw.includes('three times')) frequency = 'Three times daily';
    else if (freqRaw.includes('four times')) frequency = 'Four times daily';
    else if (freqRaw.includes('8 hours')) frequency = 'Every 8 hours';
    else if (freqRaw.includes('bedtime')) {
      frequency = 'At bedtime';
      timing = 'Evening';
    } else if (freqRaw.includes('as needed') || freqRaw.includes('prn')) frequency = 'As needed';

    if (freqRaw.includes('morning')) timing = 'Morning';
    else if (freqRaw.includes('evening') || freqRaw.includes('night')) timing = 'Evening';
    else if (freqRaw.includes('meal') || freqRaw.includes('food')) timing = 'With food';

    const duration = it.duration && it.duration !== 'PRN' ? it.duration : '30 days';
    const form = matchedMed ? matchedMed.form : ('Tablet' as const);
    const route = matchedMed ? matchedMed.defaultRoute : 'Oral';
    const doseUnit = form.toLowerCase();

    const quantity = calculateQuantity(1, frequency, duration);

    return {
      id: it.id || `migrated-it-${idx + 1}`,
      medicineId: matchedMed ? matchedMed.id : '__other__',
      customName: matchedMed ? undefined : rawName,
      medicineName: matchedMed ? matchedMed.genericName : rawName,
      dosage: dosageStr,
      strength,
      form,
      route,
      dose: { amount: 1, unit: doseUnit },
      frequency,
      timing,
      duration,
      quantity,
      refills: 0,
      instructions: it.instructions || '',
      dispensed: it.dispensed,
      legacyText: undefined,
    };
  });

  const isCancelled = legacy.status === 'cancelled';

  return {
    id: legacy.id,
    prescriptionNumber: legacy.prescriptionNumber,
    patientId: legacy.patientId,
    patientName: legacy.patientName,
    doctorId: legacy.doctorId,
    doctorName: legacy.doctorName,
    appointmentId: legacy.appointmentId,
    visitId: legacy.visitId,
    date: legacy.date,
    diagnosis: legacy.diagnosis,
    items: migratedItems,
    status: isCancelled ? 'cancelled' : 'active',
    cancelledBy: legacy.cancelledBy,
    cancelledAt: legacy.cancelledAt,
    cancelReason: legacy.cancelReason,
    allergyOverrides: legacy.allergyOverrides || [],
    dispensedBy: legacy.dispensedBy,
    dispensedAt: legacy.dispensedAt,
  };
}

