'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalyticsSettings } from '../../../constants/analyticsMetadata';
import { createDefaultCustomJavascript } from '../../../constants/customJavascript';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { readJsonResponse } from '../custom-resource/shared';
import { useCustomJsAnalyticsState } from './useCustomJsAnalyticsState';

/**
 * Default custom JavaScript length limit used before the first API response arrives.
 *
 * @private function of CustomJsClient
 */
const DEFAULT_MAX_CUSTOM_JAVASCRIPT_LENGTH = 100_000;

/**
 * Constant for the new file base name.
 *
 * @private function of CustomJsClient
 */
const NEW_FILE_BASE_NAME = 'custom-script';

/**
 * Serialized custom JavaScript file returned by the API.
 *
 * @private function of CustomJsClient
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
 *
 * @private function of CustomJsClient
 */
type CustomJavascriptReadResponse = {
    files: CustomJavascriptFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-js`.
 *
 * @private function of CustomJsClient
 */
type CustomJavascriptSaveResponse = {
    file: CustomJavascriptFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-js`.
 *
 * @private function of CustomJsClient
 */
type CustomJavascriptDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * UI state for a custom JavaScript file, tracked across unsaved edits.
 *
 * @private function of CustomJsClient
 */
export type CustomJavascriptFileState = {
    localId: string;
    id?: number;
    scope: string;
    javascript: string;
    createdAt?: string;
    updatedAt?: string | null;
};

/**
 * Normalized state returned after loading custom JavaScript files from the server.
 *
 * @private function of CustomJsClient
 */
type LoadedCustomJavascriptState = {
    files: CustomJavascriptFileState[];
    serverSnapshot: CustomJavascriptFileState[];
    maxLength: number;
    selectedFileLocalId: string;
};

/**
 * Normalized state returned after deleting the current custom JavaScript file.
 *
 * @private function of CustomJsClient
 */
type DeletedCustomJavascriptState = {
    files: CustomJavascriptFileState[];
    serverSnapshot: CustomJavascriptFileState[];
    selectedFileLocalId: string;
};

/**
 * Props consumed by `resolveDeletedCustomJavascriptState`.
 *
 * @private function of CustomJsClient
 */
type ResolveDeletedCustomJavascriptStateProps = {
    files: CustomJavascriptFileState[];
    serverSnapshot: CustomJavascriptFileState[];
    deletedFileLocalId: string;
    defaultJavaScript: string;
    selectedFileLocalId: string;
};

/**
 * Result returned by `useCustomJsClientState`.
 *
 * @private function of CustomJsClient
 */
type UseCustomJsClientStateResult = {
    addNewFile: () => void;
    analyticsHasChanges: boolean;
    analyticsLoadError: string | null;
    analyticsSettings: AnalyticsSettings;
    analyticsStatus: { type: 'success' | 'error'; text: string } | null;
    currentFile: CustomJavascriptFileState | null;
    deleteCurrentFile: () => Promise<void>;
    downloadCurrentFile: () => void;
    error: string | null;
    files: CustomJavascriptFileState[];
    handleEditorChange: (value: string | undefined) => void;
    handleScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    hasCurrentChanges: boolean;
    isAnalyticsLoading: boolean;
    isAnalyticsSaving: boolean;
    isDeleting: boolean;
    isLoading: boolean;
    isSaving: boolean;
    loadAnalyticsSettings: () => Promise<void>;
    maxLength: number;
    reloadFromServer: () => Promise<void>;
    remainingCharacters: number;
    resetToTemplate: () => void;
    saveAnalyticsSettings: () => Promise<void>;
    saveCurrentFile: () => Promise<void>;
    selectFile: (localId: string) => void;
    successMessage: string | null;
    updateAnalyticsSettings: (updates: Partial<AnalyticsSettings>) => void;
};

/**
 * Generates a short local identifier used only for client-side tracking.
 *
 * @private function of CustomJsClient
 */
function buildLocalId(): string {
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Maps a persisted API file into local editor state.
 *
 * @private function of CustomJsClient
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
 *
 * @private function of CustomJsClient
 */
function pickUniqueFileName(existing: ReadonlyArray<CustomJavascriptFileState>): string {
    let suffix = 1;
    let candidate = NEW_FILE_BASE_NAME;
    const normalizedFileNames = existing.map((file) => file.scope.trim().toLowerCase());

    while (normalizedFileNames.includes(candidate.toLowerCase())) {
        suffix += 1;
        candidate = `${NEW_FILE_BASE_NAME}-${suffix}`;
    }

    return candidate;
}

/**
 * Builds a fresh editor state for a new custom JavaScript file.
 *
 * @private function of CustomJsClient
 */
function createNewFileState(
    existing: ReadonlyArray<CustomJavascriptFileState>,
    template: string,
): CustomJavascriptFileState {
    return {
        localId: buildLocalId(),
        scope: pickUniqueFileName(existing),
        javascript: template,
        updatedAt: null,
    };
}

/**
 * Creates a lookup map for the last server-confirmed custom JavaScript snapshot.
 *
 * @private function of CustomJsClient
 */
function createServerSnapshotMap(serverSnapshot: ReadonlyArray<CustomJavascriptFileState>) {
    const map = new Map<string, CustomJavascriptFileState>();

    serverSnapshot.forEach((file) => {
        map.set(file.localId, file);
    });

    return map;
}

/**
 * Determines whether any local custom JavaScript file differs from the last saved snapshot.
 *
 * @private function of CustomJsClient
 */
function hasFilesChanged(
    files: ReadonlyArray<CustomJavascriptFileState>,
    serverSnapshotMap: ReadonlyMap<string, CustomJavascriptFileState>,
    serverSnapshotLength: number,
): boolean {
    if (files.length !== serverSnapshotLength) {
        return true;
    }

    return files.some((file) => {
        const snapshot = serverSnapshotMap.get(file.localId);
        if (!snapshot) {
            return true;
        }

        return snapshot.scope !== file.scope || snapshot.javascript !== file.javascript;
    });
}

/**
 * Resolves the custom JavaScript file currently shown in the editor.
 *
 * @private function of CustomJsClient
 */
function findCurrentFile(
    files: ReadonlyArray<CustomJavascriptFileState>,
    selectedFileLocalId: string,
): CustomJavascriptFileState | null {
    return files.find((file) => file.localId === selectedFileLocalId) ?? files[0] ?? null;
}

/**
 * Determines whether the current custom JavaScript file differs from the last saved snapshot.
 *
 * @private function of CustomJsClient
 */
function hasCurrentFileChanged(
    currentFile: CustomJavascriptFileState | null,
    serverSnapshotMap: ReadonlyMap<string, CustomJavascriptFileState>,
): boolean {
    if (!currentFile) {
        return true;
    }

    const currentSnapshot = serverSnapshotMap.get(currentFile.localId);
    if (!currentSnapshot) {
        return true;
    }

    return currentSnapshot.scope !== currentFile.scope || currentSnapshot.javascript !== currentFile.javascript;
}

/**
 * Chooses the file that should stay selected after one load completes.
 *
 * @private function of CustomJsClient
 */
function pickSelectedFileLocalId(
    files: ReadonlyArray<CustomJavascriptFileState>,
    preferredId?: number | null,
): string {
    if (preferredId) {
        const preferredLocalId = `server-${preferredId}`;
        const matchingFile = files.find((file) => file.localId === preferredLocalId);
        return matchingFile?.localId ?? files[0]?.localId ?? '';
    }

    return files[0]?.localId ?? '';
}

/**
 * Resolves local editor state from the `GET /api/custom-js` payload.
 *
 * @private function of CustomJsClient
 */
function resolveLoadedCustomJavascriptState(
    payload: CustomJavascriptReadResponse,
    defaultJavaScript: string,
    preferredId?: number | null,
): LoadedCustomJavascriptState {
    const isServerFileListEmpty = payload.files.length === 0;
    const files = isServerFileListEmpty
        ? [createNewFileState([], defaultJavaScript)]
        : payload.files.map(mapPayloadToState);
    const serverSnapshot = isServerFileListEmpty ? [] : files;

    return {
        files,
        serverSnapshot,
        maxLength: payload.maxLength,
        selectedFileLocalId: pickSelectedFileLocalId(files, preferredId),
    };
}

/**
 * Validates the current custom JavaScript file before saving.
 *
 * @private function of CustomJsClient
 */
function createSaveValidationError(currentFile: CustomJavascriptFileState, maxLength: number): string | null {
    if (!currentFile.scope.trim()) {
        return 'File name is required.';
    }

    if (currentFile.javascript.length > maxLength) {
        return `File exceeds the ${maxLength.toLocaleString()}-character limit.`;
    }

    return null;
}

/**
 * Builds the API request payload for saving one custom JavaScript file.
 *
 * @private function of CustomJsClient
 */
function createSaveRequest(currentFile: CustomJavascriptFileState): { method: 'POST' | 'PUT'; body: string } {
    const trimmedScope = currentFile.scope.trim();
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

    return {
        method: currentFile.id !== undefined ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
    };
}

/**
 * Replaces one local custom JavaScript file after a successful save.
 *
 * @private function of CustomJsClient
 */
function replaceFile(
    files: ReadonlyArray<CustomJavascriptFileState>,
    fileLocalId: string,
    savedFile: CustomJavascriptFileState,
): CustomJavascriptFileState[] {
    return files.map((file) => (file.localId === fileLocalId ? savedFile : file));
}

/**
 * Merges one saved custom JavaScript file into the server snapshot list.
 *
 * @private function of CustomJsClient
 */
function mergeServerSnapshot(
    serverSnapshot: ReadonlyArray<CustomJavascriptFileState>,
    savedFile: CustomJavascriptFileState,
): CustomJavascriptFileState[] {
    const isFileAlreadyPersisted = serverSnapshot.some((file) => file.localId === savedFile.localId);

    if (isFileAlreadyPersisted) {
        return replaceFile(serverSnapshot, savedFile.localId, savedFile);
    }

    return [...serverSnapshot, savedFile];
}

/**
 * Resolves local state after the current custom JavaScript file is deleted.
 *
 * @private function of CustomJsClient
 */
function resolveDeletedCustomJavascriptState({
    files,
    serverSnapshot,
    deletedFileLocalId,
    defaultJavaScript,
    selectedFileLocalId,
}: ResolveDeletedCustomJavascriptStateProps): DeletedCustomJavascriptState {
    const remainingFiles = files.filter((file) => file.localId !== deletedFileLocalId);

    if (remainingFiles.length === 0) {
        const fallbackFile = createNewFileState([], defaultJavaScript);

        return {
            files: [fallbackFile],
            serverSnapshot: [],
            selectedFileLocalId: fallbackFile.localId,
        };
    }

    return {
        files: remainingFiles,
        serverSnapshot: serverSnapshot.filter((file) => file.localId !== deletedFileLocalId),
        selectedFileLocalId: selectedFileLocalId === deletedFileLocalId ? remainingFiles[0].localId : selectedFileLocalId,
    };
}

/**
 * Creates the local file state returned from the save API while preserving the current local identifier.
 *
 * @private function of CustomJsClient
 */
function createSavedFileState(
    savedFilePayload: CustomJavascriptFilePayload,
    localId: string,
): CustomJavascriptFileState {
    return { ...mapPayloadToState(savedFilePayload), localId };
}

/**
 * Normalizes the error message shown in the editor banner.
 *
 * @private function of CustomJsClient
 */
function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Loads custom JavaScript state from the API and prepares the editor selection.
 *
 * @private function of CustomJsClient
 */
async function fetchCustomJavascriptState(
    defaultJavaScript: string,
    preferredId?: number | null,
): Promise<LoadedCustomJavascriptState> {
    const response = await fetch('/api/custom-js');
    const payload = await readJsonResponse<CustomJavascriptReadResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load custom JavaScript.');
    }

    return resolveLoadedCustomJavascriptState(payload, defaultJavaScript, preferredId);
}

/**
 * Saves one custom JavaScript file through the API.
 *
 * @private function of CustomJsClient
 */
async function saveCustomJavascriptState(
    currentFile: CustomJavascriptFileState,
): Promise<CustomJavascriptSaveResponse> {
    const request = createSaveRequest(currentFile);
    const response = await fetch('/api/custom-js', {
        method: request.method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: request.body,
    });

    const payload = await readJsonResponse<CustomJavascriptSaveResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to save custom JavaScript.');
    }

    return payload;
}

