// Client Component for rendering deleted agents
'use client';

import React, { useState } from 'react';
import { AgentCard } from './AgentCard';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type DeletedAgentsListProps = {
    agents: readonly AgentBasicInformation[];
    isAdmin: boolean;
};

export function DeletedAgentsList({ agents: initialAgents, isAdmin }: DeletedAgentsListProps) {
    const [agents, setAgents] = useState(Array.from(initialAgents));

    const handleRestore = async (agentIdentifier: string) => {
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Restore agent "${agent.agentName}"?`)) return;
        await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/restore`, { method: 'POST' });
        setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
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
