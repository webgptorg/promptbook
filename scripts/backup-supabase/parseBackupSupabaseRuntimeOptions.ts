import { EnvironmentMismatchError } from '../../src/errors/EnvironmentMismatchError';
import { spaceTrim } from '../../src/utils/organization/spaceTrim';

/**
 * Supported environment variable names for PostgreSQL connection string resolution.
 *
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_CONNECTION_ENV_NAMES = ['POSTGRES_URL', 'DATABASE_URL'] as const;

/**
 * Default schema list when no CLI override is provided.
 *
 * @private constant of backupSupabase
 */
export const DEFAULT_BACKUP_SUPABASE_SCHEMA_NAMES = 'public';

/**
 * Default target directory for backup ZIP files.
 *
 * @private constant of backupSupabase
 */
export const DEFAULT_BACKUP_SUPABASE_OUTPUT_DIRECTORY = 'backups/supabase';

/**
 * Default backup filename pattern.
 *
 * The `%timestamp%` token resolves to `YYYY-MM-DD_HH-mm-ss`.
 *
 * @private constant of backupSupabase
 */
export const DEFAULT_BACKUP_SUPABASE_FILENAME_PATTERN = '%timestamp%.sql.zip';

/**
 * CLI options accepted by the backup command.
 *
 * @private type of backupSupabase
 */
export type BackupSupabaseCommandOptions = {
    /**
     * Optional direct PostgreSQL connection string.
     */
    readonly connectionString?: string;

    /**
     * Comma-separated schema list to back up.
     */
    readonly schemas: string;

    /**
     * Output directory where ZIP file should be created.
     */
    readonly outputDir: string;

    /**
     * Output filename pattern with placeholder tokens.
     */
    readonly filenamePattern: string;
};

/**
 * Normalized runtime options used by backup logic.
 *
 * @private type of backupSupabase
 */
export type BackupSupabaseRuntimeOptions = {
    /**
     * PostgreSQL connection string.
     */
    readonly connectionString: string;

    /**
     * Schema names included in backup.
     */
    readonly schemaNames: ReadonlyArray<string>;

    /**
     * Output directory where ZIP file will be written.
     */
    readonly outputDirectory: string;

    /**
     * Filename pattern for ZIP output.
     */
    readonly filenamePattern: string;
};

/**
 * Parses raw commander options and validates required backup values.
 *
 * @param options Raw options from commander.
 * @returns Validated runtime options.
 *
 * @private function of backupSupabase
 */
export function parseBackupSupabaseRuntimeOptions(options: BackupSupabaseCommandOptions): BackupSupabaseRuntimeOptions {
    const connectionString = options.connectionString || resolveConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Missing PostgreSQL connection string.

                Provide \`--connection-string\` or set one of:
                - \`${BACKUP_SUPABASE_CONNECTION_ENV_NAMES[0]}\`
                - \`${BACKUP_SUPABASE_CONNECTION_ENV_NAMES[1]}\`
            `),
        );
    }

    const schemaNames = options.schemas
        .split(',')
        .map((schemaName) => schemaName.trim())
        .filter((schemaName) => schemaName !== '');

    if (schemaNames.length === 0) {
        throw new EnvironmentMismatchError('No schemas were provided. Use `--schemas public,...`.');
    }

    if (options.outputDir.trim() === '') {
        throw new EnvironmentMismatchError('Output directory cannot be empty.');
    }

    if (options.filenamePattern.trim() === '') {
        throw new EnvironmentMismatchError('Filename pattern cannot be empty.');
    }

    return {
        connectionString,
        schemaNames,
        outputDirectory: options.outputDir,
        filenamePattern: options.filenamePattern,
    };
}

/**
 * Resolves connection string from known environment variables.
 *
 * @returns Connection string or `null` when not configured.
 *
 * @private function of backupSupabase
 */
function resolveConnectionStringFromEnvironment(): string | null {
    for (const envName of BACKUP_SUPABASE_CONNECTION_ENV_NAMES) {
        const envValue = process.env[envName];
        if (envValue) {
            return envValue;
        }
    }

    return null;
}
