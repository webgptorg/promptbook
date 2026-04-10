import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
import type { useTaskManagerState } from './useTaskManagerState';

/**
 * Props for one task row in the admin table.
 *
 * @private function of TaskManagerTasksCard
 */
type TaskManagerTaskRowProps = {
    busyAction: ReturnType<typeof useTaskManagerState>['busyAction'];
    busyTaskId: ReturnType<typeof useTaskManagerState>['busyTaskId'];
    onRunTaskAction: ReturnType<typeof useTaskManagerState>['runTaskAction'];
    stuckThresholdMinutes: ReturnType<typeof useTaskManagerState>['stuckThresholdMinutes'];
    task: AdminChatTaskRecord;
};

/**
 * Props for the compact status badge.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskStatusBadgeProps = {
    isStuck: boolean;
    task: AdminChatTaskRecord;
};

/**
 * One labeled info row shown in a task detail block.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskInfoRow = {
    label: string;
    secondary?: string | null;
    value: string;
};

/**
 * Props for the compact task info block.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskInfoBlockProps = {
    rows: ReadonlyArray<TaskInfoRow>;
};

/**
 * Props for the row-level task actions.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskManagerTaskActionsProps = Pick<
    TaskManagerTaskRowProps,
    'busyAction' | 'onRunTaskAction' | 'task'
> & {
    isBusy: boolean;
};

/**
 * Badge color classes keyed by display status.
 *
 * @private function of TaskManagerTaskRow
 */
const TASK_STATUS_CLASS_MAP: Record<string, string> = {
    RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
    QUEUED: 'border-slate-200 bg-slate-50 text-slate-700',
    PAUSED: 'border-orange-200 bg-orange-50 text-orange-700',
    RETRYING: 'border-amber-200 bg-amber-50 text-amber-700',
    FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
    COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CANCELLED: 'border-gray-200 bg-gray-100 text-gray-700',
    STUCK: 'border-orange-300 bg-orange-50 text-orange-800',
};

/**
 * Renders a compact vertical info block inside the table.
 *
 * @private function of TaskManagerTaskRow
 */
function TaskInfoBlock({ rows }: TaskInfoBlockProps) {
    return rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="mb-2 last:mb-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{row.label}</div>
            <div className="break-all text-[11px] text-gray-800">{row.value}</div>
            {row.secondary ? <div className="break-all text-[11px] text-gray-500">{row.secondary}</div> : null}
        </div>
    ));
}

/**
 * Resolves the effective badge label for a task.
 *
 * @private function of TaskManagerTaskRow
 */
function resolveTaskStatusLabel(task: AdminChatTaskRecord): string {
    if (task.status === 'QUEUED' && task.pausedAt) {
        return 'PAUSED';
    }

    if (task.status === 'QUEUED' && task.retryCount > 0) {
        return 'RETRYING';
    }

    return task.status;
}

/**
 * Compact badge rendering the effective task status.
 *
 * @private function of TaskManagerTaskRow
 */
function TaskStatusBadge({ isStuck, task }: TaskStatusBadgeProps) {
    const label = resolveTaskStatusLabel(task);
    const tone = isStuck ? TASK_STATUS_CLASS_MAP.STUCK : TASK_STATUS_CLASS_MAP[label] || TASK_STATUS_CLASS_MAP.QUEUED;

    return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

/**
 * Formats a durable task kind for display.
 *
 * @private function of TaskManagerTaskRow
 */
function formatTaskKind(kind: AdminChatTaskRecord['kind']): string {
    if (kind === 'CHAT_COMPLETION') {
        return 'Chat completion';
    }

    if (kind === 'CHAT_TIMEOUT') {
        return 'Chat timeout';
    }

    return kind;
}

/**
 * Formats one timestamp for compact table display.
 *
 * @private function of TaskManagerTaskRow
 */
function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

/**
 * Formats a duration in milliseconds.
 *
 * @private function of TaskManagerTaskRow
 */
function formatDuration(durationMs: number | null): string {
    if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) {
        return '—';
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts: Array<string> = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.slice(0, 2).join(' ');
}

/**
 * Computes the current queue age for one task.
 *
 * @private function of TaskManagerTaskRow
 */
function getQueueAgeMs(task: AdminChatTaskRecord): number | null {
    const queuedAtMs = Date.parse(task.queuedAt);
    return Number.isNaN(queuedAtMs) ? null : Date.now() - queuedAtMs;
}

/**
 * Computes runtime duration for running tasks.
 *
 * @private function of TaskManagerTaskRow
 */
function getRuntimeDurationMs(task: AdminChatTaskRecord): number | null {
    if (task.status !== 'RUNNING' || !task.startedAt) {
        return null;
    }

    const startedAtMs = Date.parse(task.startedAt);
    return Number.isNaN(startedAtMs) ? null : Date.now() - startedAtMs;
}

/**
 * Computes total duration for finished tasks.
 *
 * @private function of TaskManagerTaskRow
 */
function getTotalDurationMs(task: AdminChatTaskRecord): number | null {
    if (!task.startedAt || !task.finishedAt) {
        return null;
    }

    const startedAtMs = Date.parse(task.startedAt);
    const finishedAtMs = Date.parse(task.finishedAt);
    if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)) {
        return null;
    }

    return Math.max(0, finishedAtMs - startedAtMs);
}

