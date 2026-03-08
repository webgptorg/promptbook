'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bookEditorUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';
import { showAlert, showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import type { MissingAgentReference } from '../../../../utils/agentReferenceResolver/createUnresolvedAgentReferenceDiagnostics';
import { useUnsavedChangesGuard } from '../../../../components/utils/useUnsavedChangesGuard';

/**
 * Props for the BookEditorWrapper component.
 */
type BookEditorWrapperProps = {
    agentName: string;
    initialAgentSource: string_book;
};

/**
 * Monaco marker payload accepted by `<BookEditor/>`.
 */
type BookEditorDiagnostic = {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
    source?: string;
};

/**
 * API response returned by `/reference-diagnostics`.
 */
type AgentReferenceDiagnosticsResponse = {
    diagnostics?: Array<BookEditorDiagnostic>;
    missingAgentReferences?: Array<MissingAgentReference>;
};

/**
 * Optional flags accepted by `requestDiagnostics`.
 */
type RequestDiagnosticsOptions = {
    /**
     * Forces server-side resolver rebuild before running diagnostics.
     */
    readonly forceRefresh?: boolean;
};

/**
 * Save status shown by the floating Book editor indicator.
 */
type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Queued save request payload tracked by the autosave worker.
 */
type PendingSave = {
    readonly source: string_book;
    readonly version: number;
};

/**
 * Minimal API error payload used by Book-related endpoints.
 */
type ApiErrorPayload = {
    message?: string;
    error?: string;
};

/**
 * One book snapshot item returned by the history API.
 */
type AgentHistoryEntry = {
    id: number;
    createdAt: string;
    agentName: string;
    agentHash: string;
    previousAgentHash: string | null;
    agentSource: string_book;
    promptbookEngineVersion: string;
};

/**
 * API response returned by `/api/book/history`.
 */
type AgentHistoryResponse = {
    history?: Array<AgentHistoryEntry>;
};

/**
 * API response returned when restoring one history snapshot.
 */
type RestoreAgentHistoryResponse = {
    isSuccessful?: boolean;
    agentSource?: string_book;
    message?: string;
    error?: string;
};

/**
 * Delay used before autosave sends a new request after typing.
 */
const SAVE_DEBOUNCE_DELAY_MS = 1000;

/**
 * Delay used before refreshing reference diagnostics after typing.
 */
const DIAGNOSTICS_DEBOUNCE_DELAY_MS = 350;

/**
 * Visibility duration of the temporary "saved" status.
 */
const SAVE_SUCCESS_STATUS_VISIBLE_MS = 2000;

/**
 * Normalizes diagnostics payload shape returned by the diagnostics API.
 *
 * @param payload - Raw response payload.
 * @returns Always-array diagnostics payload.
 */
function normalizeDiagnosticsPayload(payload: AgentReferenceDiagnosticsResponse): {
    readonly diagnostics: Array<BookEditorDiagnostic>;
    readonly missingAgentReferences: Array<MissingAgentReference>;
} {
    return {
        diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics : [],
        missingAgentReferences: Array.isArray(payload.missingAgentReferences) ? payload.missingAgentReferences : [],
    };
}

/**
 * Normalizes the history payload shape returned by the history API.
 *
 * @param payload - Raw history payload.
 * @returns Always-array history payload.
 */
function normalizeHistoryPayload(payload: AgentHistoryResponse): Array<AgentHistoryEntry> {
    return Array.isArray(payload.history) ? payload.history : [];
}

/**
 * Extracts a human-readable API error from a failed HTTP response.
 *
 * @param response - Failed API response.
 * @returns Friendly error message for UI.
 */
async function resolveApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    const fallback = `${fallbackMessage}: ${response.status} ${response.statusText}`.trim();

    try {
        const payload = (await response.json()) as ApiErrorPayload;
        const payloadMessage = payload?.message || payload?.error;
        if (payloadMessage && payloadMessage.trim().length > 0) {
            return payloadMessage.trim();
        }
    } catch {
        // Ignore JSON parsing failures and fall back to status-based message.
    }

    return fallback;
}

// TODO: [🐱‍🚀] Rename to BookEditorSavingWrapper

/**
 * Wraps the BookEditor with autosave and file upload support.
 */
