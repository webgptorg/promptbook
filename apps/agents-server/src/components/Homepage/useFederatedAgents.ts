'use client';

import { useEffect, useState } from 'react';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';

/**
 * Local agent payload with optional federation metadata.
 *
 * @private function of AgentsList
 */
export type AgentWithVisibility = AgentOrganizationAgent & {
    serverUrl?: string;
};

/**
 * Status of one federated server fetch.
 *
 * @private function of AgentsList
 */
export type FederatedServerStatus = {
    status: 'loading' | 'success' | 'error';
    error?: string;
};

/**
 * Loads federated agents and tracks per-server loading status.
 *
 * @param showFederatedAgents - Whether federated agents feature is enabled.
 * @param initialExternalAgents - Initial external agents provided by the server.
 * @param refreshKey - Optional key used to force refetch while enabled.
 * @returns Loaded federated agents and server statuses.
 * @private function of AgentsList
 */
export function useFederatedAgents(
    showFederatedAgents: boolean,
    initialExternalAgents?: AgentWithVisibility[],
    refreshKey?: unknown,
) {
    const [federatedAgents, setFederatedAgents] = useState<AgentWithVisibility[]>(initialExternalAgents || []);
    const [federatedServersStatus, setFederatedServersStatus] = useState<Record<string, FederatedServerStatus>>({});

    useEffect(() => {
        if (!showFederatedAgents) {
            setFederatedAgents([]);
            setFederatedServersStatus({});
            return;
        }

        let isCancelled = false;

        const fetchFederatedAgents = async () => {
            try {
                const response = await fetch('/api/federated-agents');
                if (!response.ok) {
                    return;
                }
                const data = await response.json();
                const federatedServers: string[] = data.federatedServers || [];

                for (const serverUrl of federatedServers) {
                    if (isCancelled) {
                        break;
                    }

                    const normalizedUrl = serverUrl.replace(/\/$/, '');

                    setFederatedServersStatus((prev) => ({
                        ...prev,
                        [normalizedUrl]: { status: 'loading' },
                    }));

                    try {
                        const agentsResponse = await fetch(`${normalizedUrl}/api/agents`);
                        if (agentsResponse.ok) {
                            const agentsData = await agentsResponse.json();
                            if (isCancelled) {
                                break;
                            }
                            const newFederatedAgents = (agentsData.agents || []).map((agent: AgentWithVisibility) => ({
                                ...agent,
                                visibility: 'PUBLIC',
                                serverUrl: normalizedUrl,
                            }));
                            setFederatedAgents((prev) => {
                                const filteredPrev = prev.filter((a) => a.serverUrl !== normalizedUrl);
                                return [...filteredPrev, ...newFederatedAgents];
                            });
                            setFederatedServersStatus((prev) => ({
                                ...prev,
                                [normalizedUrl]: { status: 'success' },
                            }));
                        } else {
                            throw new Error(`Failed to fetch agents (Status: ${agentsResponse.status})`);
                        }
                    } catch (error) {
                        console.error(`Failed to fetch agents from ${serverUrl}`, error);
                        setFederatedServersStatus((prev) => ({
                            ...prev,
                            [normalizedUrl]: {
                                status: 'error',
                                error: error instanceof Error ? error.message : 'Unknown error',
                            },
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch federated servers', error);
            }
        };

        fetchFederatedAgents();

        return () => {
            isCancelled = true;
        };
    }, [showFederatedAgents, refreshKey]);

    return { federatedAgents, federatedServersStatus };
}
