import * as fs from 'fs';
import * as path from 'path';

/**
 * Candidate directories where SQL migration files can be located.
 *
 * @private function of runDatabaseMigrations
 */
const MIGRATIONS_DIRECTORY_CANDIDATES = [
    path.join(__dirname, 'migrations'),
    path.join(process.cwd(), 'src', 'database', 'migrations'),
    path.join(process.cwd(), 'apps', 'agents-server', 'src', 'database', 'migrations'),
] as const;

/**
 * Finds migrations directory in known runtime locations.
 *
 * @returns Absolute path to migrations directory.
 * @private function of runDatabaseMigrations
 */
export function resolveMigrationsDirectory(): string {
    for (const migrationsDirectoryCandidate of MIGRATIONS_DIRECTORY_CANDIDATES) {
        if (fs.existsSync(migrationsDirectoryCandidate)) {
            return migrationsDirectoryCandidate;
        }
    }

    throw new Error(
        `❌ Migrations directory not found. Checked: ${MIGRATIONS_DIRECTORY_CANDIDATES.map((candidate) =>
            normalizePathForLogs(candidate),
        ).join(', ')}`,
    );
}

/**
 * Reads migration files from directory and sorts them lexicographically.
 *
 * @param migrationsDirectory Directory containing SQL migrations.
 * @returns Sorted SQL migration filenames.
 * @private function of runDatabaseMigrations
 */
export function readMigrationFiles(migrationsDirectory: string): Array<string> {
    return fs
        .readdirSync(migrationsDirectory)
        .filter((file) => file.endsWith('.sql'))
        .sort();
}

/**
 * Normalizes path separators for log output.
 *
 * @param value Absolute or relative file-system path.
 * @returns Path with forward slashes.
 * @private function of runDatabaseMigrations
 */
function normalizePathForLogs(value: string): string {
    return value.split('\\').join('/');
}
