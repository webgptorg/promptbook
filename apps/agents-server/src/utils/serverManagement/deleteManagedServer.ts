import { Client } from 'pg';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { invalidateRegisteredServersCache, parseServerRecord } from '../serverRegistry';
import { resolveManagedServerConnectionString } from './resolveManagedServerConnectionString';
import { SERVER_REGISTRY_TABLE_NAME } from './SERVER_REGISTRY_TABLE_NAME';

/**
 * Deletes the current registered server from `_Server` without touching prefixed tables.
 *
 * @param options - Delete request scoped to the currently active server.
 * @returns Next server id that should become active, or `null` when none remain.
 */
export async function deleteManagedServer(options: {
    readonly serverId: number;
    readonly currentServerId: number | null;
}): Promise<number | null> {
    if (options.currentServerId === null || options.serverId !== options.currentServerId) {
        throw new NotAllowed(
            spaceTrim(`
                You can delete only the currently selected server.
            `),
        );
    }

    const client = new Client({
        connectionString: resolveManagedServerConnectionString('delete a registered server'),
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        const deleteResult = await client.query(`DELETE FROM "${SERVER_REGISTRY_TABLE_NAME}" WHERE "id" = $1`, [
            options.serverId,
        ]);

        if ((deleteResult.rowCount ?? 0) === 0) {
            throw new NotFoundError(
                spaceTrim(`
                    Server with id \`${options.serverId}\` was not found in \`${SERVER_REGISTRY_TABLE_NAME}\`.
                `),
            );
        }

        const remainingRows = await client.query<Record<string, unknown>>(
            `
                SELECT "id", "name", "environment", "domain", "tablePrefix", "createdAt", "updatedAt"
                FROM "${SERVER_REGISTRY_TABLE_NAME}"
                ORDER BY "name" ASC
                LIMIT 1
            `,
        );

        await client.query('COMMIT');
        invalidateRegisteredServersCache();

        const nextServerRow = remainingRows.rows[0];
        return nextServerRow ? parseServerRecord(nextServerRow).id : null;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback failures so the original error stays visible.
        }

        throw new DatabaseError(
            spaceTrim(`
                Failed to delete the current server from \`${SERVER_REGISTRY_TABLE_NAME}\`.

                ${error instanceof Error ? error.message : String(error)}
            `),
        );
    } finally {
        await client.end();
    }
}
