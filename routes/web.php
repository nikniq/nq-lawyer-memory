<?php

use App\Http\Controllers\ClientErrorController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('game'))->name('game');

Route::prefix('api')->group(function () {
    Route::get('/scores', [ScoreController::class, 'index'])->middleware('throttle:scores-read')->name('scores.index');
    Route::get('/scores/summary', [ScoreController::class, 'summary'])->middleware('throttle:scores-read')->name('scores.summary');
    // A human cannot finish more than a handful of games a minute.
    Route::post('/scores', [ScoreController::class, 'store'])->middleware('throttle:scores-write')->name('scores.store');
    Route::post('/client-errors', ClientErrorController::class)->middleware('throttle:client-errors')->name('client-errors');
});
