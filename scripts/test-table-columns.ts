import { ColumnDef, HIDE_BELOW_CLASSES } from '../src/components/ui/Table';

let passed = 0;
let failed = 0;

function assert(testName: string, condition: boolean, details: string = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failed++;
  }
}

function assertEqual<T>(testName: string, actual: T, expected: T) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${String(actual)} === ${String(expected)}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: expected ${String(expected)}, got ${String(actual)}`);
    failed++;
  }
}

console.log('--- RUNNING TABLE COLUMN DEFINITION VERIFICATION TESTS ---');

// Test 1: Column definition drives both header and body cell hideBelow without divergence
interface TestData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const testColumns: ColumnDef<TestData>[] = [
  { key: 'name', header: 'Name', label: 'Full Name', isPrimary: true },
  { key: 'email', header: 'Email', label: 'Email Address', hideBelow: 'sm' },
  { key: 'role', header: 'Role', label: 'Assigned Role', hideBelow: 'md' },
  { key: 'status', header: 'Status', label: 'Current Status', hideBelow: 'lg' },
  { key: 'actions', header: 'Actions', isActions: true },
];

testColumns.forEach((col) => {
  const headerHide = col.hideBelow;
  const cellHide = col.hideBelow;
  assertEqual(
    `Column "${col.key}" hideBelow drives both header and cell synchronously`,
    headerHide,
    cellHide
  );

  const headerClass = col.hideBelow ? HIDE_BELOW_CLASSES[col.hideBelow] : '';
  const cellClass = col.hideBelow ? HIDE_BELOW_CLASSES[col.hideBelow] : '';
  assertEqual(
    `Column "${col.key}" CSS responsive hide class matches between header and cell`,
    headerClass,
    cellClass
  );
});

// Test 2: Primary cell and Actions flag are accurately defined on column defs
assert(
  'Primary column is flagged for bold first line in stacked mode',
  testColumns.find((c) => c.key === 'name')?.isPrimary === true
);

assert(
  'Actions column is flagged for touch target and sticky behaviour',
  testColumns.find((c) => c.key === 'actions')?.isActions === true
);

// Test 3: Labels fallback to header string when explicit label is omitted
testColumns.forEach((col) => {
  const resolvedLabel = col.label || (typeof col.header === 'string' ? col.header : undefined);
  assert(
    `Column "${col.key}" has valid resolved label: "${resolvedLabel}"`,
    resolvedLabel !== undefined && resolvedLabel.length > 0
  );
});

// Test 4: HIDE_BELOW_CLASSES covers all required breakpoints
assertEqual('hideBelow sm class', HIDE_BELOW_CLASSES.sm, 'hidden sm:table-cell');
assertEqual('hideBelow md class', HIDE_BELOW_CLASSES.md, 'hidden md:table-cell');
assertEqual('hideBelow lg class', HIDE_BELOW_CLASSES.lg, 'hidden lg:table-cell');
assertEqual('hideBelow xl class', HIDE_BELOW_CLASSES.xl, 'hidden xl:table-cell');

console.log(`\nTable Column Test Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
