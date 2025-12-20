// Client Component for rendering deleted agents
'use client';

import { useState } from 'react';
import { AgentCard } from './AgentCard';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type DeletedAgentsListProps = {
    /**
     * @@@
     */
    readonly agents: readonly AgentBasicInformation[];

    /**
     * @@@
     */
    readonly isAdmin: boolean;

    /**
     * Base URL of the agents server
     */
    readonly publicUrl: URL;
};

export function DeletedAgentsList(props: DeletedAgentsListProps) {
    const { agents: initialAgents, isAdmin, publicUrl } = props;
    const [agents, setAgents] = useState(Array.from(initialAgents));

    const handleRestore = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Restore agent "${agent.agentName}"?`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/restore`, {
                method: 'POST',
            });
            if (response.ok) {
                // Update local state immediately
                setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
                // Note: router.refresh() is not needed here as the local state update is sufficient
                // and prevents the brief empty list issue during refresh
            } else {
                alert('Failed to restore agent');
            }
        } catch (error) {
            alert('Failed to restore agent');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agents.map((agent) => (
                <AgentCard
                    key={agent.permanentId || agent.agentName}
                    agent={agent}
                    publicUrl={publicUrl}
                    href={`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`}
                    isAdmin={isAdmin}
                    onRestore={handleRestore}
                />
            ))}
        </div>
    );
}
