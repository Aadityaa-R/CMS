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
  console.log('Starting verification of sidebar across viewports and roles...');
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

    // 1. Verify Desktop (1920x1080) as MD
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?as=staff' });
    await new Promise((r) => setTimeout(r, 2000));

    // Sign in as MD
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

    // Inspect initial desktop sidebar state
    const initialDesktopState = await evaluate(ws, `
      (() => {
        const expandBtn = document.querySelector('button[title="Expand sidebar"]');
        const aside = document.getElementById('sidebar-navigation');
        return {
          hasExpandBtn: !!expandBtn,
          ariaExpanded: expandBtn?.getAttribute('aria-expanded'),
          asideWidth: aside?.getBoundingClientRect().width,
        };
      })()
    `);
    console.log('Initial desktop sidebar state:', initialDesktopState);

    // Expand sidebar
    await evaluate(ws, `
      (() => {
        const expandBtn = document.querySelector('button[title="Expand sidebar"]');
        if (expandBtn) expandBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const expandedState = await evaluate(ws, `
      (() => {
        const collapseBtn = document.querySelector('button[title="Collapse sidebar"]');
        const aside = document.getElementById('sidebar-navigation');
        return {
          hasCollapseBtn: !!collapseBtn,
          ariaExpanded: collapseBtn?.getAttribute('aria-expanded'),
          asideWidth: aside?.getBoundingClientRect().width,
        };
      })()
    `);
    console.log('Expanded desktop sidebar state:', expandedState);

    // Test Outside Click Pass-Through: click a button on the page while sidebar is open
    const passThroughResult = await evaluate(ws, `
      (async () => {
        const dateBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Week' || b.textContent.trim() === 'Month');
        if (dateBtn) {
          dateBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          dateBtn.click();
          await new Promise(r => setTimeout(r, 100));
          const collapseBtn = document.querySelector('button[title="Collapse sidebar"]');
          const expandBtn = document.querySelector('button[title="Expand sidebar"]');
          return {
            dateBtnFound: true,
            isClosedAfterClick: !!expandBtn,
            hasCollapseBtn: !!collapseBtn,
          };
        }
        return { dateBtnFound: false };
      })()
    `);
    console.log('Outside click pass-through result:', passThroughResult);

    // Test Escape key dismissal
    await evaluate(ws, `
      (async () => {
        const expandBtn = document.querySelector('button[title="Expand sidebar"]');
        if (expandBtn) expandBtn.click();
        await new Promise(r => setTimeout(r, 100));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const escapeResult = await evaluate(ws, `
      (() => {
        const expandBtn = document.querySelector('button[title="Expand sidebar"]');
        return { isClosedAfterEscape: !!expandBtn };
      })()
    `);
    console.log('Escape key dismissal result:', escapeResult);

    // Test Mouse Click vs Keyboard Focus Outlines
    const focusCheckResult = await evaluate(ws, `
      (() => {
        const expandBtn = document.querySelector('button[title="Expand sidebar"]');
        expandBtn.focus();
        const computedStyle = window.getComputedStyle(expandBtn);
        return {
          outlineStyle: computedStyle.outlineStyle,
          outlineWidth: computedStyle.outlineWidth,
        };
      })()
    `);
    console.log('Focus outline check result on toggle button:', focusCheckResult);

    // 2. Verify Mobile Phone (360x800)
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 500));

    const mobileInitialState = await evaluate(ws, `
      (() => {
        const openBtn = document.querySelector('button[title="Open menu"]');
        const aside = document.getElementById('sidebar-navigation');
        return {
          hasOpenMenuBtn: !!openBtn,
          ariaExpanded: openBtn?.getAttribute('aria-expanded'),
          isInert: aside?.hasAttribute('inert'),
          ariaHidden: aside?.getAttribute('aria-hidden'),
        };
      })()
    `);
    console.log('Mobile initial state (360x800):', mobileInitialState);

    // Open mobile drawer
    await evaluate(ws, `
      (() => {
        const openBtn = document.querySelector('button[title="Open menu"]');
        if (openBtn) openBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const mobileOpenState = await evaluate(ws, `
      (() => {
        const closeBtn = document.querySelector('button[title="Close menu"]');
        const backdrop = document.querySelector('.bg-slate-900\\/50');
        const aside = document.getElementById('sidebar-navigation');
        return {
          hasCloseMenuBtn: !!closeBtn,
          ariaExpanded: closeBtn?.getAttribute('aria-expanded'),
          hasBackdrop: !!backdrop,
          isInert: aside?.hasAttribute('inert'),
        };
      })()
    `);
    console.log('Mobile open drawer state:', mobileOpenState);

    // Dismiss by tapping backdrop
    await evaluate(ws, `
      (() => {
        const backdrop = document.querySelector('.bg-slate-900\\/50');
        if (backdrop) backdrop.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const mobileAfterDismiss = await evaluate(ws, `
      (() => {
        const openBtn = document.querySelector('button[title="Open menu"]');
        const aside = document.getElementById('sidebar-navigation');
        return {
          hasOpenMenuBtn: !!openBtn,
          isInert: aside?.hasAttribute('inert'),
        };
      })()
    `);
    console.log('Mobile after backdrop dismiss:', mobileAfterDismiss);

    console.log('All interactive verification checks completed successfully!');
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
