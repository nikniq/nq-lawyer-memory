(() => {
  'use strict';

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

  const LEVELS = {
    easy:   { pairs: 6,  cols: 4 },
    normal: { pairs: 8,  cols: 4 },
    hard:   { pairs: 12, cols: 6 },
  };

  const MISMATCH_DELAY = 900;
  const STORAGE_KEY = 'legal-memory-best';

  const el = {
    board: document.getElementById('gameBoard'),
    pairsCount: document.getElementById('pairsCount'),
    pairsTotal: document.getElementById('pairsTotal'),
    moves: document.getElementById('movesCount'),
    timer: document.getElementById('timer'),
    difficulty: document.getElementById('difficulty'),
    reset: document.getElementById('resetBtn'),
    bestLine: document.getElementById('bestLine'),
    bestText: document.getElementById('bestText'),
    overlay: document.getElementById('winOverlay'),
    winText: document.getElementById('winText'),
    winRecord: document.getElementById('winRecord'),
    playAgain: document.getElementById('playAgainBtn'),
  };

  const state = {
    level: 'normal',
    cards: [],
    flipped: [],
    matched: 0,
    moves: 0,
    locked: false,
    startedAt: null,
    elapsed: 0,
    timerId: null,
  };

  // ---------- helpers ----------

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function loadBest() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }

  function saveBest(best) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(best)); } catch { /* storage unavailable */ }
  }

  function renderBest() {
    const best = loadBest()[state.level];
    el.bestLine.hidden = !best;
    if (best) el.bestText.textContent = `${best.moves} moves in ${formatTime(best.time)}`;
  }

  // ---------- timer ----------

  function startTimer() {
    if (state.timerId) return;
    state.startedAt = Date.now() - state.elapsed;
    state.timerId = setInterval(() => {
      state.elapsed = Date.now() - state.startedAt;
      el.timer.textContent = formatTime(state.elapsed);
    }, 250);
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
    if (state.startedAt) state.elapsed = Date.now() - state.startedAt;
    el.timer.textContent = formatTime(state.elapsed);
  }

  // ---------- game ----------

  function newGame() {
    stopTimer();
    const { pairs, cols } = LEVELS[state.level];
    const chosen = shuffle(ICONS).slice(0, pairs);

    state.cards = shuffle([...chosen, ...chosen]).map((c, i) => ({
      ...c, key: i, flipped: false, matched: false,
    }));
    state.flipped = [];
    state.matched = 0;
    state.moves = 0;
    state.locked = false;
    state.startedAt = null;
    state.elapsed = 0;

    el.board.style.setProperty('--cols', cols);
    el.pairsTotal.textContent = pairs;
    el.overlay.hidden = true;
    el.timer.textContent = '0:00';

    renderBoard();
    updateStats();
    renderBest();
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
          <div class="card-face card-face--front" aria-hidden="true">
            <span class="card-icon">${card.icon}</span>
            <span class="card-name">${card.name}</span>
          </div>
        </div>`;
      frag.appendChild(btn);
    });

    el.board.appendChild(frag);
  }

  function cardEl(key) {
    return el.board.querySelector(`[data-key="${key}"]`);
  }

  function setCardView(card) {
    const node = cardEl(card.key);
    node.classList.toggle('is-flipped', card.flipped);
    node.classList.toggle('is-matched', card.matched);
    const faceUp = card.flipped || card.matched;
    node.setAttribute('aria-pressed', String(faceUp));
    node.setAttribute('aria-label', faceUp ? `${card.name}${card.matched ? ', matched' : ''}` : 'Face-down card');
    if (card.matched) node.disabled = true;
  }

  function flip(key) {
    if (state.locked) return;
    const card = state.cards[key];
    if (!card || card.flipped || card.matched) return;

    startTimer();
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
      setCardView(a);
      setCardView(b);
      updateStats();
      if (state.matched === LEVELS[state.level].pairs) setTimeout(win, 600);
      return;
    }

    state.locked = true;
    cardEl(a.key).classList.add('is-miss');
    cardEl(b.key).classList.add('is-miss');

    setTimeout(() => {
      a.flipped = b.flipped = false;
      cardEl(a.key).classList.remove('is-miss');
      cardEl(b.key).classList.remove('is-miss');
      setCardView(a);
      setCardView(b);
      state.flipped = [];
      state.locked = false;
    }, MISMATCH_DELAY);
  }

  function updateStats() {
    el.pairsCount.textContent = state.matched;
    el.moves.textContent = state.moves;
  }

  function win() {
    stopTimer();
    const best = loadBest();
    const prev = best[state.level];
    const isRecord = !prev || state.moves < prev.moves || (state.moves === prev.moves && state.elapsed < prev.time);

    if (isRecord) {
      best[state.level] = { moves: state.moves, time: state.elapsed };
      saveBest(best);
      renderBest();
    }

    el.winText.textContent = `You found all ${LEVELS[state.level].pairs} pairs in ${state.moves} moves and ${formatTime(state.elapsed)}.`;
    el.winRecord.hidden = !isRecord;
    el.overlay.hidden = false;
    el.playAgain.focus();
  }

  // ---------- events ----------

  el.board.addEventListener('click', (e) => {
    const btn = e.target.closest('.card');
    if (btn) flip(Number(btn.dataset.key));
  });

  // Arrow-key navigation across the grid.
  el.board.addEventListener('keydown', (e) => {
    const cards = [...el.board.querySelectorAll('.card')];
    const idx = cards.indexOf(document.activeElement);
    if (idx < 0) return;
    const cols = LEVELS[state.level].cols;
    const map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = cards[idx + map[e.key]];
    if (next) next.focus();
  });

  el.reset.addEventListener('click', newGame);
  el.playAgain.addEventListener('click', newGame);
  el.difficulty.addEventListener('change', () => {
    state.level = el.difficulty.value;
    newGame();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.overlay.hidden) newGame();
  });

  // Pause the clock when the tab is hidden so idle time doesn't count.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state.timerId) stopTimer(); }
    else if (state.startedAt && state.matched < LEVELS[state.level].pairs && state.moves > 0) startTimer();
  });

  newGame();
})();
