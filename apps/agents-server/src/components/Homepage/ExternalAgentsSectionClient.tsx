'use client';

import { useEffect, useState } from 'react';
import type { AgentsByServer } from '../../utils/getFederatedAgents';
import { ExternalAgentsSection } from './ExternalAgentsSection';

type FederatedAgentsResponse = {
    agentsByServer: AgentsByServer[];
};

export function ExternalAgentsSectionClient() {
    const [agentsByServer, setAgentsByServer] = useState<AgentsByServer[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchFederatedAgents = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/federated-agents');
                if (!response.ok) {
                    throw new Error('Failed to fetch federated agents');
                }
                const data: FederatedAgentsResponse = await response.json();
                if (!isCancelled) {
                    setAgentsByServer(data.agentsByServer || []);
                }
            } catch (err) {
                if (!isCancelled) {
                    // Note: Keep failure non-fatal for homepage; show a small message
                    setError(err instanceof Error ? err.message : 'Failed to load federated agents');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        fetchFederatedAgents();

        return () => {
            isCancelled = true;
        };
    }, []);

    if (loading && !agentsByServer) {
        return (
            <div className="mt-8 flex items-center justify-center py-8 text-sm text-gray-500">
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                Loading federated agents…
            </div>
        );
    }

    if (error && (!agentsByServer || agentsByServer.length === 0)) {
        return (
            <div className="mt-8 text-center text-sm text-gray-500">Failed to load federated agents.</div>
        );
    }

    if (!agentsByServer || agentsByServer.length === 0) {
        return null;
    }

    return <ExternalAgentsSection agentsByServer={agentsByServer} />;
}
