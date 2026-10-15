<?php

namespace App\Providers;

use App\Support\ClientIp;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Named limiters keep separate counters. The plain "throttle:N,1"
        // form shares one counter per visitor across every route, so a few
        // leaderboard reads (two per New Game) used up the filing allowance.
        RateLimiter::for('scores-read', fn (Request $r) => Limit::perMinute(60)->by(ClientIp::of($r)));
        RateLimiter::for('scores-write', fn (Request $r) => Limit::perMinute(6)->by(ClientIp::of($r)));
        RateLimiter::for('client-errors', fn (Request $r) => Limit::perMinute(10)->by(ClientIp::of($r)));
    }
}
