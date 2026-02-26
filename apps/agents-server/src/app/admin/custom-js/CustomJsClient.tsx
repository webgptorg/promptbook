'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDefaultCustomJavascript } from '../../../constants/customJavascript';
import { CUSTOM_RESOURCE_INPUT_CLASS_NAME, readJsonResponse } from '../custom-resource/shared';

/**
 * API payload returned by `GET /api/custom-js`.
 * @private
 */
type CustomJavascriptReadResponse = {
    javascript: string;
    exists: boolean;
    updatedAt: string | null;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `PUT /api/custom-js`.
 * @private
 */
type CustomJavascriptWriteResponse = {
    javascript: string;
    updatedAt: string;
    maxLength: number;
    error?: string;
};

/**
 * Renders the admin custom JavaScript editor and saves global script settings.
 * @private
 */
export function CustomJsClient() {
    const defaultJavaScript = useMemo(() => createDefaultCustomJavascript(), []);
    const [javascript, setJavascript] = useState(defaultJavaScript);
    const [initialJavaScript, setInitialJavaScript] = useState(defaultJavaScript);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [maxLength, setMaxLength] = useState<number>(100_000);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const hasChanges = javascript !== initialJavaScript;
    const remainingCharacters = maxLength - javascript.length;

    const loadCustomJavascript = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch('/api/custom-js');
            const payload = await readJsonResponse<CustomJavascriptReadResponse>(response);

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load custom JavaScript.');
            }

            const editorValue = payload.exists ? payload.javascript : defaultJavaScript;
            setJavascript(editorValue);
            setInitialJavaScript(editorValue);
            setUpdatedAt(payload.updatedAt);
            setMaxLength(payload.maxLength || 100_000);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load custom JavaScript.');
        } finally {
            setIsLoading(false);
        }
    }, [defaultJavaScript]);

    useEffect(() => {
        void loadCustomJavascript();
    }, [loadCustomJavascript]);

    const saveCustomJavascript = useCallback(async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch('/api/custom-js', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ javascript }),
            });

            const payload = await readJsonResponse<CustomJavascriptWriteResponse>(response);

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save custom JavaScript.');
            }

            setInitialJavaScript(javascript);
            setUpdatedAt(payload.updatedAt);
            setMaxLength(payload.maxLength || maxLength);
            setSuccessMessage('Custom JavaScript saved. Reload any open pages to see the changes.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save custom JavaScript.');
        } finally {
            setIsSaving(false);
        }
    }, [javascript, maxLength]);

    if (isLoading) {
        return <div className="p-8 text-center">Loading custom JavaScript...</div>;
    }

    return (
        <div className="w-full px-2 sm:px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Custom JavaScript</h1>
            <p className="text-sm text-gray-600 mb-6">
                This script is loaded on every Agents Server page. Use it to add integrations, helpers, or assistive
                instrumentation. Be mindful that any runtime errors here can impact the UI, so keep it focused and
                well-tested.
            </p>

            {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {successMessage && (
                <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {successMessage}
                </div>
            )}

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Script editor</h2>
                    <div className="text-xs text-gray-500">
                        {updatedAt ? `Last saved: ${new Date(updatedAt).toLocaleString()}` : 'Not saved yet'}
                    </div>
                </div>

                <label htmlFor="custom-js-editor" className="mb-2 block text-sm font-medium text-gray-700">
                    JavaScript
                </label>
                <textarea
                    id="custom-js-editor"
                    value={javascript}
                    onChange={(event) => setJavascript(event.target.value)}
                    className={`${CUSTOM_RESOURCE_INPUT_CLASS_NAME} min-h-[520px] font-mono text-xs leading-5`}
                    spellCheck={false}
                    placeholder={defaultJavaScript}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className={remainingCharacters < 0 ? 'text-red-600' : 'text-gray-500'}>
                        {remainingCharacters.toLocaleString()} characters remaining
                    </span>
                    <span className="text-gray-400">Limit: {maxLength.toLocaleString()}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            void saveCustomJavascript();
                        }}
                        disabled={isSaving || remainingCharacters < 0 || !hasChanges}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        {isSaving ? 'Saving...' : 'Save JavaScript'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setJavascript(defaultJavaScript)}
                        disabled={isSaving}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Reset to template
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void loadCustomJavascript();
                        }}
                        disabled={isSaving}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Reload from server
                    </button>
                </div>
            </section>
        </div>
    );
}
