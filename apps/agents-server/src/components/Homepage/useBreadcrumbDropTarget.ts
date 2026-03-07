'use client';

import { useDroppable } from '@dnd-kit/core';

/**
 * Drag metadata for breadcrumb drop targets.
 *
 * @private function of AgentsList
 */
export type BreadcrumbDropTargetData = {
    type: 'BREADCRUMB';
    folderId: number | null;
};

const BREADCRUMB_DRAG_ID_PREFIX = 'breadcrumb:';

/**
 * Builds a drag identifier for breadcrumb drop targets.
 *
 * @param folderId - Folder id represented by the breadcrumb.
 * @returns Drag identifier string.
 * @private function of AgentsList
 */
const getBreadcrumbDragId = (folderId: number | null) =>
    `${BREADCRUMB_DRAG_ID_PREFIX}${folderId === null ? 'root' : String(folderId)}`;

/**
 * Provides droppable state for breadcrumb-style drop targets.
 *
 * @param folderId - Folder id represented by the drop target.
 * @param canOrganize - Whether drag-and-drop organization is enabled.
 * @returns Droppable state for the target.
 * @private function of AgentsList
 */
export function useBreadcrumbDropTarget(folderId: number | null, canOrganize: boolean) {
    return useDroppable({
        id: getBreadcrumbDragId(folderId),
        data: {
            type: 'BREADCRUMB',
            folderId,
        } satisfies BreadcrumbDropTargetData,
        disabled: !canOrganize,
    });
}
