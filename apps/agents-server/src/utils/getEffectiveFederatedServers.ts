import type { string_promptbook_server_url } from '../../../../src/types/typeAliases';
import { AUTO_FEDERATED_AGENT_SERVER_URLS } from '../../../../servers';

/**
 * Computes the effective list of federated servers for the current Agents Server.
 *
 * - Combines servers listed in the FEDERATED_SERVERS metadata (comma-separated)
 *   with a set of auto-federated servers defined in the root servers.ts config.
 * - Ensures uniqueness and trims whitespace.
 */
export function getEffectiveFederatedServers(federatedServersString: string): Array<string_promptbook_server_url> {
    const manualFederatedServers = federatedServersString
        .split(',')
        .map((server) => server.trim())
        .filter((server): server is string_promptbook_server_url => server !== '');

    const merged = Array.from(
        new Set<string_promptbook_server_url>([...manualFederatedServers, ...AUTO_FEDERATED_AGENT_SERVER_URLS]),
    );

    return merged;
}
