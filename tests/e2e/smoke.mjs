// Browser smoke test: plays the real game in headless Chrome over the
// DevTools protocol and fails on anything a player or screen-reader user
// would hit. Needs the app running (php artisan serve) and Chrome installed.
//
//   npm run e2e                       # against http://127.0.0.1:8000
//   APP_URL=http://127.0.0.1:8770 npm run e2e
//   SHOTS=./shots npm run e2e         # also save screenshots
//   CHROME=/path/to/chrome npm run e2e
//
// Checks: zero axe-core violations on five screens, no console errors or
// uncaught exceptions, a won game files its score, phones get at most four
// columns, and Versus hides the score tile.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const BASE = (process.env.APP_URL || 'http://127.0.0.1:8000').replace(/\/?$/, '/');
const SHOTS = process.env.SHOTS || null;
// The test files a score. Never let it write "Smoke Test" onto the live board.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(BASE) && process.env.E2E_ALLOW_REMOTE !== '1') {
  console.error(`Refusing to run against ${BASE}: it files a score. Set E2E_ALLOW_REMOTE=1 to override.`);
  process.exit(2);
}
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(existsSync);
if (!CHROME) { console.error('Chrome not found; set CHROME'); process.exit(2); }
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9300 + Math.floor(Math.random() * 500);
const failures = [];
const fail = (msg) => { failures.push(msg); console.log('  ✗', msg); };
const pass = (msg) => console.log('  ✓', msg);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'lm-chrome-'))}`, 'about:blank',
], { stdio: 'ignore' });

let ws; let seq = 0;
const pending = new Map();
const consoleErrors = [];

async function connect() {
  for (let i = 0; i < 100; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        ws.onmessage = ({ data }) => {
          const m = JSON.parse(data);
          if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
          if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
          if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
          if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
        };
        return;
      }
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('Chrome did not start');
}

const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function shot(name) {
  if (!SHOTS) return;
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
}
const viewport = async (width, height, mobile = false) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
};
async function load(prefs = {}) {
  await send('Page.navigate', { url: BASE });
  await sleep(800);
  await js(`localStorage.clear(); localStorage.setItem('legal-memory-prefs', ${JSON.stringify(JSON.stringify({ sound: false, ...prefs }))}); true`);
  await send('Page.reload');
  await sleep(1200);
}
const click = (i) => js(`document.querySelectorAll('.card')[${i}].click(); true`);
const pairsByName = () => js(`Object.values([...document.querySelectorAll('.card')].reduce((m, c, i) => ((m[c.querySelector('.card-name').textContent] ||= []).push(i), m), {}))`);
async function solveIcons() { for (const [a, b] of await pairsByName()) { await click(a); await click(b); await sleep(220); } await sleep(1500); }
async function audit(label) {
  await js(`window.axe || document.head.appendChild(Object.assign(document.createElement('script'), { textContent: ${JSON.stringify(readFileSync(AXE, 'utf8'))} })); true`);
  const v = await js(`axe.run(document, { resultTypes: ['violations'] }).then(r => r.violations.map(v => v.impact + ' ' + v.id + ' (' + v.nodes.length + '): ' + v.nodes[0].target.join(' ')))`);
  v.length ? v.forEach((x) => fail(`axe [${label}] ${x}`)) : pass(`axe [${label}] no violations`);
}

try {
  await connect();
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

  console.log('Desktop');
  await viewport(1280, 1000);
  await load({ level: 'normal', mode: 'icons' });
  await shot('desktop-start');
  await audit('desktop start');

  await load({ level: 'easy', mode: 'icons' });
  await sleep(1800); // Easy previews every card first
  await solveIcons();
  (await js(`!document.getElementById('winOverlay').hidden`)) ? pass('easy game reaches the win dialog') : fail('win dialog did not open');
  await shot('desktop-win');
  await audit('win dialog');
  await js(`document.getElementById('nameInput').value = 'Smoke Test'; document.getElementById('submitForm').requestSubmit(); true`);
  await sleep(1500);
  const filed = await js(`document.getElementById('submitMsg').textContent`);
  /Filed!/.test(filed) ? pass(`score filed: "${filed}"`) : fail(`score not filed: "${filed}"`);

  await js(`document.getElementById('playAgainBtn').click(); true`);
  await sleep(2700); // preview again
  await js(`document.querySelectorAll('details').forEach(d => d.open = true); true`);
  await audit('panels open');

  await load({ level: 'normal', mode: 'icons', rules: 'computer' });
  (await js(`document.getElementById('scoreStat').offsetParent === null`)) ? pass('versus hides the score tile') : fail('score tile visible in versus');
  (await js(`/Counsel Bot/.test(document.getElementById('players').textContent)`)) ? pass('versus shows Counsel Bot') : fail('Counsel Bot missing');

  await load({ level: 'normal', mode: 'icons', theme: 'light' });
  await click(0); await sleep(300);
  await js(`document.getElementById('pauseBtn').click(); true`);
  await sleep(400);
  await shot('light-paused');
  await audit('light theme, paused');

  console.log('Phone');
  await viewport(390, 844, true);
  await load({ level: 'hard', mode: 'terms' });
  const cols = await js(`getComputedStyle(document.getElementById('gameBoard')).gridTemplateColumns.split(' ').length`);
  cols <= 4 ? pass(`hard board uses ${cols} columns on a phone`) : fail(`hard board uses ${cols} columns on a phone`);
  const overflow = await js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  overflow <= 0 ? pass('no horizontal scroll on a phone') : fail(`page scrolls sideways by ${overflow}px on a phone`);
  await shot('phone-hard-terms');

  await load({ level: 'easy', mode: 'icons' });
  await sleep(1800);
  await solveIcons();
  await shot('phone-win');
  await audit('phone win');

  consoleErrors.length ? consoleErrors.forEach((e) => fail(`console: ${e}`)) : pass('no console errors');
} catch (e) {
  fail(`driver error: ${e.message}`);
} finally {
  chrome.kill();
}

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll browser checks passed.');
process.exit(failures.length ? 1 : 0);
