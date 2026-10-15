<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ScoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => ['required', Rule::in(array_keys(Score::PAIRS))],
            'mode' => ['required', Rule::in(['icons', 'terms'])],
            'daily' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $scores = Score::query()
            ->where('level', $data['level'])
            ->where('mode', $data['mode'])
            ->where('daily', $data['daily'] ?? null)
            ->orderByDesc('score')
            ->orderBy('moves')
            ->orderBy('time_ms')
            ->limit(10)
            ->get(['name', 'moves', 'time_ms', 'score', 'created_at']);

        return response()->json(['scores' => $scores]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:20', 'regex:/^[\pL\pN .\'_-]+$/u'],
            'level' => ['required', Rule::in(array_keys(Score::PAIRS))],
            'mode' => ['required', Rule::in(['icons', 'terms'])],
            'daily' => ['nullable', 'date_format:Y-m-d'],
            'moves' => ['required', 'integer', 'min:1', 'max:999'],
            'time_ms' => ['required', 'integer', 'min:1', 'max:86400000'],
        ]);

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
