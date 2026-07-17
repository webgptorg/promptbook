'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SquareTerminal } from 'lucide-react';
import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import { TaskManagerTaskLogActions } from './TaskManagerTaskLogActions';
import { TaskManagerTaskTerminalDialog } from './TaskManagerTaskTerminalDialog';
import {
    buildTaskRunReportRows,
    formatTaskDateTime,
    formatTaskDuration,
    formatTaskKind,
    getTaskQueueAgeMs,
    getTaskRuntimeDurationMs,
    getTaskTotalDurationMs,
    isTaskStuck,
    TaskInfoBlock,
    TaskStatusBadge,
    truncateTaskText,
} from './taskManagerTaskPresentation';
import type { useTaskManagerState } from './useTaskManagerState';

/**
 * Props for one task row in the admin table.
 *
 * @private function of TaskManagerTasksCard
 */
type TaskManagerTaskRowProps = {
    busyAction: ReturnType<typeof useTaskManagerState>['busyAction'];
    busyTaskId: ReturnType<typeof useTaskManagerState>['busyTaskId'];
    isSuperAdmin: boolean;
    language: ServerLanguageCode;
    onRunTaskAction: ReturnType<typeof useTaskManagerState>['runTaskAction'];
    stuckThresholdMinutes: ReturnType<typeof useTaskManagerState>['stuckThresholdMinutes'];
    task: AdminChatTaskRecord;
};

/**
 * Props for the row-level task actions.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskManagerTaskActionsProps = Pick<TaskManagerTaskRowProps, 'busyAction' | 'onRunTaskAction' | 'task'> & {
    isBusy: boolean;
    isSuperAdmin: boolean;
    onOpenTerminal: () => void;
};

/**
 * Resolves the row highlight tone for one task.
 *
 * @private function of TaskManagerTaskRow
 */
function resolveTaskRowClassName(task: AdminChatTaskRecord, isStuck: boolean): string {
    if (isStuck) {
        return 'bg-orange-50/60';
    }

    if (task.status === 'FAILED') {
        return 'bg-rose-50/40';
    }

    return '';
}

/**
 * Renders the supported row-level admin actions.
 *
 * @private function of TaskManagerTaskRow
 */
function TaskManagerTaskActions({
    busyAction,
    isBusy,
    isSuperAdmin,
    onOpenTerminal,
    onRunTaskAction,
    task,
}: TaskManagerTaskActionsProps) {
    const isDurableChatTask = task.kind === 'CHAT_COMPLETION' || task.kind === 'CHAT_TIMEOUT';
    const isCancelable = isDurableChatTask && (task.status === 'QUEUED' || task.status === 'RUNNING');
    const isRetryable = isDurableChatTask && task.status === 'FAILED';

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {isSuperAdmin ? (
                <button
                    type="button"
                    onClick={onOpenTerminal}
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
                    onClick={() => void onRunTaskAction(task, 'cancel')}
                    disabled={isBusy}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy && busyAction === 'cancel' ? 'Cancelling…' : 'Cancel'}
                </button>
            ) : null}

            {isRetryable ? (
                <button
                    type="button"
                    onClick={() => void onRunTaskAction(task, 'retry')}
                    disabled={isBusy}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy && busyAction === 'retry' ? 'Retrying…' : 'Retry'}
                </button>
            ) : null}

            {!isCancelable && !isRetryable && !isSuperAdmin ? (
                <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-500">
                    -
                </span>
            ) : null}
        </div>
    );
}

/**
 * Renders one task row in the admin task table.
 *
 * @private function of TaskManagerTasksCard
 */
