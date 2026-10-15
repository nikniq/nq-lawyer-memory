# Legal Memory Game

A legal-themed memory matching game built on Laravel. Flip cards, find the pairs, close the case.

Live at https://lawyermemory.nikniq.com

## Features

- **Decks**: Icons, Legal terms (term ↔ definition), Latin maxims, and your own custom deck.
- **Levels**: Easy (6 pairs) to Expert (16 pairs).
- **Rules**: Classic, Trial (beat the clock), Versus (two players, hot seat), and Versus Counsel Bot (a computer opponent whose memory sharpens with the level).
- **Daily Case**: a date-seeded board that is the same for everyone, with its own leaderboard and a shareable result.
- **Scoring, hints, streaks, achievements**, lifetime stats, and a review of the terms you missed most.
- **Online leaderboard**: top 10 per deck, level and daily date, with a summary of how everyone else did.
- Sound and haptics, light/dark theme, keyboard play, installable as a PWA with offline support.

## Layout

| Path | What it is |
|------|------------|
| `public_html/js/game.js` | The whole game: decks, rules, scoring, Counsel Bot, leaderboard client. No build step. |
| `public_html/css/game.css` | Styles, including light theme and reduced-motion handling. |
| `resources/views/game.blade.php` | The single page. |
| `app/Http/Controllers/ScoreController.php` | Leaderboard API: list, summary, file a result. |
| `app/Models/Score.php` | Score formula (mirrored in the JS) and the name filter. |
| `config/game.php` | Blocked leaderboard words. |
| `app/Console/Commands/` | `ops:verify-deploy` and `scores:prune`. |
| `tests/Feature/` | PHP tests for the API, ops commands and headers. |
| `tests/js/` | Headless (jsdom) tests that play the real game script through every mode. |

The web root is `public_html`, not `public` (set in `bootstrap/app.php`).

## Local development

```sh
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve
```

Then open http://localhost:8000. The front end is plain JS and CSS served from `public_html`, so there is nothing to build.

## Tests

```sh
php artisan test        # PHP: API, commands, headers, error pages
npm test                # JS: plays every game mode in jsdom
./vendor/bin/pint       # code style
```

CI runs all three on every push and pull request (`.github/workflows/ci.yml`).

## API

All routes live under `/api` and require the session CSRF token for POST.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/scores?level=&mode=&daily=` | Top 10 for a board. Cached 30 s. |
| GET | `/api/scores/summary?level=&mode=&daily=&moves=` | Players, average moves and time, and the percent of players beaten by `moves`. |
| POST | `/api/scores` | File a result: `name, level, mode, daily?, moves, time_ms`. Implausible results and offensive names are rejected. Limited to 6 per minute. |

The score is recomputed server-side from moves and time: 1,000 per pair, minus 25 per move beyond the minimum, minus 2 per second.

## Deployment

The server deploys by pulling from GitHub. Two scripts drive it:

- `deploy.sh` runs **on the server**: pull, `composer install` if the lockfile moved, create the SQLite file if missing, migrate, optional seed, rebuild caches, then `ops:verify-deploy`.
- `cx.sh` runs **locally** as a numbered menu over SSH: deploy, what's live, migrations, caches, logs, health, backups, maintenance mode. It refuses to deploy with unpushed commits. Copy `vars.sh.example` to `vars.sh` and fill in the host.

The scheduler prunes daily-case scores older than 30 days. It needs one cron entry on the server:

```
* * * * * cd ~/www/<site> && php artisan schedule:run >> /dev/null 2>&1
```

Static assets are referenced with `?v=N`; bump the number in `game.blade.php` and `sw.js` when changing CSS or JS so browsers and the service worker pick up the new files.

## Production checklist

- `APP_ENV=production`, `APP_DEBUG=false` (deploy.sh warns if not).
- `APP_KEY` set.
- `storage/` writable; `database/database.sqlite` exists.
- Cron entry above for pruning.
