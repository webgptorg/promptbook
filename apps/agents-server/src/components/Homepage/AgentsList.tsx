// Client Component for rendering and deleting agents
'use client';

import React, { useState } from 'react';
import { TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { AddAgentButton } from '../../app/AddAgentButton';
import { AgentCard } from './AgentCard';
import { Section } from './Section';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type AgentsListProps = {
    agents: AgentBasicInformation[];
    isAdmin: boolean;
};

export function AgentsList({ agents: initialAgents, isAdmin }: AgentsListProps) {
    const [agents, setAgents] = useState(Array.from(initialAgents));

    const handleDelete = async (agentIdentifier: string) => {
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Delete agent "${agent.agentName}"? It will be moved to Recycle Bin.`)) return;
        await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, { method: 'DELETE' });
        setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
    };

    const handleClone = async (agentIdentifier: string) => {
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Clone agent "${agent.agentName}"?`)) return;
        const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/clone`, { method: 'POST' });
        const newAgent = await response.json();
        setAgents([...agents, newAgent]);
    };

    return (
        <Section title={`Agents (${agents.length})`}>
            {agents.map((agent) => (
                <AgentCard
                    key={agent.permanentId || agent.agentName}
                    agent={agent}
                    href={`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onClone={handleClone}
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
        </Section>
    );
}
