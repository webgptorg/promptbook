import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import type { ServerRecord } from '../serverRegistry';
import { listRegisteredServersUsingServiceRole } from '../serverRegistry';
import { SERVER_REGISTRY_TABLE_NAME } from './SERVER_REGISTRY_TABLE_NAME';

/**
 * Loads one registered server by its id.
 *
 * @param serverId - Registry id to resolve.
 * @returns Matching server record.
 */
export async function getManagedServerById(serverId: number): Promise<ServerRecord> {
    const servers = await listRegisteredServersUsingServiceRole({ forceRefresh: true });
    const server = servers.find((candidate) => candidate.id === serverId);

    if (!server) {
        throw new NotFoundError(
            spaceTrim(`
                Server with id \`${serverId}\` was not found in \`${SERVER_REGISTRY_TABLE_NAME}\`.
            `),
        );
    }

    return server;
}
