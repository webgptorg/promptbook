import { string_promptbook_server_url } from '@promptbook-local/types';
import { getMetadata } from '../database/getMetadata';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 */
export async function getFederatedServers(): Promise<string[]> {
    const federatedServersString = (await getMetadata('FEDERATED_SERVERS')) || '';
    const coreServer = (await getMetadata('CORE_SERVER'))!;

    const federatedServers = federatedServersString
        .split(',')
        .map((server) => server.trim())
        .filter((server): server is string_promptbook_server_url => server !== '');

    return [coreServer, ...federatedServers];
}
