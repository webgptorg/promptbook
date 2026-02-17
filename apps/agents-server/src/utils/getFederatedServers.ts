import { string_promptbook_server_url } from '@promptbook-local/types';
import { getMetadataMap } from '../database/getMetadata';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 *
 * @public exported from `apps/agents-server`
 */
export async function getFederatedServers(): Promise<string[]> {
    const metadata = await getMetadataMap(['FEDERATED_SERVERS', 'CORE_SERVER']);
    const federatedServersString = metadata['FEDERATED_SERVERS'] || '';
    const coreServer = metadata['CORE_SERVER'];

    if (!coreServer) {
        throw new Error('Missing CORE_SERVER metadata value');
    }

    const federatedServers = federatedServersString
        .split(',')
        .map((server) => server.trim())
        .filter((server): server is string_promptbook_server_url => server !== '');

    return [coreServer, ...federatedServers];
}
