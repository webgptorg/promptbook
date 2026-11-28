'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import type { FolderEditValues } from './FolderEditDialog';
import { AgentsListFolderApi } from './AgentsListFolderApi';
import { createFolderEditDialogState, type FolderEditDialogState } from './FolderEditDialogState';
import { findFolderById } from './agentOrganizationUtils';

/**
 * Setter for the interactive local folders cache.
 *
 * @private function of AgentsList
 */
type FolderOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationFolder[]>>;

/**
 * Props accepted by the private folder edit hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderEditStateProps = {
    readonly breadcrumbFolders: ReadonlyArray<Pick<AgentOrganizationFolder, 'id' | 'name'>>;
    readonly currentFolderId: number | null;
    readonly folders: AgentOrganizationFolder[];
    readonly navigateToFolder: (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => void;
    readonly setFolders: FolderOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Folder dialog state and handlers returned to `useAgentsListFolderState`.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderEditStateResult = {
    readonly folderEditDialogState: FolderEditDialogState | null;
    readonly handleCloseFolderEditDialog: () => void;
    readonly handleCreateFolder: () => void;
    readonly handleRenameFolder: (folderId: number) => void;
    readonly handleSubmitFolderEdit: (values: FolderEditValues) => Promise<void>;
    readonly isFolderEditSubmitting: boolean;
};

/**
 * Trims and validates folder edit values before submission.
 *
 * @param values - Folder dialog values to validate.
 * @returns Normalized values and a validation error when present.
 *
 * @private function of AgentsList
 */
function normalizeFolderEditValues(values: FolderEditValues): {
    readonly normalizedValues: FolderEditValues;
    readonly errorMessage: string | null;
} {
    const normalizedValues = { ...values, name: values.name.trim() };

    if (!normalizedValues.name) {
        return {
            normalizedValues,
            errorMessage: 'Folder name cannot be empty.',
        };
    }

    if (normalizedValues.name.includes('/')) {
        return {
            normalizedValues,
            errorMessage: 'Folder name cannot include "/".',
        };
    }

    return {
        normalizedValues,
        errorMessage: null,
    };
}

/**
 * Resolves the failure dialog title for folder create/edit submission.
 *
 * @param mode - Current folder dialog mode.
 * @returns Dialog title for failed submission.
 *
 * @private function of AgentsList
 */
function resolveFolderEditFailureTitle(mode: FolderEditDialogState['mode']): string {
    return mode === 'CREATE' ? 'Create failed' : 'Update failed';
}

/**
 * Replaces one folder entry with its updated persisted value.
 *
 * @param folders - Existing folders collection.
 * @param folderId - Folder being updated.
 * @param updatedFolder - Latest folder payload from the API.
 * @returns Folder collection with the updated folder merged in place.
 *
 * @private function of AgentsList
 */
function mergeUpdatedFolder(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    folderId: number,
    updatedFolder: AgentOrganizationFolder,
): AgentOrganizationFolder[] {
    return folders.map((folder) => (folder.id === folderId ? { ...folder, ...updatedFolder } : folder));
}

/**
 * Returns whether a folder currently participates in the breadcrumb trail.
 *
 * @param breadcrumbFolders - Current breadcrumb folders.
 * @param folderId - Folder being updated.
 * @returns True when the route breadcrumb should be refreshed after rename.
 *
 * @private function of AgentsList
 */
function isFolderInBreadcrumbTrail(
    breadcrumbFolders: ReadonlyArray<Pick<AgentOrganizationFolder, 'id' | 'name'>>,
    folderId: number,
): boolean {
    return breadcrumbFolders.some((folder) => folder.id === folderId);
}

/**
 * Owns create/edit folder dialog state and persistence for `AgentsList`.
 *
 * @param props - Folder dialog inputs and state mutation helpers.
 * @returns Folder dialog state plus create, rename, and submit handlers.
 *
 * @private function of AgentsList
 */
export function useAgentsListFolderEditState({
    breadcrumbFolders,
    currentFolderId,
    folders,
    navigateToFolder,
    setFolders,
    synchronizeAfterMutation,
}: UseAgentsListFolderEditStateProps): UseAgentsListFolderEditStateResult {
    const [folderEditDialogState, setFolderEditDialogState] = useState<FolderEditDialogState | null>(null);
    const [isFolderEditSubmitting, setIsFolderEditSubmitting] = useState<boolean>(false);

    const resetFolderEditDialogState = useCallback(() => {
        setFolderEditDialogState(null);
    }, []);

    const handleCreateFolder = useCallback(() => {
        setFolderEditDialogState(createFolderEditDialogState('CREATE', null));
    }, []);

    const handleRenameFolder = useCallback(
        (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            setFolderEditDialogState(createFolderEditDialogState('EDIT', folderId, folder));
        },
        [folders],
    );

    const handleSubmitFolderEdit = useCallback(
        async (values: FolderEditValues) => {
            const activeDialogState = folderEditDialogState;
            if (!activeDialogState) {
                return;
            }

            const { errorMessage, normalizedValues } = normalizeFolderEditValues(values);
            if (errorMessage) {
                await showAlert({
                    title: 'Invalid name',
                    message: errorMessage,
                }).catch(() => undefined);
                return;
            }

            setIsFolderEditSubmitting(true);
            try {
                if (activeDialogState.mode === 'CREATE') {
                    const createdFolder = await AgentsListFolderApi.createFolder(currentFolderId ?? null, normalizedValues);

                    setFolders((prev) => [...prev, createdFolder]);
                    synchronizeAfterMutation('create-folder');
                    resetFolderEditDialogState();
                    return;
                }

                const folderId = activeDialogState.folderId;
                if (folderId === null) {
                    return;
                }

                const updatedFolder = await AgentsListFolderApi.updateFolder(folderId, normalizedValues);
                const nextFolders = mergeUpdatedFolder(folders, folderId, updatedFolder);

                setFolders(nextFolders);
                synchronizeAfterMutation('rename-folder');

                if (isFolderInBreadcrumbTrail(breadcrumbFolders, folderId)) {
                    navigateToFolder(currentFolderId ?? null, nextFolders);
                }

                resetFolderEditDialogState();
            } catch (error) {
                await showAlert({
                    title: resolveFolderEditFailureTitle(activeDialogState.mode),
                    message: error instanceof Error ? error.message : 'Failed to update folder.',
                }).catch(() => undefined);
            } finally {
                setIsFolderEditSubmitting(false);
            }
        },
        [
            breadcrumbFolders,
            currentFolderId,
            folderEditDialogState,
            folders,
            navigateToFolder,
            resetFolderEditDialogState,
            setFolders,
            synchronizeAfterMutation,
        ],
    );

    const handleCloseFolderEditDialog = useCallback(() => {
        if (isFolderEditSubmitting) {
            return;
        }

        resetFolderEditDialogState();
    }, [isFolderEditSubmitting, resetFolderEditDialogState]);

    return {
        folderEditDialogState,
        handleCloseFolderEditDialog,
        handleCreateFolder,
        handleRenameFolder,
        handleSubmitFolderEdit,
        isFolderEditSubmitting,
    };
}
