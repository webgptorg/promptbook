import { Client } from 'pg';
import type { DatabaseMigrationLogger } from './runDatabaseMigrations';

/**
 * Cross-process advisory lock key guarding migration execution.
 *
 * @private function of runDatabaseMigrations
 */
const DATABASE_MIGRATION_LOCK_KEY = 'promptbook_agents_server_migrations';

/**
 * Acquires advisory lock preventing concurrent migration execution across processes.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for progress output.
 * @private function of runDatabaseMigrations
 */
export async function acquireMigrationExecutionLock(client: Client, logger: DatabaseMigrationLogger): Promise<void> {
    logger.info('🔒 Waiting for migration lock');
    await client.query('SELECT pg_advisory_lock(hashtext($1));', [DATABASE_MIGRATION_LOCK_KEY]);
    logger.info('🔒 Migration lock acquired');
}

/**
 * Releases advisory lock used for migration execution.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for warnings.
 * @private function of runDatabaseMigrations
 */
export async function releaseMigrationExecutionLock(client: Client, logger: DatabaseMigrationLogger): Promise<void> {
    try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1));', [DATABASE_MIGRATION_LOCK_KEY]);
    } catch (unlockError) {
        logger.warn('⚠️ Failed to release migration lock');
        logger.warn(String(unlockError));
    }
}
