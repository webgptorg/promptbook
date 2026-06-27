import { string_promptbook_server_url } from '@promptbook-local/types';
import { getMetadataMap } from '../database/getMetadata';

/**
 * Metadata key storing the comma-separated federated servers list.
 *
 * @private
 */
const FEDERATED_SERVERS_METADATA_KEY = 'FEDERATED_SERVERS';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 *
 * @public exported from `apps/agents-server`
 */
export async function getFederatedServers(): Promise<string_promptbook_server_url[]> {
    const metadata = await getMetadataMap([FEDERATED_SERVERS_METADATA_KEY]);
    const federatedServersString = metadata[FEDERATED_SERVERS_METADATA_KEY] || '';

    return federatedServersString
        .split(',')
        .map((server) => server.trim())
        .filter((server): server is string_promptbook_server_url => server !== '');
}
