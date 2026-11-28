import spaceTrim from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';

/**
 * Resolves the PostgreSQL connection string used by Supabase-backed Agents Server database access.
 *
 * @returns PostgreSQL connection string.
 * @throws DatabaseError when neither supported environment variable is configured.
 *
 * @private exported from Agents Server database utilities
 */
export function resolvePostgresConnectionString(): string {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Environment variable \`POSTGRES_URL\` or \`DATABASE_URL\` must be defined.

                Configure one of these variables to use the Supabase/PostgreSQL database backend.
            `),
        );
    }

    return connectionString;
}
