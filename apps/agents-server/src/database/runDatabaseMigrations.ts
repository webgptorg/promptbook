import { Client } from 'pg';
import spaceTrim from 'spacetrim';
import { acquireMigrationExecutionLock, releaseMigrationExecutionLock } from './acquireMigrationExecutionLock';
import { listRegisteredServersFromDatabase } from './listRegisteredServersFromDatabase';
import { migratePrefix } from './migratePrefix';
import { readMigrationFiles, resolveMigrationsDirectory } from './resolveMigrationsDirectory';
import { selectPrefixesForMigration } from './selectPrefixesForMigration';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { type ServerRecord } from '../utils/serverRegistry';

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
     * Registered servers loaded from the global `_Server` table.
     */
    readonly registeredServers: ReadonlyArray<ServerRecord>;
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
     * Registered servers used for `--only=production|preview|<server-name>` expansion.
     */
    readonly registeredServers?: ReadonlyArray<ServerRecord>;
    /**
     * PostgreSQL connection string.
     */
    readonly connectionString: string;
    /**
     * Whether migration records should be marked as automatic or manual.
     */
    readonly appliedBy: DatabaseMigrationAppliedBy;
    /**
     * Optional subset of migration targets to process.
     */
    readonly onlyTargets?: ReadonlyArray<string> | null;
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
 * Environment variable used for the current/default table prefix.
 */
const SUPABASE_TABLE_PREFIX_ENV_NAME = 'SUPABASE_TABLE_PREFIX';

/**
 * Candidate environment variables for PostgreSQL connection string.
 */
const DATABASE_CONNECTION_ENV_NAMES = ['POSTGRES_URL', 'DATABASE_URL'] as const;

/**
 * Reads migration runtime configuration from environment variables and `_Server`.
 *
 * @param logger - Logger used for warnings.
 * @returns Parsed configuration or `null` when migration should be skipped.
 */
export async function resolveDatabaseMigrationRuntimeConfiguration(
    logger: DatabaseMigrationLogger = console,
): Promise<DatabaseMigrationRuntimeConfiguration | null> {
    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                ${DATABASE_CONNECTION_ENV_NAMES.join(' or ')} is not defined.
            `),
        );
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        const registeredServers = await listRegisteredServersFromDatabase(client);
        const hasExplicitDefaultPrefix = process.env[SUPABASE_TABLE_PREFIX_ENV_NAME] !== undefined;
        const configuredPrefixes = uniquePrefixes([
            ...(hasExplicitDefaultPrefix
                ? [process.env[SUPABASE_TABLE_PREFIX_ENV_NAME] || '']
                : registeredServers.length === 0
                ? ['']
                : []),
            ...registeredServers.map((server) => server.tablePrefix),
        ]);

        if (configuredPrefixes.length === 0) {
            logger.warn(`⚠️ No migration prefixes resolved from \`${SUPABASE_TABLE_PREFIX_ENV_NAME}\` or \`_Server\`.`);
            return null;
        }

        logger.info(`🗂️ Loaded ${registeredServers.length} registered servers from \`_Server\`.`);

        return {
            prefixes: configuredPrefixes,
            registeredServers,
            connectionString,
        };
    } finally {
        await client.end();
    }
}

/**
 * Executes pending SQL migrations for selected prefixes.
 *
 * @param options - Migration execution options.
 * @returns Aggregated migration summary.
 */
export async function runDatabaseMigrations(options: RunDatabaseMigrationsOptions): Promise<RunDatabaseMigrationsResult> {
    const logger = options.logger ?? console;
    const selectedPrefixes = selectPrefixesForMigration(
        options.prefixes,
        options.registeredServers ?? [],
        options.onlyTargets,
    );
    const migrationsDirectory = options.migrationsDirectory ?? resolveMigrationsDirectory();
    const migrationFiles = readMigrationFiles(migrationsDirectory);
    const perPrefix: Array<DatabaseMigrationPrefixResult> = [];

    logger.info(`📂 Found ${migrationFiles.length} migration files`);
    logger.info(
        `📋 Found ${selectedPrefixes.length} prefixes to migrate: ${selectedPrefixes
            .map((prefix) => prefix || '<default>')
            .join(', ')}`,
    );

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
                manualAppliedByDefault: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
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
 * Returns unique non-empty prefixes while preserving input order.
 *
 * @param prefixes - Raw prefixes.
 * @returns Ordered unique prefixes.
 */
function uniquePrefixes(prefixes: ReadonlyArray<string>): Array<string> {
    const result: Array<string> = [];

    for (const prefix of prefixes) {
        const normalizedPrefix = prefix.trim();
        if (result.includes(normalizedPrefix)) {
            continue;
        }
        result.push(normalizedPrefix);
    }

    return result;
}
