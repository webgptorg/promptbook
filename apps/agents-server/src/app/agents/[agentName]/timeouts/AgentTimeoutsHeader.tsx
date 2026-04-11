import type { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';

/**
 * Props for the timeout-manager page header.
 *
 * @private function of AgentTimeoutsClient
 */
type AgentTimeoutsHeaderProps = {
    state: ReturnType<typeof useAgentTimeoutsClientState>;
};

/**
 * Renders the timeout-manager heading and top-level actions.
 *
 * @private function of AgentTimeoutsClient
 */
export function AgentTimeoutsHeader({ state }: AgentTimeoutsHeaderProps) {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="text-3xl font-light text-gray-900">My timeouts</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                    Agent-scoped timeout manager across all your chats.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {state.bulkActions.map((bulkAction) => (
                    <button
                        key={bulkAction.action}
                        type="button"
                        onClick={() => {
                            void state.runBulkAction(bulkAction.action);
                        }}
                        disabled={state.busyBulkAction !== null}
                        className={bulkAction.buttonClassName}
                    >
                        {state.busyBulkAction === bulkAction.action ? bulkAction.busyLabel : bulkAction.idleLabel}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => {
                        void state.refreshNow();
                    }}
                    disabled={state.isRefreshing || state.busyBulkAction !== null}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {state.isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
        </div>
    );
}
