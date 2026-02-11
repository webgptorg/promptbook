'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bookEditorUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';

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
};

// TODO: [🐱‍🚀] Rename to BookEditorSavingWrapper

/**
 * Wraps the BookEditor with autosave and file upload support.
 */
export function BookEditorWrapper({ agentName, initialAgentSource }: BookEditorWrapperProps) {
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [diagnostics, setDiagnostics] = useState<Array<BookEditorDiagnostic>>([]);

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
            setDiagnostics(Array.isArray(payload.diagnostics) ? payload.diagnostics : []);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            console.error('Error loading reference diagnostics:', error);
            setDiagnostics([]);
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

    return (
        <div className="w-full h-full">
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
    );
}

/**
 * TODO: Prompt: Use `import { debounce } from '@promptbook-local/utils';` instead of custom debounce implementation
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 * TODO: [🐱‍🚀] Add error handling and retry logic
 * TODO: [🐱‍🚀] Show save status indicator
 */
