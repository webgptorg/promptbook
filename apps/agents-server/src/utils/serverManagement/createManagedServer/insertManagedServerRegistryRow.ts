import { Client } from 'pg';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../../src/errors/DatabaseError';
import { parseServerRecord, type ServerRecord } from '../../serverRegistry';
import { SERVER_REGISTRY_TABLE_NAME } from '../SERVER_REGISTRY_TABLE_NAME';
import { createInsertStatement, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

/**
 * Inserts the new server row into the shared `_Server` registry.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 * @returns Parsed registry row.
 *
 * @private function of createManagedServer
 */
export async function insertManagedServerRegistryRow(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<ServerRecord> {
    const insertRegistryResult = await client.query<Record<string, unknown>>(
        `
            INSERT INTO "${SERVER_REGISTRY_TABLE_NAME}" ("name", "environment", "domain", "tablePrefix")
            VALUES ($1, $2, $3, $4)
            RETURNING "id", "name", "environment", "domain", "tablePrefix", "createdAt", "updatedAt"
        `,
        [input.name, input.environment, input.domain, input.tablePrefix],
    );

    sqlRecorder.addStatement(
        createInsertStatement(SERVER_REGISTRY_TABLE_NAME, {
            name: input.name,
            environment: input.environment,
            domain: input.domain,
            tablePrefix: input.tablePrefix,
        }),
    );

    const serverRow = insertRegistryResult.rows[0];

    if (!serverRow) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to insert a row into \`${SERVER_REGISTRY_TABLE_NAME}\` for server \`${input.name}\`.
            `),
        );
    }

    return parseServerRecord(serverRow);
}
