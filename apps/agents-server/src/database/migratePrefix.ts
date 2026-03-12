import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import type { DatabaseMigrationAppliedBy, DatabaseMigrationLogger } from './runDatabaseMigrations';

/**
 * Context for one prefix migration pass.
 *
 * @private function of runDatabaseMigrations
 */
export type MigratePrefixOptions = {
    /**
     * Prefix to migrate.
     */
    readonly prefix: string;
    /**
     * Marker for migration records.
     */
    readonly appliedBy: DatabaseMigrationAppliedBy;
    /**
     * Fallback value used when old migration records have missing `appliedBy`.
     */
    readonly manualAppliedByDefault: DatabaseMigrationAppliedBy;
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
 * Context for migrations-table schema synchronization.
 *
 * @private function of runDatabaseMigrations
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
    /**
     * Fallback value used when old migration records have missing `appliedBy`.
     */
    readonly manualAppliedByDefault: DatabaseMigrationAppliedBy;
};

/**
 * Applies pending migrations for one prefix inside the current transaction.
 *
 * @param options Prefix migration options.
 * @returns Number of newly applied migrations.
 * @private function of runDatabaseMigrations
 */
export async function applyPendingMigrationsForPrefix(options: MigratePrefixOptions): Promise<number> {
    const migrationsTableName = `${options.prefix}Migrations`;
    const migrationsTableIdentifier = quoteIdentifier(migrationsTableName);

    await ensureMigrationsTableSchema({
        client: options.client,
        migrationsTableIdentifier,
        manualAppliedByDefault: options.manualAppliedByDefault,
    });

    const { rows } = await options.client.query<{ filename: string }>(
        `SELECT "filename" FROM ${migrationsTableIdentifier}`,
    );
    const appliedMigrations = new Set(rows.map((row) => row.filename));

    let appliedCount = 0;
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

    return appliedCount;
}

/**
 * Runs migrations for one prefix in a single transaction.
 *
 * @param options Prefix migration options.
 * @returns Number of newly applied migrations.
 * @private function of runDatabaseMigrations
 */
export async function migratePrefix(options: MigratePrefixOptions): Promise<number> {
    await options.client.query('BEGIN');
    try {
        const appliedCount = await applyPendingMigrationsForPrefix(options);
        await options.client.query('COMMIT');
        return appliedCount;
    } catch (error) {
        await safeRollbackTransaction(options.client, options.logger, options.prefix);
        throw error;
    }
}

/**
 * Creates or upgrades the migrations table schema.
 *
 * This keeps the `appliedBy` column present even on old installations.
 *
 * @param options Migration table schema options.
 * @private function of runDatabaseMigrations
 */
async function ensureMigrationsTableSchema(options: EnsureMigrationsTableSchemaOptions): Promise<void> {
    await options.client.query(`
        CREATE TABLE IF NOT EXISTS ${options.migrationsTableIdentifier} (
            "filename" TEXT PRIMARY KEY,
            "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
            "appliedBy" TEXT NOT NULL DEFAULT '${options.manualAppliedByDefault}'
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
        [options.manualAppliedByDefault],
    );

    await options.client.query(`
        ALTER TABLE ${options.migrationsTableIdentifier}
        ALTER COLUMN "appliedBy" SET DEFAULT '${options.manualAppliedByDefault}';
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
 * @private function of runDatabaseMigrations
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
 * Quotes SQL identifiers safely for PostgreSQL.
 *
 * @param identifier Raw identifier.
 * @returns Quoted identifier.
 * @private function of runDatabaseMigrations
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
