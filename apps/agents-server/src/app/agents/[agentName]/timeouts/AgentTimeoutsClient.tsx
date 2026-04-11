'use client';

import { AgentTimeoutsEditDialog } from './AgentTimeoutsEditDialog';
import { AgentTimeoutsFiltersCard } from './AgentTimeoutsFiltersCard';
import { AgentTimeoutsHeader } from './AgentTimeoutsHeader';
import { AgentTimeoutsSummaryMetrics } from './AgentTimeoutsSummaryMetrics';
import { AgentTimeoutsTableCard } from './AgentTimeoutsTableCard';
import { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';

/**
 * Props for the agent timeout manager page.
 */
type AgentTimeoutsClientProps = {
    agentName: string;
};

/**
 * Displays all timeouts for one user+agent across chats and supports timeout edits.
 *
 * @private route component of AgentTimeoutsPage
 */
export function AgentTimeoutsClient({ agentName }: AgentTimeoutsClientProps) {
    const state = useAgentTimeoutsClientState({ agentName });

    return (
        <div className="container mx-auto mt-20 space-y-6 px-4 py-8">
            <AgentTimeoutsHeader state={state} />
            <AgentTimeoutsSummaryMetrics state={state} />
            <AgentTimeoutsFiltersCard state={state} />

            {state.errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {state.errorMessage}
                </div>
            ) : null}

            <AgentTimeoutsTableCard agentName={agentName} state={state} />
            <AgentTimeoutsEditDialog state={state} />
        </div>
    );
}
