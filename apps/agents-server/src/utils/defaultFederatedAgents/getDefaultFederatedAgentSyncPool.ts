import { spaceTrim } from '@promptbook-local/utils';
import { Pool } from 'pg';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { resolveDatabaseMigrationConnectionStringFromEnvironment } from '../../database/runDatabaseMigrations';

/**
 * Shared PostgreSQL pool reused by default-agent sync helpers.
 */
let defaultFederatedAgentSyncPool: Pool | null = null;

/**
 * Resolves the shared PostgreSQL pool used by this feature.
 *
 * @returns Shared PostgreSQL pool.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export function getDefaultFederatedAgentSyncPool(): Pool {
    if (defaultFederatedAgentSyncPool) {
        return defaultFederatedAgentSyncPool;
    }

    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot synchronize default federated agents because \`POSTGRES_URL\` or \`DATABASE_URL\` is missing.
            `),
        );
    }

    defaultFederatedAgentSyncPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    return defaultFederatedAgentSyncPool;
}
