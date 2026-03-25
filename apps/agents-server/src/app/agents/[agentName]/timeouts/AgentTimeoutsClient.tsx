'use client';

import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import { Dialog } from '@/src/components/Portal/Dialog';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    runAgentUserTimeoutBulkAction,
    cancelAgentUserTimeout,
    fetchAgentUserTimeouts,
    updateAgentUserTimeout,
    type AgentUserTimeoutBulkAction,
    type AgentUserTimeoutCounters,
    type AgentUserTimeoutUpdatePayload,
    type UserChatTimeout,
} from '@/src/utils/userChatClient';

/**
 * Filter tabs available in the timeout manager.
 */
type TimeoutManagerFilter = 'active' | 'paused' | 'history' | 'all';

/**
 * Props for the agent timeout manager page.
 */
type AgentTimeoutsClientProps = {
    agentName: string;
};

/**
 * Polling cadence for refreshing timeout data.
 */
const AGENT_TIMEOUT_MANAGER_POLL_INTERVAL_MS = 10_000;

/**
 * UX copy/configuration for supported timeout-manager bulk actions.
 */
const TIMEOUT_MANAGER_BULK_ACTION_CONFIG: Record<
    AgentUserTimeoutBulkAction,
    {
        idleLabel: string;
        busyLabel: string;
        confirmTitle: string;
        confirmMessage: string;
        confirmLabel: string;
        errorTitle: string;
        buttonClassName: string;
    }
> = {
    cancel_all_active: {
        idleLabel: 'Cancel active',
        busyLabel: 'Cancelling...',
        confirmTitle: 'Cancel all active timeouts',
        confirmMessage: 'Cancel all active timeouts for this agent across your chats?',
        confirmLabel: 'Cancel all',
        errorTitle: 'Bulk cancellation failed',
        buttonClassName:
            'rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60',
    },
    pause_all_active: {
        idleLabel: 'Pause active',
        busyLabel: 'Pausing...',
        confirmTitle: 'Pause all active timeouts',
        confirmMessage: 'Pause all active queued timeouts for this agent across your chats?',
        confirmLabel: 'Pause all',
        errorTitle: 'Bulk pause failed',
        buttonClassName:
            'rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60',
    },
    resume_all_paused: {
        idleLabel: 'Resume paused',
        busyLabel: 'Resuming...',
        confirmTitle: 'Resume all paused timeouts',
        confirmMessage: 'Resume all paused queued timeouts for this agent across your chats?',
        confirmLabel: 'Resume all',
        errorTitle: 'Bulk resume failed',
        buttonClassName:
            'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60',
    },
};

/**
 * Displays all timeouts for one user+agent across chats and supports timeout edits.
 */
