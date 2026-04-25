'use client';

import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import {
    $cancelAdminChatTask,
    $fetchAdminChatTasks,
    $retryAdminChatTask,
    type AdminChatTaskCounters,
    type AdminChatTaskRecord,
    type AdminChatTaskView,
} from '@/src/utils/chatTasksAdmin';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Supported row-level admin actions.
 *
 * @private function of TaskManagerClient
 */
type TaskActionKind = 'cancel' | 'retry';

/**
 * State returned by `useTaskManagerState`.
 *
 * @private function of TaskManagerClient
 */
type UseTaskManagerStateResult = {
    busyAction: TaskActionKind | null;
    busyTaskId: string | null;
    counters: AdminChatTaskCounters | null;
    error: string | null;
    isLoading: boolean;
    isNextPageDisabled: boolean;
    isPreviousPageDisabled: boolean;
    isRefreshing: boolean;
    lastRefreshedLabel: string;
    oldestQueuedAgeLabel: string;
    page: number;
    pageSize: number;
    pollIntervalMs: number;
    refreshNow: () => void;
    runTaskAction: (task: AdminChatTaskRecord, action: TaskActionKind) => Promise<void>;
    search: string;
    searchInput: string;
    selectView: (view: AdminChatTaskView) => void;
    stuckThresholdMinutes: number;
    tasks: Array<AdminChatTaskRecord>;
    timeWindowHours: number;
    total: number;
    totalPages: number;
    updatePageSize: (value: string) => void;
    updatePollIntervalMs: (value: string) => void;
    updateSearchInput: (value: string) => void;
    updateStuckThresholdMinutes: (value: string) => void;
    updateTimeWindowHours: (value: string) => void;
    view: AdminChatTaskView;
    goToNextPage: () => void;
    goToPreviousPage: () => void;
};

/**
 * Dialog copy used for one admin task action.
 *
 * @private function of TaskManagerClient
 */
type TaskActionDialogCopy = {
    cancelLabel: string;
    confirmLabel: string;
    failureTitle: string;
    promptTitle: string;
    title: string;
    verb: string;
};

/**
 * Parses a numeric select value with a fallback for invalid input.
 *
 * @private function of TaskManagerClient
 */
