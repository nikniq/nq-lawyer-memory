<?php

namespace App\Console\Commands;

use App\Models\Score;
use Illuminate\Console\Command;

/**
 * Daily boards are only interesting on the day. Keep a short tail so a
 * streak chaser can still look back, then drop the rest. All-time boards
 * are never pruned.
 */
class PruneScores extends Command
{
    protected $signature = 'scores:prune {--days=30 : Keep daily boards newer than this} {--dry-run : Report without deleting}';

    protected $description = 'Delete daily-case scores older than a number of days';

    public function handle(): int
    {
        $cutoff = now()->subDays((int) $this->option('days'))->toDateString();

        $query = Score::query()->whereNotNull('daily')->where('daily', '<', $cutoff);
        $count = $query->count();

        if ($this->option('dry-run')) {
            $this->info("Would delete {$count} daily score(s) before {$cutoff}.");

            return self::SUCCESS;
        }

        $query->delete();
        $this->info("Deleted {$count} daily score(s) before {$cutoff}.");

        return self::SUCCESS;
    }
}
