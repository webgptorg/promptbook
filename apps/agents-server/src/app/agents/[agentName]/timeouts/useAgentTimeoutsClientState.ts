'use client';

import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import { useDirtyModalGuard } from '@/src/components/utils/useDirtyModalGuard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    cancelAgentUserTimeout,
    fetchAgentUserTimeouts,
    runAgentUserTimeoutBulkAction,
    updateAgentUserTimeout,
    type AgentUserTimeoutBulkAction,
    type AgentUserTimeoutCounters,
    type AgentUserTimeoutUpdatePayload,
    type UserChatTimeout,
} from '@/src/utils/userChatClient';

/**
 * Filter tabs available in the timeout manager.
 *
 * @private function of AgentTimeoutsClient
 */
type TimeoutManagerFilter = 'active' | 'paused' | 'history' | 'all';

/**
 * Supported timeout actions shown as busy states in the manager.
 *
 * @private function of AgentTimeoutsClient
 */
type TimeoutManagerActionKind = 'save' | 'cancel' | 'pause' | 'resume' | 'extend';

/**
 * Local edit form state for the timeout dialog.
 *
 * @private function of AgentTimeoutsClient
 */
type TimeoutEditDraft = {
    dueAtLocalValue: string;
    recurrenceMinutesValue: string;
    messageValue: string;
    parametersValue: string;
};

/**
 * Props accepted by `useAgentTimeoutsClientState`.
 *
 * @private function of AgentTimeoutsClient
 */
type UseAgentTimeoutsClientStateProps = {
    agentName: string;
};

/**
 * Button metadata for one timeout-manager bulk action.
 *
 * @private function of AgentTimeoutsClient
 */
type TimeoutManagerBulkActionView = {
    action: AgentUserTimeoutBulkAction;
    idleLabel: string;
    busyLabel: string;
    buttonClassName: string;
};

/**
 * Dialog copy and button styling for one bulk action.
 *
 * @private function of AgentTimeoutsClient
 */
type TimeoutManagerBulkActionConfig = TimeoutManagerBulkActionView & {
    confirmTitle: string;
    confirmMessage: string;
    confirmLabel: string;
    errorTitle: string;
};

/**
 * State and handlers exposed by `useAgentTimeoutsClientState`.
 *
 * @private function of AgentTimeoutsClient
 */
type UseAgentTimeoutsClientStateResult = {
    bulkActions: ReadonlyArray<TimeoutManagerBulkActionView>;
    busyAction: TimeoutManagerActionKind | null;
    busyBulkAction: AgentUserTimeoutBulkAction | null;
    busyTimeoutId: string | null;
    counters: AgentUserTimeoutCounters | null;
    closeEditDialog: () => void;
    requestCloseEditDialog: () => void;
    editDraft: TimeoutEditDraft;
    editingTimeout: UserChatTimeout | null;
    errorMessage: string | null;
    filter: TimeoutManagerFilter;
    filteredTimeouts: Array<UserChatTimeout>;
    generatedAt: string | null;
    isLoading: boolean;
    isRefreshing: boolean;
    cancelTimeout: (timeout: UserChatTimeout) => Promise<void>;
    extendTimeout: (timeout: UserChatTimeout) => Promise<void>;
    openEditDialog: (timeout: UserChatTimeout) => void;
    refreshNow: () => Promise<void>;
    runBulkAction: (action: AgentUserTimeoutBulkAction) => Promise<void>;
    saveEdits: () => Promise<void>;
    selectFilter: (nextFilter: TimeoutManagerFilter) => void;
    toggleTimeoutPause: (timeout: UserChatTimeout) => Promise<void>;
    updateEditDueAtLocalValue: (nextValue: string) => void;
    updateEditMessageValue: (nextValue: string) => void;
    updateEditParametersValue: (nextValue: string) => void;
    updateEditRecurrenceMinutesValue: (nextValue: string) => void;
};

/**
 * Polling cadence for refreshing timeout data.
 *
 * @private function of AgentTimeoutsClient
 */
const AGENT_TIMEOUT_MANAGER_POLL_INTERVAL_MS = 10_000;

/**
 * UX copy/configuration for supported timeout-manager bulk actions.
 *
 * @private function of AgentTimeoutsClient
 */
