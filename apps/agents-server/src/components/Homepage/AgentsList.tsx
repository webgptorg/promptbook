// Client Component for rendering and deleting agents
'use client';

import { Grid, Network, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddAgentButton } from '../../app/AddAgentButton';
import { AgentCard } from './AgentCard';
import { AgentsGraph } from './AgentsGraph';

import { string_url } from '@promptbook-local/types';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
    serverUrl?: string;
};

type AgentsListProps = {
    /**
     * List of agents to display, each with basic information and visibility status
     */
    readonly agents: AgentWithVisibility[];

    /**
     * Indicates if the current user has administrative privileges for managing agents
     */
    readonly isAdmin: boolean;

    /**
     * Base URL of the agents server
     *
     * Note: [👭] Using `string_url`, not `URL` object because we are passing prop from server to client.
     */
    readonly publicUrl: string_url;
};

export function AgentsList(props: AgentsListProps) {
    const { agents: initialAgents, isAdmin, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [agents, setAgents] = useState(Array.from(initialAgents));
    const [federatedAgents, setFederatedAgents] = useState<AgentWithVisibility[]>([]);
    const viewMode = searchParams.get('view') === 'graph' ? 'GRAPH' : 'LIST';

    useEffect(() => {
        if (viewMode !== 'GRAPH') {
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

                    try {
                        const normalizedUrl = serverUrl.replace(/\/$/, '');
                        const agentsResponse = await fetch(`/agents/${encodeURIComponent(normalizedUrl)}/api/agents`);
                        if (agentsResponse.ok) {
                            const agentsData = await agentsResponse.json();
                            if (isCancelled) {
                                break;
                            }
                            const newFederatedAgents = (agentsData.agents || []).map((agent: AgentWithVisibility) => ({
                                ...agent,
                                // Note: Federated agents are assumed public or handled by the server
                                visibility: 'PUBLIC',
                                serverUrl: normalizedUrl,
                            }));
                            setFederatedAgents((prev) => {
                                const filteredPrev = prev.filter((a) => a.serverUrl !== normalizedUrl);
                                return [...filteredPrev, ...newFederatedAgents];
                            });
                        }
                    } catch (error) {
                        console.error(`Failed to fetch agents from ${serverUrl}`, error);
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
    }, [viewMode]);

    const setViewMode = (mode: 'LIST' | 'GRAPH') => {
        const params = new URLSearchParams(searchParams.toString());
        if (mode === 'LIST') {
            params.delete('view');
        } else {
            params.set('view', 'graph');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const handleDelete = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Delete agent "${agent.agentName}"? It will be moved to Recycle Bin.`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, { method: 'DELETE' });
            if (response.ok) {
                // Update local state immediately
                setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
                // Note: router.refresh() is not needed here as the local state update is sufficient
                // and prevents the brief empty list issue during refresh
            } else {
                alert('Failed to delete agent');
            }
        } catch (error) {
            alert('Failed to delete agent');
        }
    };

    const handleClone = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Clone agent "${agent.agentName}"?`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/clone`, {
                method: 'POST',
            });
            if (response.ok) {
                const newAgent = await response.json();
                setAgents([...agents, newAgent]);
                router.refresh(); // Refresh server data to ensure consistency
            } else {
                alert('Failed to clone agent');
            }
        } catch (error) {
            alert('Failed to clone agent');
        }
    };

    const handleToggleVisibility = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;

        const newVisibility = agent.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
        if (!window.confirm(`Make agent "${agent.agentName}" ${newVisibility.toLowerCase()}?`)) return;

        const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility: newVisibility }),
        });

        if (response.ok) {
            // Update the local state
            setAgents(
                agents.map((a) =>
                    a.permanentId === agent.permanentId || a.agentName === agent.agentName
                        ? { ...a, visibility: newVisibility }
                        : a,
                ),
            );
            router.refresh(); // Refresh server data to ensure consistency
        } else {
            alert('Failed to update agent visibility');
        }
    };

    return (
        <section className="mt-16 first:mt-4 mb-4">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">
                <div className="flex items-center justify-between w-full">
                    <span>Agents ({agents.length})</span>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg ml-4">
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                viewMode === 'LIST'
                                    ? 'bg-white shadow-sm text-blue-600 font-medium'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="List View"
                        >
                            <Grid className="w-4 h-4" />
                            <span>List</span>
                        </button>
                        <button
                            onClick={() => setViewMode('GRAPH')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                viewMode === 'GRAPH'
                                    ? 'bg-white shadow-sm text-blue-600 font-medium'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Graph View"
                        >
                            <Network className="w-4 h-4" />
                            <span>Graph</span>
                        </button>
                    </div>
                </div>
            </h2>
            {viewMode === 'LIST' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent) => (
                        <AgentCard
                            key={agent.permanentId || agent.agentName}
                            agent={agent}
                            publicUrl={publicUrl}
                            href={`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`}
                            isAdmin={isAdmin}
                            onDelete={handleDelete}
                            onClone={handleClone}
                            onToggleVisibility={handleToggleVisibility}
                            visibility={agent.visibility}
                        />
                    ))}
                    {isAdmin && <AddAgentButton />}
                    {isAdmin && (
                        <Link
                            href="/recycle-bin"
                            className="flex items-center gap-2 px-4 py-2 mt-4 text-gray-600 hover:text-red-600 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Open Recycle Bin
                        </Link>
                    )}
                </div>
            ) : (
                <div className="w-full">
                    <AgentsGraph
                        agents={agents.map((a) => ({ ...a, serverUrl: publicUrl.replace(/\/$/, '') }))}
                        federatedAgents={federatedAgents}
                        publicUrl={publicUrl}
                    />
                </div>
            )}
        </section>
    );
}
