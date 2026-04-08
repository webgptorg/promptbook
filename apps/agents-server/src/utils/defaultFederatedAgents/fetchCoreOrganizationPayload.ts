import { spaceTrim } from '@promptbook-local/utils';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import type { FederatedOrganizationPayload } from './selectDefaultFederatedAgentsFromOrganizationPayload';
import { fetchWithDefaultFederatedAgentTimeout } from './fetchWithDefaultFederatedAgentTimeout';

/**
 * Fetches the Core public organization snapshot.
 *
 * @param coreServerUrl - Base URL of the Core server.
 * @returns Parsed organization payload.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function fetchCoreOrganizationPayload(coreServerUrl: string): Promise<FederatedOrganizationPayload> {
    const endpoint = new URL('/api/agent-organization', ensureTrailingSlash(coreServerUrl)).href;
    const response = await fetchWithDefaultFederatedAgentTimeout(endpoint);

    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to fetch default federated agents metadata from \`${endpoint}\`.

                Received \`${response.status} ${response.statusText}\`.
            `),
        );
    }

    return (await response.json()) as FederatedOrganizationPayload;
}

/**
 * Normalizes a server base URL so relative `URL` construction stays predictable.
 *
 * @param value - Raw base URL.
 * @returns Base URL with exactly one trailing slash.
 */
function ensureTrailingSlash(value: string): string {
    return `${value.replace(/\/+$/g, '')}/`;
}
