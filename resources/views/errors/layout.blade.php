<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@yield('title') · {{ config('app.name') }}</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="{{ asset('css/game.css') }}?v=8">
  <link rel="icon" href="{{ asset('icon.svg') }}" type="image/svg+xml">
</head>
<body>
  <div class="page">
    <header class="header">
      <h1 class="title">{{ config('app.name') }}</h1>
    </header>
    <main class="modal error-page" role="main">
      <div class="modal-emoji" aria-hidden="true">@yield('emoji')</div>
      <h2 class="modal-title">@yield('title')</h2>
      <p class="modal-text">@yield('message')</p>
      <a class="btn" href="{{ url('/') }}">Back to the game</a>
    </main>
  </div>
</body>
</html>
