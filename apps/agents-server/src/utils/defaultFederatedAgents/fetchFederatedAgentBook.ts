import { spaceTrim } from '@promptbook-local/utils';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { fetchWithDefaultFederatedAgentTimeout } from './fetchWithDefaultFederatedAgentTimeout';

/**
 * Fetches the effective book source of one remote public agent.
 *
 * @param agentRouteUrl - Canonical remote agent route.
 * @returns Remote book content as plain text.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function fetchFederatedAgentBook(agentRouteUrl: string): Promise<string_book> {
    const endpoint = buildFederatedAgentBookUrl(agentRouteUrl);
    const response = await fetchWithDefaultFederatedAgentTimeout(endpoint);

    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to fetch default federated agent source from \`${endpoint}\`.

                Received \`${response.status} ${response.statusText}\`.
            `),
        );
    }

    return (await response.text()) as string_book;
}

/**
 * Builds the public book endpoint URL for one remote agent route.
 *
 * @param agentRouteUrl - Canonical remote agent route.
 * @returns Absolute remote `/api/book` URL.
 */
function buildFederatedAgentBookUrl(agentRouteUrl: string): string {
    const routeUrl = new URL(agentRouteUrl);
    routeUrl.search = '';
    routeUrl.hash = '';
    routeUrl.pathname = `${routeUrl.pathname.replace(/\/+$/g, '')}/api/book`;
    return routeUrl.href;
}
