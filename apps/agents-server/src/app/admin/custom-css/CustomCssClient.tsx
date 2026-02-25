'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    createDefaultCustomStylesheetCss,
    customStylesheetClassEntries,
} from '../../../constants/customStylesheet';

/**
 * API payload returned by `GET /api/custom-css`.
 */
type CustomCssReadResponse = {
    css: string;
    exists: boolean;
    updatedAt: string | null;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `PUT /api/custom-css`.
 */
type CustomCssWriteResponse = {
    css: string;
    updatedAt: string;
    maxLength: number;
    error?: string;
};

/**
 * Input styles shared by editor controls.
 */
const CUSTOM_CSS_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Reads JSON body from one fetch response with a typed fallback.
 */
async function readJsonResponse<T>(response: Response): Promise<T> {
    return (await response.json()) as T;
}

/**
 * Renders the admin custom CSS editor and saves global stylesheet settings.
 */
export function CustomCssClient() {
    const defaultCss = useMemo(() => createDefaultCustomStylesheetCss(), []);
    const [css, setCss] = useState(defaultCss);
    const [initialCss, setInitialCss] = useState(defaultCss);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [maxLength, setMaxLength] = useState<number>(100_000);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const hasChanges = css !== initialCss;
    const remainingCharacters = maxLength - css.length;

    /**
     * Loads the latest custom stylesheet config from the server.
     */
    const loadCustomCss = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch('/api/custom-css');
            const payload = await readJsonResponse<CustomCssReadResponse>(response);

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load custom CSS.');
            }

            const editorValue = payload.exists ? payload.css : defaultCss;
            setCss(editorValue);
            setInitialCss(editorValue);
            setUpdatedAt(payload.updatedAt);
            setMaxLength(payload.maxLength || 100_000);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load custom CSS.');
        } finally {
            setIsLoading(false);
        }
    }, [defaultCss]);

    useEffect(() => {
        void loadCustomCss();
    }, [loadCustomCss]);

    /**
     * Persists current editor CSS to the server.
     */
    const saveCustomCss = useCallback(async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch('/api/custom-css', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ css }),
            });

            const payload = await readJsonResponse<CustomCssWriteResponse>(response);
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save custom CSS.');
            }

            setInitialCss(css);
            setUpdatedAt(payload.updatedAt);
            setMaxLength(payload.maxLength || maxLength);
            setSuccessMessage('Custom CSS saved. Refresh any open pages to see updates.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save custom CSS.');
        } finally {
            setIsSaving(false);
        }
    }, [css, maxLength]);

    if (isLoading) {
        return <div className="p-8 text-center">Loading custom CSS...</div>;
    }

    return (
        <div className="w-full px-2 sm:px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Custom CSS</h1>
            <p className="text-sm text-gray-600 mb-6">
                This stylesheet is loaded on every Agents Server page. Use it to customize chat surfaces and message styling.
            </p>

            {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {successMessage && (
                <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {successMessage}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Stylesheet editor</h2>
                        <div className="text-xs text-gray-500">
                            {updatedAt ? `Last saved: ${new Date(updatedAt).toLocaleString()}` : 'Not saved yet'}
                        </div>
                    </div>

                    <label htmlFor="custom-css-editor" className="mb-2 block text-sm font-medium text-gray-700">
                        CSS
                    </label>
                    <textarea
                        id="custom-css-editor"
                        value={css}
                        onChange={(event) => setCss(event.target.value)}
                        className={`${CUSTOM_CSS_INPUT_CLASS_NAME} min-h-[520px] font-mono text-xs leading-5`}
                        spellCheck={false}
                        placeholder={defaultCss}
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
                                void saveCustomCss();
                            }}
                            disabled={isSaving || remainingCharacters < 0 || !hasChanges}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            {isSaving ? 'Saving...' : 'Save CSS'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setCss(defaultCss)}
                            disabled={isSaving}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Reset to template
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void loadCustomCss();
                            }}
                            disabled={isSaving}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Reload from server
                        </button>
                    </div>
                </section>

                <aside className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Common selectors</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        These classes are attached by the chat renderer and can be safely targeted in custom CSS.
                    </p>
                    <ul className="mt-4 space-y-2">
                        {customStylesheetClassEntries.map((entry) => (
                            <li key={entry.className} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                                <div className="font-mono text-xs text-blue-700">.{entry.className}</div>
                                <div className="mt-1 text-xs text-gray-600">{entry.description}</div>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </div>
    );
}
