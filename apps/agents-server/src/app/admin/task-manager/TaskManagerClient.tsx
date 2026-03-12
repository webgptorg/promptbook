'use client';

import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import {
    $cancelAdminChatTask,
    $fetchAdminChatTasks,
    $retryAdminChatTask,
    type AdminChatTaskRecord,
    type AdminChatTaskView,
} from '@/src/utils/chatTasksAdmin';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Card } from '../../../components/Homepage/Card';

/**
 * Supported row-level admin actions.
 */
type TaskActionKind = 'cancel' | 'retry';

/**
 * Metadata for one dashboard tab.
 */
type TaskViewOption = {
    id: AdminChatTaskView;
    label: string;
    description: string;
};

/**
 * Props for the compact status badge.
 */
type TaskStatusBadgeProps = {
    task: AdminChatTaskRecord;
    isStuck: boolean;
};

/**
 * Available dashboard tabs.
 */
const TASK_VIEW_OPTIONS: ReadonlyArray<TaskViewOption> = [
    { id: 'active', label: 'Active', description: 'Queued + running' },
    { id: 'running', label: 'Running', description: 'Live workers' },
    { id: 'queued', label: 'Queued', description: 'Backlog only' },
    { id: 'failed', label: 'Failed', description: 'Last 24h' },
    { id: 'all', label: 'All', description: 'Time window' },
];

/**
 * Auto-refresh presets.
 */
const TASK_POLL_INTERVAL_OPTIONS = [
    { value: 3_000, label: '3s' },
    { value: 5_000, label: '5s' },
    { value: 10_000, label: '10s' },
    { value: 30_000, label: '30s' },
    { value: 0, label: 'Off' },
] as const;

/**
 * Stuck-task threshold presets.
 */
const TASK_STUCK_THRESHOLD_OPTIONS = [
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
] as const;

/**
 * Time-window presets for the `All` view.
 */
const TASK_TIME_WINDOW_OPTIONS = [
    { value: 1, label: '1 hour' },
    { value: 6, label: '6 hours' },
    { value: 24, label: '24 hours' },
    { value: 24 * 7, label: '7 days' },
] as const;

/**
 * Badge color classes keyed by display status.
 */
const TASK_STATUS_CLASS_MAP: Record<string, string> = {
    RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
    QUEUED: 'border-slate-200 bg-slate-50 text-slate-700',
    RETRYING: 'border-amber-200 bg-amber-50 text-amber-700',
    FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
    COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CANCELLED: 'border-gray-200 bg-gray-100 text-gray-700',
    STUCK: 'border-orange-300 bg-orange-50 text-orange-800',
};

/**
 * Admin task-manager dashboard client.
 */
