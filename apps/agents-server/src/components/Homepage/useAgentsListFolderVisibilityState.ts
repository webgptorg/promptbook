'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { DEFAULT_AGENT_VISIBILITY, type AgentVisibility } from '../../utils/agentVisibility';
import { showAlert, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
import { AgentsListFolderApi } from './AgentsListFolderApi';
import { createFolderDescendantContext, findFolderById } from './agentOrganizationUtils';

/**
 * Setter for the interactive local agents cache.
 *
 * @private function of AgentsList
 */
type AgentOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationAgent[]>>;

/**
 * Props accepted by the private folder visibility hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderVisibilityStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly childrenByParentId: ReadonlyMap<number | null, number[]>;
    readonly folders: AgentOrganizationFolder[];
    readonly formatText: (text: string) => string;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Collects local agents affected by a folder subtree visibility change.
 *
 * @param agents - Local agents shown in the list.
 * @param descendantFolderIds - Folder ids included in the subtree.
 * @returns Affected local agents.
 *
 * @private function of AgentsList
 */
function collectAffectedAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    descendantFolderIds: ReadonlySet<number>,
): AgentOrganizationAgent[] {
    return agents.filter((agent) => agent.folderId !== null && descendantFolderIds.has(agent.folderId));
}

/**
 * Creates the folder visibility dialog description.
 *
 * @param affectedAgentCount - Number of affected subtree agents.
 * @param folderName - Display name of the targeted folder.
 * @param formatText - Localized naming helper from homepage state.
 * @returns Visibility dialog description copy.
 *
 * @private function of AgentsList
 */
function createFolderVisibilityDescription(
    affectedAgentCount: number,
    folderName: string,
    formatText: (text: string) => string,
): string {
    return `${formatText('Set visibility for folder')} "${folderName}" ${formatText('and its subtree')}. ${formatText(
        'Affected agents',
    )}: ${affectedAgentCount}.`;
}

/**
 * Applies one subtree visibility update to the local agents cache.
 *
 * @param agents - Existing local agents collection.
 * @param descendantFolderIds - Folder ids included in the subtree.
 * @param visibility - Visibility persisted for the subtree.
 * @returns Updated local agents collection.
 *
 * @private function of AgentsList
 */
function applyFolderVisibilityToAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    descendantFolderIds: ReadonlySet<number>,
    visibility: AgentVisibility,
): AgentOrganizationAgent[] {
    return agents.map((agent) =>
        agent.folderId !== null && descendantFolderIds.has(agent.folderId) ? { ...agent, visibility } : agent,
    );
}

/**
 * Owns subtree visibility selection and persistence for `AgentsList`.
 *
 * @param props - Folder visibility inputs and mutation helpers.
 * @returns Callback that opens the folder visibility flow for one subtree.
 *
 * @private function of AgentsList
 */
export function useAgentsListFolderVisibilityState({
    agents,
    childrenByParentId,
    folders,
    formatText,
    setAgents,
    synchronizeAfterMutation,
}: UseAgentsListFolderVisibilityStateProps): (folderId: number) => Promise<void> {
    const handleSetFolderVisibility = useCallback(
        async (folderId: number, visibility: AgentVisibility) => {
            if (!findFolderById(folders, folderId)) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);

            try {
                await AgentsListFolderApi.updateFolderVisibility(folderId, visibility);

                setAgents((prev) => applyFolderVisibilityToAgents(prev, descendantContext.idSet, visibility));
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

    return useCallback(
        async (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
            const affectedAgents = collectAffectedAgents(agents, descendantContext.idSet);
            const selectedVisibility = await showVisibilityDialog({
                title: 'Update visibility',
                description: createFolderVisibilityDescription(affectedAgents.length, folder.name, formatText),
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
}
