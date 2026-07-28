'use client';

import { $fetchVpsAdminChatTasks } from '@/src/utils/chatTasksAdmin';
import { Card } from '../../../components/Homepage/Card';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { TaskManagerFiltersCard } from './TaskManagerFiltersCard';
import { SERVER_TASK_MANAGER_PATH, TaskManagerScopeTabs, VPS_TASK_MANAGER_PATH, type TaskManagerScope } from './TaskManagerScopeTabs';
import { TaskManagerSummaryMetrics } from './TaskManagerSummaryMetrics';
import { TaskManagerTasksCard } from './TaskManagerTasksCard';
import { useTaskManagerState } from './useTaskManagerState';

/**
 * Props for the admin task-manager dashboard client.
 *
 * @private route component of AdminTaskManagerPage
 */
type TaskManagerClientProps = {
    /**
     * Whether the current user is the environment-backed super-admin who may open task terminals
     * and reach the VPS-wide view.
     */
    isSuperAdmin: boolean;
    /**
     * Whether this dashboard shows one server or the whole VPS. Defaults to the per-server view.
     */
    scope?: TaskManagerScope;
};

/**
 * Admin task-manager dashboard client, shared by the per-server and VPS-wide views.
 *
 * @private route component of AdminTaskManagerPage
 */
export function TaskManagerClient({ isSuperAdmin, scope = 'server' }: TaskManagerClientProps) {
    const { language } = useServerLanguage();
    const isVpsScope = scope === 'vps';
    const taskManagerState = useTaskManagerState(language, {
        fetchTasks: isVpsScope ? $fetchVpsAdminChatTasks : undefined,
        isVpsScope,
    });

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20">
                <TaskManagerScopeTabs activeScope={scope} isSuperAdmin={isSuperAdmin} />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">
                        {isVpsScope ? 'Task manager · All servers (VPS)' : 'Task manager'}
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        {isVpsScope
                            ? 'Superadmin-only operational view of background work across every server on this VPS, including chat completions, scheduled timeout wake-ups, self-updates, and live browser previews. Each task shows the server it belongs to.'
                            : 'Admin-only operational view of background work across all users, including chat completions, scheduled timeout wake-ups, self-updates, and live browser previews. This dashboard shows queue and worker state, not chat transcript content.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">
                        Route:{' '}
                        <span className="font-mono text-gray-700">
                            {isVpsScope ? VPS_TASK_MANAGER_PATH : SERVER_TASK_MANAGER_PATH}
                        </span>
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

            <TaskManagerTasksCard
                language={language}
                state={taskManagerState}
                isSuperAdmin={isSuperAdmin}
                showServerColumn={isVpsScope}
            />
        </div>
    );
}
