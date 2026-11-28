import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { resolveDatabaseMigrationConnectionStringFromEnvironment } from '../../database/runDatabaseMigrations';

/**
 * Resolves the PostgreSQL connection string required for mutable server-management operations.
 *
 * @param action - Human-readable action name used in diagnostics.
 * @returns Non-empty connection string.
 *
 * @private function of serverManagement
 */
export function resolveManagedServerConnectionString(action: string): string {
    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();

    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot ${action} because \`POSTGRES_URL\` or \`DATABASE_URL\` is missing.
            `),
        );
    }

    return connectionString;
}
