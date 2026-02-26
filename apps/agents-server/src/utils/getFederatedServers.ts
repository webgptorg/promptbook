import { string_promptbook_server_url } from '@promptbook-local/types';
import { getMetadataMap } from '../database/getMetadata';

/**
 * Options that tweak the behavior of `getFederatedServers`.
 *
 * @public exported from `apps/agents-server`
 */
export type GetFederatedServersOptions = {
    /**
     * When set, hide the core server from the resulting list if the metadata flag requests it.
     *
     * @private Internal toggle for UI surfaces that should hide the core server.
     */
    readonly excludeHiddenCoreServer?: boolean;
};

/**
 * @private Metadata key storing the core server URL.
 */
const CORE_SERVER_METADATA_KEY = 'CORE_SERVER';

/**
 * @private Metadata key storing the comma-separated federated servers list.
 */
const FEDERATED_SERVERS_METADATA_KEY = 'FEDERATED_SERVERS';

/**
 * @private Metadata key indicating whether the core server should be hidden from UI lists.
 */
const IS_CORE_SERVER_HIDDEN_METADATA_KEY = 'IS_CORE_SERVER_HIDDEN';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 *
 * @public exported from `apps/agents-server`
 */
export async function getFederatedServers(options?: GetFederatedServersOptions): Promise<string_promptbook_server_url[]> {
    const metadata = await getMetadataMap([
        FEDERATED_SERVERS_METADATA_KEY,
        CORE_SERVER_METADATA_KEY,
        IS_CORE_SERVER_HIDDEN_METADATA_KEY,
    ]);
    const federatedServersString = metadata[FEDERATED_SERVERS_METADATA_KEY] || '';
    const rawCoreServer = metadata[CORE_SERVER_METADATA_KEY] || '';
    const coreServer = rawCoreServer.trim() as string_promptbook_server_url;

    if (!coreServer) {
        throw new Error('Missing CORE_SERVER metadata value');
    }

    const federatedServers = federatedServersString
        .split(',')
        .map((server) => server.trim())
        .filter((server): server is string_promptbook_server_url => server !== '');

    const allServers = [coreServer, ...federatedServers];
    if (options?.excludeHiddenCoreServer && isCoreServerHidden(metadata)) {
        const normalizedCoreServer = normalizeServerUrl(coreServer);
        return allServers.filter((server) => normalizeServerUrl(server) !== normalizedCoreServer);
    }

    return allServers;
}

/**
 * Determines if the metadata flag explicitly hides the core server from UI lists.
 *
 * @param metadata - Metadata map containing IS_CORE_SERVER_HIDDEN value.
 * @returns Whether the core server should be hidden.
 *
 * @private Internal helper for filtering UI-friendly lists.
 */
function isCoreServerHidden(metadata: Record<string, string | null>): boolean {
    const rawValue = metadata[IS_CORE_SERVER_HIDDEN_METADATA_KEY] || '';
    return rawValue.trim().toLowerCase() === 'true';
}

/**
 * Normalizes a server URL by trimming trailing slashes for comparison purposes.
 *
 * @param value - Raw server URL.
 * @returns Normalized server URL.
 *
 * @private Internal helper used when filtering hidden servers.
 */
function normalizeServerUrl(value: string): string {
    return value.replace(/\/+$/, '');
}
