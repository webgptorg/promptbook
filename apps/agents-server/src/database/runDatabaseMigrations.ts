import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

/**
 * Allowed values describing who applied a migration record.
 */
export const DATABASE_MIGRATION_APPLIED_BY = {
    AUTOMATIC: 'AUTOMATIC',
    MANUAL: 'MANUAL',
} as const;

/**
 * Value used in migration history to indicate whether a migration was applied automatically or manually.
 */
export type DatabaseMigrationAppliedBy = (typeof DATABASE_MIGRATION_APPLIED_BY)[keyof typeof DATABASE_MIGRATION_APPLIED_BY];

/**
 * Minimal logger contract used by the migration runner.
 */
export type DatabaseMigrationLogger = Pick<Console, 'error' | 'info' | 'warn'>;

/**
 * Resolved runtime configuration required for running SQL migrations.
 */
export type DatabaseMigrationRuntimeConfiguration = {
    /**
     * Prefixes for all table namespaces that should be migrated.
     */
    readonly prefixes: ReadonlyArray<string>;
    /**
     * Connection string for PostgreSQL used by migration runner.
     */
    readonly connectionString: string;
};

/**
 * Options controlling one migration execution.
 */
export type RunDatabaseMigrationsOptions = {
    /**
     * Prefixes that should be migrated.
     */
    readonly prefixes: ReadonlyArray<string>;
    /**
     * PostgreSQL connection string.
     */
    readonly connectionString: string;
    /**
     * Whether migration records should be marked as automatic or manual.
     */
    readonly appliedBy: DatabaseMigrationAppliedBy;
    /**
     * Optional subset of prefixes to migrate.
     */
    readonly onlyPrefixes?: ReadonlyArray<string> | null;
    /**
     * Optional custom migrations directory.
     */
    readonly migrationsDirectory?: string;
    /**
     * Logger used for progress output.
     */
    readonly logger?: DatabaseMigrationLogger;
    /**
     * If true, prints every SQL migration body before execution.
     */
    readonly logSqlStatements?: boolean;
};

/**
 * Result of one prefix migration run.
 */
export type DatabaseMigrationPrefixResult = {
    /**
     * Prefix that was processed.
     */
    readonly prefix: string;
    /**
     * Number of newly applied migration files.
     */
    readonly appliedCount: number;
};

/**
 * Result of full migration run across all selected prefixes.
 */
export type RunDatabaseMigrationsResult = {
    /**
     * Prefixes that were processed.
     */
    readonly processedPrefixes: ReadonlyArray<string>;
    /**
     * Number of SQL migration files discovered on disk.
     */
    readonly totalMigrationFiles: number;
    /**
     * Per-prefix summary.
     */
    readonly perPrefix: ReadonlyArray<DatabaseMigrationPrefixResult>;
};

/**
 * Environment variable with comma-separated prefix list.
 */
const SUPABASE_MIGRATION_PREFIXES_ENV_NAME = 'SUPABASE_MIGRATION_PREFIXES';

/**
 * Candidate environment variables for PostgreSQL connection string.
 */
const DATABASE_CONNECTION_ENV_NAMES = ['POSTGRES_URL', 'DATABASE_URL'] as const;

/**
 * Candidate directories where SQL migration files can be located.
 */
const MIGRATIONS_DIRECTORY_CANDIDATES = [
    path.join(__dirname, 'migrations'),
    path.join(process.cwd(), 'src', 'database', 'migrations'),
    path.join(process.cwd(), 'apps', 'agents-server', 'src', 'database', 'migrations'),
] as const;

/**
 * Cross-process advisory lock key guarding migration execution.
 */
const DATABASE_MIGRATION_LOCK_KEY = 'promptbook_agents_server_migrations';

/**
 * Reads migration runtime configuration from environment variables.
 *
 * Returns `null` when prefixes are not configured.
 *
 * @param logger Logger used for warnings.
 * @returns Parsed configuration or `null` when migration should be skipped.
 */
