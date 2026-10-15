<?php

use Illuminate\Support\Facades\Schedule;

// Needs a cron entry on the server:
//   * * * * * cd ~/www/<site> && php artisan schedule:run >> /dev/null 2>&1
Schedule::command('db:backup --keep=14')->dailyAt('03:00');
Schedule::command('scores:prune --days=30')->dailyAt('03:30');
