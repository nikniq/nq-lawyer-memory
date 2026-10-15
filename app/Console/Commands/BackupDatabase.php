<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Copies the SQLite database into storage/backups and keeps the newest N.
 * Uses SQLite's own backup API through VACUUM INTO so the copy is
 * consistent even while the site is writing.
 */
class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--keep=14 : How many backups to retain}';

    protected $description = 'Back up the SQLite database to storage/backups';

    public function handle(): int
    {
        if (config('database.default') !== 'sqlite') {
            $this->warn('Only SQLite databases are backed up by this command. Use your database server\'s own tooling.');

            return self::SUCCESS;
        }

        if (config('database.connections.sqlite.database') === ':memory:') {
            $this->warn('In-memory database: nothing to back up.');

            return self::SUCCESS;
        }

        $dir = storage_path('backups');
        if (! is_dir($dir) && ! mkdir($dir, 0755, true)) {
            $this->error("Cannot create {$dir}");

            return self::FAILURE;
        }

        $target = $dir.'/db-'.now()->format('Ymd-His').'.sqlite';
        DB::statement('VACUUM INTO '.DB::getPdo()->quote($target));

        $size = round(filesize($target) / 1024);
        $this->info("Backed up to {$target} ({$size} KB)");

        $files = glob($dir.'/db-*.sqlite') ?: [];
        rsort($files);
        foreach (array_slice($files, (int) $this->option('keep')) as $old) {
            unlink($old);
            $this->line('  removed '.basename($old));
        }

        return self::SUCCESS;
    }
}
