// Headless DOM tests for public_html/js/game.js.
// Loads the real Blade template (with its few directives substituted) and the
// real script into jsdom, then plays through every mode with a faked clock
// and a faked fetch. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../../resources/views/game.blade.php', import.meta.url), 'utf8')
  .replace(/\{\{\s*config\('app\.name'\)\s*\}\}/g, 'Legal Memory Game')
  .replace(/\{\{\s*csrf_token\(\)\s*\}\}/g, 'test-token')
  .replace(/\{\{\s*asset\('([^']+)'\)\s*\}\}/g, '/$1')
  .replace(/<script[^>]*googletagmanager[^>]*><\/script>/, '')
  .replace(/<script src="\/js\/game\.js[^"]*" defer><\/script>/, '');
const script = readFileSync(new URL('../../public_html/js/game.js', import.meta.url), 'utf8');

function boot({ prefs = {}, scores = [], fetchFail = false } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;
  const requests = [];

  window.localStorage.setItem('legal-memory-prefs', JSON.stringify({ sound: false, ...prefs }));
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  window.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (fetchFail) throw new Error('offline');
    const u = new URL(url, 'https://example.test');
    if (u.pathname === '/api/scores' && (init.method || 'GET') === 'GET') return json({ scores });
    if (u.pathname === '/api/scores/summary') return json({ players: 3, avg_moves: 12.5, avg_time_ms: 40000, beat_percent: 66 });
    if (u.pathname === '/api/scores') return json({ score: 7000, rank: 2 }, 201);
    return json({}, 404);
  };
  window.navigator.clipboard = { writeText: async () => {} };
  const events = [];
  window.gtag = (kind, name, params) => { if (kind === 'event') events.push({ name, params }); };

  // Deterministic, controllable clock.
  let now = Date.now();
  const timers = [];
  let seq = 0;
  window.Date.now = () => now;
  window.setTimeout = (fn, ms = 0) => { const id = ++seq; timers.push({ id, at: now + ms, fn, every: null }); return id; };
  window.setInterval = (fn, ms) => { const id = ++seq; timers.push({ id, at: now + ms, fn, every: ms }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      now = due.at;
      if (due.every) due.at += due.every; else timers.splice(timers.indexOf(due), 1);
      due.fn();
    }
    now = end;
  };

  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.error || e.message));
  window.eval(script);

  const doc = window.document;
  const api = {
    window, doc, advance, requests, errors, events,
    cards: () => [...doc.querySelectorAll('.card')],
    text: (id) => doc.getElementById(id).textContent.trim(),
    click: (id) => doc.getElementById(id).click(),
    select: (id, value) => { const s = doc.getElementById(id); s.value = value; s.dispatchEvent(new window.Event('change')); },
    flush: async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); },
  };
  return api;
}

const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });


test('boots without errors and renders a normal icon board', () => {
  const g = boot();
  assert.deepEqual(g.errors, []);
  assert.equal(g.cards().length, 16);
  assert.equal(g.text('pairsTotal'), '8');
  assert.equal(g.text('scoreCount'), '8000');
});

