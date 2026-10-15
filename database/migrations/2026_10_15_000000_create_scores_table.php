<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();
            $table->string('name', 20);
            $table->string('level', 10);          // easy | normal | hard
            $table->string('mode', 10);           // icons | terms
            $table->string('daily', 10)->nullable(); // YYYY-MM-DD for the daily case, null otherwise
            $table->unsignedSmallInteger('moves');
            $table->unsignedInteger('time_ms');
            $table->unsignedInteger('score');
            $table->timestamps();

            $table->index(['level', 'mode', 'daily', 'score']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};
