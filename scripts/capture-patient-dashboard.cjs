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
  console.log('Saved:', path.basename(filePath));
}

async function setViewport(ws, width, height, mobile = false) {
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await new Promise((r) => setTimeout(r, 300));
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

    // Clear storage and sign in as patient Eleanor Wright
    await setViewport(ws, 1440, 900, false);
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?as=patient' });
    await new Promise((r) => setTimeout(r, 1000));

    await evaluate(ws, `
      localStorage.clear();
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

    // Ensure we are on appointments / dashboard tab
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?tab=appointments' });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture Patient Dashboard at 1920, 768, 360
    await setViewport(ws, 1920, 1080, false);
    await captureScreen(ws, outDir, 'patient-dashboard-1920.png');
    await captureScreen(ws, outDir, 'patient-portal-1920.png');
    await captureScreen(ws, outDir, 'patient-dashboard-1920x1080.png');

    await setViewport(ws, 768, 1024, false);
    await captureScreen(ws, outDir, 'patient-dashboard-768.png');
    await captureScreen(ws, outDir, 'patient-portal-768.png');
    await captureScreen(ws, outDir, 'patient-dashboard-768x1024.png');

    await setViewport(ws, 360, 800, true);
    await captureScreen(ws, outDir, 'patient-dashboard-360.png');
    await captureScreen(ws, outDir, 'patient-portal-360.png');
    await captureScreen(ws, outDir, 'patient-dashboard-360x800.png');

    ws.close();
    console.log('Patient dashboard screenshots captured successfully.');
  } finally {
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
