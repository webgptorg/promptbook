import type { useTaskManagerState } from './useTaskManagerState';
import { Card } from '../../../components/Homepage/Card';
import { TaskManagerTaskRow } from './TaskManagerTaskRow';

/**
 * Props for the task table card.
 *
 * @private function of TaskManagerClient
 */
type TaskManagerTasksCardProps = {
    state: ReturnType<typeof useTaskManagerState>;
};

/**
 * Resolves the current empty-state message.
 *
 * @private function of TaskManagerTasksCard
 */
function resolveEmptyStateMessage(view: ReturnType<typeof useTaskManagerState>['view'], search: string): string {
    if (search) {
        return 'No background chat tasks matched the current search.';
    }
    if (view === 'running') {
        return 'No running background chat tasks right now.';
    }
    if (view === 'queued') {
        return 'No queued background chat tasks right now.';
    }
    if (view === 'failed') {
        return 'No failed background chat tasks were recorded in the last 24 hours.';
    }
    if (view === 'all') {
        return 'No background chat tasks matched the selected time window.';
    }

    return 'No active background chat tasks right now.';
}

/**
 * Renders the main task table, loading states, and pagination controls.
 *
 * @private function of TaskManagerClient
 */
export function TaskManagerTasksCard({ state }: TaskManagerTasksCardProps) {
    const firstVisibleTaskIndex = Math.min((state.page - 1) * state.pageSize + 1, state.total);
    const lastVisibleTaskIndex = Math.min(state.page * state.pageSize, state.total);

    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Background chat tasks ({state.total.toLocaleString()})</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Sorted by started time for running work and creation time for queued work.
                    </p>
                </div>
                {state.isRefreshing ? <span className="text-xs font-medium text-blue-600">Refreshing…</span> : null}
            </div>

            {state.isLoading ? (
                <div className="py-10 text-center text-sm text-gray-500">Loading background chat tasks…</div>
            ) : state.tasks.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                    {resolveEmptyStateMessage(state.view, state.search)}
                </div>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Task</th>
                                <th className="px-4 py-3 text-left font-semibold">Ownership</th>
                                <th className="px-4 py-3 text-left font-semibold">Timeline</th>
                                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                                <th className="px-4 py-3 text-left font-semibold">Queue</th>
                                <th className="px-4 py-3 text-left font-semibold">Last error</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {state.tasks.map((task) => (
                                <TaskManagerTaskRow
                                    key={task.id}
                                    task={task}
                                    busyAction={state.busyAction}
                                    busyTaskId={state.busyTaskId}
                                    onRunTaskAction={state.runTaskAction}
                                    stuckThresholdMinutes={state.stuckThresholdMinutes}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-600 md:flex-row">
                <div>
                    {state.total > 0 ? (
                        <>
                            Showing <span className="font-semibold">{firstVisibleTaskIndex}</span> –{' '}
                            <span className="font-semibold">{lastVisibleTaskIndex}</span> of{' '}
                            <span className="font-semibold">{state.total}</span> tasks
                        </>
                    ) : (
                        'No tasks'
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={state.goToPreviousPage}
                        disabled={state.isPreviousPageDisabled}
                        className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span>
                        Page <span className="font-semibold">{state.page}</span> of{' '}
                        <span className="font-semibold">{state.totalPages}</span>
                    </span>
                    <button
                        type="button"
                        onClick={state.goToNextPage}
                        disabled={state.isNextPageDisabled}
                        className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </Card>
    );
}
