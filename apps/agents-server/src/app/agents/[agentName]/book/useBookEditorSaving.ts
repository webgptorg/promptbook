import type { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveBookEditorApiErrorMessage } from './resolveBookEditorApiErrorMessage';

/**
 * Delay used before autosave sends a new request after typing.
 *
 * @private function of useBookEditorWrapper
 */
const SAVE_DEBOUNCE_DELAY_MS = 1000;

/**
 * Visibility duration of the temporary "saved" status.
 *
 * @private function of useBookEditorWrapper
 */
const SAVE_SUCCESS_STATUS_VISIBLE_MS = 2000;

/**
 * Save status shown in the Book editor status bar.
 *
 * @private function of useBookEditorWrapper
 */
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Input consumed by `useBookEditorSaving`.
 *
 * @private function of useBookEditorWrapper
 */
type UseBookEditorSavingProps = {
    /**
     * Agent route identifier used by editor-related APIs.
     */
    readonly agentName: string;
    /**
     * Initial agent source loaded on the server.
     */
    readonly initialAgentSource: string_book;
};

/**
 * Queued save request payload tracked by the autosave worker.
 *
 * @private function of useBookEditorWrapper
 */
type PendingSave = {
    readonly source: string_book;
    readonly version: number;
    readonly versionName: string | null;
};

/**
 * Builds save endpoint URL and appends optional `versionName` query param.
 *
 * @param agentName - Current agent route identifier.
 * @param versionName - Optional name for the history snapshot.
 * @returns Relative save URL for the current agent.
 * @private function of useBookEditorWrapper
 */
function createAgentBookSaveUrl(agentName: string, versionName: string | null): string {
    const baseUrl = `/agents/${encodeURIComponent(agentName)}/api/book`;
    if (!versionName) {
        return baseUrl;
    }

    return `${baseUrl}?versionName=${encodeURIComponent(versionName)}`;
}

/**
 * Manages autosave state, queued persistence, and source-version tracking for the Book editor.
 *
 * @private function of useBookEditorWrapper
 */
export function useBookEditorSaving({ agentName, initialAgentSource }: UseBookEditorSavingProps) {
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
    const [currentSourceVersion, setCurrentSourceVersion] = useState(0);
    const [lastConfirmedSourceVersion, setLastConfirmedSourceVersion] = useState(0);
    const [isSaveInFlight, setIsSaveInFlight] = useState(false);
    const [isSaveDebounced, setIsSaveDebounced] = useState(false);
    const [successfulSaveSequence, setSuccessfulSaveSequence] = useState(0);

    /**
     * Debounce timer ref so pending saves can be replaced before dispatch.
     *
     * @private function of useBookEditorWrapper
     */
    const debounceTimerRef = useRef<number | null>(null);

    /**
     * Stores the newest queued save request.
     *
     * @private function of useBookEditorWrapper
     */
    const pendingSaveRef = useRef<PendingSave | null>(null);

    /**
     * Ensures only one save worker drains the queue at a time.
     *
     * @private function of useBookEditorWrapper
     */
    const isSaveWorkerRunningRef = useRef(false);

    /**
     * Tracks the latest local editor revision independently from render timing.
     *
     * @private function of useBookEditorWrapper
     */
    const sourceVersionRef = useRef(0);

    /**
     * Flushes queued autosave requests in-order and confirms server-saved versions.
     *
     * @private function of useBookEditorWrapper
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
                    const response = await fetch(createAgentBookSaveUrl(agentName, pendingSave.versionName), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'text/plain' },
                        body: pendingSave.source,
                    });

                    if (!response.ok) {
                        throw new Error(await resolveBookEditorApiErrorMessage(response, 'Failed to save'));
                    }

                    setLastConfirmedSourceVersion((previousVersion) =>
                        pendingSave.version > previousVersion ? pendingSave.version : previousVersion,
                    );
                    setSaveStatus('saved');
                    setSuccessfulSaveSequence((previousSequence) => previousSequence + 1);
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
     * Queues the newest source revision for persistence and starts the save worker.
     *
     * @private function of useBookEditorWrapper
     */
    const enqueueSave = useCallback(
        (source: string_book, version: number, versionName: string | null = null) => {
            pendingSaveRef.current = { source, version, versionName };
            setIsSaveDebounced(false);
            void flushSaveQueue();
        },
        [flushSaveQueue],
    );

    /**
     * Schedules one autosave after the debounce delay.
     *
     * @private function of useBookEditorWrapper
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
                enqueueSave(nextSource, version, null);
            }, SAVE_DEBOUNCE_DELAY_MS);
        },
        [enqueueSave],
    );

    /**
     * Applies one in-editor source change and schedules autosave.
     *
     * @private function of useBookEditorWrapper
     */
    const handleSourceChange = useCallback(
        (nextSource: string_book) => {
            sourceVersionRef.current += 1;
            setCurrentSourceVersion(sourceVersionRef.current);
            setAgentSource(nextSource);
            scheduleSave(nextSource, sourceVersionRef.current);
        },
        [scheduleSave],
    );

    /**
     * Cancels the queued autosave timer and forgets unsent save payloads.
     *
     * @private function of useBookEditorWrapper
     */
    const cancelPendingSave = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        pendingSaveRef.current = null;
        setIsSaveDebounced(false);
    }, []);

    /**
     * Retries saving the current editor content immediately.
     *
     * @private function of useBookEditorWrapper
     */
    const retrySaveNow = useCallback(() => {
        cancelPendingSave();
        pendingSaveRef.current = { source: agentSource, version: sourceVersionRef.current, versionName: null };
        void flushSaveQueue();
    }, [agentSource, cancelPendingSave, flushSaveQueue]);

    /**
     * Saves the current source as an explicitly named snapshot.
     *
     * @private function of useBookEditorWrapper
     */
    const saveCurrentSourceAsNamedVersion = useCallback(
        (versionName: string) => {
            cancelPendingSave();
            enqueueSave(agentSource, sourceVersionRef.current, versionName);
        },
        [agentSource, cancelPendingSave, enqueueSave],
    );

    /**
     * Replaces the current editor source with a server-restored snapshot and marks it as confirmed.
     *
     * @private function of useBookEditorWrapper
     */
    const replaceWithRestoredSource = useCallback((restoredSource: string_book) => {
        sourceVersionRef.current += 1;
        const restoredVersion = sourceVersionRef.current;

        setAgentSource(restoredSource);
        setCurrentSourceVersion(restoredVersion);
        setLastConfirmedSourceVersion(restoredVersion);
        setSaveStatus('saved');
        setSaveErrorMessage(null);
    }, []);

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

    /**
     * Cleans up the pending autosave timer on unmount.
     */
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    /**
     * Indicates whether the latest local source revision is already confirmed on the server.
     *
     * @private function of useBookEditorWrapper
     */
    const isBookSavedOnServer =
        !isSaveDebounced && !isSaveInFlight && currentSourceVersion === lastConfirmedSourceVersion;

    return {
        agentSource,
        saveStatus,
        saveErrorMessage,
        currentSourceVersion,
        lastConfirmedSourceVersion,
        isSaveInFlight,
        isSaveDebounced,
        successfulSaveSequence,
        isBookSavedOnServer,
        handleSourceChange,
        retrySaveNow,
        cancelPendingSave,
        saveCurrentSourceAsNamedVersion,
        replaceWithRestoredSource,
    };
}

// TODO: Prompt: Use `import { debounce } from '@promptbook-local/utils';` instead of custom debounce implementation
// TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
