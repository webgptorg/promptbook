'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bookEditorUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';
import { showAlert } from '@/src/components/AsyncDialogs/asyncDialogs';

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

type AgentReferenceDiagnosticsResponse = {
    diagnostics?: Array<BookEditorDiagnostic>;
    missingTeamReferences?: Array<MissingTeamReference>;
};

// TODO: [🐱‍🚀] Rename to BookEditorSavingWrapper

/**
 * Wraps the BookEditor with autosave and file upload support.
 */
export function BookEditorWrapper({ agentName, initialAgentSource }: BookEditorWrapperProps) {
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [diagnostics, setDiagnostics] = useState<Array<BookEditorDiagnostic>>([]);
    const [missingTeamReferences, setMissingTeamReferences] = useState<Array<MissingTeamReference>>([]);
    const [creatingTeamMember, setCreatingTeamMember] = useState<string | null>(null);

    // Debounce timer ref so we can clear previous pending save
    const debounceTimerRef = useRef<number | null>(null);
    const diagnosticsDebounceTimerRef = useRef<number | null>(null);
    const diagnosticsAbortControllerRef = useRef<AbortController | null>(null);
    // Configurable debounce delay (ms) - tweak if needed
    const DEBOUNCE_DELAY = 1000;
    const DIAGNOSTICS_DEBOUNCE_DELAY = 350;

    /**
     * Persists the current agent source to the server.
     */
    const performSave = async (sourceToSave: string_book) => {
        setSaveStatus('saving');
        try {
            const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book`, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: sourceToSave,
            });
            if (!response.ok) {
                throw new Error(`Failed to save: ${response.statusText}`);
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000); // Reset status after 2 seconds
        } catch (error) {
            console.error('Error saving agent source:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    /**
     * Debounces saves while the user edits the agent source.
     */
    const scheduleSave = (nextSource: string_book) => {
        // Clear existing pending save
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        // We stay 'idle' while typing; could add a 'pending' status in future if desired
        // Schedule new save
        debounceTimerRef.current = window.setTimeout(() => {
            performSave(nextSource);
        }, DEBOUNCE_DELAY);
    };

    /**
     * Requests unresolved compact-reference diagnostics from the server.
     */
    const requestDiagnostics = useCallback(async (sourceToInspect: string_book) => {
        diagnosticsAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        diagnosticsAbortControllerRef.current = abortController;

        try {
            const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book/reference-diagnostics`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: sourceToInspect,
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`Failed to load diagnostics: ${response.statusText}`);
            }

            const payload = (await response.json()) as AgentReferenceDiagnosticsResponse;
            const diagnosticsPayload = Array.isArray(payload.diagnostics) ? payload.diagnostics : [];
            const teamReferences = Array.isArray(payload.missingTeamReferences)
                ? payload.missingTeamReferences
                : [];

            setDiagnostics(diagnosticsPayload);
            setMissingTeamReferences(teamReferences);
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
        }, DIAGNOSTICS_DEBOUNCE_DELAY);
    }, [requestDiagnostics]);

    /**
     * Updates local state and schedules a save for editor changes.
     */
    const handleChange = (newSource: string_book) => {
        setAgentSource(newSource);
        scheduleSave(newSource);
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

                await requestDiagnostics(agentSource);
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

    const hasMissingTeamReferences = missingTeamReferences.length > 0;
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
                    className={`fixed top-5 right-28 z-50 px-4 py-2 text-sm rounded shadow-md ${
                        saveStatus === 'saving'
                            ? 'bg-blue-100 text-blue-800'
                            : saveStatus === 'saved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {saveStatus === 'saving' && '💾 Saving...'}
                    {saveStatus === 'saved' && '✅ Saved'}
                    {saveStatus === 'error' && '❌ Failed to save'}
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
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm text-slate-700">
                Team member <span className="font-semibold text-slate-900">{member.reference}</span> is not found. Do you want to create it?
            </p>
            <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-70"
                onClick={onCreate}
                disabled={isCreating}
            >
                {isCreating ? `Creating ${member.reference}...` : `Create ${member.reference}`}
            </button>
        </div>
    );
}

/**
 * TODO: Prompt: Use `import { debounce } from '@promptbook-local/utils';` instead of custom debounce implementation
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 * TODO: [🐱‍🚀] Add error handling and retry logic
 * TODO: [🐱‍🚀] Show save status indicator
 */
