'use client';

import { useEffect, useState } from 'react';
import type { AgentWithVisibility } from './useFederatedAgents';
import { normalizeServerUrl } from './normalizeServerUrl';

/**
 * Response returned by the homepage federated-servers endpoint.
 *
 * @private shared client utility for homepage-like agent pickers.
 */
type FederatedServersResponse = {
    readonly federatedServers?: ReadonlyArray<string>;
};

/**
 * One federated server section with its loading state and loaded agents.
 *
 * @private shared client utility for homepage-like agent pickers.
 */
export type FederatedAgentSectionState = {
    readonly serverUrl: string;
    readonly status: 'loading' | 'success' | 'error';
    readonly agents: ReadonlyArray<AgentWithVisibility>;
    readonly error?: string;
};

/**
 * Fetches one remote `/api/agents` payload either directly or through the proxy fallback.
 *
 * @param serverUrl - Remote server URL without trailing slash.
 * @returns Loaded agents with attached server URL.
 *
 * @private shared client utility for homepage-like agent pickers.
 */
async function fetchFederatedAgentsForServer(serverUrl: string): Promise<ReadonlyArray<AgentWithVisibility>> {
    const normalizedUrl = normalizeServerUrl(serverUrl);
    const directResponse = await fetch(`${normalizedUrl}/api/agents`);
    if (directResponse.ok) {
        const directData = (await directResponse.json()) as { agents?: ReadonlyArray<AgentWithVisibility> };
        return (directData.agents || []).map((agent) => ({
            ...agent,
            serverUrl: normalizedUrl,
        }));
    }

    const proxyUrl = `/agents/${encodeURIComponent(normalizedUrl)}/api/agents`;
    const proxyResponse = await fetch(proxyUrl);
    if (!proxyResponse.ok) {
        throw new Error(`Failed to fetch agents from ${serverUrl} (direct: ${directResponse.status}, proxy: ${proxyResponse.status})`);
    }

    const proxyData = (await proxyResponse.json()) as { agents?: ReadonlyArray<AgentWithVisibility> };
    return (proxyData.agents || []).map((agent) => ({
        ...agent,
        serverUrl: normalizedUrl,
    }));
}

/**
 * Loads federated server sections with the same fetch behavior used by the homepage cards.
 *
 * @returns Initial loading flag together with per-server loading/error/data sections.
 *
 * @private shared client utility for homepage-like agent pickers.
 */
export function useFederatedAgentSections(): {
    readonly isLoading: boolean;
    readonly sections: ReadonlyArray<FederatedAgentSectionState>;
} {
    const [sections, setSections] = useState<ReadonlyArray<FederatedAgentSectionState>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        async function loadFederatedAgentSections(): Promise<void> {
            try {
                const response = await fetch('/api/federated-agents');
                if (!response.ok) {
                    throw new Error('Failed to fetch federated servers');
                }

                const data = (await response.json()) as FederatedServersResponse;
                if (isCancelled) {
                    return;
                }

                const serverUrls = (data.federatedServers || []).map(normalizeServerUrl);
                setSections(serverUrls.map((serverUrl) => ({ serverUrl, status: 'loading', agents: [] })));
                setIsLoading(false);

                await Promise.all(
                    serverUrls.map(async (serverUrl) => {
                        try {
                            const agents = await fetchFederatedAgentsForServer(serverUrl);
                            if (isCancelled) {
                                return;
                            }

                            setSections((previousSections) =>
                                previousSections.map((section) =>
                                    section.serverUrl === serverUrl ? { ...section, status: 'success', agents } : section,
                                ),
                            );
                        } catch (error) {
                            if (isCancelled) {
                                return;
                            }

                            console.warn(`Failed to load agents from ${serverUrl}`, error);
                            setSections((previousSections) =>
                                previousSections.map((section) =>
                                    section.serverUrl === serverUrl
                                        ? {
                                              ...section,
                                              status: 'error',
                                              agents: [],
                                              error: error instanceof Error ? error.message : 'Unknown error',
                                          }
                                        : section,
                                ),
                            );
                        }
                    }),
                );
            } catch (error) {
                console.error('Failed to load federated servers list', error);
                if (!isCancelled) {
                    setSections([]);
                    setIsLoading(false);
                }
            }
        }

        void loadFederatedAgentSections();

        return () => {
            isCancelled = true;
        };
    }, []);

    return {
        isLoading,
        sections,
    };
}
