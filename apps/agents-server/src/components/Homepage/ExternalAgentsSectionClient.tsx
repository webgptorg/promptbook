'use client';

import { useEffect, useState } from 'react';
import { AgentCard } from './AgentCard';
import { AgentCardsLoadingSkeleton } from '../Skeleton/AgentCardsLoadingSkeleton';
import { Section } from './Section';
import { HOMEPAGE_AGENT_GRID_CLASS } from './gridLayout';
import { string_url } from '@promptbook-local/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { loadFederatedServerAgents } from './loadFederatedServerAgents';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Response for federated servers.
 */
type FederatedServersResponse = {
    federatedServers: string[];
};

/**
 * State for server.
 */
type ServerState = {
    status: 'loading' | 'success' | 'error';
    agents: AgentWithVisibility[];
    error?: string;
};

/**
 * Props for external agents section client.
 */
type ExternalAgentsSectionClientProps = {
    /**
     * Base URL of the agents server
     *
     * Note: [👭] Using `string_url`, not `URL` object because we are passing prop from server to client.
     */
    readonly publicUrl: string_url;
};

/**
 * Number of skeleton cards shown while one federated server section loads.
 */
const FEDERATED_SERVER_LOADING_CARD_COUNT = 4;

/**
 * Handles external agents section client.
 */
export function ExternalAgentsSectionClient(props: ExternalAgentsSectionClientProps) {
    const { publicUrl } = props;
    const [servers, setServers] = useState<Record<string, ServerState>>({});
    const [initialLoading, setInitialLoading] = useState(true);
    const { formatText } = useAgentNaming();

    useEffect(() => {
        let isCancelled = false;

        const fetchServers = async () => {
            try {
                const response = await fetch('/api/federated-agents');
                if (!response.ok) throw new Error('Failed to fetch federated servers');

                const data: FederatedServersResponse = await response.json();

                if (isCancelled) return;

                const initialServerState: Record<string, ServerState> = {};
                data.federatedServers.forEach((serverUrl) => {
                    initialServerState[serverUrl] = { status: 'loading', agents: [] };
                });

                setServers(initialServerState);
                setInitialLoading(false);

                // Fetch agents for each server independently
                data.federatedServers.forEach((serverUrl) => {
                    fetchAgentsForServer(serverUrl);
                });
            } catch (error) {
                console.error('Failed to load federated servers list', error);
                if (!isCancelled) setInitialLoading(false);
            }
        };

        const fetchAgentsForServer = async (serverUrl: string) => {
            try {
                const agents = await loadFederatedServerAgents(serverUrl);

                if (isCancelled) return;

                setServers((prev) => ({
                    ...prev,
                    [serverUrl]: {
                        status: 'success',
                        agents,
                    },
                }));
            } catch (error) {
                if (isCancelled) return;
                console.warn(`Failed to load agents from ${serverUrl}`, error);

                setServers((prev) => ({
                    ...prev,
                    [serverUrl]: {
                        status: 'error',
                        agents: [],
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                }));
            }
        };

        fetchServers();

        return () => {
            isCancelled = true;
        };
    }, []);

    if (initialLoading) {
        return (
            <div
                className="mt-8"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label="Loading federated agents"
            >
                <Section title={formatText('Federated agents')} gridClassName={HOMEPAGE_AGENT_GRID_CLASS}>
                    <AgentCardsLoadingSkeleton cardCount={FEDERATED_SERVER_LOADING_CARD_COUNT} />
                </Section>
            </div>
        );
    }

    const serverUrls = Object.keys(servers);

    if (serverUrls.length === 0) {
        return null;
    }

    return (
        <>
            {serverUrls.map((serverUrl) => {
                const state = servers[serverUrl];
                const hostname = (() => {
                    try {
                        return new URL(serverUrl).hostname;
                    } catch {
                        return serverUrl;
                    }
                })();

                if (state.status === 'loading') {
                    return (
                        <Section
                            key={serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (...)`}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            <AgentCardsLoadingSkeleton cardCount={FEDERATED_SERVER_LOADING_CARD_COUNT} />
                        </Section>
                    );
                }

                if (state.status === 'error') {
                    return (
                        <Section
                            key={serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (Error)`}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            <div className="py-4 text-sm text-red-500 text-center">
                                {formatText('Failed to load agents from this server.')}
                            </div>
                        </Section>
                    );
                }

                if (state.status === 'success' && state.agents.length > 0) {
                    return (
                        <Section
                            key={serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (${state.agents.length})`}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            {state.agents.map((agent) => (
                                <AgentCard
                                    key={agent.url}
                                    agent={agent}
                                    href={agent.url}
                                    publicUrl={publicUrl}
                                    serverUrl={serverUrl}
                                />
                            ))}
                        </Section>
                    );
                }

                // Hide sections with no agents if successfully loaded
                return null;
            })}
        </>
    );
}
