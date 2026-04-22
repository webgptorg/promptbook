'use client';

import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { string_url } from '@promptbook-local/types';
import Link from 'next/link';
import { TrashIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AddAgentButton } from '../../app/AddAgentButton';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { buildDefaultAgentRoutePath } from '../../utils/agentRouting/buildAgentRouteHref';
import { AgentCard } from './AgentCard';
import type { DragItem } from './DragItem';
import type { DropIndicator } from './DropIndicator';
import { FolderCard } from './FolderCard';
import { HOMEPAGE_AGENT_GRID_CLASS } from './gridLayout';
import { ParentFolderCard } from './ParentFolderCard';
import { SortableAgentCard } from './SortableAgentCard';
import { SortableFolderCard } from './SortableFolderCard';

/**
 * Props for the list-mode content of `AgentsList`.
 *
 * @private function of AgentsList
 */
type AgentsListListViewProps = {
    /**
     * Agent currently shown in the drag overlay.
     */
    readonly activeAgent: AgentOrganizationAgent | null;
    /**
     * Current drag item type, if any.
     */
    readonly activeDragItemType: DragItem['type'] | null;
    /**
     * Folder currently shown in the drag overlay.
     */
    readonly activeFolder: AgentOrganizationFolder | null;
    /**
     * Whether full-card drag gestures should be enabled.
     */
    readonly allowFullCardDrag: boolean;
    /**
     * Whether organization actions are available.
     */
    readonly canOrganize: boolean;
    /**
     * Folder currently used for the Add Agent action.
     */
    readonly currentFolderId: number | null;
    /**
     * Label announced for draggable agents.
     */
    readonly dragAgentLabel: string;
    /**
     * Label announced for draggable folders.
     */
    readonly dragFolderLabel: string;
    /**
     * Current folder drop indicator.
     */
    readonly dropIndicator: DropIndicator | null;
    /**
     * Builds drag ids for agent cards.
     */
    readonly getAgentDragId: (identifier: string) => string;
    /**
     * Builds drag ids for folder cards.
     */
    readonly getFolderDragId: (folderId: number) => string;
    /**
     * Returns preview agents for one folder card.
     */
    readonly getFolderPreviewAgents: (folderId: number) => AgentBasicInformation[];
    /**
     * Handles agent context-menu requests.
     */
    readonly handleAgentContextMenu: SortableAgentCardProps['onContextMenu'];
    /**
     * Deletes one agent.
     */
    readonly handleDelete: (agentIdentifier: string) => Promise<void>;
    /**
     * Deletes one folder.
     */
    readonly handleDeleteFolder: (folderId: number) => Promise<void>;
    /**
     * dnd-kit drag-cancel handler.
     */
    readonly handleDragCancel: ComponentProps<typeof DndContext>['onDragCancel'];
    /**
     * dnd-kit drag-end handler.
     */
    readonly handleDragEnd: ComponentProps<typeof DndContext>['onDragEnd'];
    /**
     * dnd-kit drag-over handler.
     */
    readonly handleDragOver: ComponentProps<typeof DndContext>['onDragOver'];
    /**
     * dnd-kit drag-start handler.
     */
    readonly handleDragStart: ComponentProps<typeof DndContext>['onDragStart'];
    /**
     * Handles folder context-menu requests.
     */
    readonly handleFolderContextMenu: SortableFolderCardProps['onContextMenu'];
    /**
     * Opens the folder rename flow.
     */
    readonly handleRenameFolder: (folderId: number) => void;
    /**
     * Opens the agent visibility dialog.
     */
    readonly handleRequestAgentVisibilityChange: (agentIdentifier: string) => Promise<void>;
    /**
     * Whether add-agent actions should be shown.
     */
    readonly isAdmin: boolean;
    /**
     * Navigates to a folder scope.
     */
    readonly onNavigateToFolder: (folderId: number | null) => void;
    /**
     * Optional parent-folder shortcut card shown at the top.
     */
    readonly parentFolderInfo: { readonly id: number | null; readonly label: string } | null;
    /**
     * Public server URL forwarded to cards.
     */
    readonly publicUrl: string_url;
    /**
     * dnd-kit sensors array.
     */
    readonly sensors: ComponentProps<typeof DndContext>['sensors'];
    /**
     * Drag ids of the visible agent cards.
     */
    readonly visibleAgentDragIds: string[];
    /**
     * Agents visible in the current folder.
     */
    readonly visibleAgents: AgentOrganizationAgent[];
    /**
     * Drag ids of the visible folder cards.
     */
    readonly visibleFolderDragIds: string[];
    /**
     * Folders visible in the current folder.
     */
    readonly visibleFolders: AgentOrganizationFolder[];
};

/**
 * Shared SortableAgentCard prop lookup used by event-handler types above.
 *
 * @private function of AgentsList
 */
