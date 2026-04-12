'use client';

import {
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { TODO_any } from '@promptbook-local/types';
import { useCallback, useMemo, useState } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import type { DragItem } from './DragItem';
import type { DropIndicator } from './DropIndicator';
import { findAgentByIdentifier, findFolderById } from './agentOrganizationUtils';
import { getDropIntentFromRects } from './getDropIntentFromRects';
import type { BreadcrumbDropTargetData } from './useBreadcrumbDropTarget';
import type { AgentOrganizationSyncReason } from './useAgentsListSyncState';

/**
 * Drop target payload accepted by drag-and-drop handlers.
 *
 * @private function of AgentsList
 */
type DropTargetData = DragItem | BreadcrumbDropTargetData;

/**
 * Planned action for a dragged agent.
 *
 * @private function of AgentsList
 */
type AgentDropAction =
    | {
          readonly type: 'REORDER_AGENT';
          readonly draggedIdentifier: string;
          readonly targetIdentifier: string;
      }
    | {
          readonly type: 'MOVE_AGENT';
          readonly draggedIdentifier: string;
          readonly targetFolderId: number | null;
      };

/**
 * Planned action for a dragged folder.
 *
 * @private function of AgentsList
 */
type FolderDropAction =
    | {
          readonly type: 'REORDER_FOLDER';
          readonly draggedFolderId: number;
          readonly targetFolderId: number;
      }
    | {
          readonly type: 'MOVE_FOLDER';
          readonly draggedFolderId: number;
          readonly targetParentId: number | null;
      };

/**
 * Props accepted by the private drag-and-drop hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListDragStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly canOrganize: boolean;
    readonly folders: AgentOrganizationFolder[];
    readonly moveAgentToFolder: (identifier: string, targetFolderId: number | null) => Promise<void>;
    readonly moveFolderToParent: (folderId: number, targetParentId: number | null) => Promise<void>;
    readonly reorderAgents: (draggedId: string, targetId: string) => Promise<void>;
    readonly reorderFolders: (draggedId: number, targetId: number) => Promise<void>;
    readonly synchronizeOrganizationState: (
        reason: AgentOrganizationSyncReason,
        routeKeyAtSync?: string,
    ) => Promise<void>;
};

/**
 * Drag-and-drop state returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListDragStateResult = {
    readonly activeAgent: AgentOrganizationAgent | null;
    readonly activeDragItem: DragItem | null;
    readonly activeFolder: AgentOrganizationFolder | null;
    readonly dropIndicator: DropIndicator | null;
    readonly handleDragCancel: () => void;
    readonly handleDragEnd: (event: DragEndEvent) => Promise<void>;
    readonly handleDragOver: (event: DragOverEvent) => void;
    readonly handleDragStart: (event: DragStartEvent) => void;
};

/**
 * Prefix for agent drag IDs.
 *
 * @private function of AgentsList
 */
const AGENT_DRAG_ID_PREFIX = 'agent:';

/**
 * Prefix for folder drag IDs.
 *
 * @private function of AgentsList
 */
const FOLDER_DRAG_ID_PREFIX = 'folder:';

/**
 * Mouse drag activation distance in pixels.
 *
 * @private function of AgentsList
 */
const DRAG_START_DISTANCE_PX = 8;

/**
 * Touch drag activation delay in milliseconds.
 *
 * @private function of AgentsList
 */
const TOUCH_DRAG_DELAY_MS = 250;

/**
 * Touch drag movement tolerance in pixels.
 *
 * @private function of AgentsList
 */
const TOUCH_DRAG_TOLERANCE_PX = 6;

/**
 * Builds a unique drag identifier with a stable prefix.
 *
 * @param prefix - Prefix describing the drag item type.
 * @param identifier - Unique identifier for the item.
 * @returns Stable drag identifier string.
 *
 * @private function of AgentsList
 */
function buildDragId(prefix: string, identifier: string): string {
    return `${prefix}${identifier}`;
}

/**
 * Builds a drag identifier for an agent.
 *
 * @param identifier - Agent identifier.
 * @returns Drag identifier string.
 *
 * @private function of AgentsList
 */
export function getAgentDragId(identifier: string): string {
    return buildDragId(AGENT_DRAG_ID_PREFIX, identifier);
}

/**
 * Builds a drag identifier for a folder.
 *
 * @param folderId - Folder id to encode.
 * @returns Drag identifier string.
 *
 * @private function of AgentsList
 */
export function getFolderDragId(folderId: number): string {
    return buildDragId(FOLDER_DRAG_ID_PREFIX, String(folderId));
}

/**
 * Builds the drag sensor configuration shared across list and folder cards.
 *
 * @returns DnD sensor collection configured for mouse and touch input.
 *
 * @private function of AgentsList
 */
export function useAgentsListDragSensors() {
    return useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: DRAG_START_DISTANCE_PX },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
        }),
    );
}

