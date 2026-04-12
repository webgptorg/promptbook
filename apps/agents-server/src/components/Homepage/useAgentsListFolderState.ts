'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { DEFAULT_AGENT_VISIBILITY, type AgentVisibility } from '../../utils/agentVisibility';
import { DEFAULT_FOLDER_COLOR, DEFAULT_FOLDER_ICON } from '../../utils/agentOrganization/folderAppearance';
import { showAlert, showConfirm, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
import type { FolderEditValues } from './FolderEditDialog';
import { createFolderDescendantContext, findFolderById } from './agentOrganizationUtils';

/**
 * State for create/edit folder dialog interactions.
 *
 * @private function of AgentsList
 */
type FolderEditDialogState = {
    readonly mode: 'CREATE' | 'EDIT';
    readonly folderId: number | null;
    readonly initialValues: FolderEditValues;
};

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
 * Creates the initial values shown in the folder dialog.
 *
 * @param folder - Optional folder whose values should seed the dialog.
 * @returns Folder edit form values.
 *
 * @private function of AgentsList
 */
function createFolderEditInitialValues(folder?: AgentOrganizationFolder | null): FolderEditValues {
    return {
        name: folder?.name ?? '',
        icon: folder?.icon ?? DEFAULT_FOLDER_ICON,
        color: folder?.color ?? DEFAULT_FOLDER_COLOR,
    };
}

/**
 * Creates create/edit dialog state for folder operations.
 *
 * @param mode - Dialog mode.
 * @param folderId - Edited folder id or null for create mode.
 * @param folder - Optional folder used to seed edit defaults.
 * @returns Dialog state object.
 *
 * @private function of AgentsList
 */
function createFolderEditDialogState(
    mode: FolderEditDialogState['mode'],
    folderId: number | null,
    folder?: AgentOrganizationFolder | null,
): FolderEditDialogState {
    return {
        mode,
        folderId,
        initialValues: createFolderEditInitialValues(folder),
    };
}

/**
 * Validates a folder name before create/edit actions.
 *
 * @param name - Folder name to validate.
 * @returns Error message for invalid names, otherwise null.
 *
 * @private function of AgentsList
 */
function validateFolderName(name: string): string | null {
    if (!name) {
        return 'Folder name cannot be empty.';
    }
    if (name.includes('/')) {
        return 'Folder name cannot include "/".';
    }
    return null;
}

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

    return {
        normalizedValues,
        errorMessage: validateFolderName(normalizedValues.name),
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
    const [folderEditDialogState, setFolderEditDialogState] = useState<FolderEditDialogState | null>(null);
    const [isFolderEditSubmitting, setIsFolderEditSubmitting] = useState<boolean>(false);

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

    const createFolderFromDialog = useCallback(
        async (values: FolderEditValues) => {
            const response = await fetch('/api/agent-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
                    parentId: currentFolderId ?? null,
                    icon: values.icon,
                    color: values.color,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create folder.');
            }

            setFolders((prev) => [...prev, data.folder as AgentOrganizationFolder]);
            synchronizeAfterMutation('create-folder');
            setFolderEditDialogState(null);
        },
        [currentFolderId, setFolders, synchronizeAfterMutation],
    );

    const updateFolderFromDialog = useCallback(
        async (folderId: number, values: FolderEditValues) => {
            const response = await fetch(`/api/agent-folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
                    icon: values.icon,
                    color: values.color,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update folder.');
            }

            const updatedFolder = data.folder as AgentOrganizationFolder;
            const nextFolders = folders.map((item) => (item.id === folderId ? { ...item, ...updatedFolder } : item));

            setFolders(nextFolders);
            synchronizeAfterMutation('rename-folder');

            if (breadcrumbFolders.some((item) => item.id === folderId)) {
                navigateToFolder(currentFolderId ?? null, nextFolders);
            }

            setFolderEditDialogState(null);
        },
        [breadcrumbFolders, currentFolderId, folders, navigateToFolder, setFolders, synchronizeAfterMutation],
    );

    const handleSubmitFolderEdit = useCallback(
        async (values: FolderEditValues) => {
            if (!folderEditDialogState) {
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

            const dialogMode = folderEditDialogState.mode;

            setIsFolderEditSubmitting(true);
            try {
                if (dialogMode === 'CREATE') {
                    await createFolderFromDialog(normalizedValues);
                    return;
                }

                const folderId = folderEditDialogState.folderId;
                if (folderId === null) {
                    return;
                }

                await updateFolderFromDialog(folderId, normalizedValues);
            } catch (error) {
                await showAlert({
                    title: resolveFolderEditFailureTitle(dialogMode),
                    message: error instanceof Error ? error.message : 'Failed to update folder.',
                }).catch(() => undefined);
            } finally {
                setIsFolderEditSubmitting(false);
            }
        },
        [createFolderFromDialog, folderEditDialogState, updateFolderFromDialog],
    );

    const handleCloseFolderEditDialog = useCallback(() => {
        if (isFolderEditSubmitting) {
            return;
        }

        setFolderEditDialogState(null);
    }, [isFolderEditSubmitting]);

    const handleDeleteFolder = useCallback(
        async (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
            const subfolderCount = descendantContext.ids.length - 1;
            const affectedAgentCount = agents.filter(
                (agent) => agent.folderId !== null && descendantContext.idSet.has(agent.folderId),
            ).length;

            const confirmed = await showConfirm({
                title: 'Delete folder',
                message: `${formatText('Delete folder')} "${folder.name}"? ${formatText(
                    'It will move',
                )} ${affectedAgentCount} ${formatText('agents')} and ${subfolderCount} subfolders to the Recycle Bin.`,
                confirmLabel: 'Delete folder',
                cancelLabel: 'Cancel',
            }).catch(() => false);
            if (!confirmed) {
                return;
            }

            try {
                const response = await fetch(`/api/agent-folders/${folderId}`, { method: 'DELETE' });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to delete folder.');
                }

                setFolders((prev) => prev.filter((item) => !descendantContext.idSet.has(item.id)));
                setAgents((prev) =>
                    prev.filter((agent) => agent.folderId === null || !descendantContext.idSet.has(agent.folderId)),
                );
                synchronizeAfterMutation('delete-folder');

                if (currentFolderId !== null && descendantContext.idSet.has(currentFolderId)) {
                    navigateToFolder(null);
                }
            } catch (error) {
                await showAlert({
                    title: 'Delete failed',
                    message: error instanceof Error ? error.message : 'Failed to delete folder.',
                }).catch(() => undefined);
            }
        },
        [
            agents,
            childrenByParentId,
            currentFolderId,
            folders,
            formatText,
            navigateToFolder,
            setAgents,
            setFolders,
            synchronizeAfterMutation,
        ],
    );

    const handleSetFolderVisibility = useCallback(
        async (folderId: number, visibility: AgentVisibility) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);

            try {
                const response = await fetch(`/api/agent-folders/${folderId}/visibility`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visibility }),
                });
                const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to update folder visibility.');
                }

                setAgents((prev) =>
                    prev.map((agent) =>
                        agent.folderId !== null && descendantContext.idSet.has(agent.folderId)
                            ? { ...agent, visibility }
                            : agent,
                    ),
                );
                synchronizeAfterMutation('update-folder-visibility');
            } catch (error) {
                await showAlert({
                    title: 'Update failed',
                    message: error instanceof Error ? error.message : 'Failed to update folder visibility.',
                }).catch(() => undefined);
            }
        },
        [childrenByParentId, folders, setAgents, synchronizeAfterMutation],
    );

    const handleRequestFolderVisibilityUpdate = useCallback(
        async (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
            const affectedAgents = agents.filter(
                (agent) => agent.folderId !== null && descendantContext.idSet.has(agent.folderId),
            );
            const selectedVisibility = await showVisibilityDialog({
                title: 'Update visibility',
                description: `${formatText('Set visibility for folder')} "${folder.name}" ${formatText(
                    'and its subtree',
                )}. ${formatText('Affected agents')}: ${affectedAgents.length}.`,
                confirmLabel: 'Update visibility',
                initialVisibility: DEFAULT_AGENT_VISIBILITY,
            }).catch(() => null);
            if (!selectedVisibility) {
                return;
            }

            await handleSetFolderVisibility(folderId, selectedVisibility);
        },
        [agents, childrenByParentId, folders, formatText, handleSetFolderVisibility],
    );

    return {
        folderEditDialogState,
        handleCloseFolderEditDialog,
        handleCreateFolder,
        handleDeleteFolder,
        handleRenameFolder,
        handleRequestFolderVisibilityUpdate,
        handleSubmitFolderEdit,
        isFolderEditSubmitting,
    };
}
