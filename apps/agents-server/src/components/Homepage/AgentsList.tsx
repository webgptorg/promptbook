// Client Component for rendering and deleting agents
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { AddAgentButton } from '../../app/AddAgentButton';
import { AgentCard } from './AgentCard';
import { Section } from './Section';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
};

type AgentsListProps = {
    agents: AgentWithVisibility[];
    isAdmin: boolean;
};

export function AgentsList({ agents: initialAgents, isAdmin }: AgentsListProps) {
    const router = useRouter();
    const [agents, setAgents] = useState(Array.from(initialAgents));

    const handleDelete = async (agentIdentifier: string) => {
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Delete agent "${agent.agentName}"? It will be moved to Recycle Bin.`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, { method: 'DELETE' });
            if (response.ok) {
                setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
                router.refresh(); // Refresh server data to ensure consistency
            } else {
                alert('Failed to delete agent');
            }
        } catch (error) {
            alert('Failed to delete agent');
        }
    };

    const handleClone = async (agentIdentifier: string) => {
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Clone agent "${agent.agentName}"?`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/clone`, { method: 'POST' });
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
        const agent = agents.find(a => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
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
            setAgents(agents.map(a =>
                a.permanentId === agent.permanentId || a.agentName === agent.agentName
                    ? { ...a, visibility: newVisibility }
                    : a
            ));
            router.refresh(); // Refresh server data to ensure consistency
        } else {
            alert('Failed to update agent visibility');
        }
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
        </Section>
    );
}
