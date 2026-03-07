'use client';

import { GripVertical } from 'lucide-react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

/**
 * Props for the shared drag handle button.
 *
 * @private function of AgentsList
 */
export type DragHandleProps = {
    /**
     * Attributes provided by the drag sensor to keep the handle accessible.
     */
    readonly attributes: DraggableAttributes;
    /**
     * Event listeners that trigger the dragging interaction.
     */
    readonly listeners: DraggableSyntheticListeners;
    /**
     * Accessible label shown as tooltip and announced by screen readers.
     */
    readonly label: string;
    /**
     * Optional additional classes to adjust the placement or styling.
     */
    readonly className?: string;
};

/**
 * Renders a floating handle that attaches the draggable listeners.
 *
 * @private function of AgentsList
 */
export function DragHandle({ attributes, listeners, label, className = '' }: DragHandleProps) {
    return (
        <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label={label}
            title={label}
            className={`absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white bottom-3 right-3 touch-none ${className}`.trim()}
        >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

/**
 * Builds props for card wrappers when full-card drag interaction is enabled.
 *
 * @param shouldAttach - Whether listeners should be attached to the card container.
 * @param attributes - Attributes supplied by the drag sensor.
 * @param listeners - Event listeners supplied by the drag sensor.
 * @returns Props that can be spread onto the card wrapper, or an empty object.
 * @private function of AgentsList
 */
export const buildCardDragProps = (
    shouldAttach: boolean,
    attributes: DraggableAttributes,
    listeners: DraggableSyntheticListeners,
) => (shouldAttach ? { ...attributes, ...listeners } : {});
