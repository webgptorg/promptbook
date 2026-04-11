import type { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';
import { AgentTimeoutsTableRow } from './AgentTimeoutsTableRow';

/**
 * Props for the timeout table card.
 *
 * @private function of AgentTimeoutsClient
 */
type AgentTimeoutsTableCardProps = {
    agentName: string;
    state: ReturnType<typeof useAgentTimeoutsClientState>;
};

/**
 * Renders the timeout table along with loading and empty states.
 *
 * @private function of AgentTimeoutsClient
 */
export function AgentTimeoutsTableCard({ agentName, state }: AgentTimeoutsTableCardProps) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {state.isLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading timeouts...</div>
            ) : state.filteredTimeouts.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No timeouts in this view.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Timeout</th>
                                <th className="px-4 py-3 text-left font-semibold">Chat</th>
                                <th className="px-4 py-3 text-left font-semibold">Status</th>
                                <th className="px-4 py-3 text-left font-semibold">Next run</th>
                                <th className="px-4 py-3 text-left font-semibold">Recurrence</th>
                                <th className="px-4 py-3 text-left font-semibold">Payload</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {state.filteredTimeouts.map((timeout) => (
                                <AgentTimeoutsTableRow
                                    key={timeout.timeoutId}
                                    agentName={agentName}
                                    state={state}
                                    timeout={timeout}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
