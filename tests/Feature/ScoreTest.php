<?php

namespace Tests\Feature;

use App\Models\Score;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_game_page_renders(): void
    {
        $this->get('/')->assertOk()->assertSee('gameBoard', false);
    }

    public function test_score_can_be_submitted_and_ranked(): void
    {
        Score::create(['name' => 'Ada', 'level' => 'normal', 'mode' => 'icons', 'moves' => 20, 'time_ms' => 60000, 'score' => Score::compute('normal', 20, 60000)]);

        $this->postJson('/api/scores', ['name' => 'Bob', 'level' => 'normal', 'mode' => 'icons', 'moves' => 10, 'time_ms' => 30000])
            ->assertCreated()
            ->assertJson(['rank' => 1, 'score' => Score::compute('normal', 10, 30000)]);

        $this->getJson('/api/scores?level=normal&mode=icons')
            ->assertOk()
            ->assertJsonPath('scores.0.name', 'Bob')
            ->assertJsonPath('scores.1.name', 'Ada');
    }

    public function test_daily_scores_are_kept_separate(): void
    {
        $this->postJson('/api/scores', ['name' => 'Cy', 'level' => 'normal', 'mode' => 'terms', 'daily' => '2026-10-15', 'moves' => 12, 'time_ms' => 40000])->assertCreated();

        $this->getJson('/api/scores?level=normal&mode=terms')->assertOk()->assertJsonCount(0, 'scores');
        $this->getJson('/api/scores?level=normal&mode=terms&daily=2026-10-15')->assertOk()->assertJsonCount(1, 'scores');
    }

    public function test_expert_level_and_maxims_deck_are_accepted(): void
    {
        $this->postJson('/api/scores', ['name' => 'Dee', 'level' => 'expert', 'mode' => 'maxims', 'moves' => 20, 'time_ms' => 90000])
            ->assertCreated()
            ->assertJson(['score' => Score::compute('expert', 20, 90000)]);
    }

    public function test_summary_reports_players_and_percent_beaten(): void
    {
        foreach ([10, 14, 20, 30] as $moves) {
            Score::create(['name' => 'P', 'level' => 'normal', 'mode' => 'icons', 'daily' => '2026-10-16', 'moves' => $moves, 'time_ms' => 50000, 'score' => Score::compute('normal', $moves, 50000)]);
        }

        $this->getJson('/api/scores/summary?level=normal&mode=icons&daily=2026-10-16&moves=14')
            ->assertOk()
            ->assertJson(['players' => 4, 'avg_moves' => 18.5, 'beat_percent' => 50]);

        $this->getJson('/api/scores/summary?level=normal&mode=icons')
            ->assertOk()
            ->assertJson(['players' => 0, 'avg_moves' => null, 'beat_percent' => null]);
    }

    public function test_offensive_names_are_refused(): void
    {
        $this->postJson('/api/scores', ['name' => 'Sh1t Head', 'level' => 'normal', 'mode' => 'icons', 'moves' => 10, 'time_ms' => 30000])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Please choose a different name.');

        $this->postJson('/api/scores', ['name' => 'Cassandra', 'level' => 'normal', 'mode' => 'icons', 'moves' => 10, 'time_ms' => 30000])
            ->assertCreated();
    }

    public function test_leaderboard_cache_is_refreshed_on_new_score(): void
    {
        $this->getJson('/api/scores?level=easy&mode=icons')->assertOk()->assertJsonCount(0, 'scores');
        $this->postJson('/api/scores', ['name' => 'Eve', 'level' => 'easy', 'mode' => 'icons', 'moves' => 8, 'time_ms' => 20000])->assertCreated();
        $this->getJson('/api/scores?level=easy&mode=icons')->assertOk()->assertJsonCount(1, 'scores');
    }

    public function test_leaderboard_survives_a_serializing_cache_store(): void
    {
        // Production uses the database cache store, which serializes values.
        // The array store used by the test suite does not, which once hid a
        // bug where cached hits came back as __PHP_Incomplete_Class.
        config(['cache.default' => 'database']);
        $this->postJson('/api/scores', ['name' => 'Ada', 'level' => 'hard', 'mode' => 'terms', 'moves' => 15, 'time_ms' => 50000])->assertCreated();

        foreach (['miss', 'hit'] as $pass) {
            $this->getJson('/api/scores?level=hard&mode=terms')
                ->assertOk()
                ->assertJsonCount(1, 'scores')
                ->assertJsonPath('scores.0.name', 'Ada');
        }

        foreach (['miss', 'hit'] as $pass) {
            $this->getJson('/api/scores/summary?level=hard&mode=terms&moves=20')
                ->assertOk()
                ->assertJson(['players' => 1, 'avg_moves' => 15]);
        }
    }

    public function test_implausible_results_are_rejected(): void
    {
        $this->postJson('/api/scores', ['name' => 'Cheat', 'level' => 'hard', 'mode' => 'icons', 'moves' => 3, 'time_ms' => 30000])->assertStatus(422);
        $this->postJson('/api/scores', ['name' => 'Cheat', 'level' => 'hard', 'mode' => 'icons', 'moves' => 12, 'time_ms' => 100])->assertStatus(422);
        $this->postJson('/api/scores', ['name' => '<script>', 'level' => 'hard', 'mode' => 'icons', 'moves' => 12, 'time_ms' => 10000])->assertStatus(422);
    }
}
