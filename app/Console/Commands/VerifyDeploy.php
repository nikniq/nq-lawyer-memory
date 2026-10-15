<?php

namespace App\Console\Commands;

use App\Models\Score;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Post-deploy sanity check. Exits non-zero if anything that would 500 the
 * site is wrong, so deploy.sh can stop and say so.
 */
class VerifyDeploy extends Command
{
    protected $signature = 'ops:verify-deploy';

    protected $description = 'Check database, migrations, cache, storage and config after a deploy';

    public function handle(): int
    {
        $failed = 0;

        $check = function (string $label, callable $fn) use (&$failed): void {
            try {
                $detail = $fn();
                $this->line("  <info>✓</info> {$label}".($detail ? " <comment>({$detail})</comment>" : ''));
            } catch (Throwable $e) {
                $failed++;
                $this->line("  <error>✗</error> {$label}: {$e->getMessage()}");
            }
        };

        $this->info('Verifying deploy');

        $check('database connection', function () {
            DB::connection()->getPdo();

            return config('database.default');
        });

        $check('migrations applied', function () {
            Artisan::call('migrate:status', ['--pending' => true]);
            $out = trim(Artisan::output());
            if (preg_match('/\bPending\b/', $out)) {
                throw new \RuntimeException('pending migrations: run php artisan migrate --force');
            }

            return 'none pending';
        });

        foreach (['sessions', 'cache', 'jobs', 'scores'] as $table) {
            $check("table {$table}", function () use ($table) {
                if (! Schema::hasTable($table)) {
                    throw new \RuntimeException('missing');
                }

                return null;
            });
        }

        $check('cache store', function () {
            Cache::put('ops:verify', 'ok', 60);
            if (Cache::get('ops:verify') !== 'ok') {
                throw new \RuntimeException('round-trip failed');
            }

            return config('cache.default');
        });

        foreach (['storage/framework/views', 'storage/framework/cache', 'storage/framework/sessions', 'storage/logs'] as $dir) {
            $check("writable {$dir}", function () use ($dir) {
                $path = base_path($dir);
                if (! is_dir($path) || ! is_writable($path)) {
                    throw new \RuntimeException('not writable');
                }

                return null;
            });
        }

        $check('scores query', fn () => Score::count().' filed');

        $check('app key set', function () {
            if (! config('app.key')) {
                throw new \RuntimeException('APP_KEY is empty: run php artisan key:generate');
            }

            return null;
        });

        if (app()->isProduction() && config('app.debug')) {
            $this->warn('  ⚠ APP_DEBUG is true in production. Stack traces are visible to visitors.');
        }

        if ($failed) {
            $this->error("{$failed} check(s) failed.");

            return self::FAILURE;
        }

        $this->info('All checks passed.');

        return self::SUCCESS;
    }
}
