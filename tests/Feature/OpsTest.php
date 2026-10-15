<?php

namespace Tests\Feature;

use App\Models\Score;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpsTest extends TestCase
{
    use RefreshDatabase;

    public function test_verify_deploy_passes_on_a_migrated_app(): void
    {
        $this->artisan('ops:verify-deploy')
            ->expectsOutputToContain('All checks passed.')
            ->assertSuccessful();
    }

    public function test_prune_removes_only_old_daily_scores(): void
    {
        $row = fn (?string $daily) => Score::create(['name' => 'X', 'level' => 'easy', 'mode' => 'icons', 'daily' => $daily, 'moves' => 6, 'time_ms' => 10000, 'score' => 6000]);
        $row(null);
        $row(now()->toDateString());
        $row(now()->subDays(45)->toDateString());

        $this->artisan('scores:prune --days=30 --dry-run')->expectsOutputToContain('Would delete 1')->assertSuccessful();
        $this->assertSame(3, Score::count());

        $this->artisan('scores:prune --days=30')->expectsOutputToContain('Deleted 1')->assertSuccessful();
        $this->assertSame(2, Score::count());
        $this->assertSame(0, Score::where('daily', '<', now()->subDays(30)->toDateString())->count());
    }

    public function test_security_headers_are_sent(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        $this->getJson('/api/scores?level=easy&mode=icons')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_error_pages_are_themed(): void
    {
        $this->get('/no-such-page')->assertNotFound()->assertSee('Case not found')->assertSee('Back to the game');
    }

    public function test_score_filing_is_rate_limited(): void
    {
        $payload = ['name' => 'Rate', 'level' => 'easy', 'mode' => 'icons', 'moves' => 6, 'time_ms' => 10000];
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/scores', $payload)->assertCreated();
        }
        $this->postJson('/api/scores', $payload)->assertStatus(429);
    }
}
