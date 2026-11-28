import type { string_promptbook_server_url } from '@promptbook-local/types';
import { FEDERATED_SERVERS_METADATA_KEY } from '../constants/federatedAgentImport';
import { getMetadataMap } from '../database/getMetadata';
import { parseFederatedServers } from './parseFederatedServers';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 *
 * @public exported from `apps/agents-server`
 */
export async function getFederatedServers(): Promise<Array<string_promptbook_server_url>> {
    const metadata = await getMetadataMap([FEDERATED_SERVERS_METADATA_KEY]);
    return parseFederatedServers(metadata[FEDERATED_SERVERS_METADATA_KEY]);
}
