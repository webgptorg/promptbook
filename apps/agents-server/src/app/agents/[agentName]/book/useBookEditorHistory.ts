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
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<Array<AgentHistoryEntry>>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
    const [isRestoringHistoryVersion, setIsRestoringHistoryVersion] = useState(false);
    const [historyNameQuery, setHistoryNameQuery] = useState('');
    const [isNamedHistoryOnly, setIsNamedHistoryOnly] = useState(false);
    const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);

    /**
     * Abort controller for the most recent history request.
     *
     * @private function of useBookEditorWrapper
     */
    const historyAbortControllerRef = useRef<AbortController | null>(null);

    /**
     * Loads the complete version history for the current agent.
     *
     * @private function of useBookEditorWrapper
     */
    const requestHistory = useCallback(async () => {
        historyAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        historyAbortControllerRef.current = abortController;

        setIsHistoryLoading(true);
        setHistoryErrorMessage(null);

        try {
            const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book/history`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: abortController.signal,
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error(await resolveBookEditorApiErrorMessage(response, 'Failed to load history'));
            }

            const payload = (await response.json()) as AgentHistoryResponse;
            const normalizedHistory = normalizeHistoryPayload(payload);
            setHistoryEntries(normalizedHistory);
            setSelectedHistoryId((currentHistoryId) => {
                if (normalizedHistory.length === 0) {
                    return null;
                }

                if (currentHistoryId && normalizedHistory.some((item) => item.id === currentHistoryId)) {
                    return currentHistoryId;
                }

                return normalizedHistory[0]!.id;
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            console.error('Failed to load book history:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load book history.';
            setHistoryErrorMessage(errorMessage);
        } finally {
            if (historyAbortControllerRef.current === abortController) {
                historyAbortControllerRef.current = null;
            }
            setIsHistoryLoading(false);
        }
    }, [agentName]);

    /**
     * Prompts for a version name and saves the current source as a named snapshot.
     *
     * @private function of useBookEditorWrapper
     */
    const saveNamedVersion = useCallback(async () => {
        if (isRestoringHistoryVersion) {
            return;
        }

        const promptValue = await showPrompt({
            title: 'Save named version',
            message: 'Name this snapshot so you can quickly find it in history later.',
            confirmLabel: 'Save version',
            cancelLabel: 'Cancel',
            placeholder: 'For example: Baseline prompt before TEAM refactor',
            inputLabel: 'Version name',
        }).catch(() => null);

        if (promptValue === null) {
            return;
        }

        const versionName = normalizeHistoryVersionName(promptValue);
        if (!versionName) {
            await showAlert({
                title: 'Version name required',
                message: 'Enter a non-empty name to save a named version.',
            });
            return;
        }

        saveCurrentSourceAsNamedVersion(versionName);
    }, [isRestoringHistoryVersion, saveCurrentSourceAsNamedVersion]);

    /**
     * Restores one selected history snapshot and updates local editor state.
     *
     * @param historyId - Identifier of the snapshot to restore.
     * @private function of useBookEditorWrapper
     */
    const restoreHistoryVersion = useCallback(
        async (historyId: number) => {
            if (isSaveInFlight) {
                await showAlert({
                    title: 'Saving in progress',
                    message: 'Wait until the current save finishes, then try restoring this version again.',
                });
                return;
            }

            const hasUnsavedLocalChanges =
                isSaveDebounced || isSaveInFlight || currentSourceVersion !== lastConfirmedSourceVersion;
            const confirmed = await showConfirm({
                title: 'Restore version',
                message: hasUnsavedLocalChanges
                    ? 'Current local edits are not fully saved yet. Restoring will discard them. Continue?'
                    : 'Restore this version? The current source will be saved into history automatically.',
                confirmLabel: 'Restore version',
                cancelLabel: 'Cancel',
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            setIsRestoringHistoryVersion(true);

            try {
                cancelPendingSave();

                const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book/history`, {
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

                const restoredSource = payload.agentSource as string_book;

                replaceWithRestoredSource(restoredSource);
                await requestDiagnostics(restoredSource, { forceRefresh: true });
                setHistoryRefreshVersion((previousVersion) => previousVersion + 1);
                setSelectedHistoryId(historyId);
            } catch (error) {
                console.error('Failed to restore book history version:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to restore selected version.';
                await showAlert({
                    title: 'Restore failed',
                    message: errorMessage,
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
            replaceWithRestoredSource,
            requestDiagnostics,
        ],
    );

    /**
     * Loads history whenever the panel opens or a refresh is requested.
     */
    useEffect(() => {
        if (!isHistoryOpen) {
            return;
        }

        void requestHistory();
    }, [historyRefreshVersion, isHistoryOpen, requestHistory, successfulSaveSequence]);

    /**
     * Supports ESC key closing for the history side panel.
     */
    useEffect(() => {
        if (!isHistoryOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsHistoryOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHistoryOpen]);

    /**
     * Cleans up in-flight history requests on unmount.
     */
    useEffect(() => {
        return () => {
            historyAbortControllerRef.current?.abort();
        };
    }, []);

    /**
     * History entries normalized into the list/detail view model used by the panel.
     *
     * @private function of useBookEditorWrapper
     */
    const historyVersions = useMemo(() => buildHistoryVersionItems(historyEntries), [historyEntries]);

    /**
     * Filtered history items matching the current panel controls.
     *
     * @private function of useBookEditorWrapper
     */
    const filteredHistoryVersions = useMemo(
        () =>
            filterHistoryVersionItems(historyVersions, {
                namedOnly: isNamedHistoryOnly,
                nameQuery: historyNameQuery,
            }),
        [historyNameQuery, historyVersions, isNamedHistoryOnly],
    );

    /**
     * Keeps selected history row valid after list filtering changes.
     */
    useEffect(() => {
        if (filteredHistoryVersions.length === 0) {
            setSelectedHistoryId(null);
            return;
        }

        if (selectedHistoryId && filteredHistoryVersions.some((version) => version.id === selectedHistoryId)) {
            return;
        }

        setSelectedHistoryId(filteredHistoryVersions[0]!.id);
    }, [filteredHistoryVersions, selectedHistoryId]);

    /**
     * Toggles the visibility of the history side panel.
     *
     * @private function of useBookEditorWrapper
     */
    const toggleHistoryPanel = useCallback(() => {
        setIsHistoryOpen((isCurrentlyOpen) => !isCurrentlyOpen);
    }, []);

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
            isRestoring: isRestoringHistoryVersion || isSaveInFlight,
            isNamedOnly: isNamedHistoryOnly,
            nameQuery: historyNameQuery,
            onNamedOnlyChange: setIsNamedHistoryOnly,
            onNameQueryChange: setHistoryNameQuery,
            onClose: () => setIsHistoryOpen(false),
            onRefresh: () => setHistoryRefreshVersion((previousVersion) => previousVersion + 1),
            onSaveNamedVersion: () => void saveNamedVersion(),
            isSaveNamedVersionDisabled: isRestoringHistoryVersion || isSaveInFlight,
            onSelectVersion: (historyId: number) => setSelectedHistoryId(historyId),
            onRestoreVersion: (historyId: number) => void restoreHistoryVersion(historyId),
        },
    };
}
