import { $provideServer } from '../../tools/$provideServer';
import { getFederatedServers } from '../../utils/getFederatedServers';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher, normalizeServerSearchText } from '../createServerSearchMatcher';
import { canSearchFederatedAgents } from './canSearchFederatedAgents';
import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';
import { fetchFederatedAgentsPayload } from './fetchFederatedAgentsPayload';
import { getServerHostname } from './getServerHostname';
import { normalizeServerUrl } from './normalizeServerUrl';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Creates provider for agents fetched from federated servers.
 *
 * @returns Configured federated-agents search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createFederatedAgentsSearchProvider(): ServerSearchProvider {
    return {
        id: 'federated-agents',
        label: 'Federated Agents',
        async search(context) {
            const canSearchFederated = await canSearchFederatedAgents(Boolean(context.currentUser));
            if (!canSearchFederated) {
                return [];
            }

            let federatedServers: string[] = [];
            try {
                federatedServers = await getFederatedServers({ excludeHiddenCoreServer: true });
            } catch (error) {
                console.error('[search] Failed to load federated servers:', error);
                return [];
            }

            const { publicUrl } = await $provideServer();
            const localOrigin = publicUrl.origin.replace(defaultServerSearchProviderConfig.trailingSlashPattern, '');
            const remoteServerUrls = federatedServers
                .map((url) => normalizeServerUrl(url))
                .filter((url) => url.length > 0)
                .filter((url) => url !== localOrigin);

            if (remoteServerUrls.length === 0) {
                return [];
            }

            const remoteResponses = await Promise.all(
                remoteServerUrls.map(async (serverUrl) => {
                    const payload = await fetchFederatedAgentsPayload(serverUrl);
                    return { serverUrl, payload };
                }),
            );

            const results: ServerSearchResultItem[] = [];
            for (const { serverUrl, payload } of remoteResponses) {
                if (!payload) {
                    continue;
                }

                for (const agent of payload) {
                    const agentLabel = agent.meta?.fullname || agent.agentName;
                    const profileText = [
                        agent.agentName,
                        agent.meta?.fullname || '',
                        agent.meta?.description || '',
                        agent.personaDescription || '',
                    ].join('\n');
                    const match = createServerSearchMatcher(context.query, [
                        {
                            text: profileText,
                            snippetText: agent.meta?.description || agent.personaDescription || profileText,
                            weight: 2.2,
                        },
                    ]);
                    if (!match) {
                        continue;
                    }

                    const fallbackRouteAgentId = encodeURIComponent(agent.permanentId || agent.agentName);
                    const href = agent.url || `${serverUrl}/agents/${fallbackRouteAgentId}`;

                    results.push({
                        id: `federated-${normalizeServerSearchText(serverUrl)}-${agent.agentName}`,
                        providerId: 'federated-agents',
                        group: 'Federated Agents',
                        type: 'federated-agent-profile',
                        icon: 'federated-agent',
                        title: `${agentLabel} (${getServerHostname(serverUrl)})`,
                        snippet: match.snippet,
                        href,
                        score: match.score + 16,
                        isExternal: true,
                    });
                }
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
