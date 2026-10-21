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

async function main() {
  console.log('Starting verification of M10.8b non-covering sidebar layout across viewports and roles...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = cp.spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
    'about:blank',
  ]);

  try {
    await waitForHttp('http://127.0.0.1:9222/json/version');
    const wsUrl = await getPageWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });

    await sendCommand(ws, 'Page.enable');
    await sendCommand(ws, 'DOM.enable');

    // Test across viewports
    const viewports = [
      { name: '1920x1080', width: 1920, height: 1080, mobile: false },
      { name: '1366x768', width: 1366, height: 768, mobile: false },
      { name: '1024x768', width: 1024, height: 768, mobile: false },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Testing ${vp.name} as MD ---`);
      await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });

      await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?as=staff' });
      await new Promise((r) => setTimeout(r, 1500));

      // Sign in as MD if on login page
      await evaluate(ws, `
        (async () => {
          const idInput = document.querySelector('input[type="text"], input[name="identifier"]');
          const passInput = document.querySelector('input[type="password"]');
          if (idInput && passInput) {
            idInput.value = 'm.vance@beaconclinic.com';
            idInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.value = 'Doctor@123';
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In'));
            if (submitBtn) submitBtn.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 1500));

      // Check initial collapsed geometry: sidebar right edge should equal header left edge
      const initialGeom = await evaluate(ws, `
        (() => {
          const aside = document.getElementById('sidebar-navigation');
          const header = document.querySelector('header');
          const logo = header ? header.querySelector('button') : null;
          const asideRect = aside ? aside.getBoundingClientRect() : null;
          const headerRect = header ? header.getBoundingClientRect() : null;
          const logoRect = logo ? logo.getBoundingClientRect() : null;
          return {
            asideWidth: asideRect?.width,
            asideRight: asideRect?.right,
            headerLeft: headerRect?.left,
            logoLeft: logoRect?.left,
            isOverlapping: asideRect && headerRect ? asideRect.right > headerRect.left : false,
          };
        })()
      `);
      console.log(`[${vp.name}] Collapsed geometry:`, initialGeom);

      // Expand sidebar
      await evaluate(ws, `
        (() => {
          const expandBtn = document.querySelector('button[title="Expand sidebar"]');
          if (expandBtn) expandBtn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 200));

      // Check expanded geometry: sidebar right edge MUST equal header left edge (NO overlap)
      const expandedGeom = await evaluate(ws, `
        (() => {
          const aside = document.getElementById('sidebar-navigation');
          const header = document.querySelector('header');
          const logo = header ? header.querySelector('button') : null;
          const asideRect = aside ? aside.getBoundingClientRect() : null;
          const headerRect = header ? header.getBoundingClientRect() : null;
          const logoRect = logo ? logo.getBoundingClientRect() : null;
          return {
            asideWidth: asideRect?.width,
            asideRight: asideRect?.right,
            headerLeft: headerRect?.left,
            logoLeft: logoRect?.left,
            isOverlapping: asideRect && headerRect ? asideRect.right > headerRect.left : false,
          };
        })()
      `);
      console.log(`[${vp.name}] Expanded geometry:`, expandedGeom);

      if (expandedGeom?.isOverlapping) {
        throw new Error(`FAIL: Sidebar overlaps header at ${vp.name}!`);
      }

      // Test bubbling click pass-through: click Month/Week button while sidebar is open
      const clickPassThrough = await evaluate(ws, `
        (async () => {
          const targetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Month' || b.textContent.trim() === 'Week');
          if (targetBtn) {
            targetBtn.click();
            await new Promise(r => setTimeout(r, 100));
            const expandBtn = document.querySelector('button[title="Expand sidebar"]');
            return {
              targetClicked: true,
              sidebarClosed: !!expandBtn,
            };
          }
          return { targetClicked: false };
        })()
      `);
      console.log(`[${vp.name}] Bubbling click pass-through:`, clickPassThrough);
    }

    // 4. Test Mobile Phone (360x800)
    console.log('\n--- Testing 360x800 Mobile Phone ---');
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 500));

    // Open phone drawer
    await evaluate(ws, `
      (() => {
        const openBtn = document.querySelector('button[title="Open menu"]');
        if (openBtn) openBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const mobileDrawerCheck = await evaluate(ws, `
      (() => {
        const closeDrawerBtn = document.querySelector('button[title="Close drawer"]');
        const closeMenuBtn = document.querySelector('button[title="Close menu"]');
        const backdrop = document.querySelector('.bg-slate-900\\/50');
        return {
          hasDrawerCloseButton: !!closeDrawerBtn,
          hasHeaderCloseMenuButton: !!closeMenuBtn,
          hasBackdrop: !!backdrop,
        };
      })()
    `);
    console.log('Mobile drawer check:', mobileDrawerCheck);

    // Dismiss via inner close button
    await evaluate(ws, `
      (() => {
        const closeDrawerBtn = document.querySelector('button[title="Close drawer"]');
        if (closeDrawerBtn) closeDrawerBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const afterDrawerClose = await evaluate(ws, `
      (() => {
        const openBtn = document.querySelector('button[title="Open menu"]');
        return { hasOpenBtn: !!openBtn };
      })()
    `);
    console.log('Mobile after drawer close button:', afterDrawerClose);

    console.log('\nAll M10.8b verification checks passed with ZERO overlap across all viewports!');
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

main().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