/**
 * Detects tasks running longer than the selected threshold.
 *
 * @private function of TaskManagerTaskRow
 */
function isTaskStuck(task: AdminChatTaskRecord, thresholdMinutes: number): boolean {
    const runtimeMs = getRuntimeDurationMs(task);
    return runtimeMs !== null && runtimeMs >= thresholdMinutes * 60_000;
}

/**
 * Truncates long error text for compact table rendering.
 *
 * @private function of TaskManagerTaskRow
 */
function truncateText(value: string, limit: number): string {
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

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
function TaskManagerTaskActions({ busyAction, isBusy, onRunTaskAction, task }: TaskManagerTaskActionsProps) {
    const isCancelable = task.status === 'QUEUED' || task.status === 'RUNNING';
    const isRetryable = task.status === 'FAILED';

    return (
        <div className="flex justify-end gap-2">
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

            {!isCancelable && !isRetryable ? (
                <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-500">
                    —
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
    onRunTaskAction,
    stuckThresholdMinutes,
    task,
}: TaskManagerTaskRowProps) {
    const isStuck = isTaskStuck(task, stuckThresholdMinutes);
    const isBusy = busyTaskId === task.id;

    return (
        <tr className={resolveTaskRowClassName(task, isStuck)}>
            <td className="px-4 py-3 align-top">
                <div className="font-mono text-[11px] font-semibold text-gray-900">{task.id}</div>
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
                            Recurrence: <span className="text-gray-700">Every {formatDuration(task.recurrenceIntervalMs)}</span>
                        </div>
                    ) : null}
                    {task.cancelRequestedAt ? <div className="font-medium text-orange-700">Cancellation requested</div> : null}
                    {task.pausedAt ? (
                        <div className="font-medium text-orange-700">Paused {formatDateTime(task.pausedAt)}</div>
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
                        { label: 'Created', value: formatDateTime(task.createdAt) },
                        { label: 'Started', value: formatDateTime(task.startedAt) },
                        { label: 'Updated', value: formatDateTime(task.updatedAt) },
                        { label: 'Finished', value: formatDateTime(task.finishedAt) },
                    ]}
                />
            </td>

            <td className="px-4 py-3 align-top">
                <TaskInfoBlock
                    rows={[
                        { label: 'Queue age', value: formatDuration(getQueueAgeMs(task)) },
                        { label: 'Runtime', value: formatDuration(getRuntimeDurationMs(task)) },
                        { label: 'Total', value: formatDuration(getTotalDurationMs(task)) },
                        { label: 'Heartbeat', value: formatDateTime(task.lastHeartbeatAt) },
                    ]}
                />
            </td>

            <td className="px-4 py-3 align-top">
                <TaskInfoBlock
                    rows={[
                        { label: 'Queue', value: task.queueName || '-' },
                        { label: 'Worker', value: task.workerId || '-' },
                        { label: 'Lease expires', value: formatDateTime(task.leaseExpiresAt) },
                        { label: 'Paused at', value: formatDateTime(task.pausedAt) },
                    ]}
                />
            </td>

            <td className="max-w-xs px-4 py-3 align-top text-[11px] leading-relaxed text-gray-600">
                {task.lastErrorSummary || task.lastErrorDetails ? (
                    <div className="space-y-2">
                        {task.lastErrorSummary ? <div>{truncateText(task.lastErrorSummary, 220)}</div> : null}
                        {task.lastErrorDetails ? (
                            <details className="rounded-md border border-gray-200 bg-gray-50 p-2">
                                <summary className="cursor-pointer font-medium text-gray-700">Show details</summary>
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-gray-600">
                                    {task.lastErrorDetails}
                                </pre>
                            </details>
                        ) : null}
                    </div>
                ) : (
                    '—'
                )}
            </td>

            <td className="px-4 py-3 align-top">
                <TaskManagerTaskActions
                    task={task}
                    busyAction={busyAction}
                    isBusy={isBusy}
                    onRunTaskAction={onRunTaskAction}
                />
            </td>
        </tr>
    );
}
