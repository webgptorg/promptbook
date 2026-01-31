// Client Component for rendering deleted agents
'use client';

import { useState } from 'react';
import { showAlert, showConfirm } from '../AsyncDialogs/asyncDialogs';
import { AgentCard } from './AgentCard';

import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type DeletedAgentsListProps = {
    /**
     * List of deleted agents available for restoration
     */
    readonly agents: readonly AgentBasicInformation[];

    /**
     * Indicates if the current user has administrative privileges for managing agents
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
        const confirmed = await showConfirm({
            title: 'Restore agent',
            message: `Restore agent "${agent.agentName}"?`,
            confirmLabel: 'Restore agent',
            cancelLabel: 'Cancel',
        }).catch(() => false);
        if (!confirmed) {
            return;
        }

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
                await showAlert({
                    title: 'Restore failed',
                    message: 'Failed to restore agent',
                }).catch(() => undefined);
            }
        } catch (error) {
            await showAlert({
                title: 'Restore failed',
                message: 'Failed to restore agent',
            }).catch(() => undefined);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agents.map((agent) => (
                <AgentCard
                    key={agent.permanentId || agent.agentName}
                    agent={agent}
                    publicUrl={publicUrl.href}
                    href={`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`}
                    isAdmin={isAdmin}
                    onRestore={handleRestore}
                />
            ))}
        </div>
    );
}
