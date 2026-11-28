import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import type { ServerRecord } from '../serverRegistry';
import { invalidateRegisteredServersCache } from '../serverRegistry';
import { DATABASE_MIGRATION_APPLIED_BY, runDatabaseMigrations } from '../../database/runDatabaseMigrations';
import { getManagedServerById } from './getManagedServerById';
import { resolveManagedServerConnectionString } from './resolveManagedServerConnectionString';

/**
 * Summary returned after running migrations for a single server.
 */
export type RegisteredServerMigrationResult = {
    /**
     * Migrated server row.
     */
    readonly server: ServerRecord;

    /**
     * Number of newly applied migration files.
     */
    readonly appliedCount: number;

    /**
     * Total number of migration files discovered on disk.
     */
    readonly totalMigrationFiles: number;
};

/**
 * Runs pending migrations for the selected registered server.
 *
 * @param serverId - Registry id of the server to migrate.
 * @returns Migration summary for the selected server.
 */
export async function migrateManagedServer(serverId: number): Promise<RegisteredServerMigrationResult> {
    const server = await getManagedServerById(serverId);
    const connectionString = resolveManagedServerConnectionString('run server migrations');
    const migrationResult = await runDatabaseMigrations({
        prefixes: [server.tablePrefix],
        registeredServers: [server],
        connectionString,
        appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
        onlyTargets: [server.tablePrefix],
    });

    if (!migrationResult.perPrefix[0]) {
        throw new DatabaseError('Missing migration result for the selected server prefix.');
    }

    invalidateRegisteredServersCache();

    return {
        server,
        appliedCount: migrationResult.perPrefix[0].appliedCount,
        totalMigrationFiles: migrationResult.totalMigrationFiles,
    };
}
