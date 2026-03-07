'use client';

import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { string_url } from '@promptbook-local/types';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { CSSProperties, MouseEvent } from 'react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { FolderCard } from './FolderCard';
import { buildCardDragProps, DragHandle } from './DragHandle';
import type { DragItem } from './DragItem';
import type { DropIndicator } from './DropIndicator';

/**
 * Props for sortable folder cards.
 *
 * @private function of AgentsList
 */
export type SortableFolderCardProps = {
    /**
     * Folder to render.
     */
    readonly folder: AgentOrganizationFolder;
    /**
     * Stable drag identifier for the card.
     */
    readonly dragId: string;
    /**
     * Preview agents for the folder.
     */
    readonly previewAgents: AgentBasicInformation[];
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
    /**
     * Active drag type for visual indicators.
     */
    readonly activeDragType: DragItem['type'] | null;
    /**
     * Current drop indicator state.
     */
    readonly dropIndicator: DropIndicator | null;
    /**
     * Open handler for the folder.
     */
    readonly onOpen: () => void;
    /**
     * Rename handler for the folder.
     */
    readonly onRename?: () => void;
    /**
     * Delete handler for the folder.
     */
    readonly onDelete?: () => void;
    /**
     * Context menu handler for the folder.
     */
    readonly onContextMenu?: (event: MouseEvent<HTMLDivElement>, folder: AgentOrganizationFolder) => void;
    /**
     * Accessible label displayed for the drag handle.
     */
    readonly dragHandleLabel: string;
    /**
     * Whether the whole card surface should respond to drag interactions.
     */
    readonly allowFullCardDrag: boolean;
};

/**
 * Renders a sortable folder card with drop state styling.
 *
 * @private function of AgentsList
 */
export function SortableFolderCard({
    folder,
    dragId,
    previewAgents,
    publicUrl,
    canOrganize,
    activeDragType,
    dropIndicator,
    onOpen,
    onRename,
    onDelete,
    onContextMenu,
    dragHandleLabel,
    allowFullCardDrag,
}: SortableFolderCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
        id: dragId,
        data: {
            type: 'FOLDER',
            identifier: String(folder.id),
            parentId: folder.parentId ?? null,
        } satisfies DragItem,
        disabled: !canOrganize,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const isDropTarget = isOver && activeDragType === 'AGENT';
    const isInsideTarget =
        activeDragType === 'FOLDER' && dropIndicator?.id === dragId && dropIndicator.intent === 'inside';
    const isReorderTarget =
        activeDragType === 'FOLDER' && dropIndicator?.id === dragId && dropIndicator.intent !== 'inside';
    const dropClasses =
        isInsideTarget || isDropTarget
            ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-white bg-emerald-50/40'
            : isReorderTarget
            ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white'
            : '';
    const dragProps = buildCardDragProps(allowFullCardDrag, attributes, listeners);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${canOrganize ? 'select-none' : ''} ${isDragging ? 'opacity-0' : ''} ${dropClasses}`}
            {...dragProps}
            onContextMenu={(event) => onContextMenu?.(event, folder)}
        >
            <FolderCard
                folderName={folder.name}
                folderIcon={folder.icon}
                folderColor={folder.color}
                previewAgents={previewAgents}
                publicUrl={publicUrl}
                onOpen={onOpen}
                onRename={onRename}
                onDelete={onDelete}
            />
            {canOrganize && !allowFullCardDrag && (
                <DragHandle attributes={attributes} listeners={listeners} label={dragHandleLabel} />
            )}
        </div>
    );
}
