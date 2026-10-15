#!/bin/bash
#================================================================
# LOCAL command-line assistant — cx.sh
#
#   ./cx.sh            # interactive menu
#   ./cx.sh 20         # run an option directly
#   ./cx.sh 21 "Seed"  # …with a second parameter
#
# ⚠ Runs on your LOCAL machine only — never copy this to the server.
#   Its counterpart on the server is deploy.sh (pull + migrate + caches).
#
# Requires a vars.sh next to it (see vars.sh.example). vars.sh is
# gitignored because it holds host and account details.
#================================================================

cd "$(dirname "$0")"

if [ ! -f ./vars.sh ]; then
  echo "vars.sh not found next to cx.sh — copy vars.sh.example to vars.sh and fill it in."
  exit 1
fi
# shellcheck source=vars.sh.example
source ./vars.sh

REMOTE_APP="${REMOTE_APP:-www/$PROJECT}"
APP_URL="${APP_URL:-https://$PROJECT}"
LOG_OUTPUT="${LOG_OUTPUT:-./log/remote.out}"
APP_SSH="${APP_SSH:-ssh}"
APP_SCP="${APP_SCP:-scp}"

if [ "$(hostname -s 2>/dev/null)" = "${REMOTE_HOST%%.*}" ]; then
  echo "⚠ This looks like $REMOTE_HOST — cx.sh is the LOCAL script. Use deploy.sh here."
  exit 1
fi

SELECTION="${1:-}"
PARAM2="${2:-}"

#---------------------------------------------------------------
# Helpers
#---------------------------------------------------------------
log_history() {
  mkdir -p ./log
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M')" "$1" >> ./log/history.log
}

remote() {
  $APP_SSH "$REMOTE" "cd ~/$REMOTE_APP && $*"
}

remote_tty() {
  $APP_SSH -t "$REMOTE" "cd ~/$REMOTE_APP && $*"
}

need_param() {
  if [ -z "$PARAM2" ]; then
    read -r -p "$1: " PARAM2
  fi
}

banner() {
  echo ===========================================================
  echo "$1"
  echo ===========================================================
}

confirm() {
  echo "⚠ $1"
  read -r -p "Type 'yes' to continue: " reply
  [ "$reply" = "yes" ] || { echo "Skipped $SELECTION."; exit 0; }
}

# The server deploys by pulling, so a local-only commit silently deploys
# the previous one. Refuse until everything is pushed.
require_pushed() {
  git fetch -q origin
  local branch; branch=$(git rev-parse --abbrev-ref HEAD)
  if [ -n "$(git status --porcelain)" ]; then
    echo "⚠ Uncommitted changes locally. Commit (or stash) before deploying."
    git status --short
    exit 1
  fi
  local ahead; ahead=$(git rev-list --count "origin/$branch..$branch" 2>/dev/null || echo 0)
  if [ "$ahead" != "0" ]; then
    echo "⚠ $ahead unpushed commit(s) on $branch. Run 'git push' first (option 11)."
    exit 1
  fi
}

#---------------------------------------------------------------
# Menu
#---------------------------------------------------------------
if [ -z "$SELECTION" ]; then
  clear
  echo =============================================================
  echo "Hi $USER — acting on $PROJECT ($REMOTE)"
  echo What do you want to do?
  echo -------------------------------------------------------------
  echo "LOCAL"
  echo "10 : GIT: status + unpushed commits"
  echo "11 : GIT: push current branch"
  echo "12 : BUILD: npm run build (assets into public_html/build)"
  echo "13 : TEST: php artisan test"
  echo "14 : LINT: vendor/bin/pint"
  echo "15 : SERVE: php artisan serve"
  echo ----------------------------------------------
  echo "DEPLOY — day to day"
  echo "20 : DEPLOY: pull + migrate + caches on $PROJECT"
  echo "21 : DEPLOY + re-run one seeder class"
  echo "22 : WHAT'S LIVE: compare the server's HEAD with local"
  echo "23 : MIGRATIONS: status (what is pending on the server)"
  echo "24 : CACHES: rebuild config/routes/views"
  echo "25 : CACHES: clear everything"
  echo "26 : COMPOSER: install production dependencies"
  echo "27 : BUILD + COMMIT + PUSH + DEPLOY (full release)"
  echo ----------------------------------------------
  echo "DIAGNOSE"
  echo "30 : HEALTH: $APP_URL/up"
  echo "31 : LOGS: tail the Laravel log"
  echo "32 : LOGS: last errors with stack traces"
  echo "33 : ARTISAN: run a command on the server"
  echo "34 : ENV: key settings on the server (no secrets)"
  echo "35 : DISK: usage of the app directory"
  echo ----------------------------------------------
  echo "DATA"
  echo "40 : SEED: run one seeder class (no pull, no migrate)"
  echo "41 : DB: backup the database to storage/backups"
  echo "42 : DB: pull latest backup to ./log"
  echo ----------------------------------------------
  echo "MAINTENANCE"
  echo "50 : QUEUE: failed jobs"
  echo "51 : QUEUE: retry all failed"
  echo "52 : DOWN: put the site in maintenance mode"
  echo "53 : UP: bring the site back"
  echo "54 : SHELL: open an SSH session in the app directory"
  echo "55 : COPY deploy.sh to the server"
  echo ----------------------------------------------
  echo "99 : HISTORY: what this script has done"
  echo -------------------------------------------------------------
  read -r -p "Selection: " SELECTION