export function resolveDatabaseMigrationRuntimeConfiguration(
    logger: DatabaseMigrationLogger = console,
): DatabaseMigrationRuntimeConfiguration | null {
    const prefixes = parseMigrationPrefixesFromEnvironment(process.env[SUPABASE_MIGRATION_PREFIXES_ENV_NAME]);

    if (process.env[SUPABASE_MIGRATION_PREFIXES_ENV_NAME] === undefined) {
        logger.warn(`⚠️ ${SUPABASE_MIGRATION_PREFIXES_ENV_NAME} is not defined. Skipping migration.`);
        return null;
    }

    if (prefixes.length === 0) {
        logger.warn(`⚠️ No prefixes found in ${SUPABASE_MIGRATION_PREFIXES_ENV_NAME}. Skipping migration.`);
        return null;
    }

    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new Error(`❌ ${DATABASE_CONNECTION_ENV_NAMES.join(' or ')} is not defined.`);
    }

    return {
        prefixes,
        connectionString,
    };
}

/**
 * Executes pending SQL migrations for selected prefixes.
 *
 * @param options Migration execution options.
 * @returns Aggregated migration summary.
 */
export async function runDatabaseMigrations(options: RunDatabaseMigrationsOptions): Promise<RunDatabaseMigrationsResult> {
    const logger = options.logger ?? console;
    const selectedPrefixes = selectPrefixesForMigration(options.prefixes, options.onlyPrefixes);
    const migrationsDirectory = options.migrationsDirectory ?? resolveMigrationsDirectory();
    const migrationFiles = readMigrationFiles(migrationsDirectory);
    const perPrefix: Array<DatabaseMigrationPrefixResult> = [];

    logger.info(`📂 Found ${migrationFiles.length} migration files`);
    logger.info(`📋 Found ${selectedPrefixes.length} prefixes to migrate: ${selectedPrefixes.join(', ')}`);

    const client = new Client({
        connectionString: options.connectionString,
        ssl: { rejectUnauthorized: false },
    });

    let hasExecutionLock = false;

    try {
        await client.connect();
        logger.info('🔌 Connected to database');
        await acquireMigrationExecutionLock(client, logger);
        hasExecutionLock = true;

        for (const prefix of selectedPrefixes) {
            logger.info(`\n🏗️ Migrating prefix: "${prefix}"`);
            const appliedCount = await migratePrefix({
                prefix,
                appliedBy: options.appliedBy,
                client,
                logger,
                migrationFiles,
                migrationsDirectory,
                logSqlStatements: options.logSqlStatements ?? false,
            });
            perPrefix.push({ prefix, appliedCount });
        }
    } finally {
        if (hasExecutionLock) {
            await releaseMigrationExecutionLock(client, logger);
        }
        await client.end();
    }

    return {
        processedPrefixes: selectedPrefixes,
        totalMigrationFiles: migrationFiles.length,
        perPrefix,
    };
}

/**
 * Acquires advisory lock preventing concurrent migration execution across processes.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for progress output.
 */
async function acquireMigrationExecutionLock(client: Client, logger: DatabaseMigrationLogger): Promise<void> {
    logger.info('🔒 Waiting for migration lock');
    await client.query('SELECT pg_advisory_lock(hashtext($1));', [DATABASE_MIGRATION_LOCK_KEY]);
    logger.info('🔒 Migration lock acquired');
}

/**
 * Releases advisory lock used for migration execution.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for warnings.
 */
async function releaseMigrationExecutionLock(client: Client, logger: DatabaseMigrationLogger): Promise<void> {
    try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1));', [DATABASE_MIGRATION_LOCK_KEY]);
    } catch (unlockError) {
        logger.warn('⚠️ Failed to release migration lock');
        logger.warn(String(unlockError));
    }
}

/**
 * Context for one prefix migration pass.
 */
