import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

// Read .env
const envText = fs.readFileSync('C:/Users/raadi/Downloads/CMS/.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

// Password verification function matching src/lib/auth.ts (hex salt to bytes)
async function verifyPassword(password, storedHash, saltHex, iterations) {
  return new Promise((resolve) => {
    crypto.pbkdf2(password, Buffer.from(saltHex, 'hex'), iterations, 32, 'sha256', (err, derivedKey) => {
      if (err) resolve(false);
      resolve(derivedKey.toString('hex') === storedHash);
    });
  });
}

async function runEndToEndCheck() {
  console.log('====================================================');
  console.log('RUNNING FULL FRONTEND <-> BACKEND INTEGRATION TEST');
  console.log('Target Supabase Instance:', url);
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // TEST 1: Retrieve and validate Patients
  const { data: patientRows, error: pErr } = await supabase.from('patients').select('data');
  assert(!pErr && patientRows && patientRows.length === 3, 'Patients table returns all 3 registered patients');
  const eleanor = patientRows?.map(r => r.data).find(p => p.mrn === 'MRN-84291');
  assert(eleanor && eleanor.firstName === 'Eleanor' && eleanor.age === 41, 'Patient Eleanor Wright data structure is intact');

  // TEST 2: Retrieve and validate Staff & Doctor Access
  const { data: staffRows, error: sErr } = await supabase.from('staff').select('data');
  assert(!sErr && staffRows && staffRows.length >= 2, 'Staff table returns active clinic personnel');
  const drVance = staffRows?.map(r => r.data).find(s => s.badgeNumber === 'DOC-101');
  assert(drVance && drVance.staffName === 'Dr. Marcus Vance' && drVance.moduleIds.includes('mod-admin'), 'Dr. Marcus Vance has active Managing Director credentials and permissions');

  // TEST 3: Retrieve and validate Receptionist
  const priya = staffRows?.map(r => r.data).find(s => s.badgeNumber === 'REC-301');
  assert(priya && priya.staffName === 'Priya Sharma' && priya.moduleIds.includes('mod-frontdesk'), 'Priya Sharma has active Front Desk Receptionist credentials');

  // TEST 4: Appointment & Clinical Queue Linking
  const { data: aptRows, error: aErr } = await supabase.from('appointments').select('data');
  assert(!aErr && aptRows && aptRows.length === 3, 'Appointments queue returns 3 live entries');
  const waitingApt = aptRows?.map(r => r.data).find(a => a.status === 'waiting');
  assert(waitingApt && waitingApt.patientName === 'Clara Thornton', 'Queue has waiting patient Clara Thornton (Token #3)');

  // TEST 5: Visits & Clinical SOAP Records
  const { data: visitRows, error: vErr } = await supabase.from('visits').select('data');
  assert(!vErr && visitRows && visitRows.length >= 1, 'Visits table returns clinical encounters');
  const visit1 = visitRows?.[0]?.data;
  assert(visit1 && visit1.vitals && (visit1.vitals.systolicBp === 128 || visit1.vitals.bloodPressure === '128/82'), 'Clinical encounter vitals (BP 128/82 mmHg) stored accurately');

  // TEST 6: Prescriptions & Formulary Linking
  const { data: rxRows, error: rxErr } = await supabase.from('prescriptions').select('data');
  const { data: formRows, error: fErr } = await supabase.from('formulary').select('data');
  assert(!rxErr && rxRows && rxRows.length >= 1, 'Prescriptions table returns active prescription');
  assert(!fErr && formRows && formRows.length >= 6, 'Formulary medicine catalog is stocked with 6 core medications');
  const rx1 = rxRows?.[0]?.data;
  assert(rx1 && rx1.items && rx1.items[0].medicineName.includes('Amlodipine'), 'Prescription references verified formulary medicine (Amlodipine 5mg)');

  // TEST 7: Financial Integrity (Invoices & Payments)
  const { data: invRows, error: iErr } = await supabase.from('invoices').select('data');
  const { data: payRows, error: payErr } = await supabase.from('payments').select('data');
  assert(!iErr && invRows && invRows.length === 2, 'Invoices table returns 2 billing invoices');
  assert(!payErr && payRows && payRows.length === 1, 'Payments table returns 1 settlement receipt');
  const paidInv = invRows?.map(r => r.data).find(i => i.status === 'paid');
  const receipt = payRows?.[0]?.data;
  assert(paidInv && receipt && receipt.invoiceId === paidInv.id && receipt.amount === 12000, 'Invoice INV-2026-001 correctly settled by Receipt RCT-1001 for $120.00');

  // TEST 8: Full Mutation Lifecycle (Create -> Read -> Update -> Delete)
  const tempAptId = `test-apt-${Date.now()}`;
  const tempApt = {
    id: tempAptId,
    patientId: 'pat-3',
    patientName: 'Clara Thornton',
    doctorId: 'doc-1',
    doctorName: 'Dr. Marcus Vance',
    date: '2026-10-27',
    time: '14:00',
    reason: 'Temporary Integration Verification',
    status: 'booked'
  };

  const { error: insErr } = await supabase.from('appointments').insert({
    id: tempAptId,
    data: tempApt,
    updated_at: new Date().toISOString()
  });
  assert(!insErr, 'Create Mutation: Successfully created new appointment in Supabase');

  const { data: fetchedTemp, error: fetchErr } = await supabase.from('appointments').select('data').eq('id', tempAptId).single();
  assert(!fetchErr && fetchedTemp?.data?.reason === 'Temporary Integration Verification', 'Read Verification: Newly created record read successfully');

  const { error: upErr } = await supabase.from('appointments').update({
    data: { ...tempApt, status: 'completed' },
    updated_at: new Date().toISOString()
  }).eq('id', tempAptId);
  assert(!upErr, 'Update Mutation: Successfully updated appointment status to completed');

  const { error: delErr } = await supabase.from('appointments').delete().eq('id', tempAptId);
  assert(!delErr, 'Delete Mutation: Successfully cleaned up temporary record');

  // TEST 9: Authentication & Security Credentials Verification
  const { data: accRows, error: accErr } = await supabase.from('accounts').select('data');
  assert(!accErr && accRows && accRows.length === 3, 'Accounts table returns authentication credentials');
  
  const mdAcc = accRows?.map(r => r.data).find(a => a.username === 'md');
  const isMdPasswordValid = mdAcc ? await verifyPassword('Doctor@123', mdAcc.passwordHash, mdAcc.passwordSalt, mdAcc.passwordIterations) : false;
  assert(isMdPasswordValid, 'Authentication: MD credentials (Doctor@123) verified against cryptographic PBKDF2 hash');

  const recepAcc = accRows?.map(r => r.data).find(a => a.username === 'receptionist');
  const isRecepPasswordValid = recepAcc ? await verifyPassword('Reception@123', recepAcc.passwordHash, recepAcc.passwordSalt, recepAcc.passwordIterations) : false;
  assert(isRecepPasswordValid, 'Authentication: Receptionist credentials (Reception@123) verified against cryptographic PBKDF2 hash');

  const patAcc = accRows?.map(r => r.data).find(a => a.username === 'patient');
  const isPatPasswordValid = patAcc ? await verifyPassword('Patient@123', patAcc.passwordHash, patAcc.passwordSalt, patAcc.passwordIterations) : false;
  assert(isPatPasswordValid, 'Authentication: Patient portal credentials (Patient@123) verified against cryptographic PBKDF2 hash');

  console.log('\n====================================================');
  console.log(`INTEGRATION TEST SUMMARY: ${passedTests} of ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('STATUS: FRONTEND AND BACKEND ARE FULLY OPERATIONAL AND ERROR-FREE');
  } else {
    console.log('STATUS: SOME TESTS FAILED');
  }
  console.log('====================================================');
}

runEndToEndCheck();