const TIMEOUT_MANAGER_BULK_ACTION_CONFIG: Record<AgentUserTimeoutBulkAction, TimeoutManagerBulkActionConfig> = {
    cancel_all_active: {
        action: 'cancel_all_active',
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
        action: 'pause_all_active',
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
        action: 'resume_all_paused',
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
 * Render-ready bulk action list consumed by the page header.
 *
 * @private function of AgentTimeoutsClient
 */
const TIMEOUT_MANAGER_BULK_ACTIONS: ReadonlyArray<TimeoutManagerBulkActionView> = createBulkActionViews();

/**
 * Creates a render-ready list of bulk action buttons.
 *
 * @private function of AgentTimeoutsClient
 */
function createBulkActionViews(): Array<TimeoutManagerBulkActionView> {
    return (
        Object.entries(TIMEOUT_MANAGER_BULK_ACTION_CONFIG) as Array<
            [AgentUserTimeoutBulkAction, TimeoutManagerBulkActionConfig]
        >
    ).map(([action, actionConfig]) => ({
        action,
        idleLabel: actionConfig.idleLabel,
        busyLabel: actionConfig.busyLabel,
        buttonClassName: actionConfig.buttonClassName,
    }));
}

/**
 * Creates the blank edit-draft state used when no timeout is selected.
 *
 * @private function of AgentTimeoutsClient
 */
function createEmptyTimeoutEditDraft(): TimeoutEditDraft {
    return {
        dueAtLocalValue: '',
        recurrenceMinutesValue: '',
        messageValue: '',
        parametersValue: '{}',
    };
}

/**
 * Prefills the edit dialog from one timeout record.
 *
 * @private function of AgentTimeoutsClient
 */
function createTimeoutEditDraft(timeout: UserChatTimeout): TimeoutEditDraft {
    return {
        dueAtLocalValue: toDateTimeLocalValue(timeout.dueAt),
        recurrenceMinutesValue: timeout.recurrenceIntervalMs
            ? String(Math.floor(timeout.recurrenceIntervalMs / 60_000))
            : '',
        messageValue: timeout.message || '',
        parametersValue: JSON.stringify(timeout.parameters || {}, null, 2),
    };
}

/**
 * Filters timeouts for the selected manager tab.
 *
 * @private function of AgentTimeoutsClient
 */
function filterTimeoutsBySelectedView(
    timeouts: ReadonlyArray<UserChatTimeout>,
    filter: TimeoutManagerFilter,
): Array<UserChatTimeout> {
    if (filter === 'all') {
        return [...timeouts];
    }

    if (filter === 'active') {
        return timeouts.filter(
            (timeout) => (timeout.status === 'QUEUED' || timeout.status === 'RUNNING') && !timeout.pausedAt,
        );
    }

    if (filter === 'paused') {
        return timeouts.filter((timeout) => timeout.status === 'QUEUED' && Boolean(timeout.pausedAt));
    }

    return timeouts.filter(
        (timeout) =>
            timeout.status === 'COMPLETED' || timeout.status === 'FAILED' || timeout.status === 'CANCELLED',
    );
}

/**
 * Normalizes errors thrown while loading the timeout manager.
 *
 * @private function of AgentTimeoutsClient
 */
function resolveTimeoutLoadErrorMessage(loadError: unknown): string {
    return loadError instanceof Error ? loadError.message : 'Failed to load agent timeouts.';
}

/**
 * Shows one timeout-manager alert dialog.
 *
 * @private function of AgentTimeoutsClient
 */
async function showTimeoutAlert(title: string, message: string): Promise<void> {
    await showAlert({ title, message }).catch(() => undefined);
}

/**
 * Shows a failed timeout action using the original fallback copy.
 *
 * @private function of AgentTimeoutsClient
 */
async function showTimeoutActionFailure(title: string, error: unknown, fallbackMessage: string): Promise<void> {
    await showTimeoutAlert(title, error instanceof Error ? error.message : fallbackMessage);
}

/**
 * Requests confirmation before one timeout cancellation.
 *
 * @private function of AgentTimeoutsClient
 */
async function confirmTimeoutCancellation(timeoutId: string): Promise<boolean> {
    return showConfirm({
        title: 'Cancel timeout',
        message: `Cancel timeout "${timeoutId}"?`,
        confirmLabel: 'Cancel timeout',
        cancelLabel: 'Back',
    }).catch(() => false);
}

/**
 * Prompts the user for a positive number of extension minutes.
 *
 * @private function of AgentTimeoutsClient
 */
async function requestTimeoutExtensionMinutes(): Promise<number | null> {
    const value = await showPrompt({
        title: 'Extend timeout',
        message: 'Add minutes to the current due time.',
        confirmLabel: 'Extend',
        cancelLabel: 'Back',
        placeholder: 'Minutes',
        inputLabel: 'Minutes',
    }).catch(() => null);

    if (value === null) {
        return null;
    }

    const minutes = Number.parseFloat(value.trim());
    if (!Number.isFinite(minutes) || minutes <= 0) {
        await showTimeoutAlert('Invalid value', 'Please enter a positive number of minutes.');
        return null;
    }

    return minutes;
}

/**
 * Requests confirmation before one bulk action.
 *
 * @private function of AgentTimeoutsClient
 */
async function confirmTimeoutBulkAction(actionConfig: TimeoutManagerBulkActionConfig): Promise<boolean> {
    return showConfirm({
        title: actionConfig.confirmTitle,
        message: actionConfig.confirmMessage,
        confirmLabel: actionConfig.confirmLabel,
        cancelLabel: 'Back',
    }).catch(() => false);
}

/**
 * Validates and converts the edit dialog state into an API payload.
 *
 * @private function of AgentTimeoutsClient
 */
async function createTimeoutEditPayload(
    editDraft: TimeoutEditDraft,
): Promise<AgentUserTimeoutUpdatePayload | null> {
    let parsedParameters: Record<string, unknown>;
    try {
        parsedParameters = parseTimeoutEditParameters(editDraft.parametersValue);
    } catch (error) {
        await showTimeoutActionFailure('Invalid parameters JSON', error, 'Failed to parse parameters JSON.');
        return null;
    }

    let recurrenceIntervalMs: number | null;
    try {
        recurrenceIntervalMs = parseTimeoutEditRecurrenceIntervalMs(editDraft.recurrenceMinutesValue);
    } catch (error) {
        await showTimeoutActionFailure(
            'Invalid recurrence',
            error,
            'Recurrence must be a positive number of minutes or empty.',
        );
        return null;
    }

    const dueAt = fromDateTimeLocalValue(editDraft.dueAtLocalValue);
    if (!dueAt) {
        await showTimeoutAlert('Invalid date', 'Next run must be a valid date and time.');
        return null;
    }

    const trimmedMessage = editDraft.messageValue.trim();

    return {
        dueAt,
        recurrenceIntervalMs,
        message: trimmedMessage ? trimmedMessage : null,
        parameters: parsedParameters,
    };
}

/**
 * Parses the JSON parameters field and guarantees an object result.
 *
 * @private function of AgentTimeoutsClient
 */
function parseTimeoutEditParameters(parametersValue: string): Record<string, unknown> {
    const parsedJson = JSON.parse(parametersValue || '{}') as unknown;
    if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
        throw new Error('Parameters JSON must be an object.');
    }

    return parsedJson as Record<string, unknown>;
}

/**
 * Parses the optional recurrence field into milliseconds.
 *
 * @private function of AgentTimeoutsClient
 */
function parseTimeoutEditRecurrenceIntervalMs(recurrenceMinutesValue: string): number | null {
    const trimmedRecurrence = recurrenceMinutesValue.trim();
    if (!trimmedRecurrence) {
        return null;
    }

    const recurrenceMinutes = Number.parseFloat(trimmedRecurrence);
    if (!Number.isFinite(recurrenceMinutes) || recurrenceMinutes <= 0) {
        throw new Error('Recurrence must be a positive number of minutes or empty.');
    }

    return Math.floor(recurrenceMinutes * 60_000);
}

/**
 * Converts an ISO date into a `datetime-local` compatible value.
 *
 * @private function of AgentTimeoutsClient
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
 *
 * @private function of AgentTimeoutsClient
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
 * Manages timeout-manager polling, mutations, filters, and edit-dialog state.
 *
 * @private function of AgentTimeoutsClient
 */
export function useAgentTimeoutsClientState({
    agentName,
}: UseAgentTimeoutsClientStateProps): UseAgentTimeoutsClientStateResult {
    const [timeouts, setTimeouts] = useState<Array<UserChatTimeout>>([]);
    const [counters, setCounters] = useState<AgentUserTimeoutCounters | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState<TimeoutManagerFilter>('active');
    const [editingTimeout, setEditingTimeout] = useState<UserChatTimeout | null>(null);
    const [busyTimeoutId, setBusyTimeoutId] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<TimeoutManagerActionKind | null>(null);
    const [busyBulkAction, setBusyBulkAction] = useState<AgentUserTimeoutBulkAction | null>(null);
    const [editDraft, setEditDraft] = useState<TimeoutEditDraft>(createEmptyTimeoutEditDraft);

    /**
     * Loads current agent-scoped timeout data.
     *
     * @private function of AgentTimeoutsClient
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
                setErrorMessage(resolveTimeoutLoadErrorMessage(error));
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
     * Runs one timeout mutation while keeping the busy state and local refresh consistent.
     *
     * @private function of AgentTimeoutsClient
     */
    const runBusyTimeoutAction = useCallback(
        async (timeout: UserChatTimeout, action: TimeoutManagerActionKind, worker: () => Promise<void>) => {
            try {
                setBusyTimeoutId(timeout.timeoutId);
                setBusyAction(action);
                await worker();
                await refreshTimeouts(false);
            } finally {
                setBusyTimeoutId(null);
                setBusyAction(null);
            }
        },
        [refreshTimeouts],
    );

    /**
     * Applies one timeout patch and refreshes the manager data.
     *
     * @private function of AgentTimeoutsClient
     */
    const applyTimeoutPatch = useCallback(
        async (timeout: UserChatTimeout, payload: AgentUserTimeoutUpdatePayload, action: TimeoutManagerActionKind) => {
            await runBusyTimeoutAction(timeout, action, async () => {
                await updateAgentUserTimeout(agentName, timeout.timeoutId, payload);
            });
        },
        [agentName, runBusyTimeoutAction],
    );

    /**
     * Opens the advanced timeout edit dialog with prefilled values.
     *
     * @private function of AgentTimeoutsClient
     */
    const openEditDialog = useCallback((timeout: UserChatTimeout) => {
        setEditingTimeout(timeout);
        setEditDraft(createTimeoutEditDraft(timeout));
    }, []);

    /**
     * Closes the edit dialog and resets its local form state.
     *
     * @private function of AgentTimeoutsClient
     */
    const closeEditDialog = useCallback(() => {
        setEditingTimeout(null);
        setEditDraft(createEmptyTimeoutEditDraft());
    }, []);
    const hasEditDraftUnsavedChanges = useMemo(() => {
        if (!editingTimeout) {
            return false;
        }

        const initialEditDraft = createTimeoutEditDraft(editingTimeout);

        return (
            editDraft.dueAtLocalValue !== initialEditDraft.dueAtLocalValue ||
            editDraft.recurrenceMinutesValue !== initialEditDraft.recurrenceMinutesValue ||
            editDraft.messageValue !== initialEditDraft.messageValue ||
            editDraft.parametersValue !== initialEditDraft.parametersValue
        );
    }, [editDraft, editingTimeout]);
    const { requestClose: requestCloseEditDialog } = useDirtyModalGuard({
        hasUnsavedChanges: hasEditDraftUnsavedChanges,
        isCloseBlocked: busyAction === 'save' && busyTimeoutId === editingTimeout?.timeoutId,
        onClose: closeEditDialog,
    });

    /**
     * Updates the selected manager filter.
     *
     * @private function of AgentTimeoutsClient
     */
    const selectFilter = useCallback((nextFilter: TimeoutManagerFilter) => {
        setFilter(nextFilter);
    }, []);

    /**
     * Forces an immediate manager refresh from the header button.
     *
     * @private function of AgentTimeoutsClient
     */
    const refreshNow = useCallback(async () => {
        await refreshTimeouts(true);
    }, [refreshTimeouts]);

    /**
     * Cancels one timeout after confirmation.
     *
     * @private function of AgentTimeoutsClient
     */
    const cancelTimeout = useCallback(
        async (timeout: UserChatTimeout) => {
            const isConfirmed = await confirmTimeoutCancellation(timeout.timeoutId);
            if (!isConfirmed) {
                return;
            }

            try {
                await runBusyTimeoutAction(timeout, 'cancel', async () => {
                    await cancelAgentUserTimeout(agentName, timeout.timeoutId);
                });
            } catch (error) {
                await showTimeoutActionFailure('Cancellation failed', error, 'Failed to cancel timeout.');
            }
        },
        [agentName, runBusyTimeoutAction],
    );

    /**
     * Toggles one queued timeout between paused and active states.
     *
     * @private function of AgentTimeoutsClient
     */
    const toggleTimeoutPause = useCallback(
        async (timeout: UserChatTimeout) => {
            const isPaused = timeout.status === 'QUEUED' && Boolean(timeout.pausedAt);

            await applyTimeoutPatch(timeout, { paused: !isPaused }, isPaused ? 'resume' : 'pause');
        },
        [applyTimeoutPatch],
    );

    /**
     * Prompts for and applies a quick timeout extension.
     *
     * @private function of AgentTimeoutsClient
     */
    const extendTimeout = useCallback(
        async (timeout: UserChatTimeout) => {
            const minutes = await requestTimeoutExtensionMinutes();
            if (minutes === null) {
                return;
            }

            try {
                await applyTimeoutPatch(timeout, { extendByMs: Math.floor(minutes * 60_000) }, 'extend');
            } catch (error) {
                await showTimeoutActionFailure('Extension failed', error, 'Failed to extend timeout.');
            }
        },
        [applyTimeoutPatch],
    );

    /**
     * Executes one bulk timeout action and refreshes manager data.
     *
     * @private function of AgentTimeoutsClient
     */
    const runBulkAction = useCallback(
        async (action: AgentUserTimeoutBulkAction) => {
            const actionConfig = TIMEOUT_MANAGER_BULK_ACTION_CONFIG[action];
            const isConfirmed = await confirmTimeoutBulkAction(actionConfig);
            if (!isConfirmed) {
                return;
            }

            try {
                setBusyBulkAction(action);
                await runAgentUserTimeoutBulkAction(agentName, action);
                await refreshTimeouts(false);
            } catch (error) {
                await showTimeoutActionFailure(
                    actionConfig.errorTitle,
                    error,
                    'Failed to run timeout bulk action.',
                );
            } finally {
                setBusyBulkAction(null);
            }
        },
        [agentName, refreshTimeouts],
    );

    /**
     * Updates the next-run field in the edit dialog.
     *
     * @private function of AgentTimeoutsClient
     */
    const updateEditDueAtLocalValue = useCallback((nextValue: string) => {
        setEditDraft((currentDraft) => ({ ...currentDraft, dueAtLocalValue: nextValue }));
    }, []);

    /**
     * Updates the recurrence field in the edit dialog.
     *
     * @private function of AgentTimeoutsClient
     */
    const updateEditRecurrenceMinutesValue = useCallback((nextValue: string) => {
        setEditDraft((currentDraft) => ({ ...currentDraft, recurrenceMinutesValue: nextValue }));
    }, []);

    /**
     * Updates the wake-up message field in the edit dialog.
     *
     * @private function of AgentTimeoutsClient
     */
    const updateEditMessageValue = useCallback((nextValue: string) => {
        setEditDraft((currentDraft) => ({ ...currentDraft, messageValue: nextValue }));
    }, []);

    /**
     * Updates the JSON parameters field in the edit dialog.
     *
     * @private function of AgentTimeoutsClient
     */
    const updateEditParametersValue = useCallback((nextValue: string) => {
        setEditDraft((currentDraft) => ({ ...currentDraft, parametersValue: nextValue }));
    }, []);

    /**
     * Saves edits from the timeout dialog.
     *
     * @private function of AgentTimeoutsClient
     */
    const saveEdits = useCallback(async () => {
        if (!editingTimeout) {
            return;
        }

        const payload = await createTimeoutEditPayload(editDraft);
        if (!payload) {
            return;
        }

        try {
            await applyTimeoutPatch(editingTimeout, payload, 'save');
            closeEditDialog();
        } catch (error) {
            await showTimeoutActionFailure('Update failed', error, 'Failed to save timeout edits.');
        }
    }, [applyTimeoutPatch, closeEditDialog, editDraft, editingTimeout]);

    const filteredTimeouts = useMemo(() => filterTimeoutsBySelectedView(timeouts, filter), [filter, timeouts]);

    return {
        bulkActions: TIMEOUT_MANAGER_BULK_ACTIONS,
        busyAction,
        busyBulkAction,
        busyTimeoutId,
        counters,
        closeEditDialog,
        requestCloseEditDialog,
        editDraft,
        editingTimeout,
        errorMessage,
        filter,
        filteredTimeouts,
        generatedAt,
        isLoading,
        isRefreshing,
        cancelTimeout,
        extendTimeout,
        openEditDialog,
        refreshNow,
        runBulkAction,
        saveEdits,
        selectFilter,
        toggleTimeoutPause,
        updateEditDueAtLocalValue,
        updateEditMessageValue,
        updateEditParametersValue,
        updateEditRecurrenceMinutesValue,
    };
}