type SortableAgentCardProps = ComponentProps<typeof SortableAgentCard>;

/**
 * Shared SortableFolderCard prop lookup used by event-handler types above.
 *
 * @private function of AgentsList
 */
type SortableFolderCardProps = ComponentProps<typeof SortableFolderCard>;

/**
 * Renders the sortable list/grid view of folders and agents.
 *
 * @param props - Visible list data, drag handlers, and list-level actions.
 * @returns DnD-enabled list view for `AgentsList`.
 *
 * @private function of AgentsList
 */
export function AgentsListListView({
    activeAgent,
    activeDragItemType,
    activeFolder,
    allowFullCardDrag,
    canOrganize,
    currentFolderId,
    dragAgentLabel,
    dragFolderLabel,
    dropIndicator,
    getAgentDragId,
    getFolderDragId,
    getFolderPreviewAgents,
    handleAgentContextMenu,
    handleDelete,
    handleDeleteFolder,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleFolderContextMenu,
    handleRenameFolder,
    handleRequestAgentVisibilityChange,
    isAdmin,
    onNavigateToFolder,
    parentFolderInfo,
    publicUrl,
    sensors,
    visibleAgentDragIds,
    visibleAgents,
    visibleFolderDragIds,
    visibleFolders,
}: AgentsListListViewProps) {
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className={HOMEPAGE_AGENT_GRID_CLASS}>
                {parentFolderInfo && (
                    <ParentFolderCard
                        label={parentFolderInfo.label}
                        folderId={parentFolderInfo.id}
                        onOpen={() => onNavigateToFolder(parentFolderInfo.id)}
                        canOrganize={canOrganize}
                    />
                )}
                <SortableContext items={visibleFolderDragIds} strategy={rectSortingStrategy}>
                    {visibleFolders.map((folder) => (
                        <SortableFolderCard
                            key={folder.id}
                            folder={folder}
                            dragId={getFolderDragId(folder.id)}
                            previewAgents={getFolderPreviewAgents(folder.id)}
                            publicUrl={publicUrl}
                            canOrganize={canOrganize}
                            activeDragType={activeDragItemType}
                            dropIndicator={dropIndicator}
                            onOpen={() => onNavigateToFolder(folder.id)}
                            onRename={canOrganize ? () => handleRenameFolder(folder.id) : undefined}
                            onDelete={canOrganize ? () => handleDeleteFolder(folder.id) : undefined}
                            onContextMenu={handleFolderContextMenu}
                            dragHandleLabel={dragFolderLabel}
                            allowFullCardDrag={allowFullCardDrag}
                        />
                    ))}
                </SortableContext>
                <SortableContext items={visibleAgentDragIds} strategy={rectSortingStrategy}>
                    {visibleAgents.map((agent) => {
                        const agentIdentifier = agent.permanentId || agent.agentName;

                        return (
                            <SortableAgentCard
                                key={agentIdentifier}
                                agent={agent}
                                dragId={getAgentDragId(agentIdentifier)}
                                agentIdentifier={agentIdentifier}
                                publicUrl={publicUrl}
                                isAdmin={isAdmin}
                                canOrganize={canOrganize}
                                activeDragType={activeDragItemType}
                                onDelete={handleDelete}
                                onRequestVisibilityChange={handleRequestAgentVisibilityChange}
                                onContextMenu={handleAgentContextMenu}
                                dragHandleLabel={dragAgentLabel}
                                allowFullCardDrag={allowFullCardDrag}
                            />
                        );
                    })}
                </SortableContext>

                {isAdmin && <AddAgentButton currentFolderId={currentFolderId} />}
                {canOrganize && (
                    <Link
                        href="/recycle-bin"
                        className="flex items-center gap-2 px-4 py-2 mt-4 text-gray-600 hover:text-red-600 transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Open Recycle Bin
                    </Link>
                )}
            </div>
            <DragOverlay>
                {activeDragItemType === 'AGENT' && activeAgent ? (
                    <div className="pointer-events-none scale-105 drop-shadow-2xl">
                        <AgentCard
                            agent={activeAgent}
                            publicUrl={publicUrl}
                            href={buildDefaultAgentRoutePath(activeAgent.permanentId || activeAgent.agentName)}
                            isAdmin={false}
                            visibility={activeAgent.visibility}
                        />
                    </div>
                ) : activeDragItemType === 'FOLDER' && activeFolder ? (
                    <div className="pointer-events-none scale-105 drop-shadow-2xl">
                        <FolderCard
                            folderName={activeFolder.name}
                            folderIcon={activeFolder.icon}
                            folderColor={activeFolder.color}
                            previewAgents={getFolderPreviewAgents(activeFolder.id)}
                            publicUrl={publicUrl}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
