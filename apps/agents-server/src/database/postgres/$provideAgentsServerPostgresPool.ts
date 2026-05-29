import { Pool } from 'pg';
import { resolvePostgresConnectionString } from '../resolvePostgresConnectionString';

/**
 * Shared PostgreSQL pool reused across the server process.
 *
 * @private exported from Agents Server PostgreSQL utilities
 */
let agentsServerPostgresPool: Pool | null = null;

/**
 * Provides the shared PostgreSQL pool used by direct PostgreSQL helpers.
 *
 * @returns Shared PostgreSQL pool.
 *
 * @private exported from Agents Server PostgreSQL utilities
 */
export function $provideAgentsServerPostgresPool(): Pool {
    if (!agentsServerPostgresPool) {
        agentsServerPostgresPool = new Pool({
            connectionString: resolvePostgresConnectionString(),
            ssl: { rejectUnauthorized: false },
        });
    }

    return agentsServerPostgresPool;
}

/**
 * Resets the cached PostgreSQL pool for isolated tests.
 *
 * @private exported from Agents Server PostgreSQL utilities
 */
export async function $resetAgentsServerPostgresPoolForTests(): Promise<void> {
    if (!agentsServerPostgresPool) {
        return;
    }

    const pool = agentsServerPostgresPool;
    agentsServerPostgresPool = null;
    await pool.end();
}
