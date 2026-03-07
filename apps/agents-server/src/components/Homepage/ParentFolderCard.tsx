'use client';

import { ArrowUp } from 'lucide-react';
import { FileCard } from './FileCard';
import { useBreadcrumbDropTarget } from './useBreadcrumbDropTarget';

/**
 * Props for the parent folder navigation card.
 *
 * @private function of AgentsList
 */
export type ParentFolderCardProps = {
    /**
     * Label shown for the parent folder.
     */
    readonly label: string;
    /**
     * Folder id represented by the parent card.
     */
    readonly folderId: number | null;
    /**
     * Click handler for navigating to the parent folder.
     */
    readonly onOpen: () => void;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
};

/**
 * Renders a card for navigating to the parent folder with drop support.
 *
 * @private function of AgentsList
 */
export function ParentFolderCard({ label, folderId, onOpen, canOrganize }: ParentFolderCardProps) {
    const { isOver, setNodeRef } = useBreadcrumbDropTarget(folderId, canOrganize);
    const isDropTarget = isOver && canOrganize;

    return (
        <button type="button" ref={setNodeRef} onClick={onOpen} className="block h-full w-full text-left">
            <FileCard
                className={`flex h-full items-center gap-3 border-blue-200 bg-blue-50/60 hover:border-blue-300 ${
                    isDropTarget ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : ''
                }`}
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-100 border border-blue-200 text-blue-700">
                    <ArrowUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-blue-700">Parent folder</p>
                    <h3 className="text-sm font-semibold text-gray-900 truncate" title={label}>
                        {label}
                    </h3>
                </div>
            </FileCard>
        </button>
    );
}
