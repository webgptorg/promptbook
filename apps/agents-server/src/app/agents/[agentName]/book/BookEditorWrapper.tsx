'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bookEditorUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';
import { showAlert } from '@/src/components/AsyncDialogs/asyncDialogs';
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
 * Minimal metadata returned by the diagnostics API for each missing TEAM teammate.
 */
type MissingTeamReference = {
    /**
     * Display-friendly payload extracted from the compact reference token.
     */
    readonly reference: string;

    /**
     * Original compact token (e.g. `{Lawyer}` or `@lawyer`).
     */
    readonly token: string;
};

/**
 * API response returned by `/reference-diagnostics`.
 */
type AgentReferenceDiagnosticsResponse = {
    diagnostics?: Array<BookEditorDiagnostic>;
    missingTeamReferences?: Array<MissingTeamReference>;
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
 * Minimal server error payload used for save failure messages.
 */
type SaveErrorPayload = {
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
    readonly missingTeamReferences: Array<MissingTeamReference>;
} {
    return {
        diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics : [],
        missingTeamReferences: Array.isArray(payload.missingTeamReferences) ? payload.missingTeamReferences : [],
    };
}

/**
 * Extracts a human-readable save error from a failed HTTP response.
 *
 * @param response - Failed save response.
 * @returns Friendly error message for UI.
 */
async function resolveSaveErrorMessage(response: Response): Promise<string> {
    const fallbackMessage = `Failed to save: ${response.status} ${response.statusText}`.trim();

    try {
        const payload = (await response.json()) as SaveErrorPayload;
        const payloadMessage = payload?.message || payload?.error;
        if (payloadMessage && payloadMessage.trim().length > 0) {
            return payloadMessage.trim();
        }
    } catch {
        // Ignore JSON parsing failures and fall back to status-based message.
    }

    return fallbackMessage;
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
    const [missingTeamReferences, setMissingTeamReferences] = useState<Array<MissingTeamReference>>([]);
    const [creatingTeamMember, setCreatingTeamMember] = useState<string | null>(null);

    // Debounce timer refs so pending jobs can be canceled before scheduling a newer one.
    const debounceTimerRef = useRef<number | null>(null);
    const diagnosticsDebounceTimerRef = useRef<number | null>(null);
    const diagnosticsAbortControllerRef = useRef<AbortController | null>(null);
    const pendingSaveRef = useRef<PendingSave | null>(null);
    const isSaveWorkerRunningRef = useRef(false);
    const sourceVersionRef = useRef(0);

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
                        throw new Error(await resolveSaveErrorMessage(response));
                    }

                    setLastConfirmedSourceVersion((previousVersion) =>
                        pendingSave.version > previousVersion ? pendingSave.version : previousVersion,
                    );
                    setSaveStatus('saved');
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
            setMissingTeamReferences(normalizedPayload.missingTeamReferences);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            console.error('Error loading reference diagnostics:', error);
            setDiagnostics([]);
            setMissingTeamReferences([]);
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
     * Updates local state and schedules a save for editor changes.
     */
    const handleChange = (newSource: string_book) => {
        sourceVersionRef.current += 1;
        setCurrentSourceVersion(sourceVersionRef.current);
        setAgentSource(newSource);
        scheduleSave(newSource, sourceVersionRef.current);
        scheduleDiagnostics(newSource);
    };

    const handleCreateTeamMember = useCallback(
        async (member: MissingTeamReference) => {
            if (!member.reference) {
                return;
            }

            setCreatingTeamMember(member.reference);

            try {
                const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book/team-member`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: member.reference }),
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

                    throw new Error(message || 'Failed to create team member');
                }

                await requestDiagnostics(agentSource, { forceRefresh: true });
            } catch (error) {
                console.error('Failed to create team member:', error);
                const errorMessage =
                    error instanceof Error ? error.message : 'An unknown error occurred while creating the team member.';

                await showAlert({
                    title: 'Create team member failed',
                    message: `Unable to create ${member.reference}. ${errorMessage}`,
                });
            } finally {
                setCreatingTeamMember(null);
            }
        },
        [agentName, agentSource, requestDiagnostics],
    );

    useEffect(() => {
        void requestDiagnostics(initialAgentSource);
    }, [initialAgentSource, requestDiagnostics]);

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

    const hasMissingTeamReferences = missingTeamReferences.length > 0;
    const saveStatusToneClassName =
        saveStatus === 'saved'
            ? 'bg-green-100 text-green-800'
            : saveStatus === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800';
    const saveStatusLabel =
        saveStatus === 'pending'
            ? 'Changes queued for save...'
            : saveStatus === 'saving'
            ? 'Saving to server...'
            : saveStatus === 'saved'
            ? 'Saved on server'
            : 'Failed to save on server';
    const renderTeamMemberCards = () =>
        missingTeamReferences.map((member) => (
            <MissingTeamMemberCard
                key={member.reference}
                member={member}
                isCreating={creatingTeamMember === member.reference}
                onCreate={() => handleCreateTeamMember(member)}
            />
        ));

    return (
        <div className="relative flex h-full min-h-0 flex-col">
            {saveStatus !== 'idle' && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed top-5 right-28 z-50 max-w-md rounded px-4 py-2 text-sm shadow-md ${saveStatusToneClassName}`}
                >
                    <p className="font-semibold">{saveStatusLabel}</p>
                    {saveStatus === 'error' && (
                        <div className="mt-1 flex flex-col gap-2 text-xs">
                            {saveErrorMessage && <p>{saveErrorMessage}</p>}
                            <p>Navigation is blocked until this source is saved.</p>
                            <button
                                type="button"
                                onClick={retrySaveNow}
                                className="inline-flex w-fit items-center rounded border border-current px-2 py-1 font-semibold transition-opacity hover:opacity-80"
                            >
                                Retry save now
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex h-full min-h-0 gap-6">
                <div className="flex-1 min-h-0">
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

                {hasMissingTeamReferences && (
                    <aside className="hidden w-80 shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-md md:flex">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Missing teammates
                        </p>
                        <div className="flex flex-col gap-4">{renderTeamMemberCards()}</div>
                    </aside>
                )}
            </div>

            {hasMissingTeamReferences && (
                <div className="mt-4 flex flex-col gap-4 px-4 md:hidden">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Missing teammates
                    </p>
                    <div className="flex flex-col gap-4">{renderTeamMemberCards()}</div>
                </div>
            )}
        </div>
    );
}

/**
 * Props for an individual missing-team-member card.
 */
type MissingTeamMemberCardProps = {
    readonly member: MissingTeamReference;
    readonly isCreating: boolean;
    readonly onCreate: () => void;
};

/**
 * Renders a single card describing the unresolved teammate and its creation action.
 */
function MissingTeamMemberCard({ member, isCreating, onCreate }: MissingTeamMemberCardProps) {
    const displayToken = member.token || member.reference;
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm text-slate-700">
                Team member <span className="font-semibold text-slate-900">{displayToken}</span> is not found. Do you want to create it?
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
 * TODO: Prompt: Use `import { debounce } from '@promptbook-local/utils';` instead of custom debounce implementation
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
