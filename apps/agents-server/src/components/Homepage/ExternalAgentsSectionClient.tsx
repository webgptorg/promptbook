'use client';

import { useEffect, useState } from 'react';
import type { AgentsByServer } from '../../utils/AgentsByServer';
import { AgentCard } from './AgentCard';
import { Section } from './Section';
import { string_url } from '@promptbook-local/types';

type FederatedServersResponse = {
    federatedServers: string[];
};

type ServerState = {
    status: 'loading' | 'success' | 'error';
    agents: AgentsByServer['agents'];
    error?: string;
};

type ExternalAgentsSectionClientProps = {
    /**
     * Base URL of the agents server
     * 
     * Note: [👭] Using `string_url`, not `URL` object because we are passing prop from server to client. 
     */
    readonly publicUrl: string_url
};

export function ExternalAgentsSectionClient(props: ExternalAgentsSectionClientProps) {
    const { publicUrl } = props;
    const [servers, setServers] = useState<Record<string, ServerState>>({});
    const [initialLoading, setInitialLoading] = useState(true);

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
            const normalizedUrl = serverUrl.replace(/\/$/, '');

            try {
                // 1. Try direct connection
                const response = await fetch(`${normalizedUrl}/api/agents`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch agents from ${serverUrl} (Status: ${response.status})`);
                }

                const data = await response.json();

                if (isCancelled) return;

                setServers((prev) => ({
                    ...prev,
                    [serverUrl]: {
                        status: 'success',
                        agents: data.agents || [],
                    },
                }));
            } catch (directError) {
                // 2. Try proxy through our server
                try {
                    // Note: We are using encodeURIComponent to ensure the URL is passed correctly as a parameter
                    const proxyUrl = `/agents/${encodeURIComponent(normalizedUrl)}/api/agents`;
                    const response = await fetch(proxyUrl);

                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch agents from ${serverUrl} via proxy (Status: ${response.status})`,
                        );
                    }

                    const data = await response.json();

                    if (isCancelled) return;

                    setServers((prev) => ({
                        ...prev,
                        [serverUrl]: {
                            status: 'success',
                            agents: data.agents || [],
                        },
                    }));
                } catch (proxyError) {
                    if (isCancelled) return;
                    console.warn(`Failed to load agents from ${serverUrl} (Direct & Proxy)`, directError, proxyError);

                    setServers((prev) => ({
                        ...prev,
                        [serverUrl]: {
                            status: 'error',
                            agents: [],
                            error: proxyError instanceof Error ? proxyError.message : 'Unknown error',
                        },
                    }));
                }
            }
        };

        fetchServers();

        return () => {
            isCancelled = true;
        };
    }, []);

    if (initialLoading) {
        return (
            <div className="mt-8 flex items-center justify-center py-8 text-sm text-gray-500">
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                Loading federated agents…
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
                        <Section key={serverUrl} title={`Agents from ${hostname} (...)`}>
                            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                Loading...
                            </div>
                        </Section>
                    );
                }

                if (state.status === 'error') {
                    return (
                        <Section key={serverUrl} title={`Agents from ${hostname} (Error)`}>
                            <div className="py-4 text-sm text-red-500 text-center">
                                Failed to load agents from this server.
                            </div>
                        </Section>
                    );
                }

                if (state.status === 'success' && state.agents.length > 0) {
                    return (
                        <Section key={serverUrl} title={`Agents from ${hostname} (${state.agents.length})`}>
                            {state.agents.map((agent) => (
                                <AgentCard key={agent.url} agent={agent} href={agent.url} publicUrl={publicUrl} />
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
