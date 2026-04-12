import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { applyPendingMigrationsForPrefix } from '../../../database/migratePrefix';
import { readMigrationFiles, resolveMigrationsDirectory } from '../../../database/resolveMigrationsDirectory';
import { DATABASE_MIGRATION_APPLIED_BY } from '../../../database/runDatabaseMigrations';
import { createInsertStatement, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

/**
 * Applies all currently pending prefix migrations and records them in the SQL dump.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 * @param migrationLogger - Logger matching the migration helper contract.
 *
 * @private function of createManagedServer
 */
export async function applyManagedServerMigrations(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
    migrationLogger: Pick<Console, 'error' | 'info' | 'warn'>,
): Promise<void> {
    const migrationsDirectory = await resolveMigrationsDirectory();
    const migrationFiles = await readMigrationFiles(migrationsDirectory);

    for (const migrationFile of migrationFiles) {
        const rawMigrationSql = await readFile(`${migrationsDirectory}/${migrationFile}`, 'utf-8');
        sqlRecorder.addStatement(rawMigrationSql.replace(/prefix_/g, input.tablePrefix));
        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}Migrations`, {
                filename: migrationFile,
                appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
            }),
        );
    }

    await applyPendingMigrationsForPrefix({
        prefix: input.tablePrefix,
        appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
        manualAppliedByDefault: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
        client,
        logger: migrationLogger,
        migrationFiles,
        migrationsDirectory,
        logSqlStatements: false,
    });
}