test('a full classic game can be won and the win dialog offers to file the score', async () => {
  const g = boot({ prefs: { level: 'easy' } });
  g.advance(2000); // preview on easy
  // Easy icons: find pairs by name.
  const byName = new Map();
  g.cards().forEach((c) => { const k = c.querySelector('.card-name').textContent; (byName.get(k) || byName.set(k, []).get(k)).push(c); });
  for (const [a, b] of byName.values()) { a.click(); b.click(); g.advance(50); }
  g.advance(1000);
  await g.flush();
  assert.deepEqual(g.errors, []);
  assert.equal(g.text('pairsCount'), '6');
  assert.equal(g.text('movesCount'), '6');
  assert.equal(g.doc.getElementById('winOverlay').hidden, false);
  assert.equal(g.doc.getElementById('submitForm').hidden, false);
  assert.match(g.text('winText'), /6 moves/);
  assert.equal(g.doc.getElementById('winRecord').hidden, false);

  // Submit the score.
  g.doc.getElementById('nameInput').value = 'Tester';
  g.doc.getElementById('submitForm').dispatchEvent(new g.window.Event('submit', { cancelable: true }));
  await g.flush();
  const post = g.requests.find((r) => r.init.method === 'POST');
  assert.ok(post, 'score was posted');
  const body = JSON.parse(post.init.body);
  assert.equal(body.level, 'easy');
  assert.equal(body.moves, 6);
  assert.equal(post.init.headers['X-CSRF-TOKEN'], 'test-token');
  assert.match(g.text('submitMsg'), /rank #2/);
  assert.match(g.text('winCompare'), /66%/);
});

test('mismatches flip back, cost a move and reset the streak', () => {
  const g = boot();
  const cards = g.cards();
  const name = (c) => c.querySelector('.card-name').textContent;
  const a = cards[0];
  const b = cards.find((c) => name(c) !== name(a));
  a.click(); b.click();
  assert.equal(g.text('movesCount'), '1');
  assert.ok(a.classList.contains('is-flipped'));
  g.advance(1000);
  assert.ok(!a.classList.contains('is-flipped'));
  assert.equal(a.getAttribute('aria-label'), 'Face-down card');
});

test('hint reveals a pair briefly and adds two moves; three hints max', () => {
  const g = boot();
  g.click('hintBtn');
  assert.equal(g.text('movesCount'), '2');
  assert.equal(g.cards().filter((c) => c.classList.contains('is-hint')).length, 2);
  g.advance(1100);
  assert.equal(g.cards().filter((c) => c.classList.contains('is-hint')).length, 0);
  g.click('hintBtn'); g.advance(1100);
  g.click('hintBtn'); g.advance(1100);
  assert.equal(g.text('movesCount'), '6');
  assert.ok(g.doc.getElementById('hintBtn').disabled);
});

test('trial mode ends in a mistrial when the clock runs out', () => {
  const g = boot({ prefs: { rules: 'trial', level: 'normal' } });
  assert.equal(g.text('timerLabel'), 'Time left');
  g.cards()[0].click();
  g.advance(91_000);
  assert.deepEqual(g.errors, []);
  assert.equal(g.text('winTitle'), 'Mistrial!');
  assert.equal(g.doc.getElementById('submitForm').hidden, true);
});

test('terms deck pairs a term with its definition and lists missed terms for review', async () => {
  const g = boot({ prefs: { mode: 'terms', level: 'easy' } });
  g.advance(2000);
  assert.ok(g.doc.getElementById('gameBoard').classList.contains('board--terms'));
  const terms = g.cards().filter((c) => c.querySelector('.card-term'));
  const defs = g.cards().filter((c) => c.querySelector('.card-def'));
  assert.equal(terms.length, 6);
  assert.equal(defs.length, 6);
  // One deliberate miss, then solve by trying each term against each definition.
  terms[0].click(); defs.find((d) => true).click(); g.advance(1000);
  for (const t of terms) {
    for (const d of defs) {
      if (t.disabled) break;
      if (d.disabled) continue;
      t.click(); d.click(); g.advance(1000);
    }
  }
  g.advance(1000);
  await g.flush();
  assert.deepEqual(g.errors, []);
  assert.equal(g.text('pairsCount'), '6');
  assert.equal(g.doc.getElementById('review').hidden, false);
  assert.ok(g.doc.querySelectorAll('#reviewList li').length >= 1);
  // Lifetime misses were recorded for the focus feature.
  const weak = JSON.parse(g.window.localStorage.getItem('legal-memory-weak'));
  assert.ok(Object.keys(weak).some((k) => k.startsWith('terms:')));
});

test('versus against Counsel Bot plays to completion and declares a result', async () => {
  const g = boot({ prefs: { rules: 'computer', level: 'normal' } });
  assert.equal(g.doc.getElementById('players').hidden, false);
  assert.match(g.text('players'), /Counsel Bot/);
  // Human deliberately misses once so the bot gets a turn, then let the bot and
  // a naive human alternate until the board is cleared.
  const name = (c) => c.querySelector('.card-name').textContent;
  let guard = 400;
  while (Number(g.text('pairsCount')) < 8 && guard-- > 0) {
    const hidden = g.cards().filter((c) => !c.disabled && c.getAttribute('aria-pressed') === 'false');
    const turn = g.text('players');
    if (/Your turn/.test(turn) && hidden.length >= 2) {
      const a = hidden[0];
      const twin = hidden.find((c) => c !== a && name(c) === name(a));
      a.click(); (guard % 3 === 0 && twin ? twin : hidden.find((c) => c !== a)).click();
    }
    g.advance(1000);
  }
  g.advance(2000);
  await g.flush();
  assert.deepEqual(g.errors, []);
  assert.equal(g.text('pairsCount'), '8');
  assert.match(g.text('winTitle'), /wins!|Hung jury/);
  assert.equal(g.doc.getElementById('submitForm').hidden, true, 'versus games do not file scores');
});

test('pause stops the clock and resume continues it', () => {
  const g = boot();
  g.cards()[0].click();
  g.advance(5000);
  assert.equal(g.text('timer'), '0:05');
  g.click('pauseBtn');
  assert.equal(g.doc.getElementById('pausedOverlay').hidden, false);
  g.advance(60_000);
  g.click('resumeBtn');
  g.advance(1000);
  assert.equal(g.text('timer'), '0:06');
});

test('daily case deals the same board for the same date and deck', () => {
  const order = (g) => g.cards().map((c) => c.querySelector('.card-name').textContent).join(',');
  const a = boot(); a.click('dailyBtn');
  const b = boot(); b.click('dailyBtn');
  assert.equal(order(a), order(b));
  assert.match(a.text('boardTitle'), /Daily Case #\d+/);
  const c = boot();
  assert.notEqual(order(a), order(c), 'a non-daily board is shuffled differently');
});

test('custom deck can be saved from text and becomes playable', () => {
  const g = boot();
  const lines = Array.from({ length: 7 }, (_, i) => `Term ${i} — Definition number ${i}`).join('\n');
  g.doc.getElementById('customText').value = lines;
  g.click('customSave');
  assert.deepEqual(g.errors, []);
  assert.match(g.text('customMsg'), /Saved 7 pairs/);
  assert.equal(g.doc.getElementById('mode').value, 'custom');
  assert.equal(g.text('pairsTotal'), '7', 'normal wants 8 pairs but the deck has 7');
  assert.equal(g.doc.getElementById('leaderboard').hidden, true);
  assert.ok(g.doc.getElementById('dailyBtn').disabled);
});

test('leaderboard failure degrades gracefully', async () => {
  const g = boot({ fetchFail: true });
  await g.flush();
  assert.deepEqual(g.errors, []);
  assert.equal(g.doc.getElementById('lbEmpty').hidden, false);
  assert.match(g.text('lbEmpty'), /unavailable/);
});

test('expert level deals 16 pairs on 8 columns', () => {
  const g = boot({ prefs: { level: 'expert', mode: 'maxims' } });
  assert.equal(g.cards().length, 32);
  assert.equal(g.doc.getElementById('gameBoard').style.getPropertyValue('--cols'), '8');
});

test('screen readers hear matches, misses and the result', () => {
  const g = boot({ prefs: { level: 'easy' } });
  g.advance(2000);
  const name = (c) => c.querySelector('.card-name').textContent;
  const [a, ...rest] = g.cards();
  const other = rest.find((c) => name(c) !== name(a));
  a.click(); other.click(); g.advance(50);
  assert.match(g.text('announcer'), /^No match: .+ and .+\.$/);
  g.advance(1000);

  const twin = rest.find((c) => name(c) === name(a));
  a.click(); twin.click(); g.advance(50);
  assert.match(g.text('announcer'), new RegExp(`^Match: ${name(a)}\\. 1 of 6 pairs\\.$`));

  const byName = new Map();
  g.cards().filter((c) => !c.disabled).forEach((c) => { const k = name(c); (byName.get(k) || byName.set(k, []).get(k)).push(c); });
  for (const [x, y] of byName.values()) { x.click(); y.click(); g.advance(50); }
  g.advance(1000);
  assert.match(g.text('announcer'), /^Case closed!/);
});

test('versus announces whose turn it is', () => {
  const g = boot({ prefs: { rules: 'versus' } });
  const name = (c) => c.querySelector('.card-name').textContent;
  const [a, ...rest] = g.cards();
  a.click(); rest.find((c) => name(c) !== name(a)).click();
  g.advance(1000);
  assert.equal(g.text('announcer'), 'Defence\'s turn.');
});

test('analytics events fire for start, win and filing', async () => {
  const g = boot({ prefs: { level: 'easy', mode: 'icons' } });
  g.advance(2000);
  const byName = new Map();
  g.cards().forEach((c) => { const k = c.querySelector('.card-name').textContent; (byName.get(k) || byName.set(k, []).get(k)).push(c); });
  for (const [a, b] of byName.values()) { a.click(); b.click(); g.advance(50); }
  g.advance(1000);
  g.doc.getElementById('nameInput').value = 'Tester';
  g.doc.getElementById('submitForm').dispatchEvent(new g.window.Event('submit', { cancelable: true }));
  await g.flush();

  const names = g.events.map((e) => e.name);
  assert.equal(names.filter((n) => n === 'game_start').length, 1, 'one start per game');
  assert.ok(names.includes('game_win'));
  assert.ok(names.includes('score_filed'));
  assert.ok(names.includes('achievement'));
  const win = g.events.find((e) => e.name === 'game_win').params;
  assert.deepEqual({ deck: win.deck, level: win.level, moves: win.moves }, { deck: 'icons', level: 'easy', moves: 6 });
});

test('the game still works when analytics is blocked', () => {
  const g = boot();
  delete g.window.gtag;
  g.cards()[0].click(); g.cards()[1].click(); g.advance(1000);
  assert.deepEqual(g.errors, []);
  assert.equal(g.text('movesCount'), '1');
});

test('uncaught errors from the game are reported once, with game context', async () => {
  const g = boot({ prefs: { mode: 'maxims', level: 'hard' } });
  const fire = (message, filename) => g.window.dispatchEvent(new g.window.ErrorEvent('error', { message, filename, lineno: 12, colno: 3 }));
  fire('Boom', 'https://example.test/js/game.js?v=7');
  fire('Boom', 'https://example.test/js/game.js?v=7');            // duplicate, ignored
  fire('From an extension', 'chrome-extension://abc/content.js'); // foreign, ignored
  await g.flush();
  const reports = g.requests.filter((r) => r.url === '/api/client-errors');
  assert.equal(reports.length, 1);
  const body = JSON.parse(reports[0].init.body);
  assert.equal(body.message, 'Boom');
  assert.equal(body.line, 12);
  assert.deepEqual({ deck: body.state.deck, level: body.state.level }, { deck: 'maxims', level: 'hard' });
  assert.equal(reports[0].init.headers['X-CSRF-TOKEN'], 'test-token');
});
