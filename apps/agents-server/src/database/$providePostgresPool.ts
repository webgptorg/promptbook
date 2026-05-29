import { Pool } from 'pg';
import { resolvePostgresConnectionString } from './resolvePostgresConnectionString';

/**
 * Shared PostgreSQL pool reused across the Agents Server process.
 *
 * @private internal singleton of Agents Server database layer
 */
let postgresPool: Pool | null = null;

/**
 * Provides the shared PostgreSQL pool used by raw SQL helpers and local PostgreSQL adapters.
 *
 * @returns Shared PostgreSQL pool.
 *
 * @private exported from Agents Server database utilities
 */
export function $providePostgresPool(): Pool {
    if (!postgresPool) {
        postgresPool = new Pool({
            connectionString: resolvePostgresConnectionString(),
            ssl: { rejectUnauthorized: false },
        });
    }

    return postgresPool;
}