export function TaskManagerTaskRow({
    busyAction,
    busyTaskId,
    isSuperAdmin,
    language,
    onRunTaskAction,
    stuckThresholdMinutes,
    task,
}: TaskManagerTaskRowProps) {
    const [isTerminalDialogOpen, setIsTerminalDialogOpen] = useState(false);
    const isStuck = isTaskStuck(task, stuckThresholdMinutes);
    const isBusy = busyTaskId === task.id;

    return (
        <tr className={resolveTaskRowClassName(task, isStuck)}>
            <td className="px-4 py-3 align-top">
                <Link
                    href={`/admin/task-manager/${encodeURIComponent(task.id)}`}
                    className="font-mono text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
                    title="Open the task detail page"
                >
                    {task.id}
                </Link>
                <div className="mt-2 flex flex-wrap gap-2">
                    <TaskStatusBadge task={task} isStuck={isStuck} />
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
                        {formatTaskKind(task.kind)}
                    </span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                    <div>
                        Priority: <span className="text-gray-700">{task.priority ?? '-'}</span>
                    </div>
                    <div>
                        Attempts: <span className="text-gray-700">{task.attemptCount}</span> • Retries:{' '}
                        <span className="text-gray-700">{task.retryCount}</span>
                    </div>
                    {task.recurrenceIntervalMs ? (
                        <div>
                            Recurrence:{' '}
                            <span className="text-gray-700">Every {formatTaskDuration(task.recurrenceIntervalMs)}</span>
                        </div>
                    ) : null}
                    {task.cancelRequestedAt ? (
                        <div className="font-medium text-orange-700">Cancellation requested</div>
                    ) : null}
                    {task.pausedAt ? (
                        <div className="font-medium text-orange-700">
                            Paused {formatTaskDateTime(task.pausedAt, language)}
                        </div>
                    ) : null}
                </div>
            </td>

            <td className="px-4 py-3 align-top">
                <TaskInfoBlock
                    rows={[
                        {
                            label: 'User',
                            value: `#${task.userId}`,
                            secondary: task.username || '-',
                        },
                        {
                            label: 'Agent',
                            value: task.agentName || task.agentPermanentId,
                            secondary: task.agentPermanentId,
                        },
                        { label: 'Chat', value: task.chatId },
                    ]}
                />
            </td>

            <td className="px-4 py-3 align-top">
                <TaskInfoBlock
                    rows={[
                        { label: 'Created', value: formatTaskDateTime(task.createdAt, language) },
                        { label: 'Started', value: formatTaskDateTime(task.startedAt, language) },
                        { label: 'Updated', value: formatTaskDateTime(task.updatedAt, language) },
                        { label: 'Finished', value: formatTaskDateTime(task.finishedAt, language) },
                    ]}
                />
            </td>

            <td className="px-4 py-3 align-top">
                <TaskInfoBlock
                    rows={[
                        { label: 'Queue age', value: formatTaskDuration(getTaskQueueAgeMs(task)) },
                        { label: 'Runtime', value: formatTaskDuration(getTaskRuntimeDurationMs(task)) },
                        { label: 'Total', value: formatTaskDuration(getTaskTotalDurationMs(task)) },
                        { label: 'Heartbeat', value: formatTaskDateTime(task.lastHeartbeatAt, language) },
                    ]}
                />
            </td>

            <td className="px-4 py-3 align-top">
                <TaskInfoBlock
                    rows={[
                        { label: 'Queue', value: task.queueName || '-' },
                        { label: 'Worker', value: task.workerId || '-' },
                        { label: 'Lease expires', value: formatTaskDateTime(task.leaseExpiresAt, language) },
                        { label: 'Paused at', value: formatTaskDateTime(task.pausedAt, language) },
                        ...buildTaskRunReportRows(task.runReport),
                    ]}
                />
            </td>

            <td className="max-w-xs px-4 py-3 align-top text-[11px] leading-relaxed text-gray-600">
                <div className="space-y-2">
                    {task.lastErrorSummary || task.lastErrorDetails ? (
                        <>
                            {task.lastErrorSummary ? <div>{truncateTaskText(task.lastErrorSummary, 220)}</div> : null}
                            {task.lastErrorDetails ? (
                                <details className="rounded-md border border-gray-200 bg-gray-50 p-2">
                                    <summary className="cursor-pointer font-medium text-gray-700">
                                        Show details
                                    </summary>
                                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-gray-600">
                                        {task.lastErrorDetails}
                                    </pre>
                                </details>
                            ) : null}
                        </>
                    ) : (
                        '-'
                    )}
                    <TaskManagerTaskLogActions task={task} />
                </div>
            </td>

            <td className="px-4 py-3 align-top">
                <TaskManagerTaskActions
                    task={task}
                    busyAction={busyAction}
                    isBusy={isBusy}
                    isSuperAdmin={isSuperAdmin}
                    onOpenTerminal={() => setIsTerminalDialogOpen(true)}
                    onRunTaskAction={onRunTaskAction}
                />
                {isTerminalDialogOpen ? (
                    <TaskManagerTaskTerminalDialog task={task} onClose={() => setIsTerminalDialogOpen(false)} />
                ) : null}
            </td>
        </tr>
    );
}
