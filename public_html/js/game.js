(() => {
  'use strict';

  // ---------- decks ----------

  // Icon deck: both cards in a pair look the same.
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
  ];

  // Terms deck: one card shows the term, its partner shows the definition.
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

  const LEVELS = {
    easy:   { pairs: 6,  cols: 4 },
    normal: { pairs: 8,  cols: 4 },
    hard:   { pairs: 12, cols: 6 },
  };

  const MISMATCH_DELAY = 900;
  const HINTS_PER_GAME = 3;
  const HINT_PENALTY = 2;        // moves added per hint
  const PREVIEW_MS = 1500;       // easy-level peek at the start
  const DAILY_EPOCH = Date.UTC(2026, 0, 1);

  const KEYS = {
    best: 'legal-memory-best',
    stats: 'legal-memory-stats',
    prefs: 'legal-memory-prefs',
  };

  // ---------- elements ----------

  const $ = (id) => document.getElementById(id);
  const el = {
    board: $('gameBoard'),
    pairsCount: $('pairsCount'), pairsTotal: $('pairsTotal'),
    moves: $('movesCount'), timer: $('timer'),
    streak: $('streakCount'), score: $('scoreCount'),
    difficulty: $('difficulty'), mode: $('mode'),
    daily: $('dailyBtn'), hint: $('hintBtn'), reset: $('resetBtn'),
    sound: $('soundBtn'), theme: $('themeBtn'),
    bestLine: $('bestLine'), bestText: $('bestText'),
    statsLine: $('statsLine'),
    overlay: $('winOverlay'), winTitle: $('winTitle'), winText: $('winText'),
    winRecord: $('winRecord'), playAgain: $('playAgainBtn'),
    submitForm: $('submitForm'), nameInput: $('nameInput'), submitBtn: $('submitBtn'),
    submitMsg: $('submitMsg'), shareBtn: $('shareBtn'),
    board_title: $('boardTitle'),
    lbTitle: $('lbTitle'), lbList: $('lbList'), lbEmpty: $('lbEmpty'),
    confetti: $('confetti'),
  };

  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  // ---------- persistent prefs / stats ----------

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* unavailable */ }
  }

  const prefs = Object.assign({ level: 'normal', mode: 'icons', sound: true, theme: 'auto', name: '' }, load(KEYS.prefs, {}));
  const stats = Object.assign({ played: 0, won: 0, bestStreak: 0 }, load(KEYS.stats, {}));

  // ---------- state ----------

  const state = {
    daily: false,
    cards: [],
    flipped: [],
    matched: 0,
    moves: 0,
    streak: 0,
    hintsLeft: HINTS_PER_GAME,
    locked: false,
    started: false,
    startedAt: null,
    elapsed: 0,
    timerId: null,
    finished: false,
  };

  const level = () => LEVELS[prefs.level];
  const bestKey = () => `${prefs.mode}-${prefs.level}${state.daily ? '-' + dailyDate() : ''}`;

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

  function dailyDate() {
    return new Date().toISOString().slice(0, 10);
  }
  function dailyNumber() {
    return Math.floor((Date.now() - DAILY_EPOCH) / 86400000) + 1;
  }

  // ---------- formatting ----------

  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  // Mirrors Score::compute on the server.
  function computeScore(moves, ms) {
    const pairs = level().pairs;
    const extra = Math.max(0, moves - pairs);
    return Math.max(0, pairs * 1000 - extra * 25 - Math.floor(ms / 500));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- sound ----------

  let audioCtx = null;
  function tone(freq, duration = 0.08, type = 'sine', when = 0, gain = 0.08) {
    if (!prefs.sound) return;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      g.gain.setValueAtTime(gain, audioCtx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + when + duration);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + when);
      osc.stop(audioCtx.currentTime + when + duration);
    } catch { /* audio unavailable */ }
  }
  const sfx = {
    flip:  () => tone(520, 0.05, 'triangle'),
    match: () => { tone(660, 0.1); tone(880, 0.15, 'sine', 0.08); },
    miss:  () => tone(180, 0.2, 'sawtooth', 0, 0.05),
    hint:  () => tone(440, 0.1, 'square', 0, 0.04),
    win:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', i * 0.12)),
  };

  // ---------- theme ----------

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

  // ---------- timer ----------

  function startTimer() {
    if (state.timerId) return;
    state.startedAt = Date.now() - state.elapsed;
    state.timerId = setInterval(() => {
      state.elapsed = Date.now() - state.startedAt;
      el.timer.textContent = formatTime(state.elapsed);
      renderScore();
    }, 250);
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
    if (state.startedAt) state.elapsed = Date.now() - state.startedAt;
    el.timer.textContent = formatTime(state.elapsed);
  }

  // ---------- game ----------

  function buildDeck(rand) {
    const { pairs } = level();
    if (prefs.mode === 'terms') {
      return shuffle(TERMS, rand).slice(0, pairs).flatMap((t) => [
        { id: t.id, face: 'term', title: t.term, text: '', label: t.term },
        { id: t.id, face: 'def',  title: '', text: t.def, label: `Definition: ${t.def}` },
      ]);
    }
    return shuffle(ICONS, rand).slice(0, pairs).flatMap((c) => [
      { id: c.id, face: 'icon', icon: c.icon, title: c.name, label: c.name },
      { id: c.id, face: 'icon', icon: c.icon, title: c.name, label: c.name },
    ]);
  }

  function newGame() {
    stopTimer();
    const { pairs, cols } = level();
    const rand = state.daily ? mulberry32(hashString(`${dailyDate()}|${prefs.mode}|${prefs.level}`)) : Math.random;

    state.cards = shuffle(buildDeck(rand), rand).map((c, i) => ({ ...c, key: i, flipped: false, matched: false }));
    Object.assign(state, {
      flipped: [], matched: 0, moves: 0, streak: 0, hintsLeft: HINTS_PER_GAME,
      locked: false, started: false, startedAt: null, elapsed: 0, finished: false,
    });

    el.board.style.setProperty('--cols', cols);
    el.board.classList.toggle('board--terms', prefs.mode === 'terms');
    el.pairsTotal.textContent = pairs;
    el.overlay.hidden = true;
    el.timer.textContent = '0:00';
    el.daily.classList.toggle('is-active', state.daily);
    el.daily.setAttribute('aria-pressed', String(state.daily));
    el.board_title.textContent = state.daily
      ? `Daily Case #${dailyNumber()} · ${dailyDate()}`
      : `${prefs.mode === 'terms' ? 'Legal terms' : 'Icons'} · ${prefs.level}`;

    renderBoard();
    updateStats();
    renderBest();
    renderStatsLine();
    loadLeaderboard();

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
    if (card.face === 'term') {
      return `<span class="card-term">${escapeHtml(card.title)}</span>`;
    }
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
    const faceUp = card.flipped || card.matched;
    node.setAttribute('aria-pressed', String(faceUp));
    node.setAttribute('aria-label', faceUp ? `${card.label}${card.matched ? ', matched' : ''}` : 'Face-down card');
    node.disabled = card.matched;
  }

  function flip(key) {
    if (state.locked || state.finished) return;
    const card = state.cards[key];
    if (!card || card.flipped || card.matched) return;

    if (!state.started) { state.started = true; stats.played++; save(KEYS.stats, stats); renderStatsLine(); }
    startTimer();
    sfx.flip();
    card.flipped = true;
    state.flipped.push(card);
    setCardView(card);

    if (state.flipped.length === 2) {
      state.moves++;
      updateStats();
      checkMatch();
    }
  }

  function checkMatch() {
    const [a, b] = state.flipped;

    if (a.id === b.id) {
      a.matched = b.matched = true;
      a.flipped = b.flipped = false;
      state.flipped = [];
      state.matched++;
      state.streak++;
      if (state.streak > stats.bestStreak) { stats.bestStreak = state.streak; save(KEYS.stats, stats); }
      sfx.match();
      setCardView(a); setCardView(b);
      if (state.streak >= 2) [a, b].forEach((c) => cardEl(c.key).classList.add('is-combo'));
      updateStats();
      if (state.matched === level().pairs) setTimeout(win, 600);
      return;
    }

    state.streak = 0;
    state.locked = true;
    sfx.miss();
    cardEl(a.key).classList.add('is-miss');
    cardEl(b.key).classList.add('is-miss');
    updateStats();

    setTimeout(() => {
      a.flipped = b.flipped = false;
      cardEl(a.key).classList.remove('is-miss');
      cardEl(b.key).classList.remove('is-miss');
      setCardView(a); setCardView(b);
      state.flipped = [];
      state.locked = false;
    }, MISMATCH_DELAY);
  }

  // Reveal one unmatched pair briefly. Costs moves, so it is a trade, not a cheat.
  function hint() {
    if (state.locked || state.finished || state.hintsLeft <= 0 || state.flipped.length) return;
    const hidden = state.cards.filter((c) => !c.matched && !c.flipped);
    if (hidden.length < 2) return;
    const first = hidden[Math.floor(Math.random() * hidden.length)];
    const partner = hidden.find((c) => c.id === first.id && c.key !== first.key);
    if (!partner) return;

    state.hintsLeft--;
    state.moves += HINT_PENALTY;
    state.streak = 0;
    state.started = true;
    startTimer();
    sfx.hint();
    updateStats();

    state.locked = true;
    [first, partner].forEach((c) => { c.flipped = true; setCardView(c); cardEl(c.key).classList.add('is-hint'); });
    setTimeout(() => {
      [first, partner].forEach((c) => { c.flipped = false; setCardView(c); cardEl(c.key).classList.remove('is-hint'); });
      state.locked = false;
    }, 1000);
  }

  function renderScore() {
    el.score.textContent = state.started ? computeScore(state.moves, state.elapsed) : level().pairs * 1000;
  }

  function updateStats() {
    el.pairsCount.textContent = state.matched;
    el.moves.textContent = state.moves;
    el.streak.textContent = state.streak >= 2 ? `🔥${state.streak}` : state.streak;
    el.hint.textContent = `Hint (${state.hintsLeft})`;
    el.hint.disabled = state.hintsLeft <= 0 || state.finished;
    renderScore();
  }

  function renderBest() {
    const best = load(KEYS.best, {})[bestKey()];
    el.bestLine.hidden = !best;
    if (best) el.bestText.textContent = `${best.score} pts · ${best.moves} moves in ${formatTime(best.time)}`;
  }

  function renderStatsLine() {
    const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
    el.statsLine.textContent = `Games ${stats.played} · Closed ${stats.won} (${rate}%) · Best streak ${stats.bestStreak}`;
  }

  function win() {
    stopTimer();
    state.finished = true;
    stats.won++;
    save(KEYS.stats, stats);
    renderStatsLine();
    updateStats();
    sfx.win();
    confetti();

    const score = computeScore(state.moves, state.elapsed);
    const best = load(KEYS.best, {});
    const prev = best[bestKey()];
    const isRecord = !prev || score > prev.score;
    if (isRecord) {
      best[bestKey()] = { score, moves: state.moves, time: state.elapsed };
      save(KEYS.best, best);
      renderBest();
    }

    el.winTitle.textContent = state.daily ? `Daily Case #${dailyNumber()} closed!` : 'Case closed!';
    el.winText.textContent = `${score} points · ${state.moves} moves · ${formatTime(state.elapsed)}`;
    el.winRecord.hidden = !isRecord;
    el.submitForm.hidden = false;
    el.submitBtn.disabled = false;
    el.submitMsg.textContent = '';
    el.nameInput.value = prefs.name;
    el.overlay.hidden = false;
    (prefs.name ? el.submitBtn : el.nameInput).focus();
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

  // ---------- leaderboard ----------

  function lbParams() {
    const p = new URLSearchParams({ level: prefs.level, mode: prefs.mode });
    if (state.daily) p.set('daily', dailyDate());
    return p;
  }

  async function loadLeaderboard() {
    el.lbTitle.textContent = state.daily ? `Today's top lawyers` : `Top lawyers · ${prefs.mode} · ${prefs.level}`;
    el.lbList.innerHTML = '';
    el.lbEmpty.hidden = true;
    try {
      const res = await fetch(`/api/scores?${lbParams()}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      const { scores } = await res.json();
      if (!scores.length) { el.lbEmpty.hidden = false; return; }
      el.lbList.innerHTML = scores.map((s, i) => `
        <li>
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
      loadLeaderboard();
    } catch (err) {
      el.submitMsg.textContent = err.message;
      el.submitBtn.disabled = false;
    }
  }

  // ---------- share ----------

  async function share() {
    const score = computeScore(state.moves, state.elapsed);
    const head = state.daily ? `Legal Memory Daily #${dailyNumber()}` : `Legal Memory (${prefs.mode}, ${prefs.level})`;
    const text = `${head}\n⚖️ ${score} pts · ${state.moves} moves · ${formatTime(state.elapsed)}\n${location.origin}`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      el.shareBtn.textContent = 'Copied!';
      setTimeout(() => { el.shareBtn.textContent = 'Share'; }, 1500);
    } catch { /* user cancelled */ }
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
    const cols = level().cols;
    const map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (!(e.key in map)) return;
    e.preventDefault();
    cards[idx + map[e.key]]?.focus();
  });

  el.reset.addEventListener('click', newGame);
  el.playAgain.addEventListener('click', newGame);
  el.hint.addEventListener('click', hint);
  el.submitForm.addEventListener('submit', submitScore);
  el.shareBtn.addEventListener('click', share);

  el.difficulty.addEventListener('change', () => { prefs.level = el.difficulty.value; save(KEYS.prefs, prefs); newGame(); });
  el.mode.addEventListener('change', () => { prefs.mode = el.mode.value; save(KEYS.prefs, prefs); newGame(); });
  el.daily.addEventListener('click', () => { state.daily = !state.daily; newGame(); });

  el.sound.addEventListener('click', () => { prefs.sound = !prefs.sound; save(KEYS.prefs, prefs); applySoundButton(); if (prefs.sound) sfx.flip(); });
  el.theme.addEventListener('click', () => {
    prefs.theme = { auto: 'light', light: 'dark', dark: 'auto' }[prefs.theme];
    save(KEYS.prefs, prefs); applyTheme();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'Escape' && !el.overlay.hidden) newGame();
    if (e.key.toLowerCase() === 'h') hint();
    if (e.key.toLowerCase() === 'n') newGame();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state.timerId) stopTimer(); }
    else if (state.started && !state.finished) startTimer();
  });

  // ---------- init ----------

  el.difficulty.value = prefs.level;
  el.mode.value = prefs.mode;
  applyTheme();
  applySoundButton();
  newGame();
})();