export function AgentTimeoutsClient({ agentName }: AgentTimeoutsClientProps) {
    const [timeouts, setTimeouts] = useState<Array<UserChatTimeout>>([]);
    const [counters, setCounters] = useState<AgentUserTimeoutCounters | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState<TimeoutManagerFilter>('active');
    const [editingTimeout, setEditingTimeout] = useState<UserChatTimeout | null>(null);
    const [busyTimeoutId, setBusyTimeoutId] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<'save' | 'cancel' | 'pause' | 'resume' | 'extend' | null>(null);
    const [busyBulkAction, setBusyBulkAction] = useState<AgentUserTimeoutBulkAction | null>(null);
    const [editDueAtLocalValue, setEditDueAtLocalValue] = useState('');
    const [editRecurrenceMinutesValue, setEditRecurrenceMinutesValue] = useState('');
    const [editMessageValue, setEditMessageValue] = useState('');
    const [editParametersValue, setEditParametersValue] = useState('{}');

    /**
     * Loads current agent-scoped timeout data.
     */
    const refreshTimeouts = useCallback(
        async (showRefreshingState: boolean) => {
            if (showRefreshingState) {
                setIsRefreshing(true);
            }

            try {
                setErrorMessage(null);
                const payload = await fetchAgentUserTimeouts(agentName);
                setTimeouts(payload.items);
                setCounters(payload.counters);
                setGeneratedAt(payload.generatedAt);
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load agent timeouts.');
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [agentName],
    );

    useEffect(() => {
        void refreshTimeouts(false);

        const timer = window.setInterval(() => {
            void refreshTimeouts(true);
        }, AGENT_TIMEOUT_MANAGER_POLL_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [refreshTimeouts]);

    /**
     * Applies one timeout patch and refreshes local list.
     */
    const applyTimeoutPatch = useCallback(
        async (timeout: UserChatTimeout, payload: AgentUserTimeoutUpdatePayload, action: typeof busyAction) => {
            try {
                setBusyTimeoutId(timeout.timeoutId);
                setBusyAction(action);
                await updateAgentUserTimeout(agentName, timeout.timeoutId, payload);
                await refreshTimeouts(false);
            } finally {
                setBusyTimeoutId(null);
                setBusyAction(null);
            }
        },
        [agentName, refreshTimeouts],
    );

    /**
     * Cancels one timeout and refreshes data.
     */
    const handleCancelTimeout = useCallback(
        async (timeout: UserChatTimeout) => {
            const confirmed = await showConfirm({
                title: 'Cancel timeout',
                message: `Cancel timeout "${timeout.timeoutId}"?`,
                confirmLabel: 'Cancel timeout',
                cancelLabel: 'Back',
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            try {
                setBusyTimeoutId(timeout.timeoutId);
                setBusyAction('cancel');
                await cancelAgentUserTimeout(agentName, timeout.timeoutId);
                await refreshTimeouts(false);
            } catch (error) {
                await showAlert({
                    title: 'Cancellation failed',
                    message: error instanceof Error ? error.message : 'Failed to cancel timeout.',
                }).catch(() => undefined);
            } finally {
                setBusyTimeoutId(null);
                setBusyAction(null);
            }
        },
        [agentName, refreshTimeouts],
    );

    /**
     * Prompts for quick timeout extension in minutes.
     */
    const handleExtendTimeout = useCallback(
        async (timeout: UserChatTimeout) => {
            const value = await showPrompt({
                title: 'Extend timeout',
                message: 'Add minutes to the current due time.',
                confirmLabel: 'Extend',
                cancelLabel: 'Back',
                placeholder: 'Minutes',
                inputLabel: 'Minutes',
            }).catch(() => null);

            if (value === null) {
                return;
            }

            const minutes = Number.parseFloat(value.trim());
            if (!Number.isFinite(minutes) || minutes <= 0) {
                await showAlert({
                    title: 'Invalid value',
                    message: 'Please enter a positive number of minutes.',
                }).catch(() => undefined);
                return;
            }

            try {
                await applyTimeoutPatch(
                    timeout,
                    { extendByMs: Math.floor(minutes * 60_000) },
                    'extend',
                );
            } catch (error) {
                await showAlert({
                    title: 'Extension failed',
                    message: error instanceof Error ? error.message : 'Failed to extend timeout.',
                }).catch(() => undefined);
            }
        },
        [applyTimeoutPatch],
    );

    /**
     * Executes one bulk timeout action and refreshes manager data.
     */
    const handleBulkAction = useCallback(
        async (action: AgentUserTimeoutBulkAction) => {
            const actionConfig = TIMEOUT_MANAGER_BULK_ACTION_CONFIG[action];
            const confirmed = await showConfirm({
                title: actionConfig.confirmTitle,
                message: actionConfig.confirmMessage,
                confirmLabel: actionConfig.confirmLabel,
                cancelLabel: 'Back',
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            try {
                setBusyBulkAction(action);
                await runAgentUserTimeoutBulkAction(agentName, action);
                await refreshTimeouts(false);
            } catch (error) {
                await showAlert({
                    title: actionConfig.errorTitle,
                    message: error instanceof Error ? error.message : 'Failed to run timeout bulk action.',
                }).catch(() => undefined);
            } finally {
                setBusyBulkAction(null);
            }
        },
        [agentName, refreshTimeouts],
    );

    /**
     * Opens the advanced timeout edit dialog with prefilled values.
     */
    const handleOpenEditDialog = useCallback((timeout: UserChatTimeout) => {
        setEditingTimeout(timeout);
        setEditDueAtLocalValue(toDateTimeLocalValue(timeout.dueAt));
        setEditRecurrenceMinutesValue(
            timeout.recurrenceIntervalMs ? String(Math.floor(timeout.recurrenceIntervalMs / 60_000)) : '',
        );
        setEditMessageValue(timeout.message || '');
        setEditParametersValue(JSON.stringify(timeout.parameters || {}, null, 2));
    }, []);

    /**
     * Saves edits from the timeout dialog.
     */
    const handleSaveEdits = useCallback(async () => {
        if (!editingTimeout) {
            return;
        }

        let parsedParameters: Record<string, unknown>;
        try {
            const parsedJson = JSON.parse(editParametersValue || '{}') as unknown;
            if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
                throw new Error('Parameters JSON must be an object.');
            }
            parsedParameters = parsedJson as Record<string, unknown>;
        } catch (error) {
            await showAlert({
                title: 'Invalid parameters JSON',
                message: error instanceof Error ? error.message : 'Failed to parse parameters JSON.',
            }).catch(() => undefined);
            return;
        }

        const trimmedRecurrence = editRecurrenceMinutesValue.trim();
        let recurrenceIntervalMs: number | null = null;
        if (trimmedRecurrence) {
            const recurrenceMinutes = Number.parseFloat(trimmedRecurrence);
            if (!Number.isFinite(recurrenceMinutes) || recurrenceMinutes <= 0) {
                await showAlert({
                    title: 'Invalid recurrence',
                    message: 'Recurrence must be a positive number of minutes or empty.',
                }).catch(() => undefined);
                return;
            }

            recurrenceIntervalMs = Math.floor(recurrenceMinutes * 60_000);
        }

        const dueAtIso = fromDateTimeLocalValue(editDueAtLocalValue);
        if (!dueAtIso) {
            await showAlert({
                title: 'Invalid date',
                message: 'Next run must be a valid date and time.',
            }).catch(() => undefined);
            return;
        }

        try {
            await applyTimeoutPatch(
                editingTimeout,
                {
                    dueAt: dueAtIso,
                    recurrenceIntervalMs,
                    message: editMessageValue.trim() ? editMessageValue.trim() : null,
                    parameters: parsedParameters,
                },
                'save',
            );
            setEditingTimeout(null);
        } catch (error) {
            await showAlert({
                title: 'Update failed',
                message: error instanceof Error ? error.message : 'Failed to save timeout edits.',
            }).catch(() => undefined);
        }
    }, [
        applyTimeoutPatch,
        editDueAtLocalValue,
        editMessageValue,
        editParametersValue,
        editRecurrenceMinutesValue,
        editingTimeout,
    ]);

    const filteredTimeouts = useMemo(() => {
        if (filter === 'all') {
            return timeouts;
        }

        if (filter === 'active') {
            return timeouts.filter((timeout) => (timeout.status === 'QUEUED' || timeout.status === 'RUNNING') && !timeout.pausedAt);
        }

        if (filter === 'paused') {
            return timeouts.filter((timeout) => timeout.status === 'QUEUED' && Boolean(timeout.pausedAt));
        }

        return timeouts.filter(
            (timeout) =>
                timeout.status === 'COMPLETED' || timeout.status === 'FAILED' || timeout.status === 'CANCELLED',
        );
    }, [filter, timeouts]);

    return (
        <div className="container mx-auto mt-20 space-y-6 px-4 py-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">My timeouts</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Agent-scoped timeout manager across all your chats.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleBulkAction('cancel_all_active')}
                        disabled={busyBulkAction !== null}
                        className={TIMEOUT_MANAGER_BULK_ACTION_CONFIG.cancel_all_active.buttonClassName}
                    >
                        {busyBulkAction === 'cancel_all_active'
                            ? TIMEOUT_MANAGER_BULK_ACTION_CONFIG.cancel_all_active.busyLabel
                            : TIMEOUT_MANAGER_BULK_ACTION_CONFIG.cancel_all_active.idleLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleBulkAction('pause_all_active')}
                        disabled={busyBulkAction !== null}
                        className={TIMEOUT_MANAGER_BULK_ACTION_CONFIG.pause_all_active.buttonClassName}
                    >
                        {busyBulkAction === 'pause_all_active'
                            ? TIMEOUT_MANAGER_BULK_ACTION_CONFIG.pause_all_active.busyLabel
                            : TIMEOUT_MANAGER_BULK_ACTION_CONFIG.pause_all_active.idleLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleBulkAction('resume_all_paused')}
                        disabled={busyBulkAction !== null}
                        className={TIMEOUT_MANAGER_BULK_ACTION_CONFIG.resume_all_paused.buttonClassName}
                    >
                        {busyBulkAction === 'resume_all_paused'
                            ? TIMEOUT_MANAGER_BULK_ACTION_CONFIG.resume_all_paused.busyLabel
                            : TIMEOUT_MANAGER_BULK_ACTION_CONFIG.resume_all_paused.idleLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void refreshTimeouts(true)}
                        disabled={isRefreshing || busyBulkAction !== null}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <TimeoutMetricCard label="All" value={String(counters?.allCount ?? 0)} />
                <TimeoutMetricCard
                    label="Active"
                    value={String((counters?.queuedCount ?? 0) + (counters?.runningCount ?? 0) - (counters?.pausedCount ?? 0))}
                />
                <TimeoutMetricCard label="Paused" value={String(counters?.pausedCount ?? 0)} />
                <TimeoutMetricCard label="Failed" value={String(counters?.failedCount ?? 0)} />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {(['active', 'paused', 'history', 'all'] as const).map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setFilter(item)}
                            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                                filter === item
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {item === 'active' ? 'Active' : item === 'paused' ? 'Paused' : item === 'history' ? 'History' : 'All'}
                        </button>
                    ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                    {generatedAt ? `Last refreshed ${new Date(generatedAt).toLocaleString()}` : 'Waiting for first refresh...'}
                </div>
            </div>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-gray-500">Loading timeouts...</div>
                ) : filteredTimeouts.length === 0 ? (
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
                                {filteredTimeouts.map((timeout) => {
                                    const isBusy = busyTimeoutId === timeout.timeoutId;
                                    const canEdit = timeout.status === 'QUEUED';
                                    const canCancel = timeout.status === 'QUEUED' || timeout.status === 'RUNNING';
                                    const isPaused = timeout.status === 'QUEUED' && Boolean(timeout.pausedAt);

                                    return (
                                        <tr key={timeout.timeoutId}>
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-mono text-[11px] font-semibold text-gray-900">{timeout.timeoutId}</div>
                                                <div className="mt-1 text-[11px] text-gray-500">
                                                    Updated {new Date(timeout.updatedAt).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <Link
                                                    href={`/agents/${encodeURIComponent(agentName)}/chat?chat=${encodeURIComponent(timeout.chatId)}`}
                                                    className="break-all text-blue-700 hover:underline"
                                                >
                                                    {timeout.chatId}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span
                                                    className={`rounded-full border px-2 py-0.5 font-semibold ${
                                                        timeout.status === 'RUNNING'
                                                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                            : timeout.status === 'FAILED'
                                                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                            : timeout.status === 'COMPLETED'
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : timeout.status === 'CANCELLED'
                                                            ? 'border-gray-200 bg-gray-100 text-gray-700'
                                                            : isPaused
                                                            ? 'border-orange-200 bg-orange-50 text-orange-700'
                                                            : 'border-slate-200 bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    {isPaused ? 'PAUSED' : timeout.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top">{new Date(timeout.dueAt).toLocaleString()}</td>
                                            <td className="px-4 py-3 align-top">
                                                {timeout.recurrenceIntervalMs
                                                    ? `Every ${formatDuration(timeout.recurrenceIntervalMs)}`
                                                    : 'One-shot'}
                                            </td>
                                            <td className="max-w-xs px-4 py-3 align-top">
                                                <div className="truncate text-[11px] text-gray-700">{timeout.message || 'No message'}</div>
                                                <div className="mt-1 font-mono text-[10px] text-gray-500">
                                                    {truncateText(JSON.stringify(timeout.parameters || {}), 120)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex justify-end gap-2">
                                                    {canEdit ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void applyTimeoutPatch(
                                                                        timeout,
                                                                        { paused: !isPaused },
                                                                        isPaused ? 'resume' : 'pause',
                                                                    )
                                                                }
                                                                disabled={isBusy}
                                                                className="rounded-md border border-gray-300 px-2 py-1 font-semibold text-gray-700 disabled:opacity-60"
                                                            >
                                                                {isBusy && busyAction === (isPaused ? 'resume' : 'pause')
                                                                    ? isPaused
                                                                        ? 'Resuming...'
                                                                        : 'Pausing...'
                                                                    : isPaused
                                                                    ? 'Resume'
                                                                    : 'Pause'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleExtendTimeout(timeout)}
                                                                disabled={isBusy}
                                                                className="rounded-md border border-gray-300 px-2 py-1 font-semibold text-gray-700 disabled:opacity-60"
                                                            >
                                                                {isBusy && busyAction === 'extend' ? 'Extending...' : 'Extend'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditDialog(timeout)}
                                                                disabled={isBusy}
                                                                className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 disabled:opacity-60"
                                                            >
                                                                Edit
                                                            </button>
                                                        </>
                                                    ) : null}
                                                    {canCancel ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleCancelTimeout(timeout)}
                                                            disabled={isBusy}
                                                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700 disabled:opacity-60"
                                                        >
                                                            {isBusy && busyAction === 'cancel' ? 'Cancelling...' : 'Cancel'}
                                                        </button>
                                                    ) : null}
                                                    {!canEdit && !canCancel ? (
                                                        <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-500">
                                                            -
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
            </div>

            {editingTimeout && (
                <Dialog onClose={() => setEditingTimeout(null)} className="w-full max-w-2xl p-5 sm:p-6">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Edit timeout</h2>
                            <p className="text-sm text-slate-500">{editingTimeout.timeoutId}</p>
                        </div>

                        <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700">Next run</span>
                            <input
                                type="datetime-local"
                                value={editDueAtLocalValue}
                                onChange={(event) => setEditDueAtLocalValue(event.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700">Recurrence (minutes, leave empty for one-shot)</span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={editRecurrenceMinutesValue}
                                onChange={(event) => setEditRecurrenceMinutesValue(event.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700">Wake-up message</span>
                            <input
                                type="text"
                                value={editMessageValue}
                                onChange={(event) => setEditMessageValue(event.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700">Payload parameters (JSON object)</span>
                            <textarea
                                value={editParametersValue}
                                onChange={(event) => setEditParametersValue(event.target.value)}
                                className="min-h-40 rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                            />
                        </label>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingTimeout(null)}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSaveEdits()}
                                disabled={busyTimeoutId === editingTimeout.timeoutId && busyAction === 'save'}
                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-60"
                            >
                                {busyTimeoutId === editingTimeout.timeoutId && busyAction === 'save' ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
}

/**
 * Compact metric card used by the timeout manager header.
 */
function TimeoutMetricCard(props: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{props.label}</div>
            <div className="mt-1 text-2xl font-light text-gray-900">{props.value}</div>
        </div>
    );
}

/**
 * Converts ISO date into `datetime-local` compatible value.
 */
function toDateTimeLocalValue(isoTimestamp: string): string {
    const timestamp = Date.parse(isoTimestamp);
    if (!Number.isFinite(timestamp)) {
        return '';
    }

    const date = new Date(timestamp);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parses one `datetime-local` value into ISO format.
 */
function fromDateTimeLocalValue(value: string): string | null {
    if (!value.trim()) {
        return null;
    }

    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
        return null;
    }

    return new Date(timestamp).toISOString();
}

/**
 * Formats milliseconds into compact human-friendly duration text.
 */
function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
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
    if (parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.slice(0, 2).join(' ');
}

/**
 * Truncates long text to keep table rows compact.
 */
function truncateText(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
