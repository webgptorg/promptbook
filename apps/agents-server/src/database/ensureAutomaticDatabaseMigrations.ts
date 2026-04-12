import {
    DATABASE_MIGRATION_APPLIED_BY,
    resolveDatabaseMigrationConnectionStringFromEnvironment,
    runDatabaseMigrations,
} from './runDatabaseMigrations';

/**
 * Opt-out environment flag for automatic runtime migrations.
 */
const SUPABASE_AUTO_MIGRATE_ENV_NAME = 'SUPABASE_AUTO_MIGRATE';

/**
 * Shared promises to guarantee that automatic migrations run at most once per prefix in each server process.
 */
const automaticDatabaseMigrationPromiseByPrefix = new Map<string, Promise<void>>();

/**
 * Ensures database migrations are automatically applied for the current deployment prefix.
 *
 * This is used during server startup so a newly provisioned deployment can create and migrate its database
 * without requiring a separate manual SQL step.
 *
 * @returns Promise that resolves after automatic migrations finish or are skipped.
 * @private internal startup helper for Agents Server runtime
 */
export async function ensureAutomaticDatabaseMigrations(): Promise<void> {
    return ensureAutomaticDatabaseMigrationsForPrefix(process.env.SUPABASE_TABLE_PREFIX || '');
}

/**
 * Ensures database migrations are automatically applied for a specific table prefix.
 *
 * @param prefix Table prefix for current server instance.
 * @returns Promise that resolves after automatic migrations finish or are skipped.
 * @private internal startup helper for Agents Server runtime
 */
export async function ensureAutomaticDatabaseMigrationsForPrefix(prefix: string): Promise<void> {
    const normalizedPrefix = prefix || '';
    if (!automaticDatabaseMigrationPromiseByPrefix.has(normalizedPrefix)) {
        automaticDatabaseMigrationPromiseByPrefix.set(
            normalizedPrefix,
            runAutomaticDatabaseMigrationsForPrefix(normalizedPrefix),
        );
    }

    return automaticDatabaseMigrationPromiseByPrefix.get(normalizedPrefix)!;
}

/**
 * Executes automatic migration flow using the same shared migration runner as CLI command.
 */
async function runAutomaticDatabaseMigrationsForPrefix(prefix: string): Promise<void> {
    if (shouldSkipAutomaticDatabaseMigrations()) {
        return;
    }

    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        console.warn('⚠️ POSTGRES_URL or DATABASE_URL is not defined. Skipping automatic migrations.');
        return;
    }

    console.info(`🚀 Checking database migrations automatically for prefix "${prefix}"`);
    await runDatabaseMigrations({
        prefixes: [prefix],
        connectionString,
        appliedBy: DATABASE_MIGRATION_APPLIED_BY.AUTOMATIC,
        logger: console,
        logSqlStatements: false,
    });
    console.info(`✅ Automatic database migration check finished for prefix "${prefix}"`);
}

/**
 * Determines whether automatic migrations should be skipped in current runtime.
 *
 * @returns `true` when automatic migrations should not run.
 */
function shouldSkipAutomaticDatabaseMigrations(): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
        return true;
    }

    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return true;
    }

    if (process.argv.join(' ').toLowerCase().includes('next build')) {
        return true;
    }

    const rawValue = process.env[SUPABASE_AUTO_MIGRATE_ENV_NAME]?.trim().toLowerCase();
    if (!rawValue) {
        return false;
    }

    return ['0', 'false', 'no'].includes(rawValue);
}