type MigratePrefixOptions = {
    /**
     * Prefix to migrate.
     */
    readonly prefix: string;
    /**
     * Marker for migration records.
     */
    readonly appliedBy: DatabaseMigrationAppliedBy;
    /**
     * Connected PostgreSQL client.
     */
    readonly client: Client;
    /**
     * Logger for progress output.
     */
    readonly logger: DatabaseMigrationLogger;
    /**
     * Sorted list of SQL migration filenames.
     */
    readonly migrationFiles: ReadonlyArray<string>;
    /**
     * Path to migrations directory.
     */
    readonly migrationsDirectory: string;
    /**
     * If true, print SQL before execution.
     */
    readonly logSqlStatements: boolean;
};

/**
 * Runs migrations for one prefix in a single transaction.
 *
 * @param options Prefix migration options.
 * @returns Number of newly applied migrations.
 */
async function migratePrefix(options: MigratePrefixOptions): Promise<number> {
    const migrationsTableName = `${options.prefix}Migrations`;
    const migrationsTableIdentifier = quoteIdentifier(migrationsTableName);

    await ensureMigrationsTableSchema({
        client: options.client,
        migrationsTableIdentifier,
    });

    const { rows } = await options.client.query<{ filename: string }>(
        `SELECT "filename" FROM ${migrationsTableIdentifier}`,
    );
    const appliedMigrations = new Set(rows.map((row) => row.filename));

    let appliedCount = 0;
    await options.client.query('BEGIN');
    try {
        for (const migrationFile of options.migrationFiles) {
            if (appliedMigrations.has(migrationFile)) {
                continue;
            }

            const migrationFilePath = path.join(options.migrationsDirectory, migrationFile);
            options.logger.info(`  🔼 Applying ${migrationFilePath.split('\\').join('/')}...`);

            const sql = fs.readFileSync(migrationFilePath, 'utf-8').replace(/prefix_/g, options.prefix);
            if (options.logSqlStatements) {
                options.logger.info(sql);
            }

            await options.client.query(sql);
            await options.client.query(
                `INSERT INTO ${migrationsTableIdentifier} ("filename", "appliedBy") VALUES ($1, $2)`,
                [migrationFile, options.appliedBy],
            );
            appliedCount++;
            options.logger.info(`  ✅ Applied ${migrationFile}`);
        }

        await options.client.query('COMMIT');
    } catch (error) {
        await safeRollbackTransaction(options.client, options.logger, options.prefix);
        throw error;
    }

    return appliedCount;
}

/**
 * Context for migrations-table schema synchronization.
 */
type EnsureMigrationsTableSchemaOptions = {
    /**
     * Connected PostgreSQL client.
     */
    readonly client: Client;
    /**
     * Pre-quoted migrations table identifier.
     */
    readonly migrationsTableIdentifier: string;
};

/**
 * Creates or upgrades the migrations table schema.
 *
 * This keeps the `appliedBy` column present even on old installations.
 *
 * @param options Migration table schema options.
 */
async function ensureMigrationsTableSchema(options: EnsureMigrationsTableSchemaOptions): Promise<void> {
    await options.client.query(`
        CREATE TABLE IF NOT EXISTS ${options.migrationsTableIdentifier} (
            "filename" TEXT PRIMARY KEY,
            "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
            "appliedBy" TEXT NOT NULL DEFAULT '${DATABASE_MIGRATION_APPLIED_BY.MANUAL}'
        );
    `);

    await options.client.query(`
        ALTER TABLE ${options.migrationsTableIdentifier}
        ADD COLUMN IF NOT EXISTS "appliedBy" TEXT;
    `);

    await options.client.query(
        `
        UPDATE ${options.migrationsTableIdentifier}
        SET "appliedBy" = $1
        WHERE "appliedBy" IS NULL;
        `,
        [DATABASE_MIGRATION_APPLIED_BY.MANUAL],
    );

    await options.client.query(`
        ALTER TABLE ${options.migrationsTableIdentifier}
        ALTER COLUMN "appliedBy" SET DEFAULT '${DATABASE_MIGRATION_APPLIED_BY.MANUAL}';
    `);

    await options.client.query(`
        ALTER TABLE ${options.migrationsTableIdentifier}
        ALTER COLUMN "appliedBy" SET NOT NULL;
    `);

    await options.client.query(`
        ALTER TABLE ${options.migrationsTableIdentifier}
        ENABLE ROW LEVEL SECURITY;
    `);
}

