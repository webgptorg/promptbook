import { importRuntimeModule } from './importRuntimeModule';

/**
 * Candidate directories where SQL migration files can be located.
 *
 * @private function of runDatabaseMigrations
 */
const MIGRATIONS_DIRECTORY_CANDIDATES = [
    `${__dirname}/migrations`,
    `${process.cwd()}/src/database/migrations`,
    `${process.cwd()}/apps/agents-server/src/database/migrations`,
] as const;

/**
 * Finds migrations directory in known runtime locations.
 *
 * @returns Absolute path to migrations directory.
 *
 * @private function of runDatabaseMigrations
 */
export async function resolveMigrationsDirectory(): Promise<string> {
    const { access } = await importRuntimeModule<typeof import('fs/promises')>('fs/promises');

    for (const migrationsDirectoryCandidate of MIGRATIONS_DIRECTORY_CANDIDATES) {
        try {
            await access(migrationsDirectoryCandidate);
            return migrationsDirectoryCandidate;
        } catch {
            // Continue to the next candidate directory.
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
 *
 * @private function of runDatabaseMigrations
 */
export async function readMigrationFiles(migrationsDirectory: string): Promise<Array<string>> {
    const { readdir } = await importRuntimeModule<typeof import('fs/promises')>('fs/promises');

    return (await readdir(migrationsDirectory))
        .filter((file) => file.endsWith('.sql'))
        .sort();
}

/**
 * Normalizes path separators for log output.
 *
 * @param value Absolute or relative file-system path.
 * @returns Path with forward slashes.
 *
 * @private function of runDatabaseMigrations
 */
function normalizePathForLogs(value: string): string {
    return value.split('\\').join('/');
}
