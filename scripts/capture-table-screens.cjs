const http = require('http');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function waitForHttp(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve(true);
          else resolve(false);
        });
        req.on('error', () => resolve(false));
      });
      if (ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Timeout waiting for ' + url);
}

async function getPageWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const list = JSON.parse(data);
        const page = list.find((item) => item.type === 'page') || list[0];
        resolve(page.webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });
}

function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression) {
  const res = await sendCommand(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return res.result?.value;
}

async function captureScreen(ws, outDir, fileName) {
  const { data } = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  console.log('Saved:', fileName);
}

async function setViewport(ws, width, height, mobile = false) {
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await new Promise((r) => setTimeout(r, 400));
}

async function loginStaff(ws, username, password) {
  await evaluate(ws, `
    localStorage.clear();
    sessionStorage.clear();
  `);
  await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?as=staff' });
  await new Promise((r) => setTimeout(r, 1200));

  await evaluate(ws, `
    const idInput = document.querySelector('input[type="text"], input:not([type="password"])');
    const passInput = document.querySelector('input[type="password"]');
    if (idInput && passInput) {
      idInput.value = '${username}';
      idInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.value = '${password}';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  `);
  await new Promise((r) => setTimeout(r, 1800));
}

async function loginPatient(ws, username, password) {
  await evaluate(ws, `
    localStorage.clear();
    sessionStorage.clear();
  `);
  await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?as=patient' });
  await new Promise((r) => setTimeout(r, 1200));

  await evaluate(ws, `
    const idInput = document.querySelector('input[type="text"], input:not([type="password"])');
    const passInput = document.querySelector('input[type="password"]');
    if (idInput && passInput) {
      idInput.value = '${username}';
      idInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.value = '${password}';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  `);
  await new Promise((r) => setTimeout(r, 1800));
}

async function clickTabByText(ws, text) {
  await evaluate(ws, `
    const tabs = Array.from(document.querySelectorAll('nav[aria-label="Workstation Navigation"] button, nav button, [role="tab"]'));
    const target = tabs.find(t => t.innerText.trim().toLowerCase().includes('${text.toLowerCase()}'));
    if (target) target.click();
  `);
  await new Promise((r) => setTimeout(r, 800));
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const outDir = path.join(__dirname, '..', 'docs', 'final-screens');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const chromeProc = cp.spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  try {
    await waitForHttp('http://127.0.0.1:9222/json/version');
    const wsUrl = await getPageWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));

    await sendCommand(ws, 'Page.enable');
    await sendCommand(ws, 'Runtime.enable');

    console.log('--- CAPTURING DOCTOR VIEW SCREENS ---');
    await loginStaff(ws, 'm.vance@beaconclinic.com', 'AdminPass123!');
    // Select Workstation: Doctor Desk if in MD view
    await evaluate(ws, `
      const docBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Consultation Desk') || b.innerText.includes('Doctor'));
      if (docBtn) docBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 800));

    // Tab 1: Worklist
    await clickTabByText(ws, 'Worklist');
    await setViewport(ws, 1920, 1080, false);
    await captureScreen(ws, outDir, 'doctor-worklist-1920.png');
    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'doctor-worklist-360.png');

    // Tab 2: Patients
    await setViewport(ws, 1920, 1080, false);
    await clickTabByText(ws, 'Patients');
    await captureScreen(ws, outDir, 'doctor-patients-1920.png');
    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'doctor-patients-360.png');

    console.log('--- CAPTURING RECEPTIONIST VIEW SCREENS ---');
    await loginStaff(ws, 'e.clarke@beaconclinic.com', 'ReceptionPass123!');
    // Tab 1: Lounge
    await clickTabByText(ws, 'Lounge');
    await setViewport(ws, 1920, 1080, false);
    await captureScreen(ws, outDir, 'reception-lounge-1920.png');
    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'reception-lounge-360.png');

    // Tab 2: Appointments
    await setViewport(ws, 1920, 1080, false);
    await clickTabByText(ws, 'Appointments');
    await captureScreen(ws, outDir, 'reception-appointments-1920.png');
    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'reception-appointments-360.png');

    console.log('--- CAPTURING BILLING VIEW SCREENS ---');
    await loginStaff(ws, 'm.vance@beaconclinic.com', 'AdminPass123!');
    await evaluate(ws, `
      const billBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Billing') || b.innerText.includes('Cashier'));
      if (billBtn) billBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 800));
    await clickTabByText(ws, 'Invoices');
    await setViewport(ws, 1920, 1080, false);
    await captureScreen(ws, outDir, 'billing-invoices-1920.png');
    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'billing-invoices-360.png');

    console.log('--- CAPTURING PATIENT PORTAL SCREENS ---');
    await loginPatient(ws, 's.jenkins@example.com', 'PatientPass123!');
    await clickTabByText(ws, 'Appointments');
    await setViewport(ws, 1920, 1080, false);
    await captureScreen(ws, outDir, 'patient-portal-1920.png');
    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'patient-portal-360.png');

    ws.close();
    console.log('All screenshots captured successfully.');
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});

