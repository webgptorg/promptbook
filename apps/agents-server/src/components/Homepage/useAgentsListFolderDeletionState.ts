'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { showAlert, showConfirm } from '../AsyncDialogs/asyncDialogs';
import { AgentsListFolderApi } from './AgentsListFolderApi';
import { createFolderDescendantContext, findFolderById } from './agentOrganizationUtils';

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
 * Props accepted by the private folder deletion hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderDeletionStateProps = {
    readonly agents: AgentOrganizationAgent[];
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
 * Counts local agents assigned anywhere inside a deleted folder subtree.
 *
 * @param agents - Local agents shown in the list.
 * @param descendantFolderIds - Folder ids included in the subtree.
 * @returns Number of affected local agents.
 *
 * @private function of AgentsList
 */
function countAffectedAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    descendantFolderIds: ReadonlySet<number>,
): number {
    return agents.filter((agent) => agent.folderId !== null && descendantFolderIds.has(agent.folderId)).length;
}

/**
 * Builds the delete confirmation message for one folder subtree.
 *
 * @param affectedAgentCount - Number of subtree agents moving to recycle bin.
 * @param folderName - Display name of the folder being deleted.
 * @param formatText - Localized naming helper from homepage state.
 * @param subfolderCount - Number of descendant subfolders affected by the delete.
 * @returns Confirmation dialog copy.
 *
 * @private function of AgentsList
 */
function createDeleteFolderMessage(
    affectedAgentCount: number,
    folderName: string,
    formatText: (text: string) => string,
    subfolderCount: number,
): string {
    return `${formatText('Delete folder')} "${folderName}"? ${formatText('It will move')} ${affectedAgentCount} ${formatText(
        'agents',
    )} and ${subfolderCount} subfolders to the Recycle Bin.`;
}

/**
 * Removes a deleted folder subtree from the folder collection.
 *
 * @param folders - Existing folder collection.
 * @param descendantFolderIds - Folder ids removed by the deletion.
 * @returns Folder collection without the deleted subtree.
 *
 * @private function of AgentsList
 */
function filterDeletedFolders(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    descendantFolderIds: ReadonlySet<number>,
): AgentOrganizationFolder[] {
    return folders.filter((folder) => !descendantFolderIds.has(folder.id));
}

/**
 * Removes all agents assigned into a deleted folder subtree.
 *
 * @param agents - Existing local agents collection.
 * @param descendantFolderIds - Folder ids removed by the deletion.
 * @returns Agents collection without subtree agents.
 *
 * @private function of AgentsList
 */
function filterDeletedFolderAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    descendantFolderIds: ReadonlySet<number>,
): AgentOrganizationAgent[] {
    return agents.filter((agent) => agent.folderId === null || !descendantFolderIds.has(agent.folderId));
}

/**
 * Owns folder deletion confirmation, persistence, and local cache updates.
 *
 * @param props - Folder deletion inputs and mutation helpers.
 * @returns Callback that deletes one folder subtree.
 *
 * @private function of AgentsList
 */
export function useAgentsListFolderDeletionState({
    agents,
    childrenByParentId,
    currentFolderId,
    folders,
    formatText,
    navigateToFolder,
    setAgents,
    setFolders,
    synchronizeAfterMutation,
}: UseAgentsListFolderDeletionStateProps): (folderId: number) => Promise<void> {
    return useCallback(
        async (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
            const subfolderCount = descendantContext.ids.length - 1;
            const affectedAgentCount = countAffectedAgents(agents, descendantContext.idSet);
            const confirmed = await showConfirm({
                title: 'Delete folder',
                message: createDeleteFolderMessage(affectedAgentCount, folder.name, formatText, subfolderCount),
                confirmLabel: 'Delete folder',
                cancelLabel: 'Cancel',
            }).catch(() => false);
            if (!confirmed) {
                return;
            }

            try {
                await AgentsListFolderApi.deleteFolder(folderId);

                setFolders((prev) => filterDeletedFolders(prev, descendantContext.idSet));
                setAgents((prev) => filterDeletedFolderAgents(prev, descendantContext.idSet));
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
}
