<?php

namespace Tests\Feature;

use App\Models\Score;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommandsTest extends TestCase
{
    use RefreshDatabase;

    private function score(string $name, int $moves = 10): Score
    {
        return Score::create(['name' => $name, 'level' => 'normal', 'mode' => 'icons', 'moves' => $moves, 'time_ms' => 30000, 'score' => Score::compute('normal', $moves, 30000)]);
    }

    public function test_remove_by_name_deletes_every_entry_for_that_name(): void
    {
        $this->score('Troll');
        $this->score('Troll', 12);
        $keep = $this->score('Ada');

        $this->artisan('scores:remove Troll --force')->expectsOutputToContain('Deleted 2')->assertSuccessful();
        $this->assertSame([$keep->id], Score::pluck('id')->all());
    }

    public function test_remove_by_id_deletes_one_entry(): void
    {
        $a = $this->score('Ada');
        $b = $this->score('Bob');

        $this->artisan("scores:remove {$a->id} --force")->expectsOutputToContain('Deleted 1')->assertSuccessful();
        $this->assertSame([$b->id], Score::pluck('id')->all());
        $this->artisan('scores:remove 999 --force')->expectsOutputToContain('No matching')->assertSuccessful();
    }

    public function test_game_stats_runs_with_and_without_data(): void
    {
        $this->artisan('game:stats')->assertSuccessful();
        $this->score('Ada');
        $this->artisan('game:stats --days=1')->expectsOutputToContain('Ada')->assertSuccessful();
    }

    public function test_backup_is_skipped_for_in_memory_test_database(): void
    {
        // The suite runs on :memory:, so there is no file to copy. The command
        // must say so and still succeed, so the scheduler does not alert.
        $this->artisan('db:backup')->expectsOutputToContain('In-memory database')->assertSuccessful();
    }
}
