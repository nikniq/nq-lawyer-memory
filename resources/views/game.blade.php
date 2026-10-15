<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>{{ config('app.name') }}</title>
  <meta name="description" content="A legal-themed memory game. Match icons or legal terms to their definitions, beat the daily case, and climb the leaderboard.">
  <meta name="theme-color" content="#0f172a">
  <link rel="stylesheet" href="{{ asset('css/game.css') }}?v=2">

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
          <div class="stat"><span class="stat-label">Time</span><span class="stat-value" id="timer">0:00</span></div>
          <div class="stat"><span class="stat-label">Streak</span><span class="stat-value" id="streakCount">0</span></div>
          <div class="stat stat--score"><span class="stat-label">Score</span><span class="stat-value" id="scoreCount">8000</span></div>
        </div>
        <div class="controls">
          <label class="select-wrap">
            <span class="sr-only">Deck</span>
            <select id="mode" aria-label="Deck">
              <option value="icons">Icons</option>
              <option value="terms">Legal terms</option>
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">Difficulty</span>
            <select id="difficulty" aria-label="Difficulty">
              <option value="easy">Easy · 6 pairs</option>
              <option value="normal" selected>Normal · 8 pairs</option>
              <option value="hard">Hard · 12 pairs</option>
            </select>
          </label>
          <button type="button" class="btn btn--ghost" id="dailyBtn" aria-pressed="false" title="Same board for everyone today">📅 Daily Case</button>
          <button type="button" class="btn btn--ghost" id="hintBtn" title="Reveal a pair for a moment (+2 moves). Shortcut: H">Hint (3)</button>
          <button type="button" class="btn" id="resetBtn" title="Shortcut: N">New Game</button>
        </div>
      </div>

      <p class="board-title" id="boardTitle"></p>
      <div id="gameBoard" class="board" role="grid" aria-label="Memory card board"></div>

      <p class="best" id="bestLine" hidden>Your best here: <strong id="bestText"></strong></p>
      <p class="best stats-line" id="statsLine"></p>

      <section class="leaderboard" aria-labelledby="lbTitle">
        <h2 class="lb-title" id="lbTitle">Top lawyers</h2>
        <ol class="lb-list" id="lbList"></ol>
        <p class="lb-empty" id="lbEmpty" hidden>No results filed yet. Close a case and be the first.</p>
      </section>

      <details class="howto">
        <summary>How scoring works</summary>
        <ul>
          <li>Each pair is worth 1,000 points.</li>
          <li>Every move beyond the minimum costs 25 points; every 10 seconds costs 20.</li>
          <li>Hints reveal a pair for a second but add 2 moves. You get 3 per game.</li>
          <li>Easy shows all cards for a moment at the start.</li>
          <li>The Daily Case deals the same board to everyone for 24 hours.</li>
          <li>Keyboard: arrows move, Enter flips, <kbd>H</kbd> hints, <kbd>N</kbd> starts a new game.</li>
        </ul>
      </details>
    </main>
  </div>

  <div class="confetti" id="confetti" aria-hidden="true"></div>

  <div class="overlay" id="winOverlay" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="winTitle">
      <div class="modal-emoji" aria-hidden="true">🎉</div>
      <h2 class="modal-title" id="winTitle">Case closed!</h2>
      <p class="modal-text" id="winText"></p>
      <p class="modal-record" id="winRecord" hidden>🏆 New personal best!</p>

      <form class="submit-form" id="submitForm" hidden>
        <label class="sr-only" for="nameInput">Your name</label>
        <input type="text" id="nameInput" class="input" maxlength="20" placeholder="Your name" autocomplete="nickname" required>
        <button type="submit" class="btn" id="submitBtn">File result</button>
      </form>
      <p class="submit-msg" id="submitMsg" aria-live="polite"></p>

      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" id="shareBtn">Share</button>
        <button type="button" class="btn" id="playAgainBtn">Play Again</button>
      </div>
    </div>
  </div>

  <script src="{{ asset('js/game.js') }}?v=2" defer></script>
</body>
</html>