/**
 * Finds the currently dragged agent from drag state.
 *
 * @param activeDragItem - Active drag item metadata.
 * @param agents - Current local agents.
 * @returns Dragged agent or null when not dragging an agent.
 *
 * @private function of AgentsList
 */
function resolveDraggedAgent(
    activeDragItem: DragItem | null,
    agents: ReadonlyArray<AgentOrganizationAgent>,
): AgentOrganizationAgent | null {
    if (activeDragItem?.type !== 'AGENT') {
        return null;
    }

    return findAgentByIdentifier(agents, activeDragItem.identifier) || null;
}

/**
 * Finds the currently dragged folder from drag state.
 *
 * @param activeDragItem - Active drag item metadata.
 * @param folders - Current local folders.
 * @returns Dragged folder or null when not dragging a folder.
 *
 * @private function of AgentsList
 */
function resolveDraggedFolder(
    activeDragItem: DragItem | null,
    folders: ReadonlyArray<AgentOrganizationFolder>,
): AgentOrganizationFolder | null {
    if (activeDragItem?.type !== 'FOLDER') {
        return null;
    }

    const folderId = Number(activeDragItem.identifier);
    if (Number.isNaN(folderId)) {
        return null;
    }

    return findFolderById(folders, folderId) || null;
}

/**
 * Resolves the drop indicator for folder-on-folder hover interactions.
 *
 * @param event - Current drag-over event.
 * @returns Drop indicator or null when not hovering a valid folder target.
 *
 * @private function of AgentsList
 */
function resolveFolderDropIndicator(event: DragOverEvent): DropIndicator | null {
    const dragData = event.active.data.current as DragItem | undefined;
    const overData = event.over?.data.current as DropTargetData | undefined;

    if (!dragData || dragData.type !== 'FOLDER' || !event.over || !overData || overData.type !== 'FOLDER') {
        return null;
    }

    const activeRect = event.active.rect.current.translated || event.active.rect.current.initial;
    const intent = getDropIntentFromRects(activeRect as TODO_any, event.over.rect as TODO_any);

    return { id: event.over.id, intent };
}

/**
 * Resolves the intended operation for an agent drag-and-drop completion.
 *
 * @param dragData - Dragged item metadata.
 * @param overData - Drop target metadata.
 * @returns Planned agent drag action or null when the drop should be ignored.
 *
 * @private function of AgentsList
 */
function resolveAgentDropAction(dragData: DragItem, overData: DropTargetData): AgentDropAction | null {
    if (overData.type === 'AGENT') {
        return {
            type: 'REORDER_AGENT',
            draggedIdentifier: dragData.identifier,
            targetIdentifier: overData.identifier,
        };
    }

    if (overData.type === 'FOLDER') {
        const targetFolderId = Number(overData.identifier);
        if (Number.isNaN(targetFolderId)) {
            return null;
        }

        return {
            type: 'MOVE_AGENT',
            draggedIdentifier: dragData.identifier,
            targetFolderId,
        };
    }

    if (overData.type === 'BREADCRUMB') {
        return {
            type: 'MOVE_AGENT',
            draggedIdentifier: dragData.identifier,
            targetFolderId: overData.folderId ?? null,
        };
    }

    return null;
}

/**
 * Resolves the intended operation for a folder drag-and-drop completion.
 *
 * @param dragData - Dragged folder metadata.
 * @param overData - Drop target metadata.
 * @param overId - Raw dnd-kit drop target id.
 * @param currentIndicator - Drop indicator captured before reset.
 * @returns Planned folder drag action or null when the drop should be ignored.
 *
 * @private function of AgentsList
 */
function resolveFolderDropAction(
    dragData: DragItem,
    overData: DropTargetData,
    overId: string | number,
    currentIndicator: DropIndicator | null,
): FolderDropAction | null {
    const draggedFolderId = Number(dragData.identifier);
    if (Number.isNaN(draggedFolderId)) {
        return null;
    }

    if (overData.type === 'FOLDER') {
        const targetFolderId = Number(overData.identifier);
        if (Number.isNaN(targetFolderId) || draggedFolderId === targetFolderId) {
            return null;
        }

        const isInsideDrop = currentIndicator?.id === overId && currentIndicator.intent === 'inside';
        if (isInsideDrop) {
            return {
                type: 'MOVE_FOLDER',
                draggedFolderId,
                targetParentId: targetFolderId,
            };
        }

        return {
            type: 'REORDER_FOLDER',
            draggedFolderId,
            targetFolderId,
        };
    }

    if (overData.type === 'BREADCRUMB') {
        return {
            type: 'MOVE_FOLDER',
            draggedFolderId,
            targetParentId: overData.folderId ?? null,
        };
    }

    return null;
}

