// Unit test for clinical triage vitals reference markers
// Requirement 6: systolic 160 shows "High", heart rate 50 shows "Low", normal values show no marker

const NORMAL_VITAL_RANGES = {
  systolicBp: { min: 90, max: 139 },
  diastolicBp: { min: 60, max: 89 },
  heartRateBpm: { min: 60, max: 100 },
  oxygenSaturationPct: { min: 95, max: 100 },
  temperatureCelsius: { min: 36.0, max: 37.9 },
};

const getVitalLabel = (baseLabel, value, range) => {
  if (!value || !value.trim()) return baseLabel;
  const num = Number(value);
  if (isNaN(num)) return baseLabel;
  if (num < range.min) return `${baseLabel} Low`;
  if (num > range.max) return `${baseLabel} High`;
  return baseLabel;
};

let passed = 0;
let failed = 0;

function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: "${actual}" === "${expected}"`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected "${expected}", received "${actual}"`);
    failed++;
  }
}

console.log('Running Vitals Markers Test Suite...\n');

// 1. Systolic 160 should show "High"
assertEqual(
  'Systolic BP 160 -> High',
  getVitalLabel('BP Systolic (mmHg)', '160', NORMAL_VITAL_RANGES.systolicBp),
  'BP Systolic (mmHg) High'
);

// 2. Heart rate 50 should show "Low"
assertEqual(
  'Heart Rate 50 -> Low',
  getVitalLabel('Heart Rate (bpm)', '50', NORMAL_VITAL_RANGES.heartRateBpm),
  'Heart Rate (bpm) Low'
);

// 3. Normal systolic 120 should show no marker
assertEqual(
  'Normal Systolic BP 120 -> No marker',
  getVitalLabel('BP Systolic (mmHg)', '120', NORMAL_VITAL_RANGES.systolicBp),
  'BP Systolic (mmHg)'
);

// 4. Normal heart rate 72 should show no marker
assertEqual(
  'Normal Heart Rate 72 -> No marker',
  getVitalLabel('Heart Rate (bpm)', '72', NORMAL_VITAL_RANGES.heartRateBpm),
  'Heart Rate (bpm)'
);

// 5. Boundary tests: Systolic 139 (max normal) -> no marker
assertEqual(
  'Systolic BP 139 (upper boundary) -> No marker',
  getVitalLabel('BP Systolic (mmHg)', '139', NORMAL_VITAL_RANGES.systolicBp),
  'BP Systolic (mmHg)'
);

// 6. Boundary tests: Systolic 90 (lower boundary) -> no marker
assertEqual(
  'Systolic BP 90 (lower boundary) -> No marker',
  getVitalLabel('BP Systolic (mmHg)', '90', NORMAL_VITAL_RANGES.systolicBp),
  'BP Systolic (mmHg)'
);

// 7. Diastolic 95 -> High
assertEqual(
  'Diastolic BP 95 -> High',
  getVitalLabel('BP Diastolic (mmHg)', '95', NORMAL_VITAL_RANGES.diastolicBp),
  'BP Diastolic (mmHg) High'
);

// 8. Diastolic 55 -> Low
assertEqual(
  'Diastolic BP 55 -> Low',
  getVitalLabel('BP Diastolic (mmHg)', '55', NORMAL_VITAL_RANGES.diastolicBp),
  'BP Diastolic (mmHg) Low'
);

console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
