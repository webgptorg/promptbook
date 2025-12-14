// Client Component for rendering deleted agents
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentCard } from './AgentCard';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type DeletedAgentsListProps = {
    agents: readonly AgentBasicInformation[];
    isAdmin: boolean;
};

export function DeletedAgentsList({ agents: initialAgents, isAdmin }: DeletedAgentsListProps) {
    const router = useRouter();
    const [agents, setAgents] = useState(Array.from(initialAgents));

    const handleRestore = async (agentIdentifier: string) => {
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Restore agent "${agent.agentName}"?`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/restore`, { method: 'POST' });
            if (response.ok) {
                setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
                router.refresh(); // Refresh server data to ensure consistency
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
                    href={`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`}
                    isAdmin={isAdmin}
                    onRestore={handleRestore}
                />
            ))}
        </div>
    );
}
