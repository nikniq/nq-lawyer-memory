(() => {
  'use strict';

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

  const DECKS = { icons: ICONS, terms: TERMS, maxims: MAXIMS };
  const DECK_NAMES = { icons: 'Icons', terms: 'Legal terms', maxims: 'Latin maxims' };

  const LEVELS = {
    easy:   { pairs: 6,  cols: 4, trial: 60 },
    normal: { pairs: 8,  cols: 4, trial: 90 },
    hard:   { pairs: 12, cols: 6, trial: 150 },
    expert: { pairs: 16, cols: 8, trial: 210 },
  };

  const PLAYERS = [
    { name: 'Prosecution', emoji: '🔵' },
    { name: 'Defence',     emoji: '🟠' },
  ];

  const MISMATCH_DELAY = 900;
  const HINTS_PER_GAME = 3;
  const HINT_PENALTY = 2;
  const PREVIEW_MS = 1500;
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
    { id: 'daily3',   icon: '📅', name: 'Regular Counsel',   desc: 'Close the Daily Case three days running' },
    { id: 'expert',   icon: '👑', name: 'Senior Counsel',    desc: 'Win on Expert' },
  ];

  const KEYS = {
    best: 'legal-memory-best',
    stats: 'legal-memory-stats',
    prefs: 'legal-memory-prefs',
    ach: 'legal-memory-achievements',
  };

  // ---------- elements ----------

  const $ = (id) => document.getElementById(id);
  const el = {
    board: $('gameBoard'),
    pairsCount: $('pairsCount'), pairsTotal: $('pairsTotal'),
    moves: $('movesCount'), timer: $('timer'), timerLabel: $('timerLabel'),
    streak: $('streakCount'), score: $('scoreCount'), scoreStat: $('scoreStat'),
    difficulty: $('difficulty'), mode: $('mode'), rules: $('rules'),
    daily: $('dailyBtn'), hint: $('hintBtn'), reset: $('resetBtn'),
    sound: $('soundBtn'), theme: $('themeBtn'),
    bestLine: $('bestLine'), bestText: $('bestText'),
    statsLine: $('statsLine'),
    players: $('players'),
    overlay: $('winOverlay'), modalEmoji: $('modalEmoji'), winTitle: $('winTitle'), winText: $('winText'),
    winRecord: $('winRecord'), playAgain: $('playAgainBtn'),
    submitForm: $('submitForm'), nameInput: $('nameInput'), submitBtn: $('submitBtn'),
    submitMsg: $('submitMsg'), shareBtn: $('shareBtn'),
    review: $('review'), reviewList: $('reviewList'),
    boardTitle: $('boardTitle'),
    lbSection: $('leaderboard'), lbTitle: $('lbTitle'), lbList: $('lbList'), lbEmpty: $('lbEmpty'),
    achList: $('achList'), achCount: $('achCount'),
    toasts: $('toasts'),
    confetti: $('confetti'),
  };

  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  // ---------- persistence ----------

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* unavailable */ }
  }

  const prefs = Object.assign({ level: 'normal', mode: 'icons', rules: 'classic', sound: true, theme: 'auto', name: '' }, load(KEYS.prefs, {}));
  const stats = Object.assign({ played: 0, won: 0, bestStreak: 0, dailyStreak: 0, lastDaily: null }, load(KEYS.stats, {}));
  const unlocked = load(KEYS.ach, {});
  if (!LEVELS[prefs.level]) prefs.level = 'normal';
  if (!DECKS[prefs.mode]) prefs.mode = 'icons';

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
    player: 0,
    playerPairs: [0, 0],
    misses: {},          // pair id -> times it was flipped and not matched
  };

  const level = () => LEVELS[prefs.level];
  const isVersus = () => prefs.rules === 'versus';
  const isTrial = () => prefs.rules === 'trial';
  const isTermDeck = () => prefs.mode !== 'icons';
  const trialMs = () => level().trial * 1000;
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

  const dailyDate = () => new Date().toISOString().slice(0, 10);
  const dailyNumber = () => Math.floor((Date.now() - DAILY_EPOCH) / 86400000) + 1;
  const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // ---------- formatting ----------

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
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
    tick:  () => tone(900, 0.04, 'square', 0, 0.03),
    win:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', i * 0.12)),
    lose:  () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', i * 0.2, 0.06)),
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

  // ---------- timer ----------

  function renderTimer() {
    if (isTrial()) {
      const left = trialMs() - state.elapsed;
      el.timer.textContent = formatTime(left);
      el.timer.classList.toggle('is-urgent', left <= 10000 && !state.finished);
    } else {
      el.timer.textContent = formatTime(state.elapsed);
    }
  }

  let lastTickSecond = -1;
  function startTimer() {
    if (state.timerId || state.finished) return;
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

  // ---------- game ----------

  function buildDeck(rand) {
    const { pairs } = level();
    const deck = DECKS[prefs.mode];
    if (isTermDeck()) {
      return shuffle(deck, rand).slice(0, pairs).flatMap((t) => [
        { id: t.id, face: 'term', title: t.term, text: '', label: t.term, term: t.term, def: t.def },
        { id: t.id, face: 'def',  title: '', text: t.def, label: `Definition: ${t.def}`, term: t.term, def: t.def },
      ]);
    }
    return shuffle(deck, rand).slice(0, pairs).flatMap((c) => [
      { id: c.id, face: 'icon', icon: c.icon, title: c.name, label: c.name },
      { id: c.id, face: 'icon', icon: c.icon, title: c.name, label: c.name },
    ]);
  }

  function newGame() {
    stopTimer();
    lastTickSecond = -1;
    const { pairs, cols } = level();
    const rand = state.daily ? mulberry32(hashString(`${dailyDate()}|${prefs.mode}|${prefs.level}`)) : Math.random;

    state.cards = shuffle(buildDeck(rand), rand).map((c, i) => ({ ...c, key: i, flipped: false, matched: false }));
    Object.assign(state, {
      flipped: [], matched: 0, moves: 0, streak: 0, hintsUsed: 0,
      locked: false, started: false, startedAt: null, elapsed: 0, finished: false,
      player: 0, playerPairs: [0, 0], misses: {},
    });

    el.board.style.setProperty('--cols', cols);
    el.board.classList.toggle('board--terms', isTermDeck());
    el.board.classList.toggle('board--dense', pairs >= 12);
    el.pairsTotal.textContent = pairs;
    el.overlay.hidden = true;
    el.daily.classList.toggle('is-active', state.daily);
    el.daily.setAttribute('aria-pressed', String(state.daily));
    el.timerLabel.textContent = isTrial() ? 'Time left' : 'Time';
    el.timer.classList.remove('is-urgent');
    el.scoreStat.hidden = isVersus();
    el.players.hidden = !isVersus();
    el.lbSection.hidden = isVersus();

    const rulesName = { classic: '', trial: ' · Trial', versus: ' · Versus' }[prefs.rules];
    el.boardTitle.textContent = state.daily
      ? `Daily Case #${dailyNumber()} · ${dailyDate()}${rulesName}`
      : `${DECK_NAMES[prefs.mode]} · ${prefs.level}${rulesName}`;

    renderBoard();
    renderTimer();
    updateStats();
    renderPlayers();
    renderBest();
    renderStatsLine();
    if (!isVersus()) loadLeaderboard();

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
      a.owner = b.owner = state.player;
      state.flipped = [];
      state.matched++;
      state.streak++;
      if (isVersus()) state.playerPairs[state.player]++;
      if (state.streak > stats.bestStreak) { stats.bestStreak = state.streak; save(KEYS.stats, stats); }
      if (state.streak >= 5) unlock('streak5');
      sfx.match();
      setCardView(a); setCardView(b);
      if (state.streak >= 2) [a, b].forEach((c) => cardEl(c.key).classList.add('is-combo'));
      updateStats();
      renderPlayers();
      if (state.matched === level().pairs) setTimeout(win, 600);
      return;
    }

    state.streak = 0;
    state.locked = true;
    sfx.miss();
    [a, b].forEach((c) => { state.misses[c.id] = (state.misses[c.id] || 0) + 1; cardEl(c.key).classList.add('is-miss'); });
    updateStats();

    setTimeout(() => {
      a.flipped = b.flipped = false;
      cardEl(a.key).classList.remove('is-miss');
      cardEl(b.key).classList.remove('is-miss');
      setCardView(a); setCardView(b);
      state.flipped = [];
      state.locked = false;
      if (isVersus() && !state.finished) { state.player = 1 - state.player; renderPlayers(); }
    }, MISMATCH_DELAY);
  }

  function hint() {
    if (state.locked || state.finished || state.hintsUsed >= HINTS_PER_GAME || state.flipped.length) return;
    const hidden = state.cards.filter((c) => !c.matched && !c.flipped);
    if (hidden.length < 2) return;
    const first = hidden[Math.floor(Math.random() * hidden.length)];
    const partner = hidden.find((c) => c.id === first.id && c.key !== first.key);
    if (!partner) return;

    state.hintsUsed++;
    state.moves += HINT_PENALTY;
    state.streak = 0;
    if (!state.started) { state.started = true; stats.played++; save(KEYS.stats, stats); }
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
    if (isVersus()) return;
    el.score.textContent = state.started ? computeScore(state.moves, state.elapsed) : level().pairs * 1000;
  }

  function updateStats() {
    el.pairsCount.textContent = state.matched;
    el.moves.textContent = state.moves;
    el.streak.textContent = state.streak >= 2 ? `🔥${state.streak}` : state.streak;
    const left = HINTS_PER_GAME - state.hintsUsed;
    el.hint.textContent = `Hint (${left})`;
    el.hint.disabled = left <= 0 || state.finished;
    renderScore();
  }

  function renderPlayers() {
    if (!isVersus()) return;
    el.players.innerHTML = PLAYERS.map((p, i) => `
      <div class="player ${state.player === i && !state.finished ? 'is-turn' : ''} player--${i}">
        <span class="player-name">${p.emoji} ${p.name}</span>
        <span class="player-pairs">${state.playerPairs[i]}</span>
        <span class="player-turn">${state.player === i && !state.finished ? 'Your turn' : ''}</span>
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
      .filter(([, n]) => n >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    el.review.hidden = !isTermDeck() || !missed.length;
    if (el.review.hidden) return;
    el.reviewList.innerHTML = missed.map(([id, n]) => {
      const c = state.cards.find((x) => String(x.id) === id);
      return `<li><strong>${escapeHtml(c.term)}</strong> — ${escapeHtml(c.def)} <small>(missed ×${n})</small></li>`;
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

  function checkAchievements(score) {
    unlock('first');
    const hardPlus = prefs.level === 'hard' || prefs.level === 'expert';
    if (state.moves === level().pairs) unlock('perfect');
    if (hardPlus && state.hintsUsed === 0) unlock('nohint');
    if (prefs.level !== 'easy' && state.elapsed < 45000) unlock('speedy');
    if (prefs.mode === 'terms' && hardPlus) unlock('scholar');
    if (prefs.mode === 'maxims') unlock('classic');
    if (isTrial()) unlock('clock');
    if (prefs.level === 'expert') unlock('expert');
    void score;
  }

  function openModal() {
    el.overlay.hidden = false;
  }

  function win() {
    if (state.finished) return;
    stopTimer();
    state.finished = true;
    stats.won++;
    save(KEYS.stats, stats);
    renderStatsLine();
    updateStats();
    renderPlayers();
    renderReview();
    sfx.win();
    confetti();
    recordDaily();

    el.modalEmoji.textContent = '🎉';
    el.submitForm.hidden = true;
    el.submitMsg.textContent = '';
    el.winRecord.hidden = true;

    if (isVersus()) {
      const [p0, p1] = state.playerPairs;
      const tie = p0 === p1;
      const w = p0 > p1 ? 0 : 1;
      el.winTitle.textContent = tie ? 'Hung jury!' : `${PLAYERS[w].emoji} ${PLAYERS[w].name} wins!`;
      el.winText.textContent = `${PLAYERS[0].name} ${p0} · ${PLAYERS[1].name} ${p1} · ${state.moves} moves · ${formatTime(state.elapsed)}`;
      unlock('first');
      if (!tie) unlock('versus');
      openModal();
      el.playAgain.focus();
      return;
    }

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
    el.submitForm.hidden = false;
    el.submitBtn.disabled = false;
    el.nameInput.value = prefs.name;
    openModal();
    (prefs.name ? el.submitBtn : el.nameInput).focus();
    checkAchievements(score);
  }

  function lose() {
    if (state.finished) return;
    stopTimer();
    state.finished = true;
    state.locked = true;
    updateStats();
    sfx.lose();
    el.timer.classList.remove('is-urgent');
    state.cards.forEach((c) => { if (!c.matched) { c.flipped = true; setCardView(c); } });

    el.modalEmoji.textContent = '⏰';
    el.winTitle.textContent = 'Mistrial!';
    el.winText.textContent = `Time ran out with ${state.matched} of ${level().pairs} pairs found in ${state.moves} moves.`;
    el.winRecord.hidden = true;
    el.submitForm.hidden = true;
    el.submitMsg.textContent = '';
    el.review.hidden = true;
    renderReview();
    openModal();
    el.playAgain.focus();
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
    el.lbTitle.textContent = state.daily ? `Today's top lawyers` : `Top lawyers · ${DECK_NAMES[prefs.mode]} · ${prefs.level}`;
    el.lbList.innerHTML = '';
    el.lbEmpty.hidden = true;
    try {
      const res = await fetch(`/api/scores?${lbParams()}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      const { scores } = await res.json();
      if (!scores.length) { el.lbEmpty.textContent = 'No results filed yet. Close a case and be the first.'; el.lbEmpty.hidden = false; return; }
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
    let text;
    if (isVersus()) {
      const [p0, p1] = state.playerPairs;
      text = `Legal Memory Versus\n🔵 Prosecution ${p0} · 🟠 Defence ${p1}\n${location.origin}`;
    } else {
      const score = computeScore(state.moves, state.elapsed);
      const head = state.daily ? `Legal Memory Daily #${dailyNumber()}` : `Legal Memory (${DECK_NAMES[prefs.mode]}, ${prefs.level}${isTrial() ? ', trial' : ''})`;
      text = `${head}\n⚖️ ${score} pts · ${state.moves} moves · ${formatTime(state.elapsed)}\n${location.origin}`;
    }
    try {
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

  const onPref = (key, input) => () => { prefs[key] = input.value; save(KEYS.prefs, prefs); newGame(); };
  el.difficulty.addEventListener('change', onPref('level', el.difficulty));
  el.mode.addEventListener('change', onPref('mode', el.mode));
  el.rules.addEventListener('change', onPref('rules', el.rules));
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

  // ---------- offline / install ----------

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ---------- init ----------

  el.difficulty.value = prefs.level;
  el.mode.value = prefs.mode;
  el.rules.value = prefs.rules;
  applyTheme();
  applySoundButton();
  renderAchievements();
  newGame();
})();