/**
 * Executes a planned agent drag-and-drop action.
 *
 * @param action - Planned drag outcome.
 * @param reorderAgents - Agent reordering implementation.
 * @param moveAgentToFolder - Agent move implementation.
 * @returns Promise resolving when the action finishes.
 *
 * @private function of AgentsList
 */
async function executeAgentDropAction(
    action: AgentDropAction | null,
    reorderAgents: (draggedId: string, targetId: string) => Promise<void>,
    moveAgentToFolder: (identifier: string, targetFolderId: number | null) => Promise<void>,
): Promise<void> {
    if (!action) {
        return;
    }

    if (action.type === 'REORDER_AGENT') {
        await reorderAgents(action.draggedIdentifier, action.targetIdentifier);
        return;
    }

    await moveAgentToFolder(action.draggedIdentifier, action.targetFolderId);
}

/**
 * Executes a planned folder drag-and-drop action.
 *
 * @param action - Planned drag outcome.
 * @param reorderFolders - Folder reordering implementation.
 * @param moveFolderToParent - Folder move implementation.
 * @returns Promise resolving when the action finishes.
 *
 * @private function of AgentsList
 */
async function executeFolderDropAction(
    action: FolderDropAction | null,
    reorderFolders: (draggedId: number, targetId: number) => Promise<void>,
    moveFolderToParent: (folderId: number, targetParentId: number | null) => Promise<void>,
): Promise<void> {
    if (!action) {
        return;
    }

    if (action.type === 'REORDER_FOLDER') {
        await reorderFolders(action.draggedFolderId, action.targetFolderId);
        return;
    }

    await moveFolderToParent(action.draggedFolderId, action.targetParentId);
}

/**
 * Owns drag-and-drop state and delegates each drop outcome to focused organization handlers.
 *
 * @param props - Drag state dependencies and organization handlers.
 * @returns Active drag metadata and dnd-kit callbacks.
 *
 * @private function of AgentsList
 */
export function useAgentsListDragState({
    agents,
    canOrganize,
    folders,
    moveAgentToFolder,
    moveFolderToParent,
    reorderAgents,
    reorderFolders,
    synchronizeOrganizationState,
}: UseAgentsListDragStateProps): UseAgentsListDragStateResult {
    const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

    const activeAgent = useMemo(() => resolveDraggedAgent(activeDragItem, agents), [activeDragItem, agents]);
    const activeFolder = useMemo(() => resolveDraggedFolder(activeDragItem, folders), [activeDragItem, folders]);

    const resetDragState = useCallback(() => {
        setActiveDragItem(null);
        setDropIndicator(null);
    }, []);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            if (!canOrganize) {
                return;
            }

            const dragData = event.active.data.current as DragItem | undefined;
            if (dragData) {
                setActiveDragItem(dragData);
            }
        },
        [canOrganize],
    );

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            if (!canOrganize) {
                return;
            }

            setDropIndicator(resolveFolderDropIndicator(event));
        },
        [canOrganize],
    );

    const handleAgentDrop = useCallback(
        async (dragData: DragItem, overData: DropTargetData) => {
            await executeAgentDropAction(resolveAgentDropAction(dragData, overData), reorderAgents, moveAgentToFolder);
        },
        [moveAgentToFolder, reorderAgents],
    );

    const handleFolderDrop = useCallback(
        async (
            dragData: DragItem,
            overData: DropTargetData,
            overId: string | number,
            currentIndicator: DropIndicator | null,
        ) => {
            await executeFolderDropAction(
                resolveFolderDropAction(dragData, overData, overId, currentIndicator),
                reorderFolders,
                moveFolderToParent,
            );
        },
        [moveFolderToParent, reorderFolders],
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const currentIndicator = dropIndicator;
            const dragData = event.active.data.current as DragItem | undefined;
            const overData = event.over?.data.current as DropTargetData | undefined;

            resetDragState();

            if (!canOrganize || !dragData || !event.over || !overData) {
                return;
            }

            try {
                if (dragData.type === 'AGENT') {
                    await handleAgentDrop(dragData, overData);
                    return;
                }

                if (dragData.type === 'FOLDER') {
                    await handleFolderDrop(dragData, overData, event.over.id, currentIndicator);
                }
            } catch (error) {
                await showAlert({
                    title: 'Update failed',
                    message: error instanceof Error ? error.message : 'Failed to update organization.',
                }).catch(() => undefined);
                void synchronizeOrganizationState('error-recovery');
            }
        },
        [
            canOrganize,
            dropIndicator,
            handleAgentDrop,
            handleFolderDrop,
            resetDragState,
            synchronizeOrganizationState,
        ],
    );

    const handleDragCancel = useCallback(() => {
        resetDragState();
    }, [resetDragState]);

    return {
        activeAgent,
        activeDragItem,
        activeFolder,
        dropIndicator,
        handleDragCancel,
        handleDragEnd,
        handleDragOver,
        handleDragStart,
    };
}
