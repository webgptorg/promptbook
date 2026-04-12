import type { Client } from 'pg';
import type { DatabaseMigrationLogger } from './runDatabaseMigrations';

// cspell:ignore hashtext

/**
 * Cross-process advisory lock key guarding migration execution.
 *
 * @private function of runDatabaseMigrations
 */
const DATABASE_MIGRATION_LOCK_KEY = 'promptbook_agents_server_migrations';

/**
 * Lock-acquisition strategies used by the migration runner.
 *
 * `wait` is appropriate for explicit/manual migration flows where the caller expects one serialized run.
 * `skip` is appropriate for background startup checks where waiting would block request handling.
 *
 * @private function of runDatabaseMigrations
 */
export type DatabaseMigrationExecutionLockMode = 'wait' | 'skip';

/**
 * Acquires advisory lock preventing concurrent migration execution across processes.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for progress output.
 * @param mode Whether the caller should block for the lock or skip when it is already held.
 * @returns `true` when the lock was acquired and migrations may proceed.
 *
 * @private function of runDatabaseMigrations
 */
export async function acquireMigrationExecutionLock(
    client: Client,
    logger: DatabaseMigrationLogger,
    mode: DatabaseMigrationExecutionLockMode = 'wait',
): Promise<boolean> {
    if (mode === 'skip') {
        logger.info('🔒 Checking migration lock without waiting');
        const { rows } = await client.query<{ isMigrationLockAcquired: boolean }>(
            'SELECT pg_try_advisory_lock(hashtext($1)) AS "isMigrationLockAcquired";',
            [DATABASE_MIGRATION_LOCK_KEY],
        );

        if (!rows[0]?.isMigrationLockAcquired) {
            logger.info('⏭️ Migration lock is already held by another process. Skipping this migration attempt.');
            return false;
        }

        logger.info('🔒 Migration lock acquired');
        return true;
    }

    logger.info('🔒 Waiting for migration lock');
    await client.query('SELECT pg_advisory_lock(hashtext($1));', [DATABASE_MIGRATION_LOCK_KEY]);
    logger.info('🔒 Migration lock acquired');
    return true;
}

/**
 * Releases advisory lock used for migration execution.
 *
 * @param client Connected PostgreSQL client.
 * @param logger Logger used for warnings.
 *
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
