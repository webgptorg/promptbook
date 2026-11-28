'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { createDefaultCustomStylesheetCss, MAX_CUSTOM_STYLESHEET_LENGTH } from '../../../constants/customStylesheet';
import { CustomCssApi } from './CustomCssApi';
import {
    createCustomCssSaveValidationError,
    createCustomCssServerSnapshotMap,
    createNewCustomCssFileState,
    createSavedCustomCssFileState,
    findCurrentCustomCssFile,
    hasCurrentCustomCssFileChanged,
    hasCustomCssFilesChanged,
    mergeCustomCssServerSnapshot,
    replaceCustomCssFile,
    resolveDeletedCustomCssState,
    type CustomStylesheetFileState,
} from './CustomStylesheetFileState';

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
 * Normalizes the error message shown in the editor banner.
 *
 * @private function of CustomCssClient
 */
function resolveCustomCssActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
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

    const serverSnapshotMap = useMemo(() => createCustomCssServerSnapshotMap(serverSnapshot), [serverSnapshot]);

    const hasUnsavedChanges = useMemo(
        () => hasCustomCssFilesChanged(files, serverSnapshotMap, serverSnapshot.length),
        [files, serverSnapshot.length, serverSnapshotMap],
    );

    const { confirmBeforeClose } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
    });

    const currentFile = useMemo(() => findCurrentCustomCssFile(files, selectedFileLocalId), [files, selectedFileLocalId]);
    const remainingCharacters = currentFile ? maxLength - currentFile.css.length : maxLength;
    const hasCurrentChanges = useMemo(
        () => hasCurrentCustomCssFileChanged(currentFile, serverSnapshotMap),
        [currentFile, serverSnapshotMap],
    );

    const clearMessages = useCallback(() => {
        setError(null);
        setSuccessMessage(null);
    }, []);

    const loadCustomCss = useCallback(
        async (preferredId?: number | null) => {
            setIsLoading(true);
            clearMessages();

            try {
                const loadedState = await CustomCssApi.fetchCustomCssState(defaultCss, preferredId);
                setFiles(loadedState.files);
                setServerSnapshot(loadedState.serverSnapshot);
                setMaxLength(loadedState.maxLength);
                setSelectedFileLocalId(loadedState.selectedFileLocalId);
            } catch (loadError) {
                setError(resolveCustomCssActionErrorMessage(loadError, 'Failed to load custom CSS.'));
            } finally {
                setIsLoading(false);
            }
        },
        [clearMessages, defaultCss],
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
        const draft = createNewCustomCssFileState(files, defaultCss);
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
                replaceCustomCssFile(previousFiles, currentFile.localId, { ...currentFile, ...updates }),
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

        const validationError = createCustomCssSaveValidationError(currentFile, maxLength);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);
        clearMessages();

        try {
            const savedResponse = await CustomCssApi.saveCustomCssFile(currentFile);
            const savedFile = createSavedCustomCssFileState(savedResponse.file, currentFile.localId);

            setFiles((previousFiles) => replaceCustomCssFile(previousFiles, currentFile.localId, savedFile));
            setServerSnapshot((previousServerSnapshot) => mergeCustomCssServerSnapshot(previousServerSnapshot, savedFile));
            setMaxLength(savedResponse.maxLength);
            setSuccessMessage('Custom CSS saved. Refresh any open pages to see the updates.');
        } catch (saveError) {
            setError(resolveCustomCssActionErrorMessage(saveError, 'Failed to save custom stylesheet.'));
        } finally {
            setIsSaving(false);
        }
    }, [clearMessages, currentFile, maxLength]);

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
        clearMessages();

        try {
            await CustomCssApi.deletePersistedCustomCssFile(currentFile);

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
            setError(resolveCustomCssActionErrorMessage(deleteError, 'Failed to delete custom stylesheet.'));
        } finally {
            setIsDeleting(false);
        }
    }, [clearMessages, confirmBeforeClose, currentFile, defaultCss, files, selectedFileLocalId, serverSnapshot]);

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
