#!/usr/bin/env bash
# Production deploy for Legal Memory Game. Run ON the server, from the app root:
#
#   ./deploy.sh                  # pull + install (if lockfile moved) + migrate + rebuild caches
#   ./deploy.sh SomeSeeder       # …and re-run one specific seeder class
#   ./deploy.sh --seed           # …and re-run EVERY seeder (confirms first)
#
# One command for the whole sequence so pull-without-migrate can never ship a
# "Base table or view not found" 500. Its LOCAL counterpart is cx.sh.
#
# The scheduler (daily score pruning) needs one cron entry on the server:
#   * * * * * cd ~/www/<site> && php artisan schedule:run >> /dev/null 2>&1

set -euo pipefail
cd "$(dirname "$0")"

echo "→ git pull"
LOCK_BEFORE=$(git rev-parse HEAD:composer.lock 2>/dev/null || echo none)
git pull --ff-only
LOCK_AFTER=$(git rev-parse HEAD:composer.lock 2>/dev/null || echo none)

if [ "$LOCK_BEFORE" != "$LOCK_AFTER" ]; then
    if command -v composer >/dev/null 2>&1; then
        echo "→ composer install (lockfile changed)"
        composer install --no-dev --optimize-autoloader --no-interaction
    else
        echo "⚠ composer.lock changed but composer is not on PATH."
        echo "  Install dependencies manually before trusting this deploy."
    fi
fi

# Front-end assets are built locally and committed under public_html/build
# (see cx.sh option 27). Warn if they are missing on the server.
if [ ! -f public_html/build/manifest.json ]; then
    echo "⚠ public_html/build/manifest.json missing — run 'npm run build' and commit, or build here."
fi

# SQLite databases are gitignored, so a fresh checkout has no file and every
# request 500s with "Database file at path [...] does not exist".
if grep -qE '^DB_CONNECTION=sqlite' .env 2>/dev/null; then
    DB_FILE=$(grep -E '^DB_DATABASE=' .env | cut -d= -f2- | tr -d '"' || true)
    DB_FILE="${DB_FILE:-database/database.sqlite}"
    if [ ! -f "$DB_FILE" ]; then
        echo "→ create sqlite database $DB_FILE"
        mkdir -p "$(dirname "$DB_FILE")"
        touch "$DB_FILE"
    fi
fi

echo "→ migrate"
php artisan migrate --force

if [ "${1:-}" = "--seed" ]; then
    echo "⚠ This re-runs EVERY seeder and overwrites any admin-edited field a seeder also sets."
    read -r -p "Type 'yes' to continue: " confirm
    if [ "$confirm" = "yes" ]; then
        echo "→ db:seed (all)"
        php artisan db:seed --force
    else
        echo "→ skipped seeding"
    fi
elif [ "${1:-}" != "" ]; then
    echo "→ db:seed --class=$1"
    php artisan db:seed --class="$1" --force
fi

echo "→ cache config/routes/views/events"
php artisan optimize

echo "→ storage link"
php artisan storage:link >/dev/null 2>&1 || true

echo "→ verify"
php artisan ops:verify-deploy

if grep -qE '^APP_ENV=production' .env && grep -qE '^APP_DEBUG=true' .env; then
    echo "⚠ APP_DEBUG=true in production .env — visitors can see stack traces. Set it to false."
fi

echo "✓ deployed $(git log --oneline -1)"
