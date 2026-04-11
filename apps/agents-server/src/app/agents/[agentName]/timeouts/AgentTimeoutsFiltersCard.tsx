import type { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';

/**
 * Props for the timeout filter card.
 *
 * @private function of AgentTimeoutsClient
 */
type AgentTimeoutsFiltersCardProps = {
    state: ReturnType<typeof useAgentTimeoutsClientState>;
};

/**
 * One filter tab shown in the timeout-manager view switcher.
 *
 * @private function of AgentTimeoutsFiltersCard
 */
type TimeoutManagerFilterOption = {
    id: ReturnType<typeof useAgentTimeoutsClientState>['filter'];
    label: string;
};

/**
 * Available timeout-manager filter tabs.
 *
 * @private function of AgentTimeoutsFiltersCard
 */
const TIMEOUT_MANAGER_FILTER_OPTIONS: ReadonlyArray<TimeoutManagerFilterOption> = [
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'history', label: 'History' },
    { id: 'all', label: 'All' },
];

/**
 * Formats the refresh metadata shown below the filter tabs.
 *
 * @private function of AgentTimeoutsFiltersCard
 */
function resolveLastRefreshedLabel(generatedAt: string | null): string {
    return generatedAt ? `Last refreshed ${new Date(generatedAt).toLocaleString()}` : 'Waiting for first refresh...';
}

/**
 * Renders the timeout-manager filter tabs and refresh metadata.
 *
 * @private function of AgentTimeoutsClient
 */
export function AgentTimeoutsFiltersCard({ state }: AgentTimeoutsFiltersCardProps) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
                {TIMEOUT_MANAGER_FILTER_OPTIONS.map((filterOption) => (
                    <button
                        key={filterOption.id}
                        type="button"
                        onClick={() => state.selectFilter(filterOption.id)}
                        className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                            state.filter === filterOption.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {filterOption.label}
                    </button>
                ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">{resolveLastRefreshedLabel(state.generatedAt)}</div>
        </div>
    );
}
