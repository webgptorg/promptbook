'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { FolderEditValues } from './FolderEditDialog';
import type { FolderEditDialogState } from './FolderEditDialogState';
import { useAgentsListFolderDeletionState } from './useAgentsListFolderDeletionState';
import { useAgentsListFolderEditState } from './useAgentsListFolderEditState';
import { useAgentsListFolderVisibilityState } from './useAgentsListFolderVisibilityState';

/**
 * Setter for the interactive local agents cache.
 *
 * @private function of AgentsList
 */
type AgentOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationAgent[]>>;

/**
 * Setter for the interactive local folders cache.
 *
 * @private function of AgentsList
 */
type FolderOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationFolder[]>>;

/**
 * Props accepted by the private folder-management hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly breadcrumbFolders: ReadonlyArray<Pick<AgentOrganizationFolder, 'id' | 'name'>>;
    readonly childrenByParentId: ReadonlyMap<number | null, number[]>;
    readonly currentFolderId: number | null;
    readonly folders: AgentOrganizationFolder[];
    readonly formatText: (text: string) => string;
    readonly navigateToFolder: (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => void;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly setFolders: FolderOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Folder-management state returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderStateResult = {
    readonly folderEditDialogState: FolderEditDialogState | null;
    readonly handleCloseFolderEditDialog: () => void;
    readonly handleCreateFolder: () => void;
    readonly handleDeleteFolder: (folderId: number) => Promise<void>;
    readonly handleRenameFolder: (folderId: number) => void;
    readonly handleRequestFolderVisibilityUpdate: (folderId: number) => Promise<void>;
    readonly handleSubmitFolderEdit: (values: FolderEditValues) => Promise<void>;
    readonly isFolderEditSubmitting: boolean;
};

/**
 * Owns the folder editor, deletion, and visibility flows for `AgentsList`.
 *
 * @param props - Folder-related state and mutation helpers.
 * @returns Dialog state and handlers for folder management.
 *
 * @private function of AgentsList
 */
export function useAgentsListFolderState({
    agents,
    breadcrumbFolders,
    childrenByParentId,
    currentFolderId,
    folders,
    formatText,
    navigateToFolder,
    setAgents,
    setFolders,
    synchronizeAfterMutation,
}: UseAgentsListFolderStateProps): UseAgentsListFolderStateResult {
    const folderEditState = useAgentsListFolderEditState({
        breadcrumbFolders,
        currentFolderId,
        folders,
        navigateToFolder,
        setFolders,
        synchronizeAfterMutation,
    });
    const handleDeleteFolder = useAgentsListFolderDeletionState({
        agents,
        childrenByParentId,
        currentFolderId,
        folders,
        formatText,
        navigateToFolder,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
    });
    const handleRequestFolderVisibilityUpdate = useAgentsListFolderVisibilityState({
        agents,
        childrenByParentId,
        folders,
        formatText,
        setAgents,
        synchronizeAfterMutation,
    });

    return {
        folderEditDialogState: folderEditState.folderEditDialogState,
        handleCloseFolderEditDialog: folderEditState.handleCloseFolderEditDialog,
        handleCreateFolder: folderEditState.handleCreateFolder,
        handleDeleteFolder,
        handleRenameFolder: folderEditState.handleRenameFolder,
        handleRequestFolderVisibilityUpdate,
        handleSubmitFolderEdit: folderEditState.handleSubmitFolderEdit,
        isFolderEditSubmitting: folderEditState.isFolderEditSubmitting,
    };
}