fi

log_history "$SELECTION ${PARAM2:-}"

case "$SELECTION" in
  #------------------------------------------------- LOCAL
  10) banner "git status"
      git status --short
      git fetch -q origin
      echo "--- unpushed:"
      git log --oneline "origin/$(git rev-parse --abbrev-ref HEAD)..HEAD" ;;
  11) banner "git push"
      git push origin "$(git rev-parse --abbrev-ref HEAD)" ;;
  12) banner "npm run build"
      npm run build ;;
  13) banner "php artisan test"
      php artisan test ;;
  14) banner "pint"
      ./vendor/bin/pint ;;
  15) banner "php artisan serve"
      php artisan serve ;;

  #------------------------------------------------- DEPLOY
  20) banner "DEPLOY $PROJECT"
      require_pushed
      remote_tty ./deploy.sh ;;
  21) banner "DEPLOY $PROJECT + seeder"
      need_param "Seeder class (e.g. DatabaseSeeder)"
      require_pushed
      remote_tty ./deploy.sh "$PARAM2" ;;
  22) banner "What's live"
      echo "local : $(git log --oneline -1)"
      echo -n "server: "; remote git log --oneline -1 ;;
  23) banner "Migration status"
      remote php artisan migrate:status ;;
  24) banner "Rebuild caches"
      remote php artisan optimize ;;
  25) banner "Clear all caches"
      remote php artisan optimize:clear ;;
  26) banner "composer install"
      remote composer install --no-dev --optimize-autoloader --no-interaction ;;
  27) banner "Full release"
      need_param "Commit message"
      npm run build
      git add -A
      git diff --cached --quiet || git commit -m "$PARAM2"
      git push origin "$(git rev-parse --abbrev-ref HEAD)"
      remote_tty ./deploy.sh ;;

  #------------------------------------------------- DIAGNOSE
  30) banner "Health $APP_URL/up"
      curl -sS -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" "$APP_URL/up" ;;
  31) banner "Laravel log"
      remote tail -n 100 storage/logs/laravel.log | tee -a "$LOG_OUTPUT" ;;
  32) banner "Last errors"
      remote "grep -n -A 15 -E '\\.(ERROR|CRITICAL|EMERGENCY):' storage/logs/laravel.log | tail -n 120" ;;
  33) banner "artisan"
      need_param "artisan command (e.g. migrate:status)"
      remote_tty php artisan "$PARAM2" ;;
  34) banner "Server env"
      remote "grep -E '^(APP_ENV|APP_DEBUG|APP_URL|DB_CONNECTION|CACHE_STORE|QUEUE_CONNECTION|SESSION_DRIVER)=' .env" ;;
  35) banner "Disk"
      remote "du -sh . storage vendor public_html 2>/dev/null" ;;

  #------------------------------------------------- DATA
  40) banner "Seed"
      need_param "Seeder class"
      remote php artisan db:seed --class="$PARAM2" --force ;;
  41) banner "DB backup"
      remote "mkdir -p storage/backups && if [ -f database/database.sqlite ]; then cp database/database.sqlite storage/backups/db-\$(date +%Y%m%d-%H%M%S).sqlite; else echo 'Not sqlite — use mysqldump manually'; fi && ls -lh storage/backups | tail -5" ;;
  42) banner "Pull latest backup"
      mkdir -p ./log
      LATEST=$(remote "ls -t storage/backups 2>/dev/null | head -1")
      [ -n "$LATEST" ] || { echo "No backups on server."; exit 1; }
      $APP_SCP "$REMOTE:~/$REMOTE_APP/storage/backups/$LATEST" ./log/
      echo "→ ./log/$LATEST" ;;

  #------------------------------------------------- MAINTENANCE
  50) banner "Failed jobs"
      remote php artisan queue:failed ;;
  51) banner "Retry failed jobs"
      confirm "Retries every failed job on $PROJECT."
      remote php artisan queue:retry all ;;
  52) banner "Maintenance mode ON"
      confirm "Takes $PROJECT offline for visitors."
      remote php artisan down --retry=60 ;;
  53) banner "Maintenance mode OFF"
      remote php artisan up ;;
  54) banner "SSH"
      remote_tty bash -l ;;
  55) banner "Copy deploy.sh to server"
      $APP_SCP ./deploy.sh "$REMOTE:~/$REMOTE_APP/deploy.sh"
      remote chmod +x deploy.sh ;;

  99) banner "History"
      tail -n 40 ./log/history.log 2>/dev/null || echo "(empty)" ;;

  *)  echo "Unknown option: $SELECTION"; exit 1 ;;
esac
