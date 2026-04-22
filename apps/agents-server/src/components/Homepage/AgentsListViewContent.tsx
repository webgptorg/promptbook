'use client';

import dynamic from 'next/dynamic';
import { GraphLoadingSkeleton } from '../Skeleton/GraphLoadingSkeleton';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { HomeViewMode } from './homeViewMode';
import type { AgentWithVisibility, FederatedServerStatus } from './useFederatedAgents';
import { AgentsListListView } from './AgentsListListView';
import type { DragItem } from './DragItem';
import type { DropIndicator } from './DropIndicator';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { string_url } from '@promptbook-local/types';
import type { ComponentProps } from 'react';
import { DndContext } from '@dnd-kit/core';

/**
 * Props for rendering the active `AgentsList` view.
 *
 * @private function of AgentsList
 */
type AgentsListViewContentProps = {
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
     * All local agents.
     */
    readonly agents: AgentOrganizationAgent[];
    /**
     * Whether full-card drag gestures should be enabled.
     */
    readonly allowFullCardDrag: boolean;
    /**
     * Whether organization actions are available.
     */
    readonly canOrganize: boolean;
    /**
     * Folder currently used for Add Agent actions.
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
     * Federated agents shown in non-list views.
     */
    readonly federatedAgents: AgentWithVisibility[];
    /**
     * Per-server load/error state for federated data.
     */
    readonly federatedServersStatus: Record<string, FederatedServerStatus>;
    /**
     * All local folders.
     */
    readonly folders: AgentOrganizationFolder[];
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
    readonly handleAgentContextMenu: ComponentProps<typeof AgentsListListView>['handleAgentContextMenu'];
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
    readonly handleFolderContextMenu: ComponentProps<typeof AgentsListListView>['handleFolderContextMenu'];
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
     * Office-view subset of agents.
     */
    readonly officeAgents: AgentOrganizationAgent[];
    /**
     * Office-view subset of folders.
     */
    readonly officeFolders: AgentOrganizationFolder[];
    /**
     * Navigates to a folder scope.
     */
    readonly onNavigateToFolder: (folderId: number | null) => void;
    /**
     * Optional parent-folder shortcut card shown at the top of list view.
     */
    readonly parentFolderInfo: { readonly id: number | null; readonly label: string } | null;
    /**
     * Public server URL forwarded to views.
     */
    readonly publicUrl: string_url;
    /**
     * dnd-kit sensors array.
     */
    readonly sensors: ComponentProps<typeof DndContext>['sensors'];
    /**
     * Currently active homepage view mode.
     */
    readonly viewMode: HomeViewMode;
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
 * Deferred graph chunk loaded only when the graph view is active.
 *
 * @private function of AgentsList
 */
const DeferredAgentsGraph = dynamic(() => import('./AgentsGraph').then((mod) => mod.AgentsGraph), {
    ssr: false,
    loading: () => <GraphLoadingSkeleton />,
});

/**
 * Deferred office chunk loaded only when the office view is active.
 *
 * @private function of AgentsList
 */
const DeferredAgentsOffice = dynamic(() => import('./AgentsOffice').then((mod) => mod.AgentsOffice), {
    ssr: false,
    loading: () => <GraphLoadingSkeleton />,
});

/**
 * Deferred pixel-office chunk loaded only when the pixel-office view is active.
 *
 * @private function of AgentsList
 */
const DeferredAgentsPixelOffice = dynamic(
    () => import('./AgentsPixelOffice').then((mod) => mod.AgentsPixelOffice),
    {
        ssr: false,
        loading: () => <GraphLoadingSkeleton />,
    },
);

/**
 * Adds the local server URL to agent records consumed by the graph view.
 *
 * @param agents - Local agents rendered in the graph.
 * @param publicUrl - Current public server URL.
 * @returns Local agents augmented with a canonical serverUrl value.
 *
 * @private function of AgentsList
 */
function mapGraphAgents(agents: ReadonlyArray<AgentOrganizationAgent>, publicUrl: string_url): AgentWithVisibility[] {
    const normalizedServerUrl = publicUrl.replace(/\/$/, '');
    return agents.map((agent) => ({ ...agent, serverUrl: normalizedServerUrl }));
}

/**
 * Renders the active list/graph/office homepage surface for `AgentsList`.
 *
 * @param props - Active view state and view-specific callbacks.
 * @returns The currently selected homepage view.
 *
 * @private function of AgentsList
 */
export function AgentsListViewContent({
    activeAgent,
    activeDragItemType,
    activeFolder,
    agents,
    allowFullCardDrag,
    canOrganize,
    currentFolderId,
    dragAgentLabel,
    dragFolderLabel,
    dropIndicator,
    federatedAgents,
    federatedServersStatus,
    folders,
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
    officeAgents,
    officeFolders,
    onNavigateToFolder,
    parentFolderInfo,
    publicUrl,
    sensors,
    viewMode,
    visibleAgentDragIds,
    visibleAgents,
    visibleFolderDragIds,
    visibleFolders,
}: AgentsListViewContentProps) {
    if (viewMode === 'LIST') {
        return (
            <AgentsListListView
                activeAgent={activeAgent}
                activeDragItemType={activeDragItemType}
                activeFolder={activeFolder}
                allowFullCardDrag={allowFullCardDrag}
                canOrganize={canOrganize}
                currentFolderId={currentFolderId}
                dragAgentLabel={dragAgentLabel}
                dragFolderLabel={dragFolderLabel}
                dropIndicator={dropIndicator}
                getAgentDragId={getAgentDragId}
                getFolderDragId={getFolderDragId}
                getFolderPreviewAgents={getFolderPreviewAgents}
                handleAgentContextMenu={handleAgentContextMenu}
                handleDelete={handleDelete}
                handleDeleteFolder={handleDeleteFolder}
                handleDragCancel={handleDragCancel}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDragStart={handleDragStart}
                handleFolderContextMenu={handleFolderContextMenu}
                handleRenameFolder={handleRenameFolder}
                handleRequestAgentVisibilityChange={handleRequestAgentVisibilityChange}
                isAdmin={isAdmin}
                onNavigateToFolder={onNavigateToFolder}
                parentFolderInfo={parentFolderInfo}
                publicUrl={publicUrl}
                sensors={sensors}
                visibleAgentDragIds={visibleAgentDragIds}
                visibleAgents={visibleAgents}
                visibleFolderDragIds={visibleFolderDragIds}
                visibleFolders={visibleFolders}
            />
        );
    }

    if (viewMode === 'GRAPH') {
        return (
            <div className="w-full">
                <DeferredAgentsGraph
                    agents={mapGraphAgents(agents, publicUrl)}
                    federatedAgents={federatedAgents}
                    federatedServersStatus={federatedServersStatus}
                    publicUrl={publicUrl}
                    folders={folders}
                />
            </div>
        );
    }

    if (viewMode === 'OFFICE') {
        return (
            <div className="w-full">
                <DeferredAgentsOffice
                    agents={officeAgents}
                    federatedAgents={federatedAgents}
                    publicUrl={publicUrl}
                    folders={officeFolders}
                />
            </div>
        );
    }

    return (
        <div className="w-full">
            <DeferredAgentsPixelOffice
                agents={officeAgents}
                federatedAgents={federatedAgents}
                publicUrl={publicUrl}
                folders={officeFolders}
            />
        </div>
    );
}
