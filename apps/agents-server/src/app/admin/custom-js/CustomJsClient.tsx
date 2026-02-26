'use client';

import Editor from '@monaco-editor/react';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { createDefaultCustomJavascript } from '../../../constants/customJavascript';
import { CUSTOM_RESOURCE_INPUT_CLASS_NAME, readJsonResponse } from '../custom-resource/shared';

/**
 * Serialized custom JavaScript file returned by the API.
 * @private
 */
type CustomJavascriptFilePayload = {
    id: number;
    scope: string;
    javascript: string;
    createdAt: string;
    updatedAt: string | null;
};

/**
 * API payload returned by `GET /api/custom-js`.
 * @private
 */
type CustomJavascriptReadResponse = {
    files: CustomJavascriptFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-js`.
 * @private
 */
type CustomJavascriptSaveResponse = {
    file: CustomJavascriptFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-js`.
 * @private
 */
type CustomJavascriptDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * UI state for a custom JavaScript file, tracked across unsaved edits.
 * @private
 */
type CustomJavascriptFileState = {
    localId: string;
    id?: number;
    scope: string;
    javascript: string;
    createdAt?: string;
    updatedAt?: string | null;
};

const NEW_FILE_BASE_NAME = 'custom-script';

/**
 * Creates a short unique identifier used only for client-side tracking.
 * @private
 */
function buildLocalId(): string {
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Maps a persisted API file into local editor state.
 * @private
 */
function mapPayloadToState(file: CustomJavascriptFilePayload): CustomJavascriptFileState {
    return {
        localId: `server-${file.id}`,
        id: file.id,
        scope: file.scope,
        javascript: file.javascript,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    };
}

/**
 * Picks a new file name that does not collide with existing entries.
 * @private
 */
function pickUniqueFileName(existing: CustomJavascriptFileState[]): string {
    let suffix = 1;
    let candidate = NEW_FILE_BASE_NAME;

    const normalized = existing.map((file) => file.scope.trim().toLowerCase());

    while (normalized.includes(candidate.toLowerCase())) {
        suffix += 1;
        candidate = `${NEW_FILE_BASE_NAME}-${suffix}`;
    }

    return candidate;
}

/**
 * Builds a fresh editor state for a new custom JavaScript file.
 * @private
 */
function createNewFileState(existing: CustomJavascriptFileState[], template: string): CustomJavascriptFileState {
    return {
        localId: buildLocalId(),
        scope: pickUniqueFileName(existing),
        javascript: template,
        updatedAt: null,
    };
}

/**
 * Renders the admin custom JavaScript editor and saves global script settings.
 * @private
 */
export function CustomJsClient() {
    const defaultJavaScript = useMemo(() => createDefaultCustomJavascript(), []);
    const [files, setFiles] = useState<CustomJavascriptFileState[]>([]);
    const [serverSnapshot, setServerSnapshot] = useState<CustomJavascriptFileState[]>([]);
    const [selectedFileLocalId, setSelectedFileLocalId] = useState<string>('');
    const [maxLength, setMaxLength] = useState<number>(100_000);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const serverSnapshotMap = useMemo(() => {
        const map = new Map<string, CustomJavascriptFileState>();
        serverSnapshot.forEach((file) => {
            map.set(file.localId, file);
        });
        return map;
    }, [serverSnapshot]);

    const hasUnsavedChanges = useMemo(() => {
        if (files.length !== serverSnapshot.length) {
            return true;
        }

        return files.some((file) => {
            const snapshot = serverSnapshotMap.get(file.localId);
            if (!snapshot) {
                return true;
            }

            return snapshot.scope !== file.scope || snapshot.javascript !== file.javascript;
        });
    }, [files, serverSnapshot.length, serverSnapshotMap]);

    const { confirmBeforeClose } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
    });

    const currentFile = files.find((file) => file.localId === selectedFileLocalId) ?? files[0] ?? null;

    const remainingCharacters = currentFile ? maxLength - currentFile.javascript.length : maxLength;

    const currentSnapshot = currentFile ? serverSnapshotMap.get(currentFile.localId) : null;
    const hasCurrentChanges =
        !currentFile || !currentSnapshot || currentSnapshot.scope !== currentFile.scope || currentSnapshot.javascript !== currentFile.javascript;

    const loadCustomJavascript = useCallback(
        async (preferredId?: number | null) => {
            setIsLoading(true);
            setError(null);
            setSuccessMessage(null);

            try {
                const response = await fetch('/api/custom-js');
                const payload = await readJsonResponse<CustomJavascriptReadResponse>(response);

                if (!response.ok) {
                    throw new Error(payload.error || 'Failed to load custom JavaScript.');
                }

                const hasServerFiles = payload.files.length > 0;
                const nextFiles = hasServerFiles
                    ? payload.files.map(mapPayloadToState)
                    : [createNewFileState([], defaultJavaScript)];

                setFiles(nextFiles);
                setServerSnapshot(hasServerFiles ? nextFiles : []);
                setMaxLength(payload.maxLength);

                if (preferredId) {
                    const preferredLocalId = `server-${preferredId}`;
                    const matching = nextFiles.find((file) => file.localId === preferredLocalId);
                    setSelectedFileLocalId(matching?.localId ?? nextFiles[0]?.localId ?? '');
                } else {
                    setSelectedFileLocalId(nextFiles[0]?.localId ?? '');
                }
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Failed to load custom JavaScript.');
            } finally {
                setIsLoading(false);
            }
        },
        [defaultJavaScript],
    );

    useEffect(() => {
        void loadCustomJavascript();
    }, [loadCustomJavascript]);

    useEffect(() => {
        if (!currentFile && files.length) {
            setSelectedFileLocalId(files[0].localId);
        }
    }, [currentFile, files]);

    const addNewFile = useCallback(() => {
        const draft = createNewFileState(files, defaultJavaScript);
        setFiles((prev) => [...prev, draft]);
        setSelectedFileLocalId(draft.localId);
        setSuccessMessage(null);
    }, [defaultJavaScript, files]);

    const selectFile = useCallback(
        (localId: string) => {
            if (localId === selectedFileLocalId) {
                return;
            }

            if (!confirmBeforeClose()) {
                return;
            }

            setSelectedFileLocalId(localId);
        },
        [confirmBeforeClose, selectedFileLocalId],
    );

    const updateCurrentFile = useCallback(
        (updates: Partial<CustomJavascriptFileState>) => {
            if (!currentFile) {
                return;
            }

            setFiles((prev) =>
                prev.map((file) => (file.localId === currentFile.localId ? { ...file, ...updates } : file)),
            );
            setSuccessMessage(null);
        },
        [currentFile],
    );

    const handleScopeChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            updateCurrentFile({ scope: event.target.value });
        },
        [updateCurrentFile],
    );

    const handleEditorChange = useCallback(
        (value: string | undefined) => {
            updateCurrentFile({ javascript: value ?? '' });
        },
        [updateCurrentFile],
    );

    const resetToTemplate = useCallback(() => {
        updateCurrentFile({ javascript: defaultJavaScript });
    }, [defaultJavaScript, updateCurrentFile]);

    const saveCurrentFile = useCallback(async () => {
        if (!currentFile) {
            return;
        }

        const trimmedScope = currentFile.scope.trim();
        if (!trimmedScope) {
            setError('File name is required.');
            return;
        }

        if (currentFile.javascript.length > maxLength) {
            setError(`File exceeds the ${maxLength.toLocaleString()}-character limit.`);
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload =
                currentFile.id !== undefined
                    ? {
                          id: currentFile.id,
                          scope: trimmedScope,
                          javascript: currentFile.javascript,
                      }
                    : {
                          scope: trimmedScope,
                          javascript: currentFile.javascript,
                      };

            const response = await fetch('/api/custom-js', {
                method: currentFile.id !== undefined ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await readJsonResponse<CustomJavascriptSaveResponse>(response);

            if (!response.ok) {
                throw new Error(json.error || 'Failed to save custom JavaScript.');
            }

            const savedFile = { ...mapPayloadToState(json.file), localId: currentFile.localId };

            setFiles((prev) => prev.map((file) => (file.localId === currentFile.localId ? savedFile : file)));

            setServerSnapshot((prev) => {
                const exists = prev.some((file) => file.localId === currentFile.localId);
                if (exists) {
                    return prev.map((file) => (file.localId === currentFile.localId ? savedFile : file));
                }
                return [...prev, savedFile];
            });

            setMaxLength(json.maxLength);
            setSuccessMessage('Custom JavaScript saved. Reload any open pages to see the changes.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save custom JavaScript.');
        } finally {
            setIsSaving(false);
        }
    }, [currentFile, maxLength]);

    const reloadFromServer = useCallback(async () => {
        if (!confirmBeforeClose()) {
            return;
        }

        await loadCustomJavascript(currentFile?.id ?? null);
    }, [confirmBeforeClose, currentFile?.id, loadCustomJavascript]);

    const downloadCurrentFile = useCallback(() => {
        if (!currentFile) {
            return;
        }

        const filename = `${currentFile.scope || 'custom-script'}.js`;
        const blob = new Blob([currentFile.javascript], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.setAttribute('download', filename);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
    }, [currentFile]);

    const deleteCurrentFile = useCallback(async () => {
        if (!currentFile) {
            return;
        }

        if (!confirmBeforeClose()) {
            return;
        }

        const shouldDelete = window.confirm('Delete this script? This cannot be undone.');
        if (!shouldDelete) {
            return;
        }

        setIsDeleting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (currentFile.id !== undefined) {
                const response = await fetch('/api/custom-js', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: currentFile.id }),
                });

                const payload = await readJsonResponse<CustomJavascriptDeleteResponse>(response);
                if (!response.ok) {
                    throw new Error(payload.error || 'Failed to delete custom JavaScript.');
                }
            }

            const nextFiles = files.filter((file) => file.localId !== currentFile.localId);

            if (nextFiles.length === 0) {
                const fallback = createNewFileState([], defaultJavaScript);
                setFiles([fallback]);
                setServerSnapshot([]);
                setSelectedFileLocalId(fallback.localId);
            } else {
                setFiles(nextFiles);
                setServerSnapshot((prev) => prev.filter((file) => file.localId !== currentFile.localId));
                setSelectedFileLocalId((prevId) => {
                    if (prevId === currentFile.localId) {
                        return nextFiles[0].localId;
                    }
                    return prevId;
                });
            }
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete custom JavaScript.');
        } finally {
            setIsDeleting(false);
        }
    }, [confirmBeforeClose, currentFile, defaultJavaScript, files]);

    if (isLoading) {
        return <div className="p-8 text-center">Loading custom JavaScript...</div>;
    }

    return (
        <div className="w-full px-2 sm:px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Custom JavaScript</h1>
            <p className="text-sm text-gray-600 mb-6">
                Scripts entered here are concatenated and injected on every Agents Server page. Use them to add
                helpers, integrations, or instrumentation, but keep them lean since runtime errors can impact the UI.
            </p>

            {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {successMessage && (
                <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {successMessage}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">Scripts</h2>
                        <button
                            type="button"
                            onClick={addNewFile}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-green-700"
                        >
                            New file
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Each file is injected in order and merged into the same global script.
                    </p>

                    <div className="mt-4 space-y-2">
                        {files.length === 0 && (
                            <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
                                Add your first script to get started.
                            </div>
                        )}
                        {files.map((file) => {
                            const isSelected = file.localId === currentFile?.localId;
                            return (
                                <button
                                    key={file.localId}
                                    type="button"
                                    onClick={() => selectFile(file.localId)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                            : 'border-transparent bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-sm font-medium text-gray-900">{file.scope || 'Untitled script'}</div>
                                    <div className="text-xs text-gray-500">
                                        {file.updatedAt
                                            ? `Saved ${new Date(file.updatedAt).toLocaleString()}`
                                            : 'Not saved yet'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Script editor</h2>
                        {currentFile && currentFile.updatedAt && (
                            <div className="text-xs text-gray-500">
                                Last saved: {new Date(currentFile.updatedAt).toLocaleString()}
                            </div>
                        )}
                    </div>

                    {currentFile ? (
                        <>
                            <div>
                                <label htmlFor="custom-js-name" className="mb-2 block text-sm font-medium text-gray-700">
                                    File name
                                </label>
                                <input
                                    id="custom-js-name"
                                    value={currentFile.scope}
                                    onChange={handleScopeChange}
                                    className={`${CUSTOM_RESOURCE_INPUT_CLASS_NAME} mb-4 text-sm`}
                                />
                            </div>

                            <Editor
                                height="520px"
                                language="javascript"
                                theme="vs-light"
                                value={currentFile.javascript}
                                onChange={handleEditorChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                    wordWrap: 'on',
                                    tabSize: 4,
                                }}
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
                                    onClick={() => void saveCurrentFile()}
                                    disabled={isSaving || remainingCharacters < 0 || !hasCurrentChanges}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                >
                                    {isSaving ? 'Saving...' : 'Save script'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetToTemplate}
                                    disabled={isSaving}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                                >
                                    Reset to template
                                </button>
                                <button
                                    type="button"
                                    onClick={downloadCurrentFile}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                >
                                    Download file
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void deleteCurrentFile()}
                                    disabled={isDeleting}
                                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete file'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void reloadFromServer()}
                                    disabled={isSaving || isLoading}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                                >
                                    Reload from server
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="rounded border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                            No scripts yet. Click New file to start.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
