'use client';

import { Card } from '../../../components/Homepage/Card';
import { TaskManagerFiltersCard } from './TaskManagerFiltersCard';
import { TaskManagerSummaryMetrics } from './TaskManagerSummaryMetrics';
import { TaskManagerTasksCard } from './TaskManagerTasksCard';
import { useTaskManagerState } from './useTaskManagerState';

/**
 * Admin task-manager dashboard client.
 *
 * @private route component of AdminTaskManagerPage
 */
export function TaskManagerClient() {
    const taskManagerState = useTaskManagerState();

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Task manager</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Admin-only operational view of durable background chat work across all users, including chat
                        completions and scheduled timeout wake-ups. This dashboard shows queue and worker state, not
                        chat transcript content.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">
                        Route: <span className="font-mono text-gray-700">/admin/task-manager</span>
                    </span>
                    <button
                        type="button"
                        onClick={taskManagerState.refreshNow}
                        disabled={taskManagerState.isRefreshing}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {taskManagerState.isRefreshing ? 'Refreshing…' : 'Refresh now'}
                    </button>
                </div>
            </div>

            <TaskManagerSummaryMetrics
                counters={taskManagerState.counters}
                oldestQueuedAgeLabel={taskManagerState.oldestQueuedAgeLabel}
            />

            <TaskManagerFiltersCard state={taskManagerState} />

            {taskManagerState.error ? (
                <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                    <p className="text-sm text-red-700">{taskManagerState.error}</p>
                </Card>
            ) : null}

            <TaskManagerTasksCard state={taskManagerState} />
        </div>
    );
}
