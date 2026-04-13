import type { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import type { BookEditorHistoryVersionItem } from './BookEditorHistoryPanel';
import { resolveBookEditorApiErrorMessage } from './resolveBookEditorApiErrorMessage';

/**
 * Input consumed by `useBookEditorHistory`.
 *
 * @private function of useBookEditorWrapper
 */
type UseBookEditorHistoryProps = {
    /**
     * Agent route identifier used by history-related APIs.
     */
    readonly agentName: string;
    /**
     * Whether one save request is currently in flight.
     */
    readonly isSaveInFlight: boolean;
    /**
     * Whether one debounced save is still waiting to be sent.
     */
    readonly isSaveDebounced: boolean;
    /**
     * Latest locally known source version number.
     */
    readonly currentSourceVersion: number;
    /**
     * Latest source version confirmed by the server.
     */
    readonly lastConfirmedSourceVersion: number;
    /**
     * Monotonic counter incremented after every successful save.
     */
    readonly successfulSaveSequence: number;
    /**
     * Saves the current editor content as a named version.
     */
    readonly saveCurrentSourceAsNamedVersion: (versionName: string) => void;
    /**
     * Cancels queued autosave work before restoring history.
     */
    readonly cancelPendingSave: () => void;
    /**
     * Replaces the editor content with a restored source snapshot.
     */
    readonly replaceWithRestoredSource: (restoredSource: string_book) => void;
    /**
     * Refreshes unresolved-reference diagnostics for a specific source snapshot.
     */
    readonly requestDiagnostics: (
        sourceToInspect: string_book,
        options?: { readonly forceRefresh?: boolean },
    ) => Promise<void>;
};

/**
 * One book snapshot item returned by the history API.
 *
 * @private function of useBookEditorWrapper
 */
type AgentHistoryEntry = {
    id: number;
    createdAt: string;
    agentName: string;
    agentHash: string;
    previousAgentHash: string | null;
    agentSource: string_book;
    promptbookEngineVersion: string;
    versionName?: string | null;
};

/**
 * API response returned by `/api/book/history`.
 *
 * @private function of useBookEditorWrapper
 */
type AgentHistoryResponse = {
    history?: Array<AgentHistoryEntry>;
};

/**
 * API response returned when restoring one history snapshot.
 *
 * @private function of useBookEditorWrapper
 */
type RestoreAgentHistoryResponse = {
    isSuccessful?: boolean;
    agentSource?: string_book;
    message?: string;
    error?: string;
};

/**
 * Input consumed by `useBookHistoryLoadingState`.
 *
 * @private function of useBookEditorHistory
 */
type UseBookHistoryLoadingStateProps = {
    /**
     * Agent route identifier used by history-related APIs.
     */
    readonly agentName: string;
    /**
     * Whether the history side panel is currently open.
     */
    readonly isHistoryOpen: boolean;
    /**
     * Monotonic counter incremented after every successful save.
     */
    readonly successfulSaveSequence: number;
};

/**
 * State and actions returned by `useBookHistoryLoadingState`.
 *
 * @private function of useBookEditorHistory
 */
type UseBookHistoryLoadingStateResult = {
    /**
     * Whether history entries are currently loading.
     */
    readonly isHistoryLoading: boolean;
    /**
     * Raw history entries returned by the API.
     */
    readonly historyEntries: Array<AgentHistoryEntry>;
    /**
     * History-load error message shown in the panel.
     */
    readonly historyErrorMessage: string | null;
    /**
     * Currently selected history identifier.
     */
    readonly selectedHistoryId: number | null;
    /**
     * Selects one history item by identifier.
     */
    readonly selectHistoryId: (historyId: number | null) => void;
    /**
     * Triggers a manual history refresh.
     */
    readonly refreshHistory: () => void;
};

/**
 * Input consumed by `useSaveNamedVersionAction`.
 *
 * @private function of useBookEditorHistory
 */
type UseSaveNamedVersionActionProps = {
    /**
     * Whether a restore operation is currently running.
     */
    readonly isRestoringHistoryVersion: boolean;
    /**
     * Saves the current source as an explicitly named history version.
     */
    readonly saveCurrentSourceAsNamedVersion: (versionName: string) => void;
};

/**
 * Input consumed by `useRestoreHistoryVersionAction`.
 *
 * @private function of useBookEditorHistory
 */
type UseRestoreHistoryVersionActionProps = {
    /**
     * Agent route identifier used by history-related APIs.
     */
    readonly agentName: string;
    /**
     * Whether one save request is currently in flight.
     */
    readonly isSaveInFlight: boolean;
    /**
     * Whether one debounced save is still waiting to be sent.
     */
    readonly isSaveDebounced: boolean;
    /**
     * Latest locally known source version number.
     */
    readonly currentSourceVersion: number;
    /**
     * Latest source version confirmed by the server.
     */
    readonly lastConfirmedSourceVersion: number;
    /**
     * Cancels queued autosave work before restoring history.
     */
    readonly cancelPendingSave: () => void;
    /**
     * Replaces the editor content with a restored source snapshot.
     */
    readonly replaceWithRestoredSource: (restoredSource: string_book) => void;
    /**
     * Refreshes unresolved-reference diagnostics for a specific source snapshot.
     */
    readonly requestDiagnostics: (
        sourceToInspect: string_book,
        options?: { readonly forceRefresh?: boolean },
    ) => Promise<void>;
    /**
     * Triggers a manual history refresh.
     */
    readonly refreshHistory: () => void;
    /**
     * Selects the history version that has just been restored.
     */
    readonly selectHistoryId: (historyId: number | null) => void;
};

/**
 * Input consumed by `useCloseHistoryPanelOnEscape`.
 *
 * @private function of useBookEditorHistory
 */
type UseCloseHistoryPanelOnEscapeProps = {
    /**
     * Whether the history side panel is currently open.
     */
    readonly isHistoryOpen: boolean;
    /**
     * Closes the history side panel.
     */
    readonly closeHistoryPanel: () => void;
};

/**
 * Input consumed by `useSyncSelectedHistoryVersion`.
 *
 * @private function of useBookEditorHistory
 */
type UseSyncSelectedHistoryVersionProps = {
    /**
     * Filtered history items currently visible in the panel.
     */
    readonly filteredHistoryVersions: ReadonlyArray<BookEditorHistoryVersionItem>;
    /**
     * Currently selected history identifier.
     */
    readonly selectedHistoryId: number | null;
    /**
     * Selects one history item by identifier.
     */
    readonly selectHistoryId: (historyId: number | null) => void;
};

/**
 * Normalizes the history payload shape returned by the history API.
 *
 * @param payload - Raw history payload.
 * @returns Always-array history payload.
 * @private function of useBookEditorWrapper
 */
function normalizeHistoryPayload(payload: AgentHistoryResponse): Array<AgentHistoryEntry> {
    return Array.isArray(payload.history) ? payload.history : [];
}

/**
 * Normalizes optional history version name.
 *
 * @param versionName - Raw value from API/user input.
 * @returns Trimmed non-empty version name, otherwise `null`.
 * @private function of useBookEditorWrapper
 */
function normalizeHistoryVersionName(versionName: string | null | undefined): string | null {
    if (typeof versionName !== 'string') {
        return null;
    }

    const normalizedVersionName = versionName.trim();
    return normalizedVersionName.length > 0 ? normalizedVersionName : null;
}

/**
 * Builds the API path used by the history load and restore requests.
 *
 * @param agentName - Agent route identifier.
 * @returns History API path for the current agent.
 * @private function of useBookEditorHistory
 */
function createBookHistoryApiPath(agentName: string): string {
    return `/agents/${encodeURIComponent(agentName)}/api/book/history`;
}

/**
 * Resolves whether an error came from an aborted fetch request.
 *
 * @param error - Unknown thrown value.
 * @returns `true` when the error is an abort error.
 * @private function of useBookEditorHistory
 */
function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

/**
 * Normalizes a thrown value into a panel-friendly error message.
 *
 * @param error - Unknown thrown value.
 * @param fallbackMessage - Message used when the thrown value is not an `Error`.
 * @returns Human-readable error message.
 * @private function of useBookEditorHistory
 */
function resolveHistoryOperationErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Keeps the preferred selection when still available and otherwise falls back to the first item.
 *
 * @param historyItems - Available history-like items with numeric identifiers.
 * @param preferredHistoryId - Current preferred selection.
 * @returns Stable selected history id or `null` when no items are available.
 * @private function of useBookEditorHistory
 */
function resolveSelectedHistoryId<HistoryItem extends { readonly id: number }>(
    historyItems: ReadonlyArray<HistoryItem>,
    preferredHistoryId: number | null,
): number | null {
    if (historyItems.length === 0) {
        return null;
    }

    if (preferredHistoryId && historyItems.some((historyItem) => historyItem.id === preferredHistoryId)) {
        return preferredHistoryId;
    }

    return historyItems[0]!.id;
}

/**
 * Converts raw history entries into UI-ready version items with explicit version labels.
 *
 * @param historyEntries - Snapshots returned by history API ordered from newest to oldest.
 * @returns Version items consumed by history panel.
 * @private function of useBookEditorWrapper
 */
function buildHistoryVersionItems(
    historyEntries: ReadonlyArray<AgentHistoryEntry>,
): Array<BookEditorHistoryVersionItem> {
    const totalVersions = historyEntries.length;

    return historyEntries.map((entry, index) => ({
        id: entry.id,
        versionName: normalizeHistoryVersionName(entry.versionName),
        versionLabel: `Version ${totalVersions - index}`,
        createdAtLabel: new Date(entry.createdAt).toLocaleString(),
        hash: entry.agentHash,
        hashPreview: entry.agentHash.slice(0, 8),
        source: entry.agentSource,
    }));
}

/**
 * Filters history items by optional "named only" and case-insensitive name query.
 *
 * @param versions - Version items ready for rendering.
 * @param options - Optional named/search filters.
 * @returns Filtered version items preserving original order.
 * @private function of useBookEditorWrapper
 */
function filterHistoryVersionItems(
    versions: ReadonlyArray<BookEditorHistoryVersionItem>,
    options: {
        readonly namedOnly: boolean;
        readonly nameQuery: string;
    },
): Array<BookEditorHistoryVersionItem> {
    const normalizedNameQuery = options.nameQuery.trim().toLowerCase();

    return versions.filter((version) => {
        if (options.namedOnly && !version.versionName) {
            return false;
        }

        if (normalizedNameQuery.length === 0) {
            return true;
        }

        const normalizedVersionName = (version.versionName || '').toLowerCase();
        return normalizedVersionName.includes(normalizedNameQuery);
    });
}

/**
 * Resolves whether restoring history would discard unsaved local edits.
 *
 * @param options - Save-state values needed for the restore decision.
 * @returns `true` when restoring would overwrite unsaved local state.
 * @private function of useBookEditorHistory
 */
function hasUnsavedLocalChangesBeforeRestore(options: {
    readonly isSaveDebounced: boolean;
    readonly isSaveInFlight: boolean;
    readonly currentSourceVersion: number;
    readonly lastConfirmedSourceVersion: number;
}): boolean {
    return (
        options.isSaveDebounced ||
        options.isSaveInFlight ||
        options.currentSourceVersion !== options.lastConfirmedSourceVersion
    );
}

/**
 * Resolves the confirmation message shown before restoring a selected version.
 *
 * @param isUnsavedLocalChanges - Whether local edits are not fully saved yet.
 * @returns Restore confirmation message.
 * @private function of useBookEditorHistory
 */
function resolveRestoreHistoryConfirmationMessage(isUnsavedLocalChanges: boolean): string {
    return isUnsavedLocalChanges
        ? 'Current local edits are not fully saved yet. Restoring will discard them. Continue?'
        : 'Restore this version? The current source will be saved into history automatically.';
}

/**
 * Loads history entries for the current agent from the API.
 *
 * @param agentName - Agent route identifier.
 * @param signal - Abort signal for the current request.
 * @returns Normalized history entries.
 * @private function of useBookEditorHistory
 */
async function fetchBookHistoryEntries(agentName: string, signal: AbortSignal): Promise<Array<AgentHistoryEntry>> {
    const response = await fetch(createBookHistoryApiPath(agentName), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(await resolveBookEditorApiErrorMessage(response, 'Failed to load history'));
    }

    const payload = (await response.json()) as AgentHistoryResponse;
    return normalizeHistoryPayload(payload);
}

/**
 * Restores one history snapshot and returns the restored source.
 *
 * @param agentName - Agent route identifier.
 * @param historyId - Identifier of the snapshot to restore.
 * @returns Restored source returned by the history API.
 * @private function of useBookEditorHistory
 */
async function fetchRestoredHistorySource(agentName: string, historyId: number): Promise<string_book> {
    const response = await fetch(createBookHistoryApiPath(agentName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
    });

    if (!response.ok) {
        throw new Error(await resolveBookEditorApiErrorMessage(response, 'Failed to restore version'));
    }

    const payload = (await response.json()) as RestoreAgentHistoryResponse;
    if (typeof payload.agentSource !== 'string') {
        throw new Error('History restore endpoint returned an invalid source payload.');
    }

    return payload.agentSource as string_book;
}

/**
 * Prompts the user for a named-version label and validates it.
 *
 * @returns Normalized version name or `null` when the action is cancelled or invalid.
 * @private function of useBookEditorHistory
 */
async function promptForNamedHistoryVersionName(): Promise<string | null> {
    const promptValue = await showPrompt({
        title: 'Save named version',
        message: 'Name this snapshot so you can quickly find it in history later.',
        confirmLabel: 'Save version',
        cancelLabel: 'Cancel',
        placeholder: 'For example: Baseline prompt before TEAM refactor',
        inputLabel: 'Version name',
    }).catch(() => null);

    if (promptValue === null) {
        return null;
    }

    const versionName = normalizeHistoryVersionName(promptValue);
    if (versionName) {
        return versionName;
    }

    await showAlert({
        title: 'Version name required',
        message: 'Enter a non-empty name to save a named version.',
    });

    return null;
}

/**
 * Asks the user to confirm restoring one selected history version.
 *
 * @param isUnsavedLocalChanges - Whether the restore would discard unsaved edits.
 * @returns `true` when the restore is confirmed.
 * @private function of useBookEditorHistory
 */
async function confirmHistoryRestore(isUnsavedLocalChanges: boolean): Promise<boolean> {
    return showConfirm({
        title: 'Restore version',
        message: resolveRestoreHistoryConfirmationMessage(isUnsavedLocalChanges),
        confirmLabel: 'Restore version',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Explains why restore is temporarily blocked while a save request is in flight.
 *
 * @returns Promise resolved after the alert closes.
 * @private function of useBookEditorHistory
 */
async function showHistoryRestoreBlockedBySavingAlert(): Promise<void> {
    await showAlert({
        title: 'Saving in progress',
        message: 'Wait until the current save finishes, then try restoring this version again.',
    });
}

/**
 * Loads history entries, keeps the current selection stable, and exposes refresh actions.
 *
 * @private function of useBookEditorHistory
 */
function useBookHistoryLoadingState({
    agentName,
    isHistoryOpen,
    successfulSaveSequence,
}: UseBookHistoryLoadingStateProps): UseBookHistoryLoadingStateResult {
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<Array<AgentHistoryEntry>>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
    const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);

    /**
     * Abort controller for the most recent history request.
     *
     * @private function of useBookEditorHistory
     */
    const historyAbortControllerRef = useRef<AbortController | null>(null);

    /**
     * Loads the complete version history for the current agent.
     *
     * @private function of useBookEditorHistory
     */
    const requestHistory = useCallback(async () => {
        historyAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        historyAbortControllerRef.current = abortController;

        setIsHistoryLoading(true);
        setHistoryErrorMessage(null);

        try {
            const normalizedHistory = await fetchBookHistoryEntries(agentName, abortController.signal);
            setHistoryEntries(normalizedHistory);
            setSelectedHistoryId((currentHistoryId) => resolveSelectedHistoryId(normalizedHistory, currentHistoryId));
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }

            console.error('Failed to load book history:', error);
            setHistoryErrorMessage(resolveHistoryOperationErrorMessage(error, 'Failed to load book history.'));
        } finally {
            if (historyAbortControllerRef.current === abortController) {
                historyAbortControllerRef.current = null;
            }
            setIsHistoryLoading(false);
        }
    }, [agentName]);

    /**
     * Triggers one manual history refresh.
     *
     * @private function of useBookEditorHistory
     */
    const refreshHistory = useCallback(() => {
        setHistoryRefreshVersion((previousVersion) => previousVersion + 1);
    }, []);

    /**
     * Updates the selected history identifier.
     *
     * @param historyId - History identifier to select.
     * @private function of useBookEditorHistory
     */
    const selectHistoryId = useCallback((historyId: number | null) => {
        setSelectedHistoryId(historyId);
    }, []);

    useEffect(() => {
        if (!isHistoryOpen) {
            return;
        }

        void requestHistory();
    }, [historyRefreshVersion, isHistoryOpen, requestHistory, successfulSaveSequence]);

    /**
     * Cleans up in-flight history requests on unmount.
     */
    useEffect(() => {
        return () => {
            historyAbortControllerRef.current?.abort();
        };
    }, []);

    return {
        isHistoryLoading,
        historyEntries,
        historyErrorMessage,
        selectedHistoryId,
        selectHistoryId,
        refreshHistory,
    };
}

/**
 * Prompts for a named version and saves it when the input is valid.
 *
 * @private function of useBookEditorHistory
 */
function useSaveNamedVersionAction({
    isRestoringHistoryVersion,
    saveCurrentSourceAsNamedVersion,
}: UseSaveNamedVersionActionProps) {
    return useCallback(async () => {
        if (isRestoringHistoryVersion) {
            return;
        }

        const versionName = await promptForNamedHistoryVersionName();
        if (!versionName) {
            return;
        }

        saveCurrentSourceAsNamedVersion(versionName);
    }, [isRestoringHistoryVersion, saveCurrentSourceAsNamedVersion]);
}

/**
 * Restores one selected history version and coordinates the follow-up UI updates.
 *
 * @private function of useBookEditorHistory
 */
function useRestoreHistoryVersionAction({
    agentName,
    isSaveInFlight,
    isSaveDebounced,
    currentSourceVersion,
    lastConfirmedSourceVersion,
    cancelPendingSave,
    replaceWithRestoredSource,
    requestDiagnostics,
    refreshHistory,
    selectHistoryId,
}: UseRestoreHistoryVersionActionProps) {
    const [isRestoringHistoryVersion, setIsRestoringHistoryVersion] = useState(false);

    /**
     * Restores one selected history snapshot and updates local editor state.
     *
     * @param historyId - Identifier of the snapshot to restore.
     * @private function of useBookEditorHistory
     */
    const restoreHistoryVersion = useCallback(
        async (historyId: number) => {
            if (isSaveInFlight) {
                await showHistoryRestoreBlockedBySavingAlert();
                return;
            }

            const isRestoreConfirmed = await confirmHistoryRestore(
                hasUnsavedLocalChangesBeforeRestore({
                    isSaveDebounced,
                    isSaveInFlight,
                    currentSourceVersion,
                    lastConfirmedSourceVersion,
                }),
            );

            if (!isRestoreConfirmed) {
                return;
            }

            setIsRestoringHistoryVersion(true);

            try {
                cancelPendingSave();

                const restoredSource = await fetchRestoredHistorySource(agentName, historyId);
                replaceWithRestoredSource(restoredSource);
                await requestDiagnostics(restoredSource, { forceRefresh: true });
                refreshHistory();
                selectHistoryId(historyId);
            } catch (error) {
                console.error('Failed to restore book history version:', error);
                await showAlert({
                    title: 'Restore failed',
                    message: resolveHistoryOperationErrorMessage(error, 'Failed to restore selected version.'),
                });
            } finally {
                setIsRestoringHistoryVersion(false);
            }
        },
        [
            agentName,
            cancelPendingSave,
            currentSourceVersion,
            isSaveDebounced,
            isSaveInFlight,
            lastConfirmedSourceVersion,
            refreshHistory,
            replaceWithRestoredSource,
            requestDiagnostics,
            selectHistoryId,
        ],
    );

    return {
        isRestoringHistoryVersion,
        restoreHistoryVersion,
    };
}

/**
 * Supports ESC key closing for the history side panel.
 *
 * @private function of useBookEditorHistory
 */
function useCloseHistoryPanelOnEscape({
    isHistoryOpen,
    closeHistoryPanel,
}: UseCloseHistoryPanelOnEscapeProps): void {
    useEffect(() => {
        if (!isHistoryOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeHistoryPanel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeHistoryPanel, isHistoryOpen]);
}

/**
 * Keeps the selected history row valid after list filtering changes.
 *
 * @private function of useBookEditorHistory
 */
function useSyncSelectedHistoryVersion({
    filteredHistoryVersions,
    selectedHistoryId,
    selectHistoryId,
}: UseSyncSelectedHistoryVersionProps): void {
    useEffect(() => {
        const nextSelectedHistoryId = resolveSelectedHistoryId(filteredHistoryVersions, selectedHistoryId);
        if (nextSelectedHistoryId !== selectedHistoryId) {
            selectHistoryId(nextSelectedHistoryId);
        }
    }, [filteredHistoryVersions, selectHistoryId, selectedHistoryId]);
}

/**
 * Manages Book history loading, filtering, named saves, and version restoration.
 *
 * @private function of useBookEditorWrapper
 */
export function useBookEditorHistory({
    agentName,
    isSaveInFlight,
    isSaveDebounced,
    currentSourceVersion,
    lastConfirmedSourceVersion,
    successfulSaveSequence,
    saveCurrentSourceAsNamedVersion,
    cancelPendingSave,
    replaceWithRestoredSource,
    requestDiagnostics,
}: UseBookEditorHistoryProps) {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyNameQuery, setHistoryNameQuery] = useState('');
    const [isNamedHistoryOnly, setIsNamedHistoryOnly] = useState(false);

    /**
     * Closes the history side panel.
     *
     * @private function of useBookEditorHistory
     */
    const closeHistoryPanel = useCallback(() => {
        setIsHistoryOpen(false);
    }, []);

    /**
     * Toggles the visibility of the history side panel.
     *
     * @private function of useBookEditorHistory
     */
    const toggleHistoryPanel = useCallback(() => {
        setIsHistoryOpen((isCurrentlyOpen) => !isCurrentlyOpen);
    }, []);

    const {
        isHistoryLoading,
        historyEntries,
        historyErrorMessage,
        selectedHistoryId,
        selectHistoryId,
        refreshHistory,
    } = useBookHistoryLoadingState({
        agentName,
        isHistoryOpen,
        successfulSaveSequence,
    });

    /**
     * History entries normalized into the list/detail view model used by the panel.
     *
     * @private function of useBookEditorHistory
     */
    const historyVersions = useMemo(() => buildHistoryVersionItems(historyEntries), [historyEntries]);

    /**
     * Filtered history items matching the current panel controls.
     *
     * @private function of useBookEditorHistory
     */
    const filteredHistoryVersions = useMemo(
        () =>
            filterHistoryVersionItems(historyVersions, {
                namedOnly: isNamedHistoryOnly,
                nameQuery: historyNameQuery,
            }),
        [historyNameQuery, historyVersions, isNamedHistoryOnly],
    );

    const { isRestoringHistoryVersion, restoreHistoryVersion } = useRestoreHistoryVersionAction({
        agentName,
        isSaveInFlight,
        isSaveDebounced,
        currentSourceVersion,
        lastConfirmedSourceVersion,
        cancelPendingSave,
        replaceWithRestoredSource,
        requestDiagnostics,
        refreshHistory,
        selectHistoryId,
    });
    const saveNamedVersion = useSaveNamedVersionAction({
        isRestoringHistoryVersion,
        saveCurrentSourceAsNamedVersion,
    });

    useCloseHistoryPanelOnEscape({
        isHistoryOpen,
        closeHistoryPanel,
    });
    useSyncSelectedHistoryVersion({
        filteredHistoryVersions,
        selectedHistoryId,
        selectHistoryId,
    });

    const isHistoryActionBlocked = isRestoringHistoryVersion || isSaveInFlight;

    /**
     * Runs the named-version save flow from the history panel.
     *
     * @private function of useBookEditorHistory
     */
    const handleSaveNamedVersion = useCallback(() => {
        void saveNamedVersion();
    }, [saveNamedVersion]);

    /**
     * Runs the restore flow for one selected history version.
     *
     * @param historyId - Identifier of the snapshot to restore.
     * @private function of useBookEditorHistory
     */
    const handleRestoreHistoryVersion = useCallback(
        (historyId: number) => {
            void restoreHistoryVersion(historyId);
        },
        [restoreHistoryVersion],
    );

    return {
        isHistoryOpen,
        historyVersionCount: historyVersions.length,
        toggleHistoryPanel,
        historyPanelProps: {
            isOpen: isHistoryOpen,
            isLoading: isHistoryLoading,
            errorMessage: historyErrorMessage,
            versions: filteredHistoryVersions,
            selectedVersionId: selectedHistoryId,
            isRestoring: isHistoryActionBlocked,
            isNamedOnly: isNamedHistoryOnly,
            nameQuery: historyNameQuery,
            onNamedOnlyChange: setIsNamedHistoryOnly,
            onNameQueryChange: setHistoryNameQuery,
            onClose: closeHistoryPanel,
            onRefresh: refreshHistory,
            onSaveNamedVersion: handleSaveNamedVersion,
            isSaveNamedVersionDisabled: isHistoryActionBlocked,
            onSelectVersion: selectHistoryId,
            onRestoreVersion: handleRestoreHistoryVersion,
        },
    };
}
