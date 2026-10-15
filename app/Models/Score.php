<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    protected $fillable = ['name', 'level', 'mode', 'daily', 'moves', 'time_ms', 'score'];

    public const PAIRS = ['easy' => 6, 'normal' => 8, 'hard' => 12, 'expert' => 16];

    public const MODES = ['icons', 'terms', 'maxims'];

    /**
     * Mirror of the client-side formula so a submitted score can be checked.
     * 1000 per pair, minus 25 per move beyond the minimum, minus 2 per second.
     */
    /**
     * Names are public on the leaderboard, so the obvious slurs and
     * profanities are refused. Letters that look alike are folded first so
     * "sh1t" and "s.h.i.t" are caught too.
     */
    public static function isOffensive(string $name): bool
    {
        $folded = strtolower($name);
        $folded = strtr($folded, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '@' => 'a', '$' => 's', '!' => 'i']);
        $folded = preg_replace('/[^a-z]/', '', $folded) ?? '';

        foreach (config('game.blocked_words', []) as $word) {
            if (str_contains($folded, $word)) {
                return true;
            }
        }

        return false;
    }

    public static function compute(string $level, int $moves, int $timeMs): int
    {
        $pairs = self::PAIRS[$level];
        $extra = max(0, $moves - $pairs);

        return max(0, $pairs * 1000 - $extra * 25 - intdiv($timeMs, 500));
    }
}
