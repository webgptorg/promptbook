// Client Component for rendering and deleting agents
'use client';

import React, { useState } from 'react';
import { AgentCard } from './AgentCard';
import { AddAgentButton } from '../../app/AddAgentButton';
import { Section } from './Section';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type AgentsListProps = {
    agents: AgentBasicInformation[];
    isAdmin: boolean;
};

export function AgentsList({ agents: initialAgents, isAdmin }: AgentsListProps) {
    const [agents, setAgents] = useState(Array.from(initialAgents));

    const handleDelete = async (agentName: string) => {
        if (!window.confirm(`Delete agent "${agentName}"? This action cannot be undone.`)) return;
        await fetch(`/api/agents/${encodeURIComponent(agentName)}`, { method: 'DELETE' });
        setAgents(agents.filter(a => a.agentName !== agentName));
    };

    return (
        <Section title={`Agents (${agents.length})`}>
            {agents.map((agent) => (
                <AgentCard
                    key={agent.agentName}
                    agent={agent}
                    href={`/${agent.agentName}`}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                />
            ))}
            {isAdmin && <AddAgentButton />}
        </Section>
    );
}
