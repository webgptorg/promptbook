'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationUpdatePayload,
} from '../../utils/agentOrganization/types';
import {
    applyAgentUpdates,
    applyFolderUpdates,
    buildAgentOrganizationUpdates,
    buildFolderOrganizationUpdates,
    createAgentMoveUpdates,
    createFolderMovePlan,
    createReorderedAgentUpdates,
    createReorderedFolderUpdates,
} from './agentOrganizationUtils';

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
 * Props accepted by the private organization-mutation hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListOrganizationActionsProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly childrenByParentId: ReadonlyMap<number | null, number[]>;
    readonly folders: AgentOrganizationFolder[];
    readonly persistQueuedOrganizationMutation: (
        payload: AgentOrganizationUpdatePayload,
        mutationName: string,
    ) => Promise<void>;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly setFolders: FolderOrganizationStateSetter;
    readonly visibleAgents: AgentOrganizationAgent[];
    readonly visibleFolders: AgentOrganizationFolder[];
};

/**
 * Organization mutation handlers shared across drag-and-drop and folder actions.
 *
 * @private function of AgentsList
 */
type UseAgentsListOrganizationActionsResult = {
    readonly moveAgentToFolder: (identifier: string, targetFolderId: number | null) => Promise<void>;
    readonly moveFolderToParent: (folderId: number, targetParentId: number | null) => Promise<void>;
    readonly reorderAgents: (draggedId: string, targetId: string) => Promise<void>;
    readonly reorderFolders: (draggedId: number, targetId: number) => Promise<void>;
};

/**
 * Owns organization persistence handlers shared across list interactions.
 *
 * @param props - Current organization state and update setters.
 * @returns Handlers for persisting folder and agent organization updates.
 *
 * @private function of AgentsList
 */
export function useAgentsListOrganizationActions({
    agents,
    childrenByParentId,
    folders,
    persistQueuedOrganizationMutation,
    setAgents,
    setFolders,
    visibleAgents,
    visibleFolders,
}: UseAgentsListOrganizationActionsProps): UseAgentsListOrganizationActionsResult {
    const reorderFolders = useCallback(
        async (draggedId: number, targetId: number) => {
            const updatedFolders = createReorderedFolderUpdates(folders, visibleFolders, draggedId, targetId);
            if (!updatedFolders) {
                return;
            }

            setFolders((prev) => applyFolderUpdates(prev, updatedFolders));
            await persistQueuedOrganizationMutation(buildFolderOrganizationUpdates(updatedFolders), 'reorder-folders');
        },
        [folders, persistQueuedOrganizationMutation, setFolders, visibleFolders],
    );

    const reorderAgents = useCallback(
        async (draggedId: string, targetId: string) => {
            const updates = createReorderedAgentUpdates(agents, visibleAgents, draggedId, targetId);
            if (!updates) {
                return;
            }

            setAgents((prev) => applyAgentUpdates(prev, updates));
            await persistQueuedOrganizationMutation(buildAgentOrganizationUpdates(updates), 'reorder-agents');
        },
        [agents, persistQueuedOrganizationMutation, setAgents, visibleAgents],
    );

    const moveFolderToParent = useCallback(
        async (folderId: number, targetParentId: number | null) => {
            const movePlan = createFolderMovePlan(folders, childrenByParentId, folderId, targetParentId);
            if (movePlan.type === 'NO_OP') {
                return;
            }

            if (movePlan.type === 'INVALID_PARENT') {
                await showAlert({
                    title: 'Invalid move',
                    message: 'Cannot move a folder into one of its subfolders.',
                }).catch(() => undefined);
                return;
            }

            setFolders((prev) => applyFolderUpdates(prev, movePlan.updates));
            await persistQueuedOrganizationMutation(buildFolderOrganizationUpdates(movePlan.updates), 'move-folder');
        },
        [childrenByParentId, folders, persistQueuedOrganizationMutation, setFolders],
    );

    const moveAgentToFolder = useCallback(
        async (identifier: string, targetFolderId: number | null) => {
            const updates = createAgentMoveUpdates(agents, identifier, targetFolderId);
            if (!updates) {
                return;
            }

            setAgents((prev) => applyAgentUpdates(prev, updates));
            await persistQueuedOrganizationMutation(buildAgentOrganizationUpdates(updates), 'move-agent');
        },
        [agents, persistQueuedOrganizationMutation, setAgents],
    );

    return {
        moveAgentToFolder,
        moveFolderToParent,
        reorderAgents,
        reorderFolders,
    };
}
