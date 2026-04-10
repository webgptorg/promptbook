'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { createDefaultCustomStylesheetCss, MAX_CUSTOM_STYLESHEET_LENGTH } from '../../../constants/customStylesheet';
import { readJsonResponse } from '../custom-resource/shared';

/**
 * Constant for new file base name.
 *
 * @private function of CustomCssClient
 */
const NEW_FILE_BASE_NAME = 'custom-stylesheet';

/**
 * Serialized custom stylesheet file returned by the API.
 *
 * @private function of CustomCssClient
 */
type CustomStylesheetFilePayload = {
    id: number;
    scope: string;
    css: string;
    createdAt: string;
    updatedAt: string | null;
};

/**
 * API payload returned by `GET /api/custom-css`.
 *
 * @private function of CustomCssClient
 */
type CustomCssReadResponse = {
    files: CustomStylesheetFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-css`.
 *
 * @private function of CustomCssClient
 */
type CustomCssSaveResponse = {
    file: CustomStylesheetFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-css`.
 *
 * @private function of CustomCssClient
 */
type CustomCssDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * UI state for a custom stylesheet entry tracked across unsaved edits.
 *
 * @private function of CustomCssClient
 */
export type CustomStylesheetFileState = {
    localId: string;
    id?: number;
    scope: string;
    css: string;
    createdAt?: string;
    updatedAt?: string | null;
};

/**
 * Normalized state returned after loading stylesheets from the server.
 *
 * @private function of CustomCssClient
 */
type LoadedCustomCssState = {
    files: CustomStylesheetFileState[];
    serverSnapshot: CustomStylesheetFileState[];
    maxLength: number;
    selectedFileLocalId: string;
};

/**
 * Normalized state returned after deleting the current stylesheet.
 *
 * @private function of CustomCssClient
 */
type DeletedCustomCssState = {
    files: CustomStylesheetFileState[];
    serverSnapshot: CustomStylesheetFileState[];
    selectedFileLocalId: string;
};

/**
 * Props consumed by `resolveDeletedCustomCssState`.
 *
 * @private function of CustomCssClient
 */
type ResolveDeletedCustomCssStateProps = {
    files: CustomStylesheetFileState[];
    serverSnapshot: CustomStylesheetFileState[];
    deletedFileLocalId: string;
    defaultCss: string;
    selectedFileLocalId: string;
};

/**
 * Result returned by `useCustomCssClientState`.
 *
 * @private function of CustomCssClient
 */
type UseCustomCssClientStateResult = {
    addNewFile: () => void;
    currentFile: CustomStylesheetFileState | null;
    deleteCurrentFile: () => Promise<void>;
    downloadCurrentFile: () => void;
    error: string | null;
    files: CustomStylesheetFileState[];
    handleEditorChange: (value: string | undefined) => void;
    handleScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    hasCurrentChanges: boolean;
    isDeleting: boolean;
    isLoading: boolean;
    isSaving: boolean;
    maxLength: number;
    reloadFromServer: () => Promise<void>;
    remainingCharacters: number;
    resetToTemplate: () => void;
    saveCurrentFile: () => Promise<void>;
    selectFile: (localId: string) => void;
    successMessage: string | null;
};

/**
 * Generates a short local identifier for tracking unsaved entries.
 *
 * @private function of CustomCssClient
 */
function buildLocalId(): string {
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Maps a persisted stylesheet payload into local editor state.
 *
 * @private function of CustomCssClient
 */
function mapPayloadToState(file: CustomStylesheetFilePayload): CustomStylesheetFileState {
    return {
        localId: `server-${file.id}`,
        id: file.id,
        scope: file.scope,
        css: file.css,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    };
}

/**
 * Picks a unique default stylesheet name that does not collide with existing entries.
 *
 * @private function of CustomCssClient
 */
function pickUniqueFileName(existing: ReadonlyArray<CustomStylesheetFileState>): string {
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
 * Builds a fresh editor state for a new custom stylesheet entry.
 *
 * @private function of CustomCssClient
 */
function createNewFileState(
    existing: ReadonlyArray<CustomStylesheetFileState>,
    template: string,
): CustomStylesheetFileState {
    return {
        localId: buildLocalId(),
        scope: pickUniqueFileName(existing),
        css: template,
        updatedAt: null,
    };
}

/**
 * Creates a lookup map for the last server-confirmed stylesheet snapshot.
 *
 * @private function of CustomCssClient
 */
function createServerSnapshotMap(serverSnapshot: ReadonlyArray<CustomStylesheetFileState>) {
    const map = new Map<string, CustomStylesheetFileState>();

    serverSnapshot.forEach((file) => {
        map.set(file.localId, file);
    });

    return map;
}

/**
 * Determines whether any local stylesheet differs from the last saved snapshot.
 *
 * @private function of CustomCssClient
 */
function hasFilesChanged(
    files: ReadonlyArray<CustomStylesheetFileState>,
    serverSnapshotMap: ReadonlyMap<string, CustomStylesheetFileState>,
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

        return snapshot.scope !== file.scope || snapshot.css !== file.css;
    });
}

/**
 * Resolves the stylesheet currently shown in the editor.
 *
 * @private function of CustomCssClient
 */
function findCurrentFile(
    files: ReadonlyArray<CustomStylesheetFileState>,
    selectedFileLocalId: string,
): CustomStylesheetFileState | null {
    return files.find((file) => file.localId === selectedFileLocalId) ?? files[0] ?? null;
}

/**
 * Determines whether the currently selected stylesheet differs from the last saved snapshot.
 *
 * @private function of CustomCssClient
 */
function hasCurrentFileChanged(
    currentFile: CustomStylesheetFileState | null,
    serverSnapshotMap: ReadonlyMap<string, CustomStylesheetFileState>,
): boolean {
    if (!currentFile) {
        return true;
    }

    const currentSnapshot = serverSnapshotMap.get(currentFile.localId);
    if (!currentSnapshot) {
        return true;
    }

    return currentSnapshot.scope !== currentFile.scope || currentSnapshot.css !== currentFile.css;
}

/**
 * Chooses the stylesheet that should stay selected after one load completes.
 *
 * @private function of CustomCssClient
 */
function pickSelectedFileLocalId(
    files: ReadonlyArray<CustomStylesheetFileState>,
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
 * Resolves local editor state from the `GET /api/custom-css` payload.
 *
 * @private function of CustomCssClient
 */
function resolveLoadedCustomCssState(
    payload: CustomCssReadResponse,
    defaultCss: string,
    preferredId?: number | null,
): LoadedCustomCssState {
    const hasServerFiles = payload.files.length > 0;
    const files = hasServerFiles ? payload.files.map(mapPayloadToState) : [createNewFileState([], defaultCss)];
    const serverSnapshot = hasServerFiles ? files : [];

    return {
        files,
        serverSnapshot,
        maxLength: payload.maxLength || MAX_CUSTOM_STYLESHEET_LENGTH,
        selectedFileLocalId: pickSelectedFileLocalId(files, preferredId),
    };
}

/**
 * Validates the stylesheet before saving.
 *
 * @private function of CustomCssClient
 */
function createSaveValidationError(currentFile: CustomStylesheetFileState, maxLength: number): string | null {
    if (!currentFile.scope.trim()) {
        return 'Stylesheet name is required.';
    }

    if (currentFile.css.length > maxLength) {
        return `Stylesheet exceeds the ${maxLength.toLocaleString()}-character limit.`;
    }

    return null;
}

/**
 * Builds the API request payload for saving one stylesheet.
 *
 * @private function of CustomCssClient
 */
function createSaveRequest(currentFile: CustomStylesheetFileState): { method: 'POST' | 'PUT'; body: string } {
    const trimmedScope = currentFile.scope.trim();
    const payload =
        currentFile.id !== undefined
            ? {
                  id: currentFile.id,
                  scope: trimmedScope,
                  css: currentFile.css,
              }
            : {
                  scope: trimmedScope,
                  css: currentFile.css,
              };

    return {
        method: currentFile.id !== undefined ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
    };
}

/**
 * Replaces one local stylesheet entry after a successful save.
 *
 * @private function of CustomCssClient
 */
function replaceFile(
    files: ReadonlyArray<CustomStylesheetFileState>,
    fileLocalId: string,
    savedFile: CustomStylesheetFileState,
): CustomStylesheetFileState[] {
    return files.map((file) => (file.localId === fileLocalId ? savedFile : file));
}

/**
 * Merges one saved stylesheet into the server snapshot list.
 *
 * @private function of CustomCssClient
 */
function mergeServerSnapshot(
    serverSnapshot: ReadonlyArray<CustomStylesheetFileState>,
    savedFile: CustomStylesheetFileState,
): CustomStylesheetFileState[] {
    const alreadyExists = serverSnapshot.some((file) => file.localId === savedFile.localId);

    if (alreadyExists) {
        return replaceFile(serverSnapshot, savedFile.localId, savedFile);
    }

    return [...serverSnapshot, savedFile];
}

/**
 * Resolves local state after the current stylesheet is deleted.
 *
 * @private function of CustomCssClient
 */
function resolveDeletedCustomCssState({
    files,
    serverSnapshot,
    deletedFileLocalId,
    defaultCss,
    selectedFileLocalId,
}: ResolveDeletedCustomCssStateProps): DeletedCustomCssState {
    const remainingFiles = files.filter((file) => file.localId !== deletedFileLocalId);

    if (remainingFiles.length === 0) {
        const fallbackFile = createNewFileState([], defaultCss);

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
 * Creates the local file state returned from the save API while preserving the existing local identifier.
 *
 * @private function of CustomCssClient
 */
function createSavedFileState(
    savedFilePayload: CustomStylesheetFilePayload,
    localId: string,
): CustomStylesheetFileState {
    return { ...mapPayloadToState(savedFilePayload), localId };
}

/**
 * Normalizes the error message shown in the editor banner.
 *
 * @private function of CustomCssClient
 */
function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Loads custom CSS state from the API and prepares the editor selection.
 *
 * @private function of CustomCssClient
 */
async function fetchCustomCssState(defaultCss: string, preferredId?: number | null): Promise<LoadedCustomCssState> {
    const response = await fetch('/api/custom-css');
    const payload = await readJsonResponse<CustomCssReadResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load custom CSS.');
    }

    return resolveLoadedCustomCssState(payload, defaultCss, preferredId);
}

/**
 * Saves one stylesheet through the custom CSS API.
 *
 * @private function of CustomCssClient
 */
async function saveCustomCssState(currentFile: CustomStylesheetFileState): Promise<CustomCssSaveResponse> {
    const request = createSaveRequest(currentFile);
    const response = await fetch('/api/custom-css', {
        method: request.method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: request.body,
    });

    const payload = await readJsonResponse<CustomCssSaveResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to save custom stylesheet.');
    }

    return payload;
}

/**
 * Deletes one persisted stylesheet through the custom CSS API.
 *
 * @private function of CustomCssClient
 */
async function deletePersistedCustomCssFile(currentFile: CustomStylesheetFileState): Promise<void> {
    if (currentFile.id === undefined) {
        return;
    }

    const response = await fetch('/api/custom-css', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: currentFile.id }),
    });

    const payload = await readJsonResponse<CustomCssDeleteResponse>(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete custom stylesheet.');
    }
}

