import type { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { showAlert } from '@/src/components/AsyncDialogs/asyncDialogs';
import type { MissingAgentReference } from '../../../../utils/agentReferenceResolver/createUnresolvedAgentReferenceDiagnostics';

/**
 * Delay used before refreshing reference diagnostics after typing.
 *
 * @private function of useBookEditorWrapper
 */
const DIAGNOSTICS_DEBOUNCE_DELAY_MS = 350;

/**
 * Input consumed by `useBookEditorDiagnostics`.
 *
 * @private function of useBookEditorWrapper
 */
type UseBookEditorDiagnosticsProps = {
    /**
     * Agent route identifier used by diagnostics-related APIs.
     */
    readonly agentName: string;
    /**
     * Initial agent source loaded on the server.
     */
    readonly initialAgentSource: string_book;
    /**
     * Current agent source kept in the editor.
     */
    readonly agentSource: string_book;
};

/**
 * Monaco marker payload accepted by `<BookEditor/>`.
 *
 * @private function of useBookEditorWrapper
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
 *
 * @private function of useBookEditorWrapper
 */
type AgentReferenceDiagnosticsResponse = {
    diagnostics?: Array<BookEditorDiagnostic>;
    missingAgentReferences?: Array<MissingAgentReference>;
};

/**
 * Optional flags accepted by `requestDiagnostics`.
 *
 * @private function of useBookEditorWrapper
 */
type RequestDiagnosticsOptions = {
    /**
     * Forces server-side resolver rebuild before running diagnostics.
     */
    readonly forceRefresh?: boolean;
};

/**
 * Normalizes diagnostics payload shape returned by the diagnostics API.
 *
 * @param payload - Raw response payload.
 * @returns Always-array diagnostics payload.
 * @private function of useBookEditorWrapper
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
 * Manages diagnostics requests, unresolved reference state, and referenced-agent creation for the Book editor.
 *
 * @private function of useBookEditorWrapper
 */
export function useBookEditorDiagnostics({
    agentName,
    initialAgentSource,
    agentSource,
}: UseBookEditorDiagnosticsProps) {
    const [diagnostics, setDiagnostics] = useState<Array<BookEditorDiagnostic>>([]);
    const [missingAgentReferences, setMissingAgentReferences] = useState<Array<MissingAgentReference>>([]);
    const [creatingReference, setCreatingReference] = useState<string | null>(null);

    /**
     * Debounce timer ref so stale diagnostics refreshes can be replaced.
     *
     * @private function of useBookEditorWrapper
     */
    const diagnosticsDebounceTimerRef = useRef<number | null>(null);

    /**
     * Abort controller for the most recent diagnostics request.
     *
     * @private function of useBookEditorWrapper
     */
    const diagnosticsAbortControllerRef = useRef<AbortController | null>(null);

    /**
     * Requests unresolved compact-reference diagnostics from the server.
     *
     * @private function of useBookEditorWrapper
     */
    const requestDiagnostics = useCallback(
        async (sourceToInspect: string_book, options: RequestDiagnosticsOptions = {}) => {
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
        },
        [agentName],
    );

    /**
     * Debounces diagnostics updates while the user edits the source.
     *
     * @private function of useBookEditorWrapper
     */
    const scheduleDiagnostics = useCallback(
        (nextSource: string_book) => {
            if (diagnosticsDebounceTimerRef.current) {
                clearTimeout(diagnosticsDebounceTimerRef.current);
            }

            diagnosticsDebounceTimerRef.current = window.setTimeout(() => {
                void requestDiagnostics(nextSource);
            }, DIAGNOSTICS_DEBOUNCE_DELAY_MS);
        },
        [requestDiagnostics],
    );

    /**
     * Creates a missing referenced agent and refreshes diagnostics.
     *
     * @private function of useBookEditorWrapper
     */
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
                        // Ignore parse errors.
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
     * Cleans up pending timers and in-flight diagnostics requests on unmount.
     */
    useEffect(() => {
        return () => {
            if (diagnosticsDebounceTimerRef.current) {
                clearTimeout(diagnosticsDebounceTimerRef.current);
            }
            diagnosticsAbortControllerRef.current?.abort();
        };
    }, []);

    return {
        diagnostics,
        missingAgentReferences,
        creatingReference,
        requestDiagnostics,
        scheduleDiagnostics,
        handleCreateReferencedAgent,
    };
}
