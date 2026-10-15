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

    public function test_implausible_results_are_rejected(): void
    {
        $this->postJson('/api/scores', ['name' => 'Cheat', 'level' => 'hard', 'mode' => 'icons', 'moves' => 3, 'time_ms' => 30000])->assertStatus(422);
        $this->postJson('/api/scores', ['name' => 'Cheat', 'level' => 'hard', 'mode' => 'icons', 'moves' => 12, 'time_ms' => 100])->assertStatus(422);
        $this->postJson('/api/scores', ['name' => '<script>', 'level' => 'hard', 'mode' => 'icons', 'moves' => 12, 'time_ms' => 10000])->assertStatus(422);
    }
}
