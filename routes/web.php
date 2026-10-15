<?php

use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('game'))->name('game');

Route::prefix('api')->middleware('throttle:30,1')->group(function () {
    Route::get('/scores', [ScoreController::class, 'index'])->name('scores.index');
    Route::post('/scores', [ScoreController::class, 'store'])->name('scores.store');
    Route::get('/scores/summary', [ScoreController::class, 'summary'])->name('scores.summary');
});
