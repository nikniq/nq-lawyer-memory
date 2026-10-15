<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ config('app.name') }}</title>
  <meta name="description" content="A legal-themed memory matching game. Flip cards, find the pairs, and close the case in as few moves as you can.">
  <meta name="theme-color" content="#0f172a">
  <link rel="stylesheet" href="{{ asset('css/game.css') }}">

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
      <h1 class="title">{{ config('app.name') }}</h1>
      <p class="tagline">Find every matching pair to close the case.</p>
    </header>

    <main class="game">
      <div class="toolbar">
        <div class="stats" aria-live="polite">
          <div class="stat"><span class="stat-label">Pairs</span><span class="stat-value"><span id="pairsCount">0</span>/<span id="pairsTotal">8</span></span></div>
          <div class="stat"><span class="stat-label">Moves</span><span class="stat-value" id="movesCount">0</span></div>
          <div class="stat"><span class="stat-label">Time</span><span class="stat-value" id="timer">0:00</span></div>
        </div>
        <div class="controls">
          <label class="select-wrap">
            <span class="sr-only">Difficulty</span>
            <select id="difficulty" aria-label="Difficulty">
              <option value="easy">Easy · 6 pairs</option>
              <option value="normal" selected>Normal · 8 pairs</option>
              <option value="hard">Hard · 12 pairs</option>
            </select>
          </label>
          <button type="button" class="btn" id="resetBtn">New Game</button>
        </div>
      </div>

      <div id="gameBoard" class="board" role="grid" aria-label="Memory card board"></div>

      <p class="best" id="bestLine" hidden>Best on this level: <strong id="bestText"></strong></p>
    </main>
  </div>

  <div class="overlay" id="winOverlay" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="winTitle">
      <div class="modal-emoji" aria-hidden="true">🎉</div>
      <h2 class="modal-title" id="winTitle">Case closed!</h2>
      <p class="modal-text" id="winText"></p>
      <p class="modal-record" id="winRecord" hidden>🏆 New personal best!</p>
      <button type="button" class="btn" id="playAgainBtn">Play Again</button>
    </div>
  </div>

  <script src="{{ asset('js/game.js') }}" defer></script>
</body>
</html>
