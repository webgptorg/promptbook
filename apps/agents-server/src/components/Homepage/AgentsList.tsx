// Client Component for rendering and deleting agents
'use client';

import { string_url } from '@promptbook-local/types';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { AgentsListDialogs } from './AgentsListDialogs';
import { AgentsListHeader } from './AgentsListHeader';
import { AgentsListViewContent } from './AgentsListViewContent';
import type { AgentWithVisibility } from './useFederatedAgents';
import { useAgentsListState } from './useAgentsListState';

/**
 * Props for the agents list component.
 */
type AgentsListProps = {
    /**
     * List of agents to display, each with basic information and visibility status
     */
    readonly agents: AgentOrganizationAgent[];

    /**
     * List of folders to display in the hierarchy
     */
    readonly folders: AgentOrganizationFolder[];

    /**
     * Indicates if the current user has administrative privileges for managing agents
     */
    readonly isAdmin: boolean;

    /**
     * Indicates if the current user can organize agents and folders
     */
    readonly canOrganize: boolean;

    /**
     * Controls whether federated agents are loaded and shown in graph view.
     */
    readonly showFederatedAgents: boolean;

    /**
     * Base URL of the agents server
     *
     * Note: [??] Using `string_url`, not `URL` object because we are passing prop from server to client.
     */
    readonly publicUrl: string_url;

    /**
     * Optional external agents to display in the list view (used for federated agents)
     */
    readonly externalAgents?: AgentWithVisibility[];

    /**
     * Whether the current view is inside a subfolder.
     */
    readonly isSubfolderView: boolean;
};

/**
 * Renders the agents list with folder navigation and graph view toggles.
 */
export function AgentsList(props: AgentsListProps) {
    const { canOrganize, isAdmin, publicUrl } = props;
    const state = useAgentsListState(props);
    const contextMenuFolder = state.contextMenuFolder;
    const onDeleteContextMenuFolder =
        canOrganize && contextMenuFolder ? () => state.handleDeleteFolder(contextMenuFolder.id) : undefined;
    const onOpenContextMenuFolder = contextMenuFolder ? () => state.navigateToFolder(contextMenuFolder.id) : undefined;
    const onRenameContextMenuFolder =
        canOrganize && contextMenuFolder ? () => state.handleRenameFolder(contextMenuFolder.id) : undefined;
    const onRequestContextMenuFolderVisibilityUpdate =
        isAdmin && contextMenuFolder ? () => state.handleRequestFolderVisibilityUpdate(contextMenuFolder.id) : undefined;

    return (
        <section className="mt-16 first:mt-4 mb-4">
            <AgentsListHeader
                agentCount={state.agentCount}
                allAgentsLabel={state.allAgentsLabel}
                breadcrumbFolders={state.breadcrumbFolders}
                canOrganize={canOrganize}
                headingTitle={state.headingTitle}
                onCreateFolder={state.handleCreateFolder}
                onNavigateToFolder={state.navigateToFolder}
                onSetViewMode={state.setViewMode}
                viewMode={state.viewMode}
            />
            <AgentsListViewContent
                activeAgent={state.activeAgent}
                activeDragItemType={state.activeDragItemType}
                activeFolder={state.activeFolder}
                agents={state.agents}
                allowFullCardDrag={state.allowFullCardDrag}
                canOrganize={canOrganize}
                currentFolderId={state.currentFolderId}
                dragAgentLabel={state.dragAgentLabel}
                dragFolderLabel={state.dragFolderLabel}
                dropIndicator={state.dropIndicator}
                federatedAgents={state.federatedAgents}
                federatedServersStatus={state.federatedServersStatus}
                folders={state.folders}
                getAgentDragId={state.getAgentDragId}
                getFolderDragId={state.getFolderDragId}
                getFolderPreviewAgents={state.getFolderPreviewAgents}
                handleAgentContextMenu={state.handleAgentContextMenu}
                handleDelete={state.handleDelete}
                handleDeleteFolder={state.handleDeleteFolder}
                handleDragCancel={state.handleDragCancel}
                handleDragEnd={state.handleDragEnd}
                handleDragOver={state.handleDragOver}
                handleDragStart={state.handleDragStart}
                handleFolderContextMenu={state.handleFolderContextMenu}
                handleRenameFolder={state.handleRenameFolder}
                handleRequestAgentVisibilityChange={state.handleRequestAgentVisibilityChange}
                isAdmin={isAdmin}
                mazeAgents={state.mazeAgents}
                officeAgents={state.officeAgents}
                officeFolders={state.officeFolders}
                onNavigateToFolder={state.navigateToFolder}
                parentFolderInfo={state.parentFolderInfo}
                publicUrl={publicUrl}
                sensors={state.sensors}
                viewMode={state.viewMode}
                visibleAgentDragIds={state.visibleAgentDragIds}
                visibleAgents={state.visibleAgents}
                visibleFolderDragIds={state.visibleFolderDragIds}
                visibleFolders={state.visibleFolders}
            />
            <AgentsListDialogs
                contextMenuAgent={state.contextMenuAgent}
                contextMenuAgentAnchorPoint={state.contextMenuAgentAnchorPoint}
                contextMenuAgentEmail={state.contextMenuAgentEmail}
                contextMenuAgentUrl={state.contextMenuAgentUrl}
                contextMenuFolder={state.contextMenuFolder}
                contextMenuFolderAnchorPoint={state.contextMenuFolderAnchorPoint}
                contextMenuFolderContext={state.contextMenuFolderContext}
                contextMenuIdentifier={state.contextMenuIdentifier}
                folderEditDialogInitialValues={state.folderEditDialogInitialValues}
                folderEditDialogMode={state.folderEditDialogMode}
                isFolderEditSubmitting={state.isFolderEditSubmitting}
                isAdmin={isAdmin}
                onAgentRenamed={state.handleContextMenuAgentRenamed}
                onCloseContextMenu={state.handleCloseContextMenu}
                onCloseFolderContextMenu={state.handleCloseFolderContextMenu}
                onCloseFolderEditDialog={state.handleCloseFolderEditDialog}
                onCloseQrCode={state.handleCloseQrCode}
                onDeleteContextMenuFolder={onDeleteContextMenuFolder}
                onOpenContextMenuFolder={onOpenContextMenuFolder}
                onRenameContextMenuFolder={onRenameContextMenuFolder}
                onRequestContextMenuFolderVisibilityUpdate={onRequestContextMenuFolderVisibilityUpdate}
                onShowQrCode={state.handleShowQrCode}
                onSubmitFolderEdit={state.handleSubmitFolderEdit}
                qrCodeAgent={state.qrCodeAgent}
                qrCodeAgentEmail={state.qrCodeAgentEmail}
                qrCodeAgentUrl={state.qrCodeAgentUrl}
            />
        </section>
    );
}
