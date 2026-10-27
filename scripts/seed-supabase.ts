import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env
const envText = fs.readFileSync('C:/Users/raadi/Downloads/CMS/.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or Key not found in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

// Import demo scenario generator
async function seedSupabase() {
  console.log('Connecting to Supabase at:', url);

  const { generateDemoScenario } = await import('../src/data/demoScenario.js').catch(async () => {
    // If running via tsx or bundle
    return await import('../src/data/demoScenario.ts');
  });

  const scenario = generateDemoScenario();

  const collections = [
    { table: 'accounts', items: scenario.accounts },
    { table: 'staff', items: scenario.staff },
    { table: 'patients', items: scenario.patients },
    { table: 'appointments', items: scenario.appointments },
    { table: 'prescriptions', items: scenario.prescriptions },
    { table: 'invoices', items: scenario.invoices },
    { table: 'patient_assignments', items: scenario.patientAssignments },
    { table: 'roles', items: scenario.modules },
    { table: 'approvals', items: scenario.pendingApprovals },
    { table: 'claim_requests', items: scenario.claimRequests },
    { table: 'attendance', items: scenario.attendanceRecords },
    { table: 'leave_requests', items: scenario.leaveRequests },
    { table: 'shifts', items: scenario.shifts },
    { table: 'ledger', items: scenario.ledger },
    { table: 'visits', items: scenario.visits },
    { table: 'payments', items: scenario.payments },
    { table: 'notifications', items: scenario.notifications },
    { table: 'formulary', items: scenario.formulary },
  ];

  for (const { table, items } of collections) {
    if (!items || items.length === 0) continue;
    console.log(`Seeding table '${table}' with ${items.length} records...`);
    const rows = items.map((item) => ({
      id: item.id,
      data: item,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from(table).upsert(rows);
    if (error) {
      console.error(`Error seeding '${table}':`, error.message);
    } else {
      console.log(`Successfully seeded '${table}'!`);
    }
  }

  console.log('Seeding process finished.');
}

seedSupabase().catch(console.error);

