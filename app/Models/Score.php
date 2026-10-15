<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    protected $fillable = ['name', 'level', 'mode', 'daily', 'moves', 'time_ms', 'score'];

    public const PAIRS = ['easy' => 6, 'normal' => 8, 'hard' => 12];

    /**
     * Mirror of the client-side formula so a submitted score can be checked.
     * 1000 per pair, minus 25 per move beyond the minimum, minus 2 per second.
     */
    public static function compute(string $level, int $moves, int $timeMs): int
    {
        $pairs = self::PAIRS[$level];
        $extra = max(0, $moves - $pairs);

        return max(0, $pairs * 1000 - $extra * 25 - intdiv($timeMs, 500));
    }
}
