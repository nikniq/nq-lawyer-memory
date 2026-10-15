<?php

namespace App\Console\Commands;

use App\Models\Score;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * A quick read on how the game is being played, for the owner.
 */
class GameStats extends Command
{
    protected $signature = 'game:stats {--days=7 : Window for the recent figures}';

    protected $description = 'Show how many results were filed, by whom, and on which boards';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $since = now()->subDays($days);

        $total = Score::count();
        $recent = Score::where('created_at', '>=', $since)->count();
        $players = Score::where('created_at', '>=', $since)->distinct('name')->count('name');
        $today = Score::whereDate('created_at', now()->toDateString())->count();

        $this->info('Results filed');
        $this->table(['All time', "Last {$days} days", "Players ({$days}d)", 'Today'], [[$total, $recent, $players, $today]]);

        $boards = Score::query()
            ->select('mode', 'level', DB::raw('count(*) as n'), DB::raw('round(avg(moves),1) as avg_moves'), DB::raw('max(score) as top'))
            ->where('created_at', '>=', $since)
            ->groupBy('mode', 'level')
            ->orderByDesc('n')
            ->get();

        $this->info("Boards, last {$days} days");
        $this->table(['Deck', 'Level', 'Filed', 'Avg moves', 'Top score'],
            $boards->map(fn ($b) => [$b->mode, $b->level, $b->n, $b->avg_moves, $b->top]));

        $daily = Score::whereNotNull('daily')->where('daily', '>=', $since->toDateString())
            ->select('daily', DB::raw('count(*) as n'))->groupBy('daily')->orderByDesc('daily')->get();
        if ($daily->isNotEmpty()) {
            $this->info('Daily Case');
            $this->table(['Date', 'Filed'], $daily->map(fn ($d) => [$d->daily, $d->n]));
        }

        $names = Score::where('created_at', '>=', $since)
            ->select('name', DB::raw('count(*) as n'))->groupBy('name')->orderByDesc('n')->limit(5)->get();
        if ($names->isNotEmpty()) {
            $this->info('Most active');
            $this->table(['Name', 'Filed'], $names->map(fn ($r) => [$r->name, $r->n]));
        }

        return self::SUCCESS;
    }
}
