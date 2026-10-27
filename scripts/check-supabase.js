import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env
const envText = fs.readFileSync('C:/Users/raadi/Downloads/CMS/.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or Key not found in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  'clinic_data',
  'accounts',
  'staff',
  'patients',
  'patient_assignments',
  'appointments',
  'visits',
  'prescriptions',
  'invoices',
  'payments',
  'attendance',
  'leave_requests',
  'shifts',
  'roles',
  'approvals',
  'claim_requests',
  'ledger',
  'notifications',
  'formulary'
];

async function checkBackend() {
  console.log('==============================================');
  console.log('Checking Supabase Backend Status...');
  console.log('Project URL:', url);
  console.log('==============================================');

  const results = [];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id', { head: false }).limit(1);
    if (error) {
      if (error.code === 'PGRST205') {
        results.push({ table, status: 'NOT_CREATED', details: 'Table does not exist' });
      } else {
        results.push({ table, status: 'ERROR', details: error.message });
      }
    } else {
      results.push({ table, status: 'READY', details: 'Table is active and accessible' });
    }
  }

  console.table(results);
}

checkBackend();
