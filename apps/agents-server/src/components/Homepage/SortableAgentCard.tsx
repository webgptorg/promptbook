'use client';

import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { string_url } from '@promptbook-local/types';
import type { CSSProperties, MouseEvent } from 'react';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { AgentCard } from './AgentCard';
import { buildCardDragProps, DragHandle } from './DragHandle';
import type { DragItem } from './DragItem';

/**
 * Props for sortable agent cards.
 *
 * @private function of AgentsList
 */
export type SortableAgentCardProps = {
    /**
     * Agent to render.
     */
    readonly agent: AgentOrganizationAgent;
    /**
     * Stable drag identifier for the card.
     */
    readonly dragId: string;
    /**
     * Stable logical identifier for organization updates.
     */
    readonly agentIdentifier: string;
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
    /**
     * Whether the current user is an admin.
     */
    readonly isAdmin: boolean;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
    /**
     * Active drag type for visual indicators.
     */
    readonly activeDragType: DragItem['type'] | null;
    /**
     * Delete handler for the agent.
     */
    readonly onDelete: (agentIdentifier: string) => void;
    /**
     * Visibility change request handler for the agent.
     */
    readonly onRequestVisibilityChange: (agentIdentifier: string) => void;
    /**
     * Context menu handler for the agent.
     */
    readonly onContextMenu?: (event: MouseEvent<HTMLDivElement>, agent: AgentOrganizationAgent) => void;
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
 * Renders a sortable agent card with drag affordances.
 *
 * @private function of AgentsList
 */
export function SortableAgentCard({
    agent,
    dragId,
    agentIdentifier,
    publicUrl,
    isAdmin,
    canOrganize,
    activeDragType,
    onDelete,
    onRequestVisibilityChange,
    onContextMenu,
    dragHandleLabel,
    allowFullCardDrag,
}: SortableAgentCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
        id: dragId,
        data: {
            type: 'AGENT',
            identifier: agentIdentifier,
            parentId: agent.folderId ?? null,
        } satisfies DragItem,
        disabled: !canOrganize,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const isDropTarget = isOver && activeDragType === 'AGENT';
    const dragProps = buildCardDragProps(allowFullCardDrag, attributes, listeners);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${canOrganize ? 'select-none' : ''} ${isDragging ? 'opacity-0' : ''} ${
                isDropTarget ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : ''
            }`}
            {...dragProps}
            onContextMenu={(event) => onContextMenu?.(event, agent)}
        >
            <AgentCard
                agent={agent}
                publicUrl={publicUrl}
                href={`/agents/${encodeURIComponent(agentIdentifier)}`}
                isAdmin={isAdmin}
                onDelete={onDelete}
                onRequestVisibilityChange={onRequestVisibilityChange}
                visibility={agent.visibility}
            />
            {canOrganize && !allowFullCardDrag && (
                <DragHandle attributes={attributes} listeners={listeners} label={dragHandleLabel} />
            )}
        </div>
    );
}
