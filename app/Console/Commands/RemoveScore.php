<?php

namespace App\Console\Commands;

use App\Models\Score;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Leaderboard moderation: remove entries by id or by exact name.
 */
class RemoveScore extends Command
{
    protected $signature = 'scores:remove {target : A score id, or a name to remove every entry for} {--force : Skip the confirmation}';

    protected $description = 'Remove a leaderboard entry by id, or all entries for a name';

    public function handle(): int
    {
        $target = $this->argument('target');
        $query = ctype_digit($target)
            ? Score::query()->whereKey((int) $target)
            : Score::query()->where('name', $target);

        $rows = $query->get();
        if ($rows->isEmpty()) {
            $this->warn('No matching scores.');

            return self::SUCCESS;
        }

        $this->table(['id', 'name', 'level', 'mode', 'daily', 'moves', 'score'],
            $rows->map(fn ($s) => [$s->id, $s->name, $s->level, $s->mode, $s->daily ?? '-', $s->moves, $s->score]));

        if (! $this->option('force') && ! $this->confirm("Delete {$rows->count()} score(s)?")) {
            return self::SUCCESS;
        }

        $query->delete();
        Cache::flush();
        $this->info("Deleted {$rows->count()} score(s).");

        return self::SUCCESS;
    }
}
