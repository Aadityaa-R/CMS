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

async function setTheme(ws, theme) {
  await evaluate(ws, `
    if ('${theme}' === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cms_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cms_theme', 'light');
    }
  `);
  await new Promise((r) => setTimeout(r, 200));
}

async function captureScreen(ws, outDir, name) {
  const { data } = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const filePath = path.join(outDir, `${name}-1440x900.png`);
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  console.log('Saved:', path.basename(filePath));
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
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Login Screen
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000' });
    await new Promise((r) => setTimeout(r, 1500));
    await setTheme(ws, 'light');
    await captureScreen(ws, outDir, 'login-light');
    await setTheme(ws, 'dark');
    await captureScreen(ws, outDir, 'login-dark');

    // 2. Sign Up Screen
    await evaluate(ws, `
      const signupBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Register as a New Patient'));
      if (signupBtn) signupBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 600));
    await setTheme(ws, 'light');
    await captureScreen(ws, outDir, 'signup-light');
    await setTheme(ws, 'dark');
    await captureScreen(ws, outDir, 'signup-dark');

    // 3. Log in as Managing Director (Dr. Marcus Vance)
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000' });
    await new Promise((r) => setTimeout(r, 1000));
    await evaluate(ws, `
      const idInput = document.querySelector('input[type="text"], input:not([type="password"])');
      const passInput = document.querySelector('input[type="password"]');
      if (idInput && passInput) {
        idInput.value = 'm.vance@beaconclinic.com';
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.value = 'AdminPass123!';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    `);
    await new Promise((r) => setTimeout(r, 2000));

    // Screens list for MD & Staff
    const views = [
      { tab: 'dashboard', subtab: '', name: 'dashboard' },
      { tab: 'doctor', subtab: 'overview', name: 'doctor-consultation' },
      { tab: 'doctor', subtab: 'patients', name: 'doctor-patients' },
      { tab: 'doctor', subtab: 'prescriptions', name: 'doctor-prescriptions' },
      { tab: 'role_receptionist', subtab: 'lounge', name: 'reception-lounge' },
      { tab: 'role_receptionist', subtab: 'appointments', name: 'reception-appointments' },
      { tab: 'role_receptionist', subtab: 'patients', name: 'reception-patients' },
      { tab: 'role_receptionist', subtab: 'registry', name: 'reception-registry' },
      { tab: 'billing', subtab: 'invoices', name: 'billing-invoices' },
      { tab: 'billing', subtab: 'payments', name: 'billing-payments' },
      { tab: 'access_control', subtab: 'modules', name: 'admin-roles' },
      { tab: 'access_control', subtab: 'edit_users', name: 'admin-users' },
      { tab: 'access_control', subtab: 'ledger', name: 'admin-ledger' },
      { tab: 'access_control', subtab: 'formulary', name: 'admin-formulary' },
      { tab: 'access_control', subtab: 'data', name: 'admin-data' },
      { tab: 'attendance', subtab: 'my_attendance', name: 'attendance-my' },
      { tab: 'attendance', subtab: 'sheet', name: 'attendance-sheet' },
    ];

    for (const v of views) {
      const url = `http://localhost:3000/?tab=${v.tab}${v.subtab ? '&subtab=' + v.subtab : ''}`;
      await sendCommand(ws, 'Page.navigate', { url });
      await new Promise((r) => setTimeout(r, 800));

      await setTheme(ws, 'light');
      await captureScreen(ws, outDir, `${v.name}-light`);

      await setTheme(ws, 'dark');
      await captureScreen(ws, outDir, `${v.name}-dark`);
    }

    // 4. Log out and log in as Patient (Sarah Jenkins)
    await evaluate(ws, `
      localStorage.clear();
    `);
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000' });
    await new Promise((r) => setTimeout(r, 1000));
    await evaluate(ws, `
      const idInput = document.querySelector('input[type="text"], input:not([type="password"])');
      const passInput = document.querySelector('input[type="password"]');
      if (idInput && passInput) {
        idInput.value = 's.jenkins@example.com';
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.value = 'PatientPass123!';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    `);
    await new Promise((r) => setTimeout(r, 2000));
    await setTheme(ws, 'light');
    await captureScreen(ws, outDir, 'patient-portal-light');
    await setTheme(ws, 'dark');
    await captureScreen(ws, outDir, 'patient-portal-dark');

    // 5. Test 200% zoom / 320 CSS pixels responsive check
    console.log('Testing 320px viewport for sideways scroll...');
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 640,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 500));
    const hasHorizontalOverflow = await evaluate(ws, `
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    `);
    console.log('320px horizontal overflow check:', hasHorizontalOverflow ? 'FAIL' : 'PASS (0 sideways scroll)');

    ws.close();
    console.log('All screenshots captured successfully.');
  } finally {
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
