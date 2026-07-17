'use client';

import Link from 'next/link';
import { SquareTerminal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../../../components/Homepage/Card';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { $fetchAdminChatTask, type AdminChatTaskRecord } from '../../../../utils/chatTasksAdmin';
import {
    confirmAdminChatTaskAction,
    executeAdminChatTaskAction,
    requestAdminChatTaskActionReason,
    showAdminChatTaskActionFailure,
    type AdminChatTaskActionKind,
} from '../adminChatTaskActionDialogs';
import { TaskManagerTaskLogActions } from '../TaskManagerTaskLogActions';
import { TaskManagerTaskTerminalDialog } from '../TaskManagerTaskTerminalDialog';
import {
    buildTaskRunReportRows,
    formatTaskDateTime,
    formatTaskDuration,
    formatTaskKind,
    getTaskQueueAgeMs,
    getTaskRuntimeDurationMs,
    getTaskTotalDurationMs,
    TaskInfoBlock,
    TaskStatusBadge,
    type TaskInfoRow,
} from '../taskManagerTaskPresentation';

/**
 * Props for the admin task detail client.
 *
 * @private route component of AdminTaskManagerTaskDetailPage
 */
type TaskManagerTaskDetailClientProps = {
    /**
     * Id of the shown durable background task.
     */
    taskId: string;
    /**
     * Whether the current user is the environment-backed super-admin who may open task terminals.
     */
    isSuperAdmin: boolean;
};

/**
 * One titled detail card rendered on the task detail page.
 *
 * @private component of TaskManagerTaskDetailClient
 */
function TaskDetailCard({ title, rows }: { title: string; rows: ReadonlyArray<TaskInfoRow> }) {
    return (
        <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
            <TaskInfoBlock rows={rows} />
        </Card>
    );
}

/**
 * Admin detail view of one durable background task showing all task-manager data.
 *
 * @private route component of AdminTaskManagerTaskDetailPage
 */
export function TaskManagerTaskDetailClient({ taskId, isSuperAdmin }: TaskManagerTaskDetailClientProps) {
    const { language } = useServerLanguage();
    const [task, setTask] = useState<AdminChatTaskRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<AdminChatTaskActionKind | null>(null);
    const [isTerminalDialogOpen, setIsTerminalDialogOpen] = useState(false);
    const [refreshNonce, setRefreshNonce] = useState(0);

    const refreshNow = useCallback((): void => {
        setRefreshNonce((current) => current + 1);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        async function loadTask(): Promise<void> {
            try {
                setErrorMessage(null);
                const loadedTask = await $fetchAdminChatTask(taskId);
                if (!isCancelled) {
                    setTask(loadedTask);
                }
            } catch (loadError) {
                if (!isCancelled) {
                    setErrorMessage(
                        loadError instanceof Error ? loadError.message : 'Failed to load the background task.',
                    );
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadTask();

        return () => {
            isCancelled = true;
        };
    }, [taskId, refreshNonce]);

    const runTaskAction = useCallback(
        async (action: AdminChatTaskActionKind): Promise<void> => {
            const isConfirmed = await confirmAdminChatTaskAction(action, taskId);
            if (!isConfirmed) {
                return;
            }

            const reason = await requestAdminChatTaskActionReason(action, taskId);
            if (!reason) {
                return;
            }

            try {
                setBusyAction(action);
                await executeAdminChatTaskAction(taskId, action, reason);
                refreshNow();
            } catch (actionError) {
                await showAdminChatTaskActionFailure(action, actionError);
            } finally {
                setBusyAction(null);
            }
        },
        [refreshNow, taskId],
    );

    const isDurableChatTask = task ? task.kind === 'CHAT_COMPLETION' || task.kind === 'CHAT_TIMEOUT' : false;
    const isCancelable = Boolean(task && isDurableChatTask && (task.status === 'QUEUED' || task.status === 'RUNNING'));
    const isRetryable = Boolean(task && isDurableChatTask && task.status === 'FAILED');

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <Link href="/admin/task-manager" className="text-sm text-blue-700 underline-offset-2 hover:underline">
                        ← Task manager
                    </Link>
                    <h1 className="mt-2 text-3xl font-light text-gray-900">Task detail</h1>
                    <p className="mt-1 font-mono text-sm text-gray-500">{taskId}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={refreshNow}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700"
                    >
                        Refresh now
                    </button>
                    {isSuperAdmin && task ? (
                        <button
                            type="button"
                            onClick={() => setIsTerminalDialogOpen(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
                            title="Open the read-only live CLI terminal of this task"
                        >
                            <SquareTerminal className="h-3.5 w-3.5" />
                            Terminal
                        </button>
                    ) : null}
                    {isCancelable ? (
                        <button
                            type="button"
                            onClick={() => void runTaskAction('cancel')}
                            disabled={busyAction !== null}
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busyAction === 'cancel' ? 'Cancelling…' : 'Cancel'}
                        </button>
                    ) : null}
                    {isRetryable ? (
                        <button
                            type="button"
                            onClick={() => void runTaskAction('retry')}
                            disabled={busyAction !== null}
                            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busyAction === 'retry' ? 'Retrying…' : 'Retry'}
                        </button>
                    ) : null}
                </div>
            </div>

            {errorMessage ? (
                <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                </Card>
            ) : null}

            {isLoading && !task ? (
                <Card>
                    <p className="py-4 text-center text-sm text-gray-500">Loading task…</p>
                </Card>
            ) : null}

            {task ? (
                <>
                    <Card>
                        <div className="flex flex-wrap items-center gap-2">
                            <TaskStatusBadge task={task} isStuck={false} />
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {formatTaskKind(task.kind)}
                            </span>
                            {task.cancelRequestedAt ? (
                                <span className="text-[11px] font-medium text-orange-700">Cancellation requested</span>
                            ) : null}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <TaskDetailCard
                            title="Scope"
                            rows={[
                                { label: 'User', value: `#${task.userId}`, secondary: task.username || '-' },
                                {
                                    label: 'Agent',
                                    value: task.agentName || task.agentPermanentId,
                                    secondary: task.agentPermanentId,
                                },
                                { label: 'Chat', value: task.chatId },
                            ]}
                        />
                        <TaskDetailCard
                            title="Timeline"
                            rows={[
                                { label: 'Created', value: formatTaskDateTime(task.createdAt, language) },
                                { label: 'Queued', value: formatTaskDateTime(task.queuedAt, language) },
                                { label: 'Started', value: formatTaskDateTime(task.startedAt, language) },
                                { label: 'Updated', value: formatTaskDateTime(task.updatedAt, language) },
                                { label: 'Finished', value: formatTaskDateTime(task.finishedAt, language) },
                            ]}
                        />
                        <TaskDetailCard
                            title="Durations"
                            rows={[
                                { label: 'Queue age', value: formatTaskDuration(getTaskQueueAgeMs(task)) },
                                { label: 'Runtime', value: formatTaskDuration(getTaskRuntimeDurationMs(task)) },
                                { label: 'Total', value: formatTaskDuration(getTaskTotalDurationMs(task)) },
                                { label: 'Heartbeat', value: formatTaskDateTime(task.lastHeartbeatAt, language) },
                            ]}
                        />
                        <TaskDetailCard
                            title="Worker"
                            rows={[
                                { label: 'Queue', value: task.queueName || '-' },
                                { label: 'Worker', value: task.workerId || '-' },
                                { label: 'Lease expires', value: formatTaskDateTime(task.leaseExpiresAt, language) },
                                { label: 'Paused at', value: formatTaskDateTime(task.pausedAt, language) },
                            ]}
                        />
                        <TaskDetailCard
                            title="Attempts"
                            rows={[
                                { label: 'Priority', value: task.priority === null ? '-' : String(task.priority) },
                                { label: 'Attempts', value: String(task.attemptCount) },
                                { label: 'Retries', value: String(task.retryCount) },
                                {
                                    label: 'Recurrence',
                                    value: task.recurrenceIntervalMs
                                        ? `Every ${formatTaskDuration(task.recurrenceIntervalMs)}`
                                        : '-',
                                },
                            ]}
                        />
                        {task.runReport ? (
                            <TaskDetailCard title="Run report" rows={buildTaskRunReportRows(task.runReport)} />
                        ) : null}
                    </div>

                    <Card>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Errors & logs</h2>
                        <div className="space-y-2 text-[12px] leading-relaxed text-gray-600">
                            {task.lastErrorSummary || task.lastErrorDetails ? (
                                <>
                                    {task.lastErrorSummary ? <div>{task.lastErrorSummary}</div> : null}
                                    {task.lastErrorDetails ? (
                                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-gray-200 bg-gray-50 p-3 text-[10px] leading-relaxed text-gray-600">
                                            {task.lastErrorDetails}
                                        </pre>
                                    ) : null}
                                </>
                            ) : (
                                <div>No errors reported.</div>
                            )}
                            <TaskManagerTaskLogActions task={task} />
                        </div>
                    </Card>

                    {isTerminalDialogOpen ? (
                        <TaskManagerTaskTerminalDialog task={task} onClose={() => setIsTerminalDialogOpen(false)} />
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