/**
 * Deletes one persisted custom JavaScript file through the API.
 *
 * @private function of CustomJsClient
 */
async function deletePersistedCustomJavascriptFile(currentFile: CustomJavascriptFileState): Promise<void> {
    if (currentFile.id === undefined) {
        return;
    }

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

/**
 * Downloads the current custom JavaScript file as a `.js` file.
 *
 * @private function of CustomJsClient
 */
function downloadCustomJavascriptFile(currentFile: CustomJavascriptFileState): void {
    const filename = `${currentFile.scope || NEW_FILE_BASE_NAME}.js`;
    const blob = new Blob([currentFile.javascript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', filename);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

/**
 * Manages custom JavaScript editor state, analytics settings, and unsaved-change handling.
 *
 * @private function of CustomJsClient
 */
export function useCustomJsClientState(): UseCustomJsClientStateResult {
    const defaultJavaScript = useMemo(() => createDefaultCustomJavascript(), []);
    const [files, setFiles] = useState<CustomJavascriptFileState[]>([]);
    const [serverSnapshot, setServerSnapshot] = useState<CustomJavascriptFileState[]>([]);
    const [selectedFileLocalId, setSelectedFileLocalId] = useState<string>('');
    const [maxLength, setMaxLength] = useState<number>(DEFAULT_MAX_CUSTOM_JAVASCRIPT_LENGTH);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        analyticsHasChanges,
        analyticsLoadError,
        analyticsSettings,
        analyticsStatus,
        isAnalyticsLoading,
        isAnalyticsSaving,
        loadAnalyticsSettings,
        saveAnalyticsSettings,
        updateAnalyticsSettings,
    } = useCustomJsAnalyticsState();

    const serverSnapshotMap = useMemo(() => createServerSnapshotMap(serverSnapshot), [serverSnapshot]);

    const hasUnsavedScriptChanges = useMemo(
        () => hasFilesChanged(files, serverSnapshotMap, serverSnapshot.length),
        [files, serverSnapshot.length, serverSnapshotMap],
    );
    const hasUnsavedChanges = hasUnsavedScriptChanges || analyticsHasChanges;

    const { confirmBeforeClose } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
    });

    const currentFile = useMemo(() => findCurrentFile(files, selectedFileLocalId), [files, selectedFileLocalId]);
    const remainingCharacters = currentFile ? maxLength - currentFile.javascript.length : maxLength;
    const hasCurrentChanges = useMemo(
        () => hasCurrentFileChanged(currentFile, serverSnapshotMap),
        [currentFile, serverSnapshotMap],
    );

    const loadCustomJavascript = useCallback(
        async (preferredId?: number | null) => {
            setIsLoading(true);
            setError(null);
            setSuccessMessage(null);

            try {
                const loadedState = await fetchCustomJavascriptState(defaultJavaScript, preferredId);
                setFiles(loadedState.files);
                setServerSnapshot(loadedState.serverSnapshot);
                setMaxLength(loadedState.maxLength);
                setSelectedFileLocalId(loadedState.selectedFileLocalId);
            } catch (loadError) {
                setError(getErrorMessage(loadError, 'Failed to load custom JavaScript.'));
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
        if (!currentFile && files.length > 0) {
            setSelectedFileLocalId(files[0].localId);
        }
    }, [currentFile, files]);

    const addNewFile = useCallback(() => {
        const draft = createNewFileState(files, defaultJavaScript);
        setFiles((previousFiles) => [...previousFiles, draft]);
        setSelectedFileLocalId(draft.localId);
        setSuccessMessage(null);
    }, [defaultJavaScript, files]);

    const selectFile = useCallback(
        (localId: string) => {
            if (localId === selectedFileLocalId || !confirmBeforeClose()) {
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

            setFiles((previousFiles) =>
                previousFiles.map((file) => (file.localId === currentFile.localId ? { ...file, ...updates } : file)),
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

        const validationError = createSaveValidationError(currentFile, maxLength);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = await saveCustomJavascriptState(currentFile);
            const savedFile = createSavedFileState(payload.file, currentFile.localId);

            setFiles((previousFiles) => replaceFile(previousFiles, currentFile.localId, savedFile));
            setServerSnapshot((previousServerSnapshot) => mergeServerSnapshot(previousServerSnapshot, savedFile));
            setMaxLength(payload.maxLength);
            setSuccessMessage('Custom JavaScript saved. Reload any open pages to see the changes.');
        } catch (saveError) {
            setError(getErrorMessage(saveError, 'Failed to save custom JavaScript.'));
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

        downloadCustomJavascriptFile(currentFile);
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
            await deletePersistedCustomJavascriptFile(currentFile);

            const deletedState = resolveDeletedCustomJavascriptState({
                files,
                serverSnapshot,
                deletedFileLocalId: currentFile.localId,
                defaultJavaScript,
                selectedFileLocalId,
            });

            setFiles(deletedState.files);
            setServerSnapshot(deletedState.serverSnapshot);
            setSelectedFileLocalId(deletedState.selectedFileLocalId);
        } catch (deleteError) {
            setError(getErrorMessage(deleteError, 'Failed to delete custom JavaScript.'));
        } finally {
            setIsDeleting(false);
        }
    }, [confirmBeforeClose, currentFile, defaultJavaScript, files, selectedFileLocalId, serverSnapshot]);

    return {
        addNewFile,
        analyticsHasChanges,
        analyticsLoadError,
        analyticsSettings,
        analyticsStatus,
        currentFile,
        deleteCurrentFile,
        downloadCurrentFile,
        error,
        files,
        handleEditorChange,
        handleScopeChange,
        hasCurrentChanges,
        isAnalyticsLoading,
        isAnalyticsSaving,
        isDeleting,
        isLoading,
        isSaving,
        loadAnalyticsSettings,
        maxLength,
        reloadFromServer,
        remainingCharacters,
        resetToTemplate,
        saveAnalyticsSettings,
        saveCurrentFile,
        selectFile,
        successMessage,
        updateAnalyticsSettings,
    };
}
