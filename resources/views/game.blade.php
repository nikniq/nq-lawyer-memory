<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>{{ config('app.name') }}</title>
  <meta name="description" content="A legal-themed memory game. Match icons or legal terms to their definitions, beat the daily case, and climb the leaderboard.">
  <meta name="theme-color" content="#0f172a">
  <link rel="canonical" href="{{ url('/') }}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{{ config('app.name') }}">
  <meta property="og:description" content="Match legal icons, terms and Latin maxims. Beat the daily case, outwit Counsel Bot, and climb the leaderboard.">
  <meta property="og:url" content="{{ url('/') }}">
  <meta property="og:image" content="{{ asset('og.png') }}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{ config('app.name') }}">
  <meta name="twitter:description" content="A legal-themed memory game with a daily case and online leaderboard.">
  <meta name="twitter:image" content="{{ asset('og.png') }}">
  <link rel="stylesheet" href="{{ asset('css/game.css') }}?v=5">
  <link rel="manifest" href="{{ asset('manifest.json') }}">
  <link rel="icon" href="{{ asset('icon.svg') }}" type="image/svg+xml">
  <link rel="apple-touch-icon" href="{{ asset('icon.svg') }}">
  <meta name="apple-mobile-web-app-capable" content="yes">

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-34RWEG01MV"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-34RWEG01MV');
  </script>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="header-row">
        <h1 class="title">{{ config('app.name') }}</h1>
        <div class="icon-btns">
          <button type="button" class="icon-btn" id="soundBtn" aria-label="Sound on" aria-pressed="true">🔊</button>
          <button type="button" class="icon-btn" id="themeBtn" aria-label="Theme: auto">🌓</button>
        </div>
      </div>
      <p class="tagline">Find every matching pair to close the case.</p>
    </header>

    <main class="game">
      <div class="toolbar">
        <div class="stats" aria-live="polite">
          <div class="stat"><span class="stat-label">Pairs</span><span class="stat-value"><span id="pairsCount">0</span>/<span id="pairsTotal">8</span></span></div>
          <div class="stat"><span class="stat-label">Moves</span><span class="stat-value" id="movesCount">0</span></div>
          <div class="stat"><span class="stat-label" id="timerLabel">Time</span><span class="stat-value" id="timer">0:00</span></div>
          <div class="stat"><span class="stat-label">Streak</span><span class="stat-value" id="streakCount">0</span></div>
          <div class="stat stat--score" id="scoreStat"><span class="stat-label">Score</span><span class="stat-value" id="scoreCount">8000</span></div>
        </div>
        <div class="controls">
          <label class="select-wrap">
            <span class="sr-only">Deck</span>
            <select id="mode" aria-label="Deck">
              <option value="icons">Icons</option>
              <option value="terms">Legal terms</option>
              <option value="maxims">Latin maxims</option>
              <option value="custom" id="customOption" disabled>My deck</option>
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">Rules</span>
            <select id="rules" aria-label="Rules">
              <option value="classic">Classic</option>
              <option value="trial">Trial · beat the clock</option>
              <option value="versus">Versus · 2 players</option>
              <option value="computer">Versus · Counsel Bot</option>
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">Difficulty</span>
            <select id="difficulty" aria-label="Difficulty">
              <option value="easy">Easy · 6 pairs</option>
              <option value="normal" selected>Normal · 8 pairs</option>
              <option value="hard">Hard · 12 pairs</option>
              <option value="expert">Expert · 16 pairs</option>
            </select>
          </label>
          <button type="button" class="btn btn--ghost" id="dailyBtn" aria-pressed="false" title="Same board for everyone today">📅 Daily Case</button>
          <button type="button" class="btn btn--ghost" id="hintBtn" title="Reveal a pair for a moment (+2 moves). Shortcut: H">Hint (3)</button>
          <button type="button" class="btn btn--ghost" id="pauseBtn" aria-pressed="false" title="Shortcut: P" disabled>Pause</button>
          <button type="button" class="btn" id="resetBtn" title="Shortcut: N">New Game</button>
        </div>
      </div>

      <p class="board-title" id="boardTitle"></p>
      <label class="focus-wrap" id="focusWrap" hidden>
        <input type="checkbox" id="focusToggle"> Focus on terms I keep missing
      </label>
      <div class="players" id="players" hidden aria-live="polite"></div>
      <div class="board-wrap">
        <div id="gameBoard" class="board" role="grid" aria-label="Memory card board"></div>
        <div class="paused" id="pausedOverlay" hidden>
          <p>Court is in recess</p>
          <button type="button" class="btn" id="resumeBtn">Resume</button>
        </div>
      </div>

      <p class="best" id="bestLine" hidden>Your best here: <strong id="bestText"></strong></p>
      <p class="best stats-line" id="statsLine"></p>
      <p class="best summary-line" id="summaryLine" hidden></p>

      <section class="leaderboard" id="leaderboard" aria-labelledby="lbTitle">
        <h2 class="lb-title" id="lbTitle">Top lawyers</h2>
        <ol class="lb-list" id="lbList"></ol>
        <p class="lb-empty" id="lbEmpty" hidden>No results filed yet. Close a case and be the first.</p>
      </section>

      <details class="custom">
        <summary>Build your own deck</summary>
        <p class="custom-help">One pair per line, as <code>term — definition</code>. At least 6 pairs. Saved in this browser only; custom games don't file to the leaderboard.</p>
        <textarea id="customText" class="custom-text" rows="6" spellcheck="false" placeholder="Consideration — Something of value exchanged in a contract&#10;Estoppel — Bar on denying what one earlier asserted"></textarea>
        <div class="custom-actions">
          <button type="button" class="btn" id="customSave">Save deck</button>
          <button type="button" class="btn btn--ghost" id="customClear" hidden>Clear</button>
          <span class="custom-msg" id="customMsg" aria-live="polite"></span>
        </div>
      </details>

      <details class="achievements">
        <summary>Achievements <span class="ach-count" id="achCount"></span></summary>
        <ul class="ach-list" id="achList"></ul>
      </details>

      <details class="howto">
        <summary>How to play</summary>
        <ul>
          <li><strong>Classic</strong> is the standard game. <strong>Trial</strong> gives you a time limit per level. <strong>Versus</strong> is two players on one screen, or you against Counsel Bot, whose memory sharpens with the difficulty. A match earns another go, and whoever holds more pairs wins.</li>
          <li><strong>Focus</strong> deals the terms you have missed most in past games more often. Switch it on above the board when playing a term deck.</li>
          <li>Decks: Icons match like with like. Legal terms and Latin maxims match a term to its definition.</li>
          <li>Each pair is worth 1,000 points.</li>
          <li>Every move beyond the minimum costs 25 points; every 10 seconds costs 20.</li>
          <li>Hints reveal a pair for a second but add 2 moves. You get 3 per game.</li>
          <li>Easy shows all cards for a moment at the start.</li>
          <li>The Daily Case deals the same board to everyone for 24 hours.</li>
          <li>Keyboard: arrows move, Enter flips, <kbd>H</kbd> hints, <kbd>P</kbd> pauses, <kbd>N</kbd> starts a new game.</li>
        </ul>
      </details>
    </main>
  </div>

  <div class="confetti" id="confetti" aria-hidden="true"></div>
  <div class="toasts" id="toasts" aria-live="polite"></div>

  <div class="overlay" id="winOverlay" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="winTitle">
      <div class="modal-emoji" id="modalEmoji" aria-hidden="true">🎉</div>
      <h2 class="modal-title" id="winTitle">Case closed!</h2>
      <p class="modal-text" id="winText"></p>
      <p class="modal-record" id="winRecord" hidden>🏆 New personal best!</p>
      <p class="modal-compare" id="winCompare" hidden></p>

      <form class="submit-form" id="submitForm" hidden>
        <label class="sr-only" for="nameInput">Your name</label>
        <input type="text" id="nameInput" class="input" maxlength="20" placeholder="Your name" autocomplete="nickname" required>
        <button type="submit" class="btn" id="submitBtn">File result</button>
      </form>
      <p class="submit-msg" id="submitMsg" aria-live="polite"></p>

      <div class="review" id="review" hidden>
        <h3 class="review-title">Terms to review</h3>
        <ul class="review-list" id="reviewList"></ul>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" id="shareBtn">Share</button>
        <button type="button" class="btn" id="playAgainBtn">Play Again</button>
      </div>
    </div>
  </div>

  <script src="{{ asset('js/game.js') }}?v=5" defer></script>
</body>
</html>
