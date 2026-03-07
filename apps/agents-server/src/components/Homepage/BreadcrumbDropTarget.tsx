'use client';

import { useBreadcrumbDropTarget } from './useBreadcrumbDropTarget';

/**
 * Props for breadcrumb drop targets.
 *
 * @private function of AgentsList
 */
export type BreadcrumbDropTargetProps = {
    /**
     * Label for the breadcrumb.
     */
    readonly label: string;
    /**
     * Folder id represented by the breadcrumb.
     */
    readonly folderId: number | null;
    /**
     * Click handler for navigation.
     */
    readonly onClick: () => void;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
};

/**
 * Renders a breadcrumb button that accepts drag-and-drop.
 *
 * @private function of AgentsList
 */
export function BreadcrumbDropTarget({ label, folderId, onClick, canOrganize }: BreadcrumbDropTargetProps) {
    const { isOver, setNodeRef } = useBreadcrumbDropTarget(folderId, canOrganize);

    return (
        <button
            type="button"
            ref={setNodeRef}
            onClick={onClick}
            className={`transition-colors ${
                isOver && canOrganize ? 'text-blue-700 bg-blue-50/70 rounded px-1 -mx-1' : 'hover:text-blue-600'
            }`}
        >
            {label}
        </button>
    );
}