/**
 * Downloads the current stylesheet as a `.css` file.
 *
 * @private function of CustomCssClient
 */
function downloadCustomCssFile(currentFile: CustomStylesheetFileState): void {
    const filename = `${currentFile.scope || 'custom-stylesheet'}.css`;
    const blob = new Blob([currentFile.css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', filename);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

/**
 * Manages custom CSS editor state, persistence, and unsaved-change handling.
 *
 * @private function of CustomCssClient
 */
export function useCustomCssClientState(): UseCustomCssClientStateResult {
    const defaultCss = useMemo(() => createDefaultCustomStylesheetCss(), []);
    const [files, setFiles] = useState<CustomStylesheetFileState[]>([]);
    const [serverSnapshot, setServerSnapshot] = useState<CustomStylesheetFileState[]>([]);
    const [selectedFileLocalId, setSelectedFileLocalId] = useState<string>('');
    const [maxLength, setMaxLength] = useState<number>(MAX_CUSTOM_STYLESHEET_LENGTH);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const serverSnapshotMap = useMemo(() => createServerSnapshotMap(serverSnapshot), [serverSnapshot]);

    const hasUnsavedChanges = useMemo(
        () => hasFilesChanged(files, serverSnapshotMap, serverSnapshot.length),
        [files, serverSnapshot.length, serverSnapshotMap],
    );

    const { confirmBeforeClose } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
    });

    const currentFile = useMemo(() => findCurrentFile(files, selectedFileLocalId), [files, selectedFileLocalId]);
    const remainingCharacters = currentFile ? maxLength - currentFile.css.length : maxLength;
    const hasCurrentChanges = useMemo(
        () => hasCurrentFileChanged(currentFile, serverSnapshotMap),
        [currentFile, serverSnapshotMap],
    );

    const loadCustomCss = useCallback(
        async (preferredId?: number | null) => {
            setIsLoading(true);
            setError(null);
            setSuccessMessage(null);

            try {
                const loadedState = await fetchCustomCssState(defaultCss, preferredId);
                setFiles(loadedState.files);
                setServerSnapshot(loadedState.serverSnapshot);
                setMaxLength(loadedState.maxLength);
                setSelectedFileLocalId(loadedState.selectedFileLocalId);
            } catch (loadError) {
                setError(getErrorMessage(loadError, 'Failed to load custom CSS.'));
            } finally {
                setIsLoading(false);
            }
        },
        [defaultCss],
    );

    useEffect(() => {
        void loadCustomCss();
    }, [loadCustomCss]);

    useEffect(() => {
        if (!currentFile && files.length > 0) {
            setSelectedFileLocalId(files[0].localId);
        }
    }, [currentFile, files]);

    const addNewFile = useCallback(() => {
        const draft = createNewFileState(files, defaultCss);
        setFiles((previousFiles) => [...previousFiles, draft]);
        setSelectedFileLocalId(draft.localId);
        setSuccessMessage(null);
    }, [defaultCss, files]);

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
        (updates: Partial<CustomStylesheetFileState>) => {
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
            updateCurrentFile({ css: value ?? '' });
        },
        [updateCurrentFile],
    );

    const resetToTemplate = useCallback(() => {
        updateCurrentFile({ css: defaultCss });
    }, [defaultCss, updateCurrentFile]);

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
            const payload = await saveCustomCssState(currentFile);
            const savedFile = createSavedFileState(payload.file, currentFile.localId);

            setFiles((previousFiles) => replaceFile(previousFiles, currentFile.localId, savedFile));
            setServerSnapshot((previousServerSnapshot) => mergeServerSnapshot(previousServerSnapshot, savedFile));
            setMaxLength(payload.maxLength);
            setSuccessMessage('Custom CSS saved. Refresh any open pages to see the updates.');
        } catch (saveError) {
            setError(getErrorMessage(saveError, 'Failed to save custom stylesheet.'));
        } finally {
            setIsSaving(false);
        }
    }, [currentFile, maxLength]);

    const reloadFromServer = useCallback(async () => {
        if (!confirmBeforeClose()) {
            return;
        }

        await loadCustomCss(currentFile?.id ?? null);
    }, [confirmBeforeClose, currentFile?.id, loadCustomCss]);

    const downloadCurrentFile = useCallback(() => {
        if (!currentFile) {
            return;
        }

        downloadCustomCssFile(currentFile);
    }, [currentFile]);

    const deleteCurrentFile = useCallback(async () => {
        if (!currentFile) {
            return;
        }

        if (!confirmBeforeClose()) {
            return;
        }

        const shouldDelete = window.confirm('Delete this stylesheet? This cannot be undone.');
        if (!shouldDelete) {
            return;
        }

        setIsDeleting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await deletePersistedCustomCssFile(currentFile);

            const deletedState = resolveDeletedCustomCssState({
                files,
                serverSnapshot,
                deletedFileLocalId: currentFile.localId,
                defaultCss,
                selectedFileLocalId,
            });

            setFiles(deletedState.files);
            setServerSnapshot(deletedState.serverSnapshot);
            setSelectedFileLocalId(deletedState.selectedFileLocalId);
        } catch (deleteError) {
            setError(getErrorMessage(deleteError, 'Failed to delete custom stylesheet.'));
        } finally {
            setIsDeleting(false);
        }
    }, [confirmBeforeClose, currentFile, defaultCss, files, selectedFileLocalId, serverSnapshot]);

    return {
        addNewFile,
        currentFile,
        deleteCurrentFile,
        downloadCurrentFile,
        error,
        files,
        handleEditorChange,
        handleScopeChange,
        hasCurrentChanges,
        isDeleting,
        isLoading,
        isSaving,
        maxLength,
        reloadFromServer,
        remainingCharacters,
        resetToTemplate,
        saveCurrentFile,
        selectFile,
        successMessage,
    };
}
