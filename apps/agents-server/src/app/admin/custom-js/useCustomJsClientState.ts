'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalyticsSettings } from '../../../constants/analyticsMetadata';
import { createDefaultCustomJavascript } from '../../../constants/customJavascript';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { CustomJsApi } from './CustomJsApi';
import {
    NEW_CUSTOM_JAVASCRIPT_FILE_BASE_NAME,
    createCustomJavascriptSaveValidationError,
    createCustomJavascriptServerSnapshotMap,
    createNewCustomJavascriptFileState,
    createSavedCustomJavascriptFileState,
    findCurrentCustomJavascriptFile,
    hasCurrentCustomJavascriptFileChanged,
    hasCustomJavascriptFilesChanged,
    mergeCustomJavascriptServerSnapshot,
    replaceCustomJavascriptFile,
    resolveDeletedCustomJavascriptState,
    type CustomJavascriptFileState,
} from './CustomJavascriptFileState';
import { useCustomJsAnalyticsState } from './useCustomJsAnalyticsState';

/**
 * Default custom JavaScript length limit used before the first API response arrives.
 *
 * @private function of CustomJsClient
 */
const DEFAULT_MAX_CUSTOM_JAVASCRIPT_LENGTH = 100_000;

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
 * Normalizes the error message shown in the editor banner.
 *
 * @private function of CustomJsClient
 */
function resolveCustomJsActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Downloads the current custom JavaScript file as a `.js` file.
 *
 * @private function of CustomJsClient
 */
function downloadCustomJavascriptFile(currentFile: CustomJavascriptFileState): void {
    const filename = `${currentFile.scope || NEW_CUSTOM_JAVASCRIPT_FILE_BASE_NAME}.js`;
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

    const serverSnapshotMap = useMemo(
        () => createCustomJavascriptServerSnapshotMap(serverSnapshot),
        [serverSnapshot],
    );

    const hasUnsavedScriptChanges = useMemo(
        () => hasCustomJavascriptFilesChanged(files, serverSnapshotMap, serverSnapshot.length),
        [files, serverSnapshot.length, serverSnapshotMap],
    );
    const hasUnsavedChanges = hasUnsavedScriptChanges || analyticsHasChanges;

    const { confirmBeforeClose } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
    });

    const currentFile = useMemo(
        () => findCurrentCustomJavascriptFile(files, selectedFileLocalId),
        [files, selectedFileLocalId],
    );
    const remainingCharacters = currentFile ? maxLength - currentFile.javascript.length : maxLength;
    const hasCurrentChanges = useMemo(
        () => hasCurrentCustomJavascriptFileChanged(currentFile, serverSnapshotMap),
        [currentFile, serverSnapshotMap],
    );

    const clearMessages = useCallback(() => {
        setError(null);
        setSuccessMessage(null);
    }, []);

    const loadCustomJavascript = useCallback(
        async (preferredId?: number | null) => {
            setIsLoading(true);
            clearMessages();

            try {
                const loadedState = await CustomJsApi.fetchCustomJavascriptState(defaultJavaScript, preferredId);
                setFiles(loadedState.files);
                setServerSnapshot(loadedState.serverSnapshot);
                setMaxLength(loadedState.maxLength);
                setSelectedFileLocalId(loadedState.selectedFileLocalId);
            } catch (loadError) {
                setError(resolveCustomJsActionErrorMessage(loadError, 'Failed to load custom JavaScript.'));
            } finally {
                setIsLoading(false);
            }
        },
        [clearMessages, defaultJavaScript],
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
        const draft = createNewCustomJavascriptFileState(files, defaultJavaScript);
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
                replaceCustomJavascriptFile(previousFiles, currentFile.localId, { ...currentFile, ...updates }),
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

        const validationError = createCustomJavascriptSaveValidationError(currentFile, maxLength);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);
        clearMessages();

        try {
            const payload = await CustomJsApi.saveCustomJavascriptFile(currentFile);
            const savedFile = createSavedCustomJavascriptFileState(payload.file, currentFile.localId);

            setFiles((previousFiles) => replaceCustomJavascriptFile(previousFiles, currentFile.localId, savedFile));
            setServerSnapshot((previousServerSnapshot) =>
                mergeCustomJavascriptServerSnapshot(previousServerSnapshot, savedFile),
            );
            setMaxLength(payload.maxLength);
            setSuccessMessage('Custom JavaScript saved. Reload any open pages to see the changes.');
        } catch (saveError) {
            setError(resolveCustomJsActionErrorMessage(saveError, 'Failed to save custom JavaScript.'));
        } finally {
            setIsSaving(false);
        }
    }, [clearMessages, currentFile, maxLength]);

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
        clearMessages();

        try {
            await CustomJsApi.deletePersistedCustomJavascriptFile(currentFile);

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
            setError(resolveCustomJsActionErrorMessage(deleteError, 'Failed to delete custom JavaScript.'));
        } finally {
            setIsDeleting(false);
        }
    }, [
        clearMessages,
        confirmBeforeClose,
        currentFile,
        defaultJavaScript,
        files,
        selectedFileLocalId,
        serverSnapshot,
    ]);

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