export function TaskManagerClient() {
    const [view, setView] = useState<AdminChatTaskView>('active');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [pollIntervalMs, setPollIntervalMs] = useState(3_000);
    const [stuckThresholdMinutes, setStuckThresholdMinutes] = useState(5);
    const [timeWindowHours, setTimeWindowHours] = useState(24);
    const [searchInput, setSearchInput] = useState('');
    const search = useDeferredValue(searchInput).trim();
    const [tasks, setTasks] = useState<Array<AdminChatTaskRecord>>([]);
    const [total, setTotal] = useState(0);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [counters, setCounters] = useState<{
        runningCount: number;
        queuedCount: number;
        failedLast24hCount: number;
        oldestQueuedAgeMs: number | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<TaskActionKind | null>(null);
    const hasLoadedOnceRef = useRef(false);

    useEffect(() => {
        setPage(1);
    }, [pageSize, search, timeWindowHours, view]);

    useEffect(() => {
        let isCancelled = false;

        async function loadTasks() {
            if (hasLoadedOnceRef.current) {
                setRefreshing(true);
            }

            try {
                setError(null);
                const response = await $fetchAdminChatTasks({
                    page,
                    pageSize,
                    view,
                    search: search || undefined,
                    timeWindowHours,
                });

                if (isCancelled) {
                    return;
                }

                setTasks(response.items);
                setCounters(response.counters);
                setTotal(response.total);
                setGeneratedAt(response.generatedAt);
            } catch (loadError) {
                if (!isCancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load background chat tasks.');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                    setRefreshing(false);
                    hasLoadedOnceRef.current = true;
                }
            }
        }

        void loadTasks();

        return () => {
            isCancelled = true;
        };
    }, [page, pageSize, refreshNonce, search, timeWindowHours, view]);

    useEffect(() => {
        if (pollIntervalMs <= 0) {
            return;
        }

        const timer = window.setInterval(() => setRefreshNonce((current) => current + 1), pollIntervalMs);
        return () => window.clearInterval(timer);
    }, [pollIntervalMs]);

    /**
     * Triggers an immediate refresh.
     */
    function refreshNow(): void {
        setRefreshNonce((current) => current + 1);
    }

    /**
     * Runs a guarded admin task action with a confirmation step and a required reason.
     */
    async function runTaskAction(task: AdminChatTaskRecord, action: TaskActionKind): Promise<void> {
        const confirmed = await showConfirm({
            title: action === 'cancel' ? 'Cancel background task' : 'Retry failed task',
            message: `${action === 'cancel' ? 'Cancel' : 'Retry'} task "${task.id}"?`,
            confirmLabel: action === 'cancel' ? 'Cancel task' : 'Retry task',
            cancelLabel: 'Abort',
        }).catch(() => false);

        if (!confirmed) {
            return;
        }

        const reason = await requestAdminReason(action, task.id);
        if (!reason) {
            return;
        }

        try {
            setBusyTaskId(task.id);
            setBusyAction(action);

            if (action === 'cancel') {
                await $cancelAdminChatTask(task.id, { reason });
            } else {
                await $retryAdminChatTask(task.id, { reason });
            }

            refreshNow();
        } catch (actionError) {
            await showAlert({
                title: action === 'cancel' ? 'Cancellation failed' : 'Retry failed',
                message: actionError instanceof Error ? actionError.message : 'Task action failed.',
            }).catch(() => undefined);
        } finally {
            setBusyTaskId(null);
            setBusyAction(null);
        }
    }

    const totalPages = useMemo(() => Math.max(1, Math.ceil(Math.max(total, 1) / pageSize)), [pageSize, total]);

    useEffect(() => {
        if (!loading && page > totalPages) {
            setPage(totalPages);
        }
    }, [loading, page, totalPages]);

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Task manager</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Admin-only operational view of durable background chat work across all users. This dashboard
                        shows queue and worker state, not chat transcript content.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">
                        Route: <span className="font-mono text-gray-700">/admin/task-manager</span>
                    </span>
                    <button
                        type="button"
                        onClick={refreshNow}
                        disabled={refreshing}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {refreshing ? 'Refreshing…' : 'Refresh now'}
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Running"
                    value={counters ? counters.runningCount.toLocaleString() : '...'}
                    caption="Workers in flight"
                />
                <MetricCard
                    label="Queued"
                    value={counters ? counters.queuedCount.toLocaleString() : '...'}
                    caption="Tasks waiting to start"
                />
                <MetricCard
                    label="Failed 24h"
                    value={counters ? counters.failedLast24hCount.toLocaleString() : '...'}
                    caption="Recent failures"
                />
                <MetricCard
                    label="Oldest queued"
                    value={counters ? formatDuration(counters.oldestQueuedAgeMs) : '...'}
                    caption="Backlog age"
                />
            </div>

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        {TASK_VIEW_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setView(option.id)}
                                className={`rounded-xl border px-4 py-2 text-left transition ${
                                    option.id === view
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="text-sm font-semibold">{option.label}</div>
                                <div className="text-[11px] text-current/70">{option.description}</div>
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
                        <Field label="Search" htmlFor="task-search">
                            <input
                                id="task-search"
                                type="text"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Task id / chat id / user id / agent id"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </Field>
                        <SelectField
                            id="task-page-size"
                            label="Page size"
                            value={String(pageSize)}
                            onChange={(value) => setPageSize(Number.parseInt(value, 10) || 50)}
                            options={[
                                { value: '25', label: '25' },
                                { value: '50', label: '50' },
                                { value: '100', label: '100' },
                            ]}
                        />
                        <SelectField
                            id="task-poll-interval"
                            label="Auto-refresh"
                            value={String(pollIntervalMs)}
                            onChange={(value) => setPollIntervalMs(Number.parseInt(value, 10) || 0)}
                            options={TASK_POLL_INTERVAL_OPTIONS.map((option) => ({
                                value: String(option.value),
                                label: option.label,
                            }))}
                        />
                        <SelectField
                            id="task-stuck-threshold"
                            label="Stuck after"
                            value={String(stuckThresholdMinutes)}
                            onChange={(value) => setStuckThresholdMinutes(Number.parseInt(value, 10) || 5)}
                            options={TASK_STUCK_THRESHOLD_OPTIONS.map((option) => ({
                                value: String(option.value),
                                label: option.label,
                            }))}
                        />
                        <SelectField
                            id="task-time-window"
                            label="All window"
                            value={String(timeWindowHours)}
                            disabled={view !== 'all'}
                            onChange={(value) => setTimeWindowHours(Number.parseInt(value, 10) || 24)}
                            options={TASK_TIME_WINDOW_OPTIONS.map((option) => ({
                                value: String(option.value),
                                label: option.label,
                            }))}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        <span>
                            {generatedAt
                                ? `Last refreshed ${formatDateTime(generatedAt)}`
                                : 'Waiting for first refresh…'}
                        </span>
                        <span>
                            {view === 'failed'
                                ? 'Failed view always shows the last 24 hours.'
                                : view === 'all'
                                ? `All view shows activity updated in the last ${timeWindowHours} hours.`
                                : 'Default active view shows only non-finished tasks.'}
                        </span>
                    </div>
                </div>
            </Card>

            {error ? (
                <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                    <p className="text-sm text-red-700">{error}</p>
                </Card>
            ) : null}

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">
                            Background chat tasks ({total.toLocaleString()})
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Sorted by started time for running work and creation time for queued work.
                        </p>
                    </div>
                    {refreshing ? <span className="text-xs font-medium text-blue-600">Refreshing…</span> : null}
                </div>

                {loading ? (
                    <div className="py-10 text-center text-sm text-gray-500">Loading background chat tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-500">
                        {resolveEmptyStateMessage(view, search)}
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
                                {tasks.map((task) => {
                                    const stuck = isTaskStuck(task, stuckThresholdMinutes);
                                    const isBusy = busyTaskId === task.id;
                                    return (
                                        <tr
                                            key={task.id}
                                            className={
                                                stuck
                                                    ? 'bg-orange-50/60'
                                                    : task.status === 'FAILED'
                                                    ? 'bg-rose-50/40'
                                                    : ''
                                            }
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-mono text-[11px] font-semibold text-gray-900">
                                                    {task.id}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <TaskStatusBadge task={task} isStuck={stuck} />
                                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
                                                        {formatTaskKind(task.kind)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                                                    <div>
                                                        Priority:{' '}
                                                        <span className="text-gray-700">{task.priority ?? '-'}</span>
                                                    </div>
                                                    <div>
                                                        Attempts:{' '}
                                                        <span className="text-gray-700">{task.attemptCount}</span> •
                                                        Retries:{' '}
                                                        <span className="text-gray-700">{task.retryCount}</span>
                                                    </div>
                                                    {task.cancelRequestedAt ? (
                                                        <div className="font-medium text-orange-700">
                                                            Cancellation requested
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                {renderTaskInfoBlock([
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
                                                ])}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                {renderTaskInfoBlock([
                                                    { label: 'Created', value: formatDateTime(task.createdAt) },
                                                    { label: 'Started', value: formatDateTime(task.startedAt) },
                                                    { label: 'Updated', value: formatDateTime(task.updatedAt) },
                                                    { label: 'Finished', value: formatDateTime(task.finishedAt) },
                                                ])}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                {renderTaskInfoBlock([
                                                    { label: 'Queue age', value: formatDuration(getQueueAgeMs(task)) },
                                                    {
                                                        label: 'Runtime',
                                                        value: formatDuration(getRuntimeDurationMs(task)),
                                                    },
                                                    { label: 'Total', value: formatDuration(getTotalDurationMs(task)) },
                                                    { label: 'Heartbeat', value: formatDateTime(task.lastHeartbeatAt) },
                                                ])}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                {renderTaskInfoBlock([
                                                    { label: 'Queue', value: task.queueName || '-' },
                                                    { label: 'Worker', value: task.workerId || '-' },
                                                    {
                                                        label: 'Lease expires',
                                                        value: formatDateTime(task.leaseExpiresAt),
                                                    },
                                                ])}
                                            </td>
                                            <td className="max-w-xs px-4 py-3 align-top text-[11px] leading-relaxed text-gray-600">
                                                {task.lastErrorSummary ? truncateText(task.lastErrorSummary, 220) : '—'}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex justify-end gap-2">
                                                    {(task.status === 'QUEUED' || task.status === 'RUNNING') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void runTaskAction(task, 'cancel')}
                                                            disabled={isBusy}
                                                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {isBusy && busyAction === 'cancel'
                                                                ? 'Cancelling…'
                                                                : 'Cancel'}
                                                        </button>
                                                    )}
                                                    {task.status === 'FAILED' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void runTaskAction(task, 'retry')}
                                                            disabled={isBusy}
                                                            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {isBusy && busyAction === 'retry' ? 'Retrying…' : 'Retry'}
                                                        </button>
                                                    )}
                                                    {task.status !== 'QUEUED' &&
                                                    task.status !== 'RUNNING' &&
                                                    task.status !== 'FAILED' ? (
                                                        <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-500">
                                                            —
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-600 md:flex-row">
                    <div>
                        {total > 0 ? (
                            <>
                                Showing{' '}
                                <span className="font-semibold">{Math.min((page - 1) * pageSize + 1, total)}</span> –{' '}
                                <span className="font-semibold">{Math.min(page * pageSize, total)}</span> of{' '}
                                <span className="font-semibold">{total}</span> tasks
                            </>
                        ) : (
                            'No tasks'
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                            className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span>
                            Page <span className="font-semibold">{page}</span> of{' '}
                            <span className="font-semibold">{totalPages}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={page >= totalPages}
                            className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

/**
 * Small metric card used in the header summary.
 */
function MetricCard(props: { label: string; value: string; caption: string }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{props.label}</div>
            <div className="mt-2 text-3xl font-light text-gray-900">{props.value}</div>
            <div className="mt-1 text-sm text-gray-500">{props.caption}</div>
        </div>
    );
}

/**
 * Shared field wrapper for compact filter controls.
 */
function Field(props: { label: string; htmlFor: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={props.htmlFor} className="text-sm font-medium text-gray-700">
                {props.label}
            </label>
            {props.children}
        </div>
    );
}

/**
 * Shared select field used in the filter panel.
 */
function SelectField(props: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    disabled?: boolean;
}) {
    return (
        <Field label={props.label} htmlFor={props.id}>
            <select
                id={props.id}
                value={props.value}
                disabled={props.disabled}
                onChange={(event) => props.onChange(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
                {props.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </Field>
    );
}

/**
 * Compact badge rendering the effective task status.
 */
function TaskStatusBadge({ task, isStuck }: TaskStatusBadgeProps) {
    const label = task.status === 'QUEUED' && task.retryCount > 0 ? 'RETRYING' : task.status;
    const tone = isStuck ? TASK_STATUS_CLASS_MAP.STUCK : TASK_STATUS_CLASS_MAP[label] || TASK_STATUS_CLASS_MAP.QUEUED;
    return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

/**
 * Renders a compact vertical info block inside the table.
 */
function renderTaskInfoBlock(rows: Array<{ label: string; value: string; secondary?: string | null }>) {
    return rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="mb-2 last:mb-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{row.label}</div>
            <div className="break-all text-[11px] text-gray-800">{row.value}</div>
            {row.secondary ? <div className="break-all text-[11px] text-gray-500">{row.secondary}</div> : null}
        </div>
    ));
}

/**
 * Formats a durable task kind for display.
 */
function formatTaskKind(kind: AdminChatTaskRecord['kind']): string {
    return kind === 'CHAT_COMPLETION' ? 'Chat completion' : kind;
}

/**
 * Formats one timestamp for compact table display.
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
 */
function getQueueAgeMs(task: AdminChatTaskRecord): number | null {
    const queuedAtMs = Date.parse(task.queuedAt);
    return Number.isNaN(queuedAtMs) ? null : Date.now() - queuedAtMs;
}

/**
 * Computes runtime duration for running tasks.
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
 */
function isTaskStuck(task: AdminChatTaskRecord, thresholdMinutes: number): boolean {
    const runtimeMs = getRuntimeDurationMs(task);
    return runtimeMs !== null && runtimeMs >= thresholdMinutes * 60_000;
}

/**
 * Truncates long error text for compact table rendering.
 */
function truncateText(value: string, limit: number): string {
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

/**
 * Resolves the current empty-state message.
 */
function resolveEmptyStateMessage(view: AdminChatTaskView, search: string): string {
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
 * Prompts for a required reason before destructive admin actions.
 */
async function requestAdminReason(action: TaskActionKind, taskId: string): Promise<string | null> {
    const value = await showPrompt({
        title: `${action === 'cancel' ? 'Cancel' : 'Retry'} task reason`,
        message: `Provide a short reason for task "${taskId}".`,
        confirmLabel: 'Continue',
        cancelLabel: 'Abort',
        placeholder: 'Required reason',
        inputLabel: 'Reason',
    }).catch(() => null);

    const reason = value?.trim() || '';
    if (reason) {
        return reason;
    }

    if (value !== null) {
        await showAlert({
            title: 'Reason required',
            message: 'This action requires a non-empty reason.',
        }).catch(() => undefined);
    }

    return null;
}
