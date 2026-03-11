import type { Client, QueryResultRow } from 'pg';
import spaceTrim from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { parseServerRecord, type ServerRecord } from '../utils/serverRegistry';

/**
 * SQL query used to load all registered servers in a deterministic order.
 */
const LIST_REGISTERED_SERVERS_SQL = `
    SELECT
        "id",
        "name",
        "environment",
        "domain",
        "tablePrefix",
        "createdAt",
        "updatedAt"
    FROM "_Server"
    ORDER BY "name" ASC
`;

/**
 * Minimal PostgreSQL client contract required by the registry reader.
 */
type RegisteredServersDatabaseClient = Pick<Client, 'query'>;

/**
 * Loads the global `_Server` registry through a PostgreSQL client.
 *
 * Returns an empty array when the `_Server` table does not exist yet.
 *
 * @param client - Connected PostgreSQL client.
 * @returns Registered servers ordered by name.
 */
export async function listRegisteredServersFromDatabase(
    client: RegisteredServersDatabaseClient,
): Promise<Array<ServerRecord>> {
    try {
        const { rows } = await client.query<QueryResultRow>(LIST_REGISTERED_SERVERS_SQL);
        return rows.map((row, index) => parseServerRecord(row, `row ${index + 1}`));
    } catch (error) {
        if (isMissingServerRegistryError(error)) {
            return [];
        }

        throw new DatabaseError(
            spaceTrim(`
                Failed to query global server registry table \`_Server\`.

                ${error instanceof Error ? error.message : String(error)}
            `),
        );
    }
}

/**
 * Detects PostgreSQL relation-not-found errors for `_Server`.
 *
 * @param error - Unknown query error.
 * @returns `true` when `_Server` does not exist yet.
 */
function isMissingServerRegistryError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '42P01';
}
