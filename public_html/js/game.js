(() => {
  'use strict';

  // ---------- error reporting ----------
  // Uncaught errors from this script are sent to the server log, at most a
  // few per page load. Errors from browser extensions and other origins are
  // ignored, since they are not ours to fix.
  const reported = new Set();
  let reportsLeft = 5;
  let errorContext = () => ({});
  function reportError(payload) {
    try {
      const key = `${payload.message}|${payload.line}`;
      if (reportsLeft <= 0 || reported.has(key)) return;
      reported.add(key);
      reportsLeft--;
      const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
      fetch('/api/client-errors', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': token },
        body: JSON.stringify({ ...payload, state: errorContext() }),
      }).catch(() => {});
    } catch { /* never let reporting break the game */ }
  }
  window.addEventListener('error', (e) => {
    const src = e.filename || '';
    if (src && !src.startsWith(location.origin)) return;
    reportError({
      kind: 'error',
      message: String(e.message || e.error || 'Unknown error').slice(0, 500),
      source: src.slice(0, 300) || null,
      line: e.lineno || null,
      column: e.colno || null,
      stack: e.error?.stack ? String(e.error.stack).slice(0, 3000) : null,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    reportError({
      kind: 'rejection',
      message: String(r?.message || r || 'Unhandled rejection').slice(0, 500),
      stack: r?.stack ? String(r.stack).slice(0, 3000) : null,
    });
  });

  // ---------- decks ----------

  const ICONS = [
    { id: 1,  icon: '⚖️',  name: 'Justice Scale' },
    { id: 2,  icon: '👨‍⚖️', name: 'Judge' },
    { id: 3,  icon: '📜',  name: 'Legal Document' },
    { id: 4,  icon: '🏛️',  name: 'Courthouse' },
    { id: 5,  icon: '🔨',  name: 'Gavel' },
    { id: 6,  icon: '📋',  name: 'Contract' },
    { id: 7,  icon: '💼',  name: 'Briefcase' },
    { id: 8,  icon: '🎓',  name: 'Law Degree' },
    { id: 9,  icon: '📚',  name: 'Law Library' },
    { id: 10, icon: '🔍',  name: 'Evidence' },
    { id: 11, icon: '🗂️',  name: 'Case File' },
    { id: 12, icon: '✍️',  name: 'Signature' },
    { id: 13, icon: '🤝',  name: 'Settlement' },
    { id: 14, icon: '🕵️',  name: 'Investigator' },
    { id: 15, icon: '🧾',  name: 'Invoice' },
    { id: 16, icon: '⛓️',  name: 'Custody' },
  ];

  const TERMS = [
    { id: 1,  term: 'Habeas Corpus',     def: 'Order to bring a detainee before a court' },
    { id: 2,  term: 'Pro Bono',          def: 'Legal work done for free' },
    { id: 3,  term: 'Tort',              def: 'A civil wrong causing harm or loss' },
    { id: 4,  term: 'Plaintiff',         def: 'The party who brings a lawsuit' },
    { id: 5,  term: 'Defendant',         def: 'The party being sued or accused' },
    { id: 6,  term: 'Subpoena',          def: 'Order to appear or produce evidence' },
    { id: 7,  term: 'Affidavit',         def: 'Sworn written statement' },
    { id: 8,  term: 'Precedent',         def: 'Earlier ruling that guides later cases' },
    { id: 9,  term: 'Injunction',        def: 'Court order to do or stop doing something' },
    { id: 10, term: 'Burden of Proof',   def: 'Duty to prove a disputed claim' },
    { id: 11, term: 'Hearsay',           def: 'Second-hand statement offered as truth' },
    { id: 12, term: 'Liability',         def: 'Legal responsibility for harm' },
    { id: 13, term: 'Indictment',        def: 'Formal charge of a serious crime' },
    { id: 14, term: 'Acquittal',         def: 'Verdict of not guilty' },
    { id: 15, term: 'Deposition',        def: 'Sworn testimony taken outside court' },
    { id: 16, term: 'Statute',           def: 'A written law passed by a legislature' },
  ];

  const MAXIMS = [
    { id: 1,  term: 'Mens rea',               def: 'Guilty mind' },
    { id: 2,  term: 'Actus reus',             def: 'Guilty act' },
    { id: 3,  term: 'Prima facie',            def: 'At first sight; on the face of it' },
    { id: 4,  term: 'Res judicata',           def: 'A matter already judged' },
    { id: 5,  term: 'Stare decisis',          def: 'Stand by what has been decided' },
    { id: 6,  term: 'Bona fide',              def: 'In good faith' },
    { id: 7,  term: 'Caveat emptor',          def: 'Let the buyer beware' },
    { id: 8,  term: 'Ultra vires',            def: 'Beyond one’s legal power' },
    { id: 9,  term: 'Sub judice',             def: 'Under judicial consideration' },
    { id: 10, term: 'Amicus curiae',          def: 'Friend of the court' },
    { id: 11, term: 'De facto',               def: 'In fact, whether lawful or not' },
    { id: 12, term: 'De jure',                def: 'By right; according to law' },
    { id: 13, term: 'In camera',              def: 'In private, not in open court' },
    { id: 14, term: 'Obiter dictum',          def: 'Remark said in passing, not binding' },
    { id: 15, term: 'Ratio decidendi',        def: 'The reason for the decision' },
    { id: 16, term: 'Audi alteram partem',    def: 'Hear the other side' },
  ];

  const DECK_NAMES = { icons: 'Icons', terms: 'Legal terms', maxims: 'Latin maxims', custom: 'My deck' };
  const ONLINE_MODES = ['icons', 'terms', 'maxims'];   // what the leaderboard accepts

  const LEVELS = {
    easy:   { pairs: 6,  cols: 4, trial: 60,  ai: 0.45 },
    normal: { pairs: 8,  cols: 4, trial: 90,  ai: 0.7 },
    hard:   { pairs: 12, cols: 6, trial: 150, ai: 0.88 },
    expert: { pairs: 16, cols: 8, trial: 210, ai: 0.97 },
  };

  const PLAYERS = [
    { name: 'Prosecution', emoji: '🔵' },
    { name: 'Defence',     emoji: '🟠' },
  ];
  const COMPUTER = { name: 'Counsel Bot', emoji: '🤖' };

  const MISMATCH_DELAY = 900;
  const AI_STEP = 650;
  const HINTS_PER_GAME = 3;
  const HINT_PENALTY = 2;
  const PREVIEW_MS = 1500;
  const MIN_CUSTOM_PAIRS = 6;
  const DAILY_EPOCH = Date.UTC(2026, 0, 1);

  const ACHIEVEMENTS = [
    { id: 'first',    icon: '📁', name: 'First Brief',       desc: 'Close your first case' },
    { id: 'perfect',  icon: '💎', name: 'Flawless Argument', desc: 'Finish with the minimum number of moves' },
    { id: 'nohint',   icon: '🧠', name: 'Self-Represented',  desc: 'Win on Hard or Expert without a hint' },
    { id: 'speedy',   icon: '⚡', name: 'Speedy Trial',      desc: 'Win Normal or above in under 45 seconds' },
    { id: 'streak5',  icon: '🔥', name: 'On a Roll',         desc: 'Match five pairs in a row' },
    { id: 'scholar',  icon: '🎓', name: 'Scholar',           desc: 'Win a Legal terms game on Hard or Expert' },
    { id: 'classic',  icon: '🏺', name: 'Classicist',        desc: 'Win a Latin maxims game' },
    { id: 'clock',    icon: '⏱️', name: 'Beat the Clock',    desc: 'Win a Trial-mode game' },
    { id: 'versus',   icon: '🏆', name: 'Winning Counsel',   desc: 'Win a Versus match' },
    { id: 'bot',      icon: '🤖', name: 'Outsmarted',        desc: 'Beat Counsel Bot on Hard or Expert' },
    { id: 'daily3',   icon: '📅', name: 'Regular Counsel',   desc: 'Close the Daily Case three days running' },
    { id: 'expert',   icon: '👑', name: 'Senior Counsel',    desc: 'Win on Expert' },
    { id: 'author',   icon: '✒️', name: 'Author',            desc: 'Win a game with your own deck' },
  ];

  const KEYS = {
    best: 'legal-memory-best',
    stats: 'legal-memory-stats',
    prefs: 'legal-memory-prefs',
    ach: 'legal-memory-achievements',
    weak: 'legal-memory-weak',
    custom: 'legal-memory-custom-deck',
  };

  // ---------- elements ----------

  const $ = (id) => document.getElementById(id);
  const el = {
    board: $('gameBoard'),
    pairsCount: $('pairsCount'), pairsTotal: $('pairsTotal'),
    moves: $('movesCount'), timer: $('timer'), timerLabel: $('timerLabel'),
    streak: $('streakCount'), score: $('scoreCount'), scoreStat: $('scoreStat'),
    difficulty: $('difficulty'), mode: $('mode'), rules: $('rules'),
    customOption: $('customOption'),
    focus: $('focusToggle'), focusWrap: $('focusWrap'),
    daily: $('dailyBtn'), hint: $('hintBtn'), pause: $('pauseBtn'), reset: $('resetBtn'),
    sound: $('soundBtn'), theme: $('themeBtn'),
    bestLine: $('bestLine'), bestText: $('bestText'),
    statsLine: $('statsLine'),
    players: $('players'),
    summary: $('summaryLine'),
    overlay: $('winOverlay'), modalEmoji: $('modalEmoji'), winTitle: $('winTitle'), winText: $('winText'),
    winCompare: $('winCompare'),
    winRecord: $('winRecord'), playAgain: $('playAgainBtn'),
    submitForm: $('submitForm'), nameInput: $('nameInput'), submitBtn: $('submitBtn'),
    submitMsg: $('submitMsg'), shareBtn: $('shareBtn'),
    review: $('review'), reviewList: $('reviewList'),
    boardTitle: $('boardTitle'),
    pausedOverlay: $('pausedOverlay'), resumeBtn: $('resumeBtn'),
    lbSection: $('leaderboard'), lbTitle: $('lbTitle'), lbList: $('lbList'), lbEmpty: $('lbEmpty'),
    achList: $('achList'), achCount: $('achCount'),
    customText: $('customText'), customSave: $('customSave'), customClear: $('customClear'), customMsg: $('customMsg'),
    toasts: $('toasts'),
    confetti: $('confetti'),
    announcer: $('announcer'),
  };

  // Screen readers get the same beats sighted players see: match, miss, turn, win.
  function announce(text) {
    el.announcer.textContent = '';
    setTimeout(() => { el.announcer.textContent = text; }, 30);
  }

  // Analytics events go through gtag when it is present, and are ignored otherwise.
  function track(event, params = {}) {
    try { if (typeof window.gtag === 'function') window.gtag('event', event, params); } catch { /* ignore */ }
  }
  const gameParams = () => ({ deck: prefs.mode, level: prefs.level, rules: prefs.rules, daily: state.daily ? 1 : 0 });

  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  // ---------- persistence ----------

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* unavailable */ }
  }

  const prefs = Object.assign({ level: 'normal', mode: 'icons', rules: 'classic', sound: true, theme: 'auto', name: '', focus: false }, load(KEYS.prefs, {}));
  const stats = Object.assign({ played: 0, won: 0, bestStreak: 0, dailyStreak: 0, lastDaily: null }, load(KEYS.stats, {}));
  const unlocked = load(KEYS.ach, {});
  const weak = load(KEYS.weak, {});          // "mode:id" -> lifetime misses
  let customDeck = load(KEYS.custom, []);    // [{id, term, def}]

  const DECKS = { icons: ICONS, terms: TERMS, maxims: MAXIMS, get custom() { return customDeck; } };

  if (!LEVELS[prefs.level]) prefs.level = 'normal';
  if (!DECK_NAMES[prefs.mode] || (prefs.mode === 'custom' && customDeck.length < MIN_CUSTOM_PAIRS)) prefs.mode = 'icons';
  if (!['classic', 'trial', 'versus', 'computer'].includes(prefs.rules)) prefs.rules = 'classic';

  // ---------- state ----------

  const state = {
    daily: false,
    cards: [],
    flipped: [],
    matched: 0,
    moves: 0,
    streak: 0,
    hintsUsed: 0,
    locked: false,
    started: false,
    startedAt: null,
    elapsed: 0,
    timerId: null,
    finished: false,
    paused: false,
    player: 0,
    playerPairs: [0, 0],
    misses: {},
    aiMemory: new Map(),   // card key -> pair id the computer remembers
    aiTimer: null,
  };

  errorContext = () => ({
    deck: prefs.mode, level: prefs.level, rules: prefs.rules,
    daily: state.daily ? 1 : 0, moves: state.moves, pairs: state.matched,
  });

  const level = () => LEVELS[prefs.level];
  const isVersus = () => prefs.rules === 'versus' || prefs.rules === 'computer';
  const isComputer = () => prefs.rules === 'computer';
  const isTrial = () => prefs.rules === 'trial';
  const isTermDeck = () => prefs.mode !== 'icons';
  const isOnline = () => ONLINE_MODES.includes(prefs.mode) && !isVersus();
  const trialMs = () => level().trial * 1000;
  const pairsForGame = () => Math.min(level().pairs, DECKS[prefs.mode].length);
  const bestKey = () => `${prefs.mode}-${prefs.level}${state.daily ? '-' + dailyDate() : ''}`;
  const opponent = () => (isComputer() ? COMPUTER : PLAYERS[1]);

  // ---------- randomness ----------

  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h ^= h >>> 16) >>> 0;
  }

  function mulberry32(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, rand = Math.random) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const dailyDate = () => new Date(Date.now()).toISOString().slice(0, 10);
  const dailyNumber = () => Math.floor((Date.now() - DAILY_EPOCH) / 86400000) + 1;
  const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // ---------- formatting ----------

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  // Mirrors Score::compute on the server.
  function computeScore(moves, ms) {
    const pairs = pairsForGame();
    const extra = Math.max(0, moves - pairs);
    return Math.max(0, pairs * 1000 - extra * 25 - Math.floor(ms / 500));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- sound & haptics ----------

  let audioCtx = null;
  function tone(freq, duration = 0.08, type = 'sine', when = 0, gain = 0.08) {
    if (!prefs.sound) return;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, audioCtx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + when + duration);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + when);
      osc.stop(audioCtx.currentTime + when + duration);
    } catch { /* audio unavailable */ }
  }
  function buzz(pattern) {
    if (!prefs.sound) return;
    try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
  }
  const sfx = {
    flip:  () => tone(520, 0.05, 'triangle'),
    match: () => { tone(660, 0.1); tone(880, 0.15, 'sine', 0.08); buzz(30); },
    miss:  () => { tone(180, 0.2, 'sawtooth', 0, 0.05); buzz([20, 40, 20]); },
    hint:  () => tone(440, 0.1, 'square', 0, 0.04),
    tick:  () => tone(900, 0.04, 'square', 0, 0.03),
    win:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', i * 0.12)); buzz([40, 60, 40, 60, 80]); },
    lose:  () => { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', i * 0.2, 0.06)); buzz(200); },
    unlock: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.12, 'sine', i * 0.07, 0.05)),
  };

  // ---------- theme / buttons ----------

  function applyTheme() {
    document.documentElement.dataset.theme = prefs.theme;
    el.theme.textContent = { auto: '🌓', light: '☀️', dark: '🌙' }[prefs.theme];
    el.theme.setAttribute('aria-label', `Theme: ${prefs.theme}`);
  }

  function applySoundButton() {
    el.sound.textContent = prefs.sound ? '🔊' : '🔇';
    el.sound.setAttribute('aria-label', prefs.sound ? 'Sound on' : 'Sound off');
    el.sound.setAttribute('aria-pressed', String(prefs.sound));
  }

  // ---------- toasts ----------

  function toast(html, cls = '') {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.innerHTML = html;
    el.toasts.appendChild(t);
    setTimeout(() => t.classList.add('is-out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  // ---------- achievements ----------

  function unlock(id) {
    if (unlocked[id]) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    unlocked[id] = Date.now();
    save(KEYS.ach, unlocked);
    sfx.unlock();
    track('achievement', { id });
    toast(`<strong>${a.icon} Achievement: ${escapeHtml(a.name)}</strong><span>${escapeHtml(a.desc)}</span>`, 'toast--ach');
    renderAchievements();
  }

  function renderAchievements() {
    const n = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
    el.achCount.textContent = `${n}/${ACHIEVEMENTS.length}`;
    el.achList.innerHTML = ACHIEVEMENTS.map((a) => `
      <li class="ach ${unlocked[a.id] ? 'is-unlocked' : ''}" title="${escapeHtml(a.desc)}">
        <span class="ach-icon" aria-hidden="true">${unlocked[a.id] ? a.icon : '🔒'}</span>
        <span class="ach-body"><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.desc)}</small></span>
      </li>`).join('');
  }

  // ---------- custom deck ----------

  function parseCustomDeck(text) {
    const pairs = [];
    text.split(/\r?\n/).forEach((line) => {
      const m = line.trim().match(/^(.+?)\s*(?:—|–|\||::|:|-|=)\s*(.+)$/);
      if (!m) return;
      const term = m[1].trim().slice(0, 40);
      const def = m[2].trim().slice(0, 80);
      if (term && def) pairs.push({ id: pairs.length + 1, term, def });
    });
    return pairs;
  }

  function renderCustomDeck() {
    const ok = customDeck.length >= MIN_CUSTOM_PAIRS;
    el.customOption.disabled = !ok;
    el.customOption.textContent = ok ? `My deck (${customDeck.length})` : `My deck (need ${MIN_CUSTOM_PAIRS}+)`;
    el.customText.value = customDeck.map((p) => `${p.term} — ${p.def}`).join('\n');
    el.customClear.hidden = !customDeck.length;
  }

  function saveCustomDeck() {
    const pairs = parseCustomDeck(el.customText.value);
    if (pairs.length < MIN_CUSTOM_PAIRS) {
      el.customMsg.textContent = `Found ${pairs.length} pair${pairs.length === 1 ? '' : 's'}. You need at least ${MIN_CUSTOM_PAIRS}, one per line as "term — definition".`;
      return;
    }
    customDeck = pairs.slice(0, 40);
    save(KEYS.custom, customDeck);
    el.customMsg.textContent = `Saved ${customDeck.length} pairs. Pick "My deck" to play it.`;
    renderCustomDeck();
    prefs.mode = 'custom';
    el.mode.value = 'custom';
    save(KEYS.prefs, prefs);
    newGame();
  }

  function clearCustomDeck() {
    customDeck = [];
    save(KEYS.custom, customDeck);
    el.customMsg.textContent = 'Deck cleared.';
    if (prefs.mode === 'custom') { prefs.mode = 'icons'; el.mode.value = 'icons'; save(KEYS.prefs, prefs); }
    renderCustomDeck();
    newGame();
  }

  // ---------- weak-term focus ----------

  const weakKey = (id) => `${prefs.mode}:${id}`;
  const lifetimeMisses = (id) => weak[weakKey(id)] || 0;

  // Deal the pairs the player has missed most, then fill the rest at random.
  function pickPairs(deck, n, rand) {
    const base = shuffle(deck, rand);
    if (!prefs.focus || !isTermDeck() || state.daily) return base.slice(0, n);
    const weakOnes = base.filter((p) => lifetimeMisses(p.id) > 0).sort((a, b) => lifetimeMisses(b.id) - lifetimeMisses(a.id));
    const focusCount = Math.min(weakOnes.length, Math.ceil(n * 0.6));
    const chosen = weakOnes.slice(0, focusCount);
    const rest = base.filter((p) => !chosen.includes(p));
    return [...chosen, ...rest].slice(0, n);
  }

  function renderFocus() {
    el.focusWrap.hidden = !isTermDeck();
    el.focus.checked = prefs.focus;
    const known = Object.keys(weak).filter((k) => k.startsWith(`${prefs.mode}:`)).length;
    el.focusWrap.title = known ? `${known} term${known === 1 ? '' : 's'} on your watch list` : 'Nothing missed yet';
  }

  // ---------- timer ----------

  function renderTimer() {
    if (isTrial()) {
      const left = trialMs() - state.elapsed;
      el.timer.textContent = formatTime(left);
      el.timer.classList.toggle('is-urgent', left <= 10000 && !state.finished && !state.paused);
    } else {
      el.timer.textContent = formatTime(state.elapsed);
    }
  }

  let lastTickSecond = -1;
  function startTimer() {
    if (state.timerId || state.finished || state.paused) return;
    state.startedAt = Date.now() - state.elapsed;
    state.timerId = setInterval(() => {
      state.elapsed = Date.now() - state.startedAt;
      renderTimer();
      renderScore();
      if (isTrial()) {
        const left = trialMs() - state.elapsed;
        const sec = Math.ceil(left / 1000);
        if (left <= 10000 && sec !== lastTickSecond) { lastTickSecond = sec; sfx.tick(); }
        if (left <= 0) lose();
      }
    }, 200);
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
    if (state.startedAt) state.elapsed = Date.now() - state.startedAt;
    if (isTrial()) state.elapsed = Math.min(state.elapsed, trialMs());
    renderTimer();
  }

  // ---------- pause ----------

  function setPaused(on) {
    if (!state.started || state.finished) return;
    if (on === state.paused) return;
    state.paused = on;
    if (on) { stopTimer(); clearTimeout(state.aiTimer); }
    else { startTimer(); if (isComputer() && state.player === 1 && !state.locked) scheduleAi(); }
    el.pausedOverlay.hidden = !on;
    el.board.classList.toggle('is-paused', on);
    el.pause.textContent = on ? 'Resume' : 'Pause';
    el.pause.setAttribute('aria-pressed', String(on));
    if (on) el.resumeBtn.focus();
  }

  // ---------- game ----------

  function buildDeck(rand) {
    const n = pairsForGame();
    const deck = DECKS[prefs.mode];
    if (isTermDeck()) {
      return pickPairs(deck, n, rand).flatMap((t) => [
        { id: t.id, face: 'term', title: t.term, text: '', label: t.term, term: t.term, def: t.def },
        { id: t.id, face: 'def',  title: '', text: t.def, label: `Definition: ${t.def}`, term: t.term, def: t.def },
      ]);
    }
    return shuffle(deck, rand).slice(0, n).flatMap((c) => [
      { id: c.id, face: 'icon', icon: c.icon, title: c.name, label: c.name },
      { id: c.id, face: 'icon', icon: c.icon, title: c.name, label: c.name },
    ]);
  }

  function newGame() {
    stopTimer();
    clearTimeout(state.aiTimer);
    lastTickSecond = -1;
    if (state.daily && prefs.mode === 'custom') state.daily = false;
    const pairs = pairsForGame();
    const cols = pairs >= 16 ? 8 : pairs >= 12 ? 6 : 4;
    const rand = state.daily ? mulberry32(hashString(`${dailyDate()}|${prefs.mode}|${prefs.level}`)) : Math.random;

    state.cards = shuffle(buildDeck(rand), rand).map((c, i) => ({ ...c, key: i, flipped: false, matched: false }));
    Object.assign(state, {
      flipped: [], matched: 0, moves: 0, streak: 0, hintsUsed: 0,
      locked: false, started: false, startedAt: null, elapsed: 0, finished: false, paused: false,
      player: 0, playerPairs: [0, 0], misses: {}, aiMemory: new Map(), aiTimer: null,
    });

    el.board.style.setProperty('--cols', cols);
    el.board.classList.toggle('board--terms', isTermDeck());
    el.board.classList.toggle('board--dense', pairs >= 12);
    el.board.classList.remove('is-paused');
    el.pausedOverlay.hidden = true;
    el.pause.textContent = 'Pause';
    el.pause.setAttribute('aria-pressed', 'false');
    el.pairsTotal.textContent = pairs;
    el.overlay.hidden = true;
    el.daily.classList.toggle('is-active', state.daily);
    el.daily.setAttribute('aria-pressed', String(state.daily));
    el.daily.disabled = prefs.mode === 'custom';
    el.timerLabel.textContent = isTrial() ? 'Time left' : 'Time';
    el.timer.classList.remove('is-urgent');
    el.scoreStat.hidden = isVersus();
    el.players.hidden = !isVersus();
    el.lbSection.hidden = !isOnline();
    el.summary.hidden = true;

    const rulesName = { classic: '', trial: ' · Trial', versus: ' · Versus', computer: ' · vs Counsel Bot' }[prefs.rules];
    el.boardTitle.textContent = state.daily
      ? `Daily Case #${dailyNumber()} · ${dailyDate()}${rulesName}`
      : `${DECK_NAMES[prefs.mode]} · ${prefs.level}${rulesName}${prefs.focus && isTermDeck() ? ' · focus' : ''}`;

    renderBoard();
    renderTimer();
    updateStats();
    renderPlayers();
    renderBest();
    renderStatsLine();
    renderFocus();
    if (isOnline()) { loadLeaderboard(); loadSummary(); }

    if (prefs.level === 'easy') preview();
  }

  function preview() {
    state.locked = true;
    state.cards.forEach((c) => { c.flipped = true; setCardView(c); });
    setTimeout(() => {
      state.cards.forEach((c) => { c.flipped = false; setCardView(c); });
      state.locked = false;
    }, PREVIEW_MS);
  }

  function cardFaceHtml(card) {
    if (card.face === 'icon') {
      return `<span class="card-icon">${card.icon}</span><span class="card-name">${escapeHtml(card.title)}</span>`;
    }
    if (card.face === 'term') return `<span class="card-term">${escapeHtml(card.title)}</span>`;
    return `<span class="card-def">${escapeHtml(card.text)}</span>`;
  }

  function renderBoard() {
    el.board.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.cards.forEach((card) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.dataset.key = card.key;
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label', 'Face-down card');
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-face--back" aria-hidden="true">⚖️</div>
          <div class="card-face card-face--front card-face--${card.face}" aria-hidden="true">${cardFaceHtml(card)}</div>
        </div>`;
      frag.appendChild(btn);
    });
    el.board.appendChild(frag);
  }

  const cardEl = (key) => el.board.querySelector(`[data-key="${key}"]`);

  function setCardView(card) {
    const node = cardEl(card.key);
    node.classList.toggle('is-flipped', card.flipped);
    node.classList.toggle('is-matched', card.matched);
    node.classList.remove('is-p0', 'is-p1');
    if (card.matched && isVersus()) node.classList.add(`is-p${card.owner}`);
    const faceUp = card.flipped || card.matched;
    node.setAttribute('aria-pressed', String(faceUp));
    node.setAttribute('aria-label', faceUp ? `${card.label}${card.matched ? ', matched' : ''}` : 'Face-down card');
    node.disabled = card.matched;
  }

  function beginIfNeeded() {
    if (state.started) return;
    state.started = true;
    stats.played++;
    save(KEYS.stats, stats);
    renderStatsLine();
    updateStats();
    track('game_start', gameParams());
  }

  // The computer notices every card that is turned face up, and remembers it
  // with a probability set by the level.
  function aiObserve(card) {
    if (!isComputer()) return;
    if (Math.random() < level().ai) state.aiMemory.set(card.key, card.id);
  }

  function reveal(card) {
    beginIfNeeded();
    startTimer();
    sfx.flip();
    card.flipped = true;
    state.flipped.push(card);
    setCardView(card);
    aiObserve(card);
    if (state.flipped.length === 2) {
      state.moves++;
      updateStats();
      checkMatch();
    }
  }

  function flip(key) {
    if (state.locked || state.finished || state.paused) return;
    if (isComputer() && state.player === 1) return;
    const card = state.cards[key];
    if (!card || card.flipped || card.matched) return;
    reveal(card);
  }

  function checkMatch() {
    const [a, b] = state.flipped;

    if (a.id === b.id) {
      a.matched = b.matched = true;
      a.flipped = b.flipped = false;
      a.owner = b.owner = state.player;
      state.flipped = [];
      state.matched++;
      state.aiMemory.delete(a.key); state.aiMemory.delete(b.key);
      if (state.player === 0 || !isVersus()) {
        state.streak++;
        if (state.streak > stats.bestStreak) { stats.bestStreak = state.streak; save(KEYS.stats, stats); }
        if (state.streak >= 5) unlock('streak5');
      }
      if (isVersus()) state.playerPairs[state.player]++;
      sfx.match();
      setCardView(a); setCardView(b);
      if (state.streak >= 2 && state.player === 0) [a, b].forEach((c) => cardEl(c.key).classList.add('is-combo'));
      updateStats();
      renderPlayers();
      const who = isVersus() ? (state.player === 0 ? PLAYERS[0].name : opponent().name) + ' matched' : 'Match';
      announce(`${who}: ${a.face === 'icon' ? a.title : a.term}. ${state.matched} of ${pairsForGame()} pairs.`);
      if (state.matched === pairsForGame()) { setTimeout(win, 600); return; }
      if (isComputer() && state.player === 1) scheduleAi();
      return;
    }

    if (state.player === 0 || !isVersus()) state.streak = 0;
    state.locked = true;
    sfx.miss();
    announce(`No match: ${a.label} and ${b.label}.`);
    [a, b].forEach((c) => {
      state.misses[c.id] = (state.misses[c.id] || 0) + 1;
      cardEl(c.key).classList.add('is-miss');
    });
    if (isTermDeck() && !isVersus()) {
      weak[weakKey(a.id)] = lifetimeMisses(a.id) + 1;
      save(KEYS.weak, weak);
    }
    updateStats();

    setTimeout(() => {
      a.flipped = b.flipped = false;
      cardEl(a.key).classList.remove('is-miss');
      cardEl(b.key).classList.remove('is-miss');
      setCardView(a); setCardView(b);
      state.flipped = [];
      state.locked = false;
      if (isVersus() && !state.finished) {
        state.player = 1 - state.player;
        renderPlayers();
        announce(state.player === 0 ? `${PLAYERS[0].name}, your turn.` : `${opponent().name}'s turn.`);
        if (isComputer() && state.player === 1) scheduleAi();
      }
    }, MISMATCH_DELAY);
  }

  // ---------- computer opponent ----------

  function scheduleAi() {
    clearTimeout(state.aiTimer);
    if (state.paused || state.finished) return;
    state.aiTimer = setTimeout(aiTurn, AI_STEP);
  }

  function aiTurn() {
    if (state.finished || state.paused || state.player !== 1 || state.flipped.length) return;
    const hidden = state.cards.filter((c) => !c.matched && !c.flipped);
    if (hidden.length < 2) return;

    // A remembered pair? Take it.
    const byId = new Map();
    for (const [key, id] of state.aiMemory) {
      const c = state.cards[key];
      if (c.matched || c.flipped) continue;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(c);
    }
    const known = [...byId.values()].find((cs) => cs.length >= 2);
    if (known) { aiFlipPair(known[0], known[1]); return; }

    // Otherwise flip an unknown card, then its partner if it is remembered.
    const unknown = hidden.filter((c) => !state.aiMemory.has(c.key));
    const first = (unknown.length ? unknown : hidden)[Math.floor(Math.random() * (unknown.length ? unknown.length : hidden.length))];
    reveal(first);
    state.aiTimer = setTimeout(() => {
      if (state.finished || state.paused) return;
      const rest = state.cards.filter((c) => !c.matched && !c.flipped);
      const partnerKey = [...state.aiMemory].find(([k, id]) => id === first.id && k !== first.key)?.[0];
      const partner = partnerKey !== undefined ? state.cards[partnerKey] : null;
      const second = partner && !partner.matched && !partner.flipped
        ? partner
        : rest[Math.floor(Math.random() * rest.length)];
      if (second) reveal(second);
    }, AI_STEP);
  }

  function aiFlipPair(a, b) {
    reveal(a);
    state.aiTimer = setTimeout(() => { if (!state.finished && !state.paused) reveal(b); }, AI_STEP);
  }

  // ---------- hints / stats ----------

  function hint() {
    if (state.locked || state.finished || state.paused || state.hintsUsed >= HINTS_PER_GAME || state.flipped.length) return;
    if (isComputer() && state.player === 1) return;
    const hidden = state.cards.filter((c) => !c.matched && !c.flipped);
    if (hidden.length < 2) return;
    const first = hidden[Math.floor(Math.random() * hidden.length)];
    const partner = hidden.find((c) => c.id === first.id && c.key !== first.key);
    if (!partner) return;

    state.hintsUsed++;
    state.moves += HINT_PENALTY;
    state.streak = 0;
    beginIfNeeded();
    startTimer();
    sfx.hint();
    updateStats();

    state.locked = true;
    [first, partner].forEach((c) => { c.flipped = true; setCardView(c); cardEl(c.key).classList.add('is-hint'); aiObserve(c); });
    setTimeout(() => {
      [first, partner].forEach((c) => { c.flipped = false; setCardView(c); cardEl(c.key).classList.remove('is-hint'); });
      state.locked = false;
    }, 1000);
  }

  function renderScore() {
    if (isVersus()) return;
    el.score.textContent = state.started ? computeScore(state.moves, state.elapsed) : pairsForGame() * 1000;
  }

  function updateStats() {
    el.pairsCount.textContent = state.matched;
    el.moves.textContent = state.moves;
    el.streak.textContent = state.streak >= 2 ? `🔥${state.streak}` : state.streak;
    const left = HINTS_PER_GAME - state.hintsUsed;
    el.hint.textContent = `Hint (${left})`;
    el.hint.disabled = left <= 0 || state.finished;
    el.pause.disabled = !state.started || state.finished;
    renderScore();
  }

  function renderPlayers() {
    if (!isVersus()) return;
    const ps = [PLAYERS[0], opponent()];
    el.players.innerHTML = ps.map((p, i) => `
      <div class="player ${state.player === i && !state.finished ? 'is-turn' : ''} player--${i}">
        <span class="player-name">${p.emoji} ${p.name}</span>
        <span class="player-pairs">${state.playerPairs[i]}</span>
        <span class="player-turn">${state.player === i && !state.finished ? (i === 1 && isComputer() ? 'Thinking…' : 'Your turn') : ''}</span>
      </div>`).join('');
  }

  function renderBest() {
    const best = load(KEYS.best, {})[bestKey()];
    el.bestLine.hidden = !best || isVersus();
    if (best) el.bestText.textContent = `${best.score} pts · ${best.moves} moves in ${formatTime(best.time)}`;
  }

  function renderStatsLine() {
    const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
    const daily = stats.dailyStreak > 0 && (stats.lastDaily === dailyDate() || stats.lastDaily === yesterday())
      ? ` · Daily streak ${stats.dailyStreak}` : '';
    el.statsLine.textContent = `Games ${stats.played} · Closed ${stats.won} (${rate}%) · Best streak ${stats.bestStreak}${daily}`;
  }

  function renderReview() {
    const missed = Object.entries(state.misses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    el.review.hidden = !isTermDeck() || !missed.length;
    if (el.review.hidden) return;
    el.reviewList.innerHTML = missed.map(([id, n]) => {
      const c = state.cards.find((x) => String(x.id) === id);
      const life = lifetimeMisses(c.id);
      return `<li><strong>${escapeHtml(c.term)}</strong> — ${escapeHtml(c.def)} <small>(missed ×${n}${life > n ? `, ${life} all time` : ''})</small></li>`;
    }).join('');
  }

  function recordDaily() {
    if (!state.daily) return;
    const today = dailyDate();
    if (stats.lastDaily === today) return;
    stats.dailyStreak = stats.lastDaily === yesterday() ? stats.dailyStreak + 1 : 1;
    stats.lastDaily = today;
    save(KEYS.stats, stats);
    if (stats.dailyStreak >= 3) unlock('daily3');
  }

  function checkAchievements() {
    unlock('first');
    const hardPlus = prefs.level === 'hard' || prefs.level === 'expert';
    if (state.moves === pairsForGame()) unlock('perfect');
    if (hardPlus && state.hintsUsed === 0) unlock('nohint');
    if (prefs.level !== 'easy' && state.elapsed < 45000) unlock('speedy');
    if (prefs.mode === 'terms' && hardPlus) unlock('scholar');
    if (prefs.mode === 'maxims') unlock('classic');
    if (prefs.mode === 'custom') unlock('author');
    if (isTrial()) unlock('clock');
    if (prefs.level === 'expert') unlock('expert');
  }

  function win() {
    if (state.finished) return;
    stopTimer();
    clearTimeout(state.aiTimer);
    state.finished = true;
    stats.won++;
    save(KEYS.stats, stats);
    renderStatsLine();
    updateStats();
    renderPlayers();
    renderReview();
    confetti();
    recordDaily();

    el.modalEmoji.textContent = '🎉';
    el.submitForm.hidden = true;
    el.submitMsg.textContent = '';
    el.winRecord.hidden = true;
    el.winCompare.hidden = true;

    if (isVersus()) {
      const [p0, p1] = state.playerPairs;
      const tie = p0 === p1;
      const you = p0 > p1;
      const other = opponent();
      sfx[isComputer() && !you && !tie ? 'lose' : 'win']();
      el.modalEmoji.textContent = tie ? '🤝' : (isComputer() && !you ? '🤖' : '🏆');
      el.winTitle.textContent = tie ? 'Hung jury!' : `${you ? PLAYERS[0].emoji + ' ' + PLAYERS[0].name : other.emoji + ' ' + other.name} wins!`;
      el.winText.textContent = `${PLAYERS[0].name} ${p0} · ${other.name} ${p1} · ${state.moves} moves · ${formatTime(state.elapsed)}`;
      announce(`${el.winTitle.textContent} ${el.winText.textContent}`);
      track('game_win', { ...gameParams(), moves: state.moves, time_s: Math.round(state.elapsed / 1000), result: tie ? 'tie' : (you ? 'win' : 'loss') });
      unlock('first');
      if (!tie && (you || !isComputer())) unlock('versus');
      if (isComputer() && you && (prefs.level === 'hard' || prefs.level === 'expert')) unlock('bot');
      el.overlay.hidden = false;
      el.playAgain.focus();
      return;
    }

    sfx.win();
    const score = computeScore(state.moves, state.elapsed);
    const best = load(KEYS.best, {});
    const prev = best[bestKey()];
    const isRecord = !prev || score > prev.score;
    if (isRecord) {
      best[bestKey()] = { score, moves: state.moves, time: state.elapsed };
      save(KEYS.best, best);
      renderBest();
    }

    el.winTitle.textContent = state.daily ? `Daily Case #${dailyNumber()} closed!` : (isTrial() ? 'Verdict in time!' : 'Case closed!');
    el.winText.textContent = `${score} points · ${state.moves} moves · ${formatTime(state.elapsed)}`;
    el.winRecord.hidden = !isRecord;
    if (isOnline()) {
      el.submitForm.hidden = false;
      el.submitBtn.disabled = false;
      el.nameInput.value = prefs.name;
      loadSummary(state.moves);
    }
    el.overlay.hidden = false;
    (isOnline() ? (prefs.name ? el.submitBtn : el.nameInput) : el.playAgain).focus();
    announce(`${el.winTitle.textContent} ${el.winText.textContent}${isRecord ? ' New personal best.' : ''}`);
    track('game_win', { ...gameParams(), moves: state.moves, time_s: Math.round(state.elapsed / 1000), score, hints: state.hintsUsed, record: isRecord ? 1 : 0 });
    checkAchievements();
  }

  function lose() {
    if (state.finished) return;
    stopTimer();
    clearTimeout(state.aiTimer);
    state.finished = true;
    state.locked = true;
    updateStats();
    sfx.lose();
    el.timer.classList.remove('is-urgent');
    state.cards.forEach((c) => { if (!c.matched) { c.flipped = true; setCardView(c); } });

    el.modalEmoji.textContent = '⏰';
    el.winTitle.textContent = 'Mistrial!';
    el.winText.textContent = `Time ran out with ${state.matched} of ${pairsForGame()} pairs found in ${state.moves} moves.`;
    el.winRecord.hidden = true;
    el.winCompare.hidden = true;
    el.submitForm.hidden = true;
    el.submitMsg.textContent = '';
    renderReview();
    el.overlay.hidden = false;
    el.playAgain.focus();
    announce(`Mistrial. ${el.winText.textContent}`);
    track('game_lose', { ...gameParams(), moves: state.moves, pairs_found: state.matched });
  }

  // ---------- confetti ----------

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.confetti.innerHTML = '';
    const colors = ['#d97706', '#f59e0b', '#16a34a', '#2563eb', '#f8fafc'];
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('i');
      s.style.setProperty('--x', `${Math.random() * 100}vw`);
      s.style.setProperty('--d', `${2 + Math.random() * 2}s`);
      s.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      s.style.setProperty('--c', colors[i % colors.length]);
      s.style.animationDelay = `${Math.random() * 0.8}s`;
      el.confetti.appendChild(s);
    }
    setTimeout(() => { el.confetti.innerHTML = ''; }, 4500);
  }

  // ---------- leaderboard & summary ----------

  function lbParams(extra = {}) {
    const p = new URLSearchParams({ level: prefs.level, mode: prefs.mode, ...extra });
    if (state.daily) p.set('daily', dailyDate());
    return p;
  }

  async function loadLeaderboard() {
    el.lbTitle.textContent = state.daily ? `Today's top lawyers` : `Top lawyers · ${DECK_NAMES[prefs.mode]} · ${prefs.level}`;
    el.lbList.innerHTML = '';
    el.lbEmpty.hidden = true;
    try {
      const res = await fetch(`/api/scores?${lbParams()}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      const { scores } = await res.json();
      if (!scores.length) { el.lbEmpty.textContent = 'No results filed yet. Close a case and be the first.'; el.lbEmpty.hidden = false; return; }
      el.lbList.innerHTML = scores.map((s, i) => `
        <li class="${s.name === prefs.name ? 'is-you' : ''}">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-name">${escapeHtml(s.name)}</span>
          <span class="lb-score">${s.score}</span>
          <span class="lb-detail">${s.moves} mv · ${formatTime(s.time_ms)}</span>
        </li>`).join('');
    } catch {
      el.lbEmpty.textContent = 'Leaderboard unavailable right now.';
      el.lbEmpty.hidden = false;
    }
  }

  async function loadSummary(moves = null) {
    try {
      const res = await fetch(`/api/scores/summary?${lbParams(moves ? { moves } : {})}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const s = await res.json();
      if (!s.players) return;
      const who = state.daily ? 'today' : 'on this board';
      const line = `${s.players} lawyer${s.players === 1 ? '' : 's'} ${who} · avg ${s.avg_moves} moves · avg ${formatTime(s.avg_time_ms)}`;
      if (moves === null) {
        el.summary.textContent = line;
        el.summary.hidden = false;
      } else if (s.beat_percent !== null) {
        el.winCompare.textContent = `You used fewer moves than ${s.beat_percent}% of ${s.players} lawyer${s.players === 1 ? '' : 's'} ${who}.`;
        el.winCompare.hidden = false;
      }
    } catch { /* offline */ }
  }

  async function submitScore(e) {
    e.preventDefault();
    const name = el.nameInput.value.trim();
    if (!name) { el.nameInput.focus(); return; }
    prefs.name = name;
    save(KEYS.prefs, prefs);
    el.submitBtn.disabled = true;
    el.submitMsg.textContent = 'Filing…';

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify({
          name, level: prefs.level, mode: prefs.mode,
          daily: state.daily ? dailyDate() : null,
          moves: state.moves, time_ms: Math.max(1, Math.round(state.elapsed)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not file your result.');
      el.submitMsg.textContent = `Filed! You rank #${data.rank} on this board.`;
      el.submitForm.hidden = true;
      track('score_filed', { ...gameParams(), rank: data.rank, score: data.score });
      loadLeaderboard();
      loadSummary();
    } catch (err) {
      el.submitMsg.textContent = err.message;
      el.submitBtn.disabled = false;
    }
  }

  // ---------- share ----------

  async function share() {
    let text;
    if (isVersus()) {
      const [p0, p1] = state.playerPairs;
      text = `Legal Memory Versus\n${PLAYERS[0].emoji} ${PLAYERS[0].name} ${p0} · ${opponent().emoji} ${opponent().name} ${p1}\n${location.origin}`;
    } else {
      const score = computeScore(state.moves, state.elapsed);
      const head = state.daily ? `Legal Memory Daily #${dailyNumber()}` : `Legal Memory (${DECK_NAMES[prefs.mode]}, ${prefs.level}${isTrial() ? ', trial' : ''})`;
      text = `${head}\n⚖️ ${score} pts · ${state.moves} moves · ${formatTime(state.elapsed)}\n${location.origin}`;
    }
    try {
      track('share', gameParams());
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      el.shareBtn.textContent = 'Copied!';
      setTimeout(() => { el.shareBtn.textContent = 'Share'; }, 1500);
    } catch { /* cancelled */ }
  }

  // ---------- events ----------

  el.board.addEventListener('click', (e) => {
    const btn = e.target.closest('.card');
    if (btn) flip(Number(btn.dataset.key));
  });

  el.board.addEventListener('keydown', (e) => {
    const cards = [...el.board.querySelectorAll('.card')];
    const idx = cards.indexOf(document.activeElement);
    if (idx < 0) return;
    const cols = Number(el.board.style.getPropertyValue('--cols')) || 4;
    const map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (!(e.key in map)) return;
    e.preventDefault();
    cards[idx + map[e.key]]?.focus();
  });

  el.reset.addEventListener('click', newGame);
  el.playAgain.addEventListener('click', newGame);
  el.hint.addEventListener('click', hint);
  el.pause.addEventListener('click', () => setPaused(!state.paused));
  el.resumeBtn.addEventListener('click', () => setPaused(false));
  el.submitForm.addEventListener('submit', submitScore);
  el.shareBtn.addEventListener('click', share);
  el.customSave.addEventListener('click', saveCustomDeck);
  el.customClear.addEventListener('click', clearCustomDeck);

  const onPref = (key, input) => () => { prefs[key] = input.value; save(KEYS.prefs, prefs); newGame(); };
  el.difficulty.addEventListener('change', onPref('level', el.difficulty));
  el.mode.addEventListener('change', onPref('mode', el.mode));
  el.rules.addEventListener('change', onPref('rules', el.rules));
  el.focus.addEventListener('change', () => { prefs.focus = el.focus.checked; save(KEYS.prefs, prefs); newGame(); });
  el.daily.addEventListener('click', () => { state.daily = !state.daily; newGame(); });

  el.sound.addEventListener('click', () => { prefs.sound = !prefs.sound; save(KEYS.prefs, prefs); applySoundButton(); if (prefs.sound) sfx.flip(); });
  el.theme.addEventListener('click', () => {
    prefs.theme = { auto: 'light', light: 'dark', dark: 'auto' }[prefs.theme];
    save(KEYS.prefs, prefs); applyTheme();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'Escape') {
      if (!el.overlay.hidden) newGame();
      else if (state.paused) setPaused(false);
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'h') hint();
    if (k === 'n') newGame();
    if (k === 'p') setPaused(!state.paused);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.started && !state.finished && !state.paused) setPaused(true);
  });

  // ---------- offline / install ----------

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ---------- init ----------

  renderCustomDeck();
  el.difficulty.value = prefs.level;
  el.mode.value = prefs.mode;
  el.rules.value = prefs.rules;
  applyTheme();
  applySoundButton();
  renderAchievements();
  newGame();
})();
