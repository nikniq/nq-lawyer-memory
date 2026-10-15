<?php

namespace Tests\Feature;

use App\Models\Score;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * The client shows a live score and the server recomputes it. If the two
 * formulas drift, the leaderboard contradicts the win dialog. This runs
 * the real game.js computeScore through node and compares.
 */
class ScoreParityTest extends TestCase
{
    public function test_js_and_php_score_formulas_agree(): void
    {
        if ((new Process(['node', '--version']))->run() !== 0) {
            $this->markTestSkipped('node is not available');
        }

        $cases = [];
        foreach (Score::PAIRS as $level => $pairs) {
            foreach ([$pairs, $pairs + 1, $pairs + 7, $pairs * 3, 999] as $moves) {
                foreach ([1, 999, 30000, 125500, 3600000] as $ms) {
                    $cases[] = [$level, $moves, $ms, Score::compute($level, $moves, $ms)];
                }
            }
        }

        $js = <<<'JS'
            const fs = require('fs');
            const src = fs.readFileSync(process.argv[1], 'utf8');
            const body = src.match(/function computeScore\(moves, ms\) \{([\s\S]*?)\n  \}/)[1];
            const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
            const PAIRS = { easy: 6, normal: 8, hard: 12, expert: 16 };
            const out = cases.map(([level, moves, ms]) => {
              const pairsForGame = () => PAIRS[level];
              return new Function('moves', 'ms', 'pairsForGame', body)(moves, ms, pairsForGame);
            });
            process.stdout.write(JSON.stringify(out));
            JS;

        $process = new Process(['node', '-e', $js, base_path('public_html/js/game.js')]);
        $process->setInput(json_encode(array_map(fn ($c) => array_slice($c, 0, 3), $cases)));
        $process->mustRun();
        $jsScores = json_decode($process->getOutput(), true);

        foreach ($cases as $i => [$level, $moves, $ms, $php]) {
            $this->assertSame($php, $jsScores[$i], "level={$level} moves={$moves} ms={$ms}");
        }
        $this->assertCount(count($cases), $jsScores);
    }
}