export function BookEditorWrapper({ agentName, initialAgentSource }: BookEditorWrapperProps) {
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
    const [currentSourceVersion, setCurrentSourceVersion] = useState(0);
    const [lastConfirmedSourceVersion, setLastConfirmedSourceVersion] = useState(0);
    const [isSaveInFlight, setIsSaveInFlight] = useState(false);
    const [isSaveDebounced, setIsSaveDebounced] = useState(false);
    const [diagnostics, setDiagnostics] = useState<Array<BookEditorDiagnostic>>([]);
    const [missingAgentReferences, setMissingAgentReferences] = useState<Array<MissingAgentReference>>([]);
    const [creatingReference, setCreatingReference] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<Array<AgentHistoryEntry>>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
    const [isRestoringHistoryVersion, setIsRestoringHistoryVersion] = useState(false);
    const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);

    // Debounce timer refs so pending jobs can be canceled before scheduling a newer one.
    const debounceTimerRef = useRef<number | null>(null);
    const diagnosticsDebounceTimerRef = useRef<number | null>(null);
    const diagnosticsAbortControllerRef = useRef<AbortController | null>(null);
    const historyAbortControllerRef = useRef<AbortController | null>(null);
    const pendingSaveRef = useRef<PendingSave | null>(null);
    const isSaveWorkerRunningRef = useRef(false);
    const sourceVersionRef = useRef(0);
    const isHistoryOpenRef = useRef(false);

    /**
     * Flushes queued autosave requests in-order and confirms server-saved versions.
     */
    const flushSaveQueue = useCallback(async () => {
        if (isSaveWorkerRunningRef.current || !pendingSaveRef.current) {
            return;
        }

        isSaveWorkerRunningRef.current = true;
        setIsSaveInFlight(true);

        try {
            while (pendingSaveRef.current) {
                const pendingSave = pendingSaveRef.current;
                pendingSaveRef.current = null;

                setSaveStatus('saving');
                setSaveErrorMessage(null);

                try {
                    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'text/plain' },
                        body: pendingSave.source,
                    });

                    if (!response.ok) {
                        throw new Error(await resolveApiErrorMessage(response, 'Failed to save'));
                    }

                    setLastConfirmedSourceVersion((previousVersion) =>
                        pendingSave.version > previousVersion ? pendingSave.version : previousVersion,
                    );
                    setSaveStatus('saved');
                    if (isHistoryOpenRef.current) {
                        setHistoryRefreshVersion((previousVersion) => previousVersion + 1);
                    }
                } catch (error) {
                    console.error('Error saving agent source:', error);
                    const errorMessage =
                        error instanceof Error ? error.message : 'Failed to save the current book on the server.';
                    setSaveErrorMessage(errorMessage);
                    setSaveStatus('error');
                }
            }
        } finally {
            isSaveWorkerRunningRef.current = false;
            setIsSaveInFlight(false);
        }
    }, [agentName]);

    /**
     * Queues the newest source revision for persistence and starts save worker.
     */
    const enqueueSave = useCallback(
        (source: string_book, version: number) => {
            pendingSaveRef.current = { source, version };
            setIsSaveDebounced(false);
            void flushSaveQueue();
        },
        [flushSaveQueue],
    );

    /**
     * Debounces autosave while the user edits.
     */
    const scheduleSave = useCallback(
        (nextSource: string_book, version: number) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            setIsSaveDebounced(true);
            setSaveStatus('pending');

            debounceTimerRef.current = window.setTimeout(() => {
                debounceTimerRef.current = null;
                enqueueSave(nextSource, version);
            }, SAVE_DEBOUNCE_DELAY_MS);
        },
        [enqueueSave],
    );

    /**
     * Retries saving the current editor content immediately.
     */
    const retrySaveNow = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        setIsSaveDebounced(false);
        pendingSaveRef.current = { source: agentSource, version: sourceVersionRef.current };
        void flushSaveQueue();
    }, [agentSource, flushSaveQueue]);

    /**
     * Loads the complete version history for the current agent.
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
                throw new Error(await resolveApiErrorMessage(response, 'Failed to load history'));
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
     * Requests unresolved compact-reference diagnostics from the server.
     */
    const requestDiagnostics = useCallback(async (
        sourceToInspect: string_book,
        options: RequestDiagnosticsOptions = {},
    ) => {
        diagnosticsAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        diagnosticsAbortControllerRef.current = abortController;

        try {
            const diagnosticsUrl = new URL(
                `/agents/${encodeURIComponent(agentName)}/api/book/reference-diagnostics`,
                window.location.origin,
            );

            if (options.forceRefresh) {
                diagnosticsUrl.searchParams.set('forceRefresh', '1');
            }

            const response = await fetch(diagnosticsUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: sourceToInspect,
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`Failed to load diagnostics: ${response.statusText}`);
            }

            const payload = (await response.json()) as AgentReferenceDiagnosticsResponse;
            const normalizedPayload = normalizeDiagnosticsPayload(payload);

            setDiagnostics(normalizedPayload.diagnostics);
            setMissingAgentReferences(normalizedPayload.missingAgentReferences);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            console.error('Error loading reference diagnostics:', error);
            setDiagnostics([]);
            setMissingAgentReferences([]);
        } finally {
            if (diagnosticsAbortControllerRef.current === abortController) {
                diagnosticsAbortControllerRef.current = null;
            }
        }
    }, [agentName]);

    /**
     * Debounces diagnostics updates while the user edits the source.
     */
    const scheduleDiagnostics = useCallback((nextSource: string_book) => {
        if (diagnosticsDebounceTimerRef.current) {
            clearTimeout(diagnosticsDebounceTimerRef.current);
        }

        diagnosticsDebounceTimerRef.current = window.setTimeout(() => {
            void requestDiagnostics(nextSource);
        }, DIAGNOSTICS_DEBOUNCE_DELAY_MS);
    }, [requestDiagnostics]);

    /**
     * Restores one selected history snapshot and updates local editor state.
     *
     * @param historyId - Identifier of the snapshot to restore.
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
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }

                pendingSaveRef.current = null;
                setIsSaveDebounced(false);

                const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book/history`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ historyId }),
                });

                if (!response.ok) {
                    throw new Error(await resolveApiErrorMessage(response, 'Failed to restore version'));
                }

                const payload = (await response.json()) as RestoreAgentHistoryResponse;
                if (typeof payload.agentSource !== 'string') {
                    throw new Error('History restore endpoint returned an invalid source payload.');
                }

                const restoredSource = payload.agentSource as string_book;
                sourceVersionRef.current += 1;
                const restoredVersion = sourceVersionRef.current;

                setAgentSource(restoredSource);
                setCurrentSourceVersion(restoredVersion);
                setLastConfirmedSourceVersion(restoredVersion);
                setSaveStatus('saved');
                setSaveErrorMessage(null);

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
        [agentName, currentSourceVersion, isSaveDebounced, isSaveInFlight, lastConfirmedSourceVersion, requestDiagnostics],
    );

    /**
     * Updates local state and schedules a save for editor changes.
     */
    const handleChange = (newSource: string_book) => {
        sourceVersionRef.current += 1;
        setCurrentSourceVersion(sourceVersionRef.current);
        setAgentSource(newSource);
        scheduleSave(newSource, sourceVersionRef.current);
        scheduleDiagnostics(newSource);
    };

    const handleCreateReferencedAgent = useCallback(
        async (reference: MissingAgentReference) => {
            if (!reference.reference) {
                return;
            }

            setCreatingReference(reference.reference);

            try {
                const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book/missing-agent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: reference.reference }),
                });

                if (!response.ok) {
                    let message = response.statusText;
                    try {
                        const payload = await response.json();
                        if (payload?.message) {
                            message = payload.message;
                        }
                    } catch {
                        // Ignore parse errors
                    }

                    throw new Error(message || 'Failed to create referenced agent');
                }

                await requestDiagnostics(agentSource, { forceRefresh: true });
            } catch (error) {
                console.error('Failed to create referenced agent:', error);
                const errorMessage =
                    error instanceof Error ? error.message : 'An unknown error occurred while creating the agent.';

                await showAlert({
                    title: 'Create agent failed',
                    message: `Unable to create ${reference.reference}. ${errorMessage}`,
                });
            } finally {
                setCreatingReference(null);
            }
        },
        [agentName, agentSource, requestDiagnostics],
    );

    useEffect(() => {
        void requestDiagnostics(initialAgentSource);
    }, [initialAgentSource, requestDiagnostics]);

    /**
     * Mirrors history panel visibility inside a ref so save worker can trigger refreshes.
     */
    useEffect(() => {
        isHistoryOpenRef.current = isHistoryOpen;
    }, [isHistoryOpen]);

    /**
     * Loads history whenever the panel opens or a refresh is requested.
     */
    useEffect(() => {
        if (!isHistoryOpen) {
            return;
        }

        void requestHistory();
    }, [historyRefreshVersion, isHistoryOpen, requestHistory]);

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
     * Hides the short-lived success status once the editor is safely in sync.
     */
    useEffect(() => {
        if (saveStatus !== 'saved') {
            return;
        }

        const resetTimer = window.setTimeout(() => {
            setSaveStatus((currentStatus) => {
                if (currentStatus !== 'saved') {
                    return currentStatus;
                }

                if (!isSaveDebounced && !isSaveInFlight && currentSourceVersion === lastConfirmedSourceVersion) {
                    return 'idle';
                }

                return currentStatus;
            });
        }, SAVE_SUCCESS_STATUS_VISIBLE_MS);

        return () => clearTimeout(resetTimer);
    }, [currentSourceVersion, isSaveDebounced, isSaveInFlight, lastConfirmedSourceVersion, saveStatus]);

    // Cleanup on unmount to avoid lingering timeouts
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (diagnosticsDebounceTimerRef.current) {
                clearTimeout(diagnosticsDebounceTimerRef.current);
            }
            diagnosticsAbortControllerRef.current?.abort();
            historyAbortControllerRef.current?.abort();
        };
    }, []);

    const isBookSavedOnServer =
        !isSaveDebounced && !isSaveInFlight && currentSourceVersion === lastConfirmedSourceVersion;
    const shouldPreventLeavingPage = !isBookSavedOnServer;
    const leaveGuardMessage =
        saveStatus === 'error'
            ? 'Book save failed. Stay on this page until the source is saved on the server.'
            : 'Book changes are still being saved. Stay on this page until the save completes.';

    useUnsavedChangesGuard({
        hasUnsavedChanges: shouldPreventLeavingPage,
        preventInAppNavigation: true,
        message: leaveGuardMessage,
    });

    const hasMissingReferences = missingAgentReferences.length > 0;
    const selectedHistoryEntry = historyEntries.find((item) => item.id === selectedHistoryId) || null;
    const saveStatusLabel =
        saveStatus === 'pending'
            ? 'Save queued'
            : saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'error'
            ? 'Save failed'
            : 'Saved';
    const saveIndicatorToneClassName =
        saveStatus === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : saveStatus === 'pending' || saveStatus === 'saving'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white/95 text-slate-700';
    const saveIndicatorDotClassName =
        saveStatus === 'error'
            ? 'bg-red-500'
            : saveStatus === 'pending' || saveStatus === 'saving'
            ? 'bg-blue-500'
            : 'bg-emerald-500';
    const canRestoreSelectedHistory =
        Boolean(selectedHistoryEntry) && !isRestoringHistoryVersion && !isSaveInFlight;
    const renderMissingReferenceCards = () =>
        missingAgentReferences.map((reference) => (
            <MissingAgentReferenceCard
                key={reference.reference}
                member={reference}
                isCreating={creatingReference === reference.reference}
                onCreate={() => handleCreateReferencedAgent(reference)}
            />
        ));

    return (
        <div className="relative flex h-full min-h-0 flex-col">
            <div className="pointer-events-none fixed top-5 right-28 z-50">
                <button
                    type="button"
                    role="status"
                    aria-live="polite"
                    onClick={() => setIsHistoryOpen(true)}
                    className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm transition-colors hover:opacity-90 ${saveIndicatorToneClassName}`}
                    title="Open book history"
                >
                    {saveStatus === 'saving' ? (
                        <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${saveIndicatorDotClassName}`} />
                    )}
                    <span>{saveStatusLabel}</span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">History</span>
                </button>
            </div>

            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20">
                    <button
                        type="button"
                        aria-label="Close history panel"
                        className="h-full flex-1 cursor-default"
                        onClick={() => setIsHistoryOpen(false)}
                    />
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="Book version history"
                        className="flex h-full w-full max-w-[960px] flex-col border-l border-slate-200 bg-white shadow-2xl"
                    >
                        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Version history</p>
                                <p className="text-xs text-slate-500">Saved snapshots of this book source</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setHistoryRefreshVersion((previousVersion) => previousVersion + 1)}
                                    className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    disabled={isHistoryLoading}
                                >
                                    Refresh
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>
                        </header>

                        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                            <aside className="max-h-64 overflow-auto border-b border-slate-200 md:max-h-none md:w-80 md:border-b-0 md:border-r">
                                {isHistoryLoading && (
                                    <p className="px-4 py-3 text-xs text-slate-500">Loading history...</p>
                                )}

                                {!isHistoryLoading && historyErrorMessage && (
                                    <p className="px-4 py-3 text-xs text-red-600">{historyErrorMessage}</p>
                                )}

                                {!isHistoryLoading && !historyErrorMessage && historyEntries.length === 0 && (
                                    <p className="px-4 py-3 text-xs text-slate-500">No history snapshots found.</p>
                                )}

                                {!isHistoryLoading &&
                                    historyEntries.map((entry, index) => {
                                        const isSelected = selectedHistoryId === entry.id;
                                        return (
                                            <button
                                                key={entry.id}
                                                type="button"
                                                onClick={() => setSelectedHistoryId(entry.id)}
                                                className={`flex w-full flex-col items-start gap-1 border-b border-slate-100 px-4 py-3 text-left text-xs transition-colors ${
                                                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="font-semibold text-slate-900">
                                                    Version {historyEntries.length - index}
                                                </span>
                                                <time className="text-slate-500">
                                                    {new Date(entry.createdAt).toLocaleString()}
                                                </time>
                                                <code className="rounded bg-slate-200 px-1 py-0.5 text-[10px] text-slate-700">
                                                    {entry.agentHash.slice(0, 8)}
                                                </code>
                                            </button>
                                        );
                                    })}
                            </aside>

                            <div className="flex min-h-0 flex-1 flex-col">
                                {selectedHistoryEntry ? (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                            <div className="text-xs text-slate-600">
                                                <p>
                                                    Snapshot from{' '}
                                                    <span className="font-semibold text-slate-900">
                                                        {new Date(selectedHistoryEntry.createdAt).toLocaleString()}
                                                    </span>
                                                </p>
                                                <p>
                                                    Hash:{' '}
                                                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">
                                                        {selectedHistoryEntry.agentHash}
                                                    </code>
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void restoreHistoryVersion(selectedHistoryEntry.id)}
                                                disabled={!canRestoreSelectedHistory}
                                                className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                                            >
                                                {isRestoringHistoryVersion ? 'Restoring...' : 'Restore this version'}
                                            </button>
                                        </div>

                                        <pre className="min-h-0 flex-1 overflow-auto bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                                            {selectedHistoryEntry.agentSource}
                                        </pre>
                                    </>
                                ) : (
                                    <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-xs text-slate-500">
                                        Select a version to inspect its content.
                                    </div>
                                )}

                                {saveStatus === 'error' && (
                                    <div className="flex items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                                        <p className="min-w-0 truncate">
                                            {saveErrorMessage || 'Book save failed. Retry to persist the current source.'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={retrySaveNow}
                                            className="rounded border border-red-300 px-2 py-1 font-semibold hover:bg-red-100"
                                        >
                                            Retry save
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            <div className="flex h-full min-h-0 gap-6">
                <div className="flex-1 min-h-0 min-w-0">
                    <BookEditor
                        className="w-full h-full"
                        isBorderRadiusDisabled
                        height={null}
                        value={agentSource}
                        onChange={handleChange}
                        onFileUpload={bookEditorUploadHandler}
                        diagnostics={diagnostics}
                    />
                </div>

                {hasMissingReferences && (
                    <aside className="hidden w-80 shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-md md:flex">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Missing referenced agents
                        </p>
                        <div className="flex flex-col gap-4">{renderMissingReferenceCards()}</div>
                    </aside>
                )}
            </div>

            {hasMissingReferences && (
                <div className="mt-4 flex flex-col gap-4 px-4 md:hidden">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Missing referenced agents
                    </p>
                    <div className="flex flex-col gap-4">{renderMissingReferenceCards()}</div>
                </div>
            )}
        </div>
    );
}

/**
 * Props for an individual missing agent reference card.
 */
type MissingAgentReferenceCardProps = {
    readonly member: MissingAgentReference;
    readonly isCreating: boolean;
    readonly onCreate: () => void;
};

/**
 * Renders a single card describing the unresolved agent reference and its creation action.
 */
function MissingAgentReferenceCard({ member, isCreating, onCreate }: MissingAgentReferenceCardProps) {
    const displayToken = member.token || member.reference;
    const commitmentLabel = formatCommitmentLabel(member.commitmentType);
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm text-slate-700">
                Referenced agent <span className="font-semibold text-slate-900">{displayToken}</span> is not found. Do you want to create it?
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                Missing in the {commitmentLabel} commitment
            </p>
            <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-70"
                onClick={onCreate}
                disabled={isCreating}
            >
                {isCreating ? `Creating ${displayToken}...` : `Create ${displayToken}`}
            </button>
        </div>
    );
}

/**
 * Formats the commitment label for display.
 */
function formatCommitmentLabel(commitmentType: MissingAgentReference['commitmentType']): string {
    return commitmentType === 'IMPORTS' ? 'IMPORT' : commitmentType;
}

/**
 * TODO: Prompt: Use `import { debounce } from '@promptbook-local/utils';` instead of custom debounce implementation
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