function parseSelectedNumber(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Formats a timestamp for concise status text.
 *
 * @private function of TaskManagerClient
 */
function formatDateTime(value: string | null): string {
    if (!value) {
        return '-';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

/**
 * Formats a duration in milliseconds.
 *
 * @private function of TaskManagerClient
 */
function formatDuration(durationMs: number | null): string {
    if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) {
        return '-';
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
 * Resolves dialog copy for the selected admin task action.
 *
 * @private function of TaskManagerClient
 */
function resolveTaskActionDialogCopy(action: TaskActionKind): TaskActionDialogCopy {
    if (action === 'cancel') {
        return {
            cancelLabel: 'Abort',
            confirmLabel: 'Cancel task',
            failureTitle: 'Cancellation failed',
            promptTitle: 'Cancel task reason',
            title: 'Cancel background task',
            verb: 'Cancel',
        };
    }

    return {
        cancelLabel: 'Abort',
        confirmLabel: 'Retry task',
        failureTitle: 'Retry failed',
        promptTitle: 'Retry task reason',
        title: 'Retry failed task',
        verb: 'Retry',
    };
}

/**
 * Requests confirmation before mutating a durable task.
 *
 * @private function of TaskManagerClient
 */
async function confirmTaskAction(action: TaskActionKind, taskId: string): Promise<boolean> {
    const dialogCopy = resolveTaskActionDialogCopy(action);

    return showConfirm({
        title: dialogCopy.title,
        message: `${dialogCopy.verb} task "${taskId}"?`,
        confirmLabel: dialogCopy.confirmLabel,
        cancelLabel: dialogCopy.cancelLabel,
    }).catch(() => false);
}

/**
 * Prompts for a required reason before destructive admin actions.
 *
 * @private function of TaskManagerClient
 */
async function requestAdminReason(action: TaskActionKind, taskId: string): Promise<string | null> {
    const dialogCopy = resolveTaskActionDialogCopy(action);
    const value = await showPrompt({
        title: dialogCopy.promptTitle,
        message: `Provide a short reason for task "${taskId}".`,
        confirmLabel: 'Continue',
        cancelLabel: dialogCopy.cancelLabel,
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

/**
 * Performs one admin task action against the API.
 *
 * @private function of TaskManagerClient
 */
async function executeTaskAction(taskId: string, action: TaskActionKind, reason: string): Promise<void> {
    if (action === 'cancel') {
        await $cancelAdminChatTask(taskId, { reason });
        return;
    }

    await $retryAdminChatTask(taskId, { reason });
}

/**
 * Surfaces a failed admin task action to the operator.
 *
 * @private function of TaskManagerClient
 */
async function showTaskActionFailure(action: TaskActionKind, error: unknown): Promise<void> {
    const dialogCopy = resolveTaskActionDialogCopy(action);

    await showAlert({
        title: dialogCopy.failureTitle,
        message: error instanceof Error ? error.message : 'Task action failed.',
    }).catch(() => undefined);
}

/**
 * Normalizes errors thrown while loading the task dashboard.
 *
 * @private function of TaskManagerClient
 */
function resolveTaskLoadErrorMessage(loadError: unknown): string {
    return loadError instanceof Error ? loadError.message : 'Failed to load background chat tasks.';
}

/**
 * Manages task-manager query state, polling, loading, and guarded task actions.
 *
 * @private function of TaskManagerClient
 */
export function useTaskManagerState(): UseTaskManagerStateResult {
    const [view, setView] = useState<AdminChatTaskView>('active');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [pollIntervalMs, setPollIntervalMs] = useState(10_000);
    const [stuckThresholdMinutes, setStuckThresholdMinutes] = useState(5);
    const [timeWindowHours, setTimeWindowHours] = useState(24);
    const [searchInput, setSearchInput] = useState('');
    const search = useDeferredValue(searchInput).trim();
    const [tasks, setTasks] = useState<Array<AdminChatTaskRecord>>([]);
    const [total, setTotal] = useState(0);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [counters, setCounters] = useState<AdminChatTaskCounters | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<TaskActionKind | null>(null);
    const hasLoadedOnceRef = useRef(false);

    const refreshNow = useCallback((): void => {
        setRefreshNonce((current) => current + 1);
    }, []);

    const selectView = useCallback((nextView: AdminChatTaskView): void => {
        setView(nextView);
    }, []);

    const updateSearchInput = useCallback((value: string): void => {
        setSearchInput(value);
    }, []);

    const updatePageSize = useCallback((value: string): void => {
        setPageSize(parseSelectedNumber(value, 50));
    }, []);

    const updatePollIntervalMs = useCallback((value: string): void => {
        setPollIntervalMs(parseSelectedNumber(value, 0));
    }, []);

    const updateStuckThresholdMinutes = useCallback((value: string): void => {
        setStuckThresholdMinutes(parseSelectedNumber(value, 5));
    }, []);

    const updateTimeWindowHours = useCallback((value: string): void => {
        setTimeWindowHours(parseSelectedNumber(value, 24));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [pageSize, search, timeWindowHours, view]);

    useEffect(() => {
        let isCancelled = false;

        async function loadTasks(): Promise<void> {
            if (hasLoadedOnceRef.current) {
                setIsRefreshing(true);
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
                    setError(resolveTaskLoadErrorMessage(loadError));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                    setIsRefreshing(false);
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

        const timer = window.setInterval(() => refreshNow(), pollIntervalMs);
        return () => window.clearInterval(timer);
    }, [pollIntervalMs, refreshNow]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(Math.max(total, 1) / pageSize)), [pageSize, total]);

    useEffect(() => {
        if (!isLoading && page > totalPages) {
            setPage(totalPages);
        }
    }, [isLoading, page, totalPages]);

    const goToPreviousPage = useCallback((): void => {
        setPage((current) => Math.max(1, current - 1));
    }, []);

    const goToNextPage = useCallback((): void => {
        setPage((current) => Math.min(totalPages, current + 1));
    }, [totalPages]);

    const runTaskAction = useCallback(
        async (task: AdminChatTaskRecord, action: TaskActionKind): Promise<void> => {
            const isConfirmed = await confirmTaskAction(action, task.id);
            if (!isConfirmed) {
                return;
            }

            const reason = await requestAdminReason(action, task.id);
            if (!reason) {
                return;
            }

            try {
                setBusyTaskId(task.id);
                setBusyAction(action);
                await executeTaskAction(task.id, action, reason);
                refreshNow();
            } catch (actionError) {
                await showTaskActionFailure(action, actionError);
            } finally {
                setBusyTaskId(null);
                setBusyAction(null);
            }
        },
        [refreshNow],
    );

    return {
        busyAction,
        busyTaskId,
        counters,
        error,
        isLoading,
        isNextPageDisabled: page >= totalPages,
        isPreviousPageDisabled: page <= 1,
        isRefreshing,
        lastRefreshedLabel: generatedAt
            ? `Last refreshed ${formatDateTime(generatedAt)}`
            : 'Waiting for first refresh…',
        oldestQueuedAgeLabel: counters ? formatDuration(counters.oldestQueuedAgeMs) : '...',
        page,
        pageSize,
        pollIntervalMs,
        refreshNow,
        runTaskAction,
        search,
        searchInput,
        selectView,
        stuckThresholdMinutes,
        tasks,
        timeWindowHours,
        total,
        totalPages,
        updatePageSize,
        updatePollIntervalMs,
        updateSearchInput,
        updateStuckThresholdMinutes,
        updateTimeWindowHours,
        view,
        goToNextPage,
        goToPreviousPage,
    };
}
