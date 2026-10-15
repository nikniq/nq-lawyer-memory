<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class ScoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => ['required', Rule::in(array_keys(Score::PAIRS))],
            'mode' => ['required', Rule::in(Score::MODES)],
            'daily' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $scores = Cache::remember($this->cacheKey('top', $data), 30, fn () => Score::query()
            ->where('level', $data['level'])
            ->where('mode', $data['mode'])
            ->where('daily', $data['daily'] ?? null)
            ->orderByDesc('score')
            ->orderBy('moves')
            ->orderBy('time_ms')
            ->limit(10)
            ->get(['name', 'moves', 'time_ms', 'score', 'created_at'])
            // Plain arrays: the cache refuses to unserialize objects
            // (cache.serializable_classes = false), so a cached Collection
            // would come back as __PHP_Incomplete_Class.
            ->toArray());

        return response()->json(['scores' => $scores]);
    }

    /**
     * How a board has gone for everyone: players, average moves, and the
     * share of filed results the caller's own moves beat.
     */
    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => ['required', Rule::in(array_keys(Score::PAIRS))],
            'mode' => ['required', Rule::in(Score::MODES)],
            'daily' => ['nullable', 'date_format:Y-m-d'],
            'moves' => ['nullable', 'integer', 'min:1'],
        ]);

        $base = fn () => Score::query()
            ->where('level', $data['level'])
            ->where('mode', $data['mode'])
            ->where('daily', $data['daily'] ?? null);

        $totals = Cache::remember($this->cacheKey('summary', $data), 30, function () use ($base) {
            $players = $base()->count();

            return [
                'players' => $players,
                'avg_moves' => $players ? round($base()->avg('moves'), 1) : null,
                'avg_time_ms' => $players ? (int) round($base()->avg('time_ms')) : null,
            ];
        });

        $beat = null;
        if ($totals['players'] && isset($data['moves'])) {
            $worse = $base()->where('moves', '>', $data['moves'])->count();
            $beat = (int) round($worse / $totals['players'] * 100);
        }

        return response()->json([...$totals, 'beat_percent' => $beat]);
    }

    private function cacheKey(string $what, array $data): string
    {
        return "scores:{$what}:{$data['level']}:{$data['mode']}:".($data['daily'] ?? 'all');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:20', 'regex:/^[\pL\pN .\'_-]+$/u'],
            'level' => ['required', Rule::in(array_keys(Score::PAIRS))],
            'mode' => ['required', Rule::in(Score::MODES)],
            'daily' => ['nullable', 'date_format:Y-m-d'],
            'moves' => ['required', 'integer', 'min:1', 'max:999'],
            'time_ms' => ['required', 'integer', 'min:1', 'max:86400000'],
        ]);

        if (Score::isOffensive($data['name'])) {
            return response()->json(['message' => 'Please choose a different name.'], 422);
        }

        $pairs = Score::PAIRS[$data['level']];

        // A game cannot finish in fewer moves than pairs, nor faster than
        // the mismatch animation allows. Reject anything implausible.
        if ($data['moves'] < $pairs || $data['time_ms'] < $data['moves'] * 150) {
            return response()->json(['message' => 'That result is not possible.'], 422);
        }

        $score = Score::create([
            ...$data,
            'name' => trim($data['name']),
            'daily' => $data['daily'] ?? null,
            'score' => Score::compute($data['level'], $data['moves'], $data['time_ms']),
        ]);

        Cache::forget($this->cacheKey('top', $data));
        Cache::forget($this->cacheKey('summary', $data));

        $rank = Score::query()
            ->where('level', $score->level)
            ->where('mode', $score->mode)
            ->where('daily', $score->daily)
            ->where(function ($q) use ($score) {
                $q->where('score', '>', $score->score)
                    ->orWhere(fn ($q) => $q->where('score', $score->score)->where('id', '<', $score->id));
            })
            ->count() + 1;

        return response()->json(['score' => $score->score, 'rank' => $rank], 201);
    }
}