/**
 * Rolls back an opened transaction and logs failures without masking original errors.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for rollback warnings.
 * @param prefix Prefix currently being migrated.
 */
async function safeRollbackTransaction(client: Client, logger: DatabaseMigrationLogger, prefix: string): Promise<void> {
    try {
        await client.query('ROLLBACK');
    } catch (rollbackError) {
        logger.warn(`⚠️ Failed to rollback migration transaction for prefix "${prefix}"`);
        logger.warn(String(rollbackError));
    }
}

/**
 * Finds migrations directory in known runtime locations.
 *
 * @returns Absolute path to migrations directory.
 */
function resolveMigrationsDirectory(): string {
    for (const migrationsDirectoryCandidate of MIGRATIONS_DIRECTORY_CANDIDATES) {
        if (fs.existsSync(migrationsDirectoryCandidate)) {
            return migrationsDirectoryCandidate;
        }
    }

    throw new Error(
        `❌ Migrations directory not found. Checked: ${MIGRATIONS_DIRECTORY_CANDIDATES.map((candidate) =>
            candidate.split('\\').join('/'),
        ).join(', ')}`,
    );
}

/**
 * Reads migration files from directory and sorts them lexicographically.
 *
 * @param migrationsDirectory Directory containing SQL migrations.
 * @returns Sorted SQL migration filenames.
 */
function readMigrationFiles(migrationsDirectory: string): Array<string> {
    return fs
        .readdirSync(migrationsDirectory)
        .filter((file) => file.endsWith('.sql'))
        .sort();
}

/**
 * Parses comma-separated prefix list.
 *
 * @param rawPrefixes Raw prefixes string from environment variable.
 * @returns Parsed non-empty prefixes.
 */
function parseMigrationPrefixesFromEnvironment(rawPrefixes: string | undefined): Array<string> {
    if (!rawPrefixes) {
        return [];
    }

    return rawPrefixes
        .split(',')
        .map((prefix) => prefix.trim())
        .filter((prefix) => prefix !== '');
}

/**
 * Resolves PostgreSQL connection string from supported environment variables.
 *
 * @returns Connection string or `null` when not found.
 */
export function resolveDatabaseMigrationConnectionStringFromEnvironment(): string | null {
    for (const envName of DATABASE_CONNECTION_ENV_NAMES) {
        const value = process.env[envName];
        if (value) {
            return value;
        }
    }

    return null;
}

/**
 * Selects prefixes to migrate and validates `onlyPrefixes` filter.
 *
 * @param configuredPrefixes Prefixes configured for migration.
 * @param onlyPrefixes Optional filter from CLI.
 * @returns Prefixes selected for this run.
 */
function selectPrefixesForMigration(
    configuredPrefixes: ReadonlyArray<string>,
    onlyPrefixes: ReadonlyArray<string> | null | undefined,
): Array<string> {
    const normalizedConfiguredPrefixes = configuredPrefixes
        .map((prefix) => prefix.trim())
        .filter((prefix) => prefix !== '');

    if (onlyPrefixes === null || onlyPrefixes === undefined) {
        return [...normalizedConfiguredPrefixes];
    }

    const normalizedOnlyPrefixes = onlyPrefixes.map((prefix) => prefix.trim()).filter((prefix) => prefix !== '');
    const invalidPrefixes = normalizedOnlyPrefixes.filter((prefix) => !normalizedConfiguredPrefixes.includes(prefix));
    if (invalidPrefixes.length > 0) {
        throw new Error(
            `❌ Invalid prefixes specified in --only: ${invalidPrefixes.join(
                ', ',
            )}. Available prefixes: ${normalizedConfiguredPrefixes.join(', ')}`,
        );
    }

    return normalizedOnlyPrefixes;
}

/**
 * Quotes SQL identifiers safely for PostgreSQL.
 *
 * @param identifier Raw identifier.
 * @returns Quoted identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
