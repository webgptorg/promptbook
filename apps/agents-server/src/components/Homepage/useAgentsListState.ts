'use client';

import type { string_url } from '@promptbook-local/types';
import { useMemo } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { getAgentIdentifier } from './agentOrganizationUtils';
import { useAgentsListAgentState } from './useAgentsListAgentState';
import { useAgentsListDerivedState } from './useAgentsListDerivedState';
import {
    getAgentDragId,
    getFolderDragId,
    useAgentsListDragSensors,
    useAgentsListDragState,
} from './useAgentsListDragState';
import { useAgentsListFolderPathRecovery } from './useAgentsListFolderPathRecovery';
import { useAgentsListFolderState } from './useAgentsListFolderState';
import { useAgentsListNavigationState } from './useAgentsListNavigationState';
import { useAgentsListOrganizationActions } from './useAgentsListOrganizationActions';
import { useAgentsListOverlayDetailsState } from './useAgentsListOverlayDetailsState';
import { useAgentsListOverlayState } from './useAgentsListOverlayState';
import { useAgentsListQueryState } from './useAgentsListQueryState';
import { useAgentsListSyncState } from './useAgentsListSyncState';
import type { AgentWithVisibility } from './useFederatedAgents';
import { useIsTouchInput } from './useIsTouchInput';

/**
 * Route-facing props consumed by the internal AgentsList state hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListStateProps = {
    /**
     * List of agents to display.
     */
    readonly agents: AgentOrganizationAgent[];
    /**
     * List of folders to display.
     */
    readonly folders: AgentOrganizationFolder[];
    /**
     * Indicates if the current user has administrative privileges.
     */
    readonly isAdmin: boolean;
    /**
     * Indicates if the current user can organize agents and folders.
     */
    readonly canOrganize: boolean;
    /**
     * Controls whether federated agents are loaded and shown in graph view.
     */
    readonly showFederatedAgents: boolean;
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
    /**
     * Optional external agents to display in list view.
     */
    readonly externalAgents?: AgentWithVisibility[];
    /**
     * Whether the current view is inside a subfolder.
     */
    readonly isSubfolderView: boolean;
};

/**
 * Builds all state, derived data, and interaction handlers used by `AgentsList`.
 *
 * @param props - Current AgentsList props.
 * @returns State slices and handlers consumed by the thin AgentsList facade.
 *
 * @private function of AgentsList
 */
export function useAgentsListState(props: UseAgentsListStateProps) {
    const {
        agents: initialAgents,
        folders: initialFolders,
        canOrganize,
        publicUrl,
        showFederatedAgents,
        externalAgents: initialExternalAgents,
    } = props;
    const { folderQuery, pathname, routeSyncKey, searchParamsSnapshot, setViewMode, viewMode } =
        useAgentsListQueryState();
    const { formatText } = useAgentNaming();
    const isTouchInput = useIsTouchInput();
    const allowFullCardDrag = canOrganize && viewMode === 'LIST' && !isTouchInput;
    const {
        agents,
        folders,
        lastSyncedRouteKey,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
        synchronizeOrganizationState,
    } = useAgentsListSyncState({
        initialAgents,
        initialFolders,
        routeSyncKey,
    });
    const {
        agentCount,
        allAgentsLabel,
        breadcrumbFolders,
        currentFolderId,
        folderMaps,
        folderPathSegments,
        getFolderPreviewAgents,
        headingTitle,
        officeAgents,
        officeFolders,
        parentFolderInfo,
        visibleAgents,
        visibleFolders,
    } = useAgentsListDerivedState({
        agents,
        folderQuery,
        folders,
        formatText,
        viewMode,
    });

    useAgentsListFolderPathRecovery({
        currentFolderId,
        folderPathSegments,
        lastSyncedRouteKey,
        folderQuery,
        pathname,
        routeSyncKey,
        searchParamsSnapshot,
    });

    const { buildAgentEmail, buildAgentUrl, federatedAgents, federatedServersStatus, navigateToFolder } =
        useAgentsListNavigationState({
            folders,
            initialExternalAgents,
            pathname,
            publicUrl,
            searchParamsSnapshot,
            showFederatedAgents,
            viewMode,
        });

    const organizationActions = useAgentsListOrganizationActions({
        agents,
        childrenByParentId: folderMaps.childrenByParentId,
        folders,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
        visibleAgents,
        visibleFolders,
    });
    const folderState = useAgentsListFolderState({
        agents,
        breadcrumbFolders,
        childrenByParentId: folderMaps.childrenByParentId,
        currentFolderId,
        folders,
        formatText,
        navigateToFolder,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
    });
    const agentState = useAgentsListAgentState({
        agents,
        formatText,
        setAgents,
        synchronizeAfterMutation,
    });
    const overlayState = useAgentsListOverlayState();
    const {
        contextMenuAgent,
        contextMenuAgentAnchorPoint,
        contextMenuAgentEmail,
        contextMenuAgentUrl,
        contextMenuFolder,
        contextMenuFolderAnchorPoint,
        contextMenuFolderContext,
        contextMenuIdentifier,
        qrCodeAgent,
        qrCodeAgentEmail,
        qrCodeAgentUrl,
    } = useAgentsListOverlayDetailsState({
        buildAgentEmail,
        buildAgentUrl,
        folderById: folderMaps.folderById,
        folders,
        overlayState,
    });
    const dragState = useAgentsListDragState({
        agents,
        canOrganize,
        folders,
        moveAgentToFolder: organizationActions.moveAgentToFolder,
        moveFolderToParent: organizationActions.moveFolderToParent,
        reorderAgents: organizationActions.reorderAgents,
        reorderFolders: organizationActions.reorderFolders,
        synchronizeOrganizationState,
    });
    const sensors = useAgentsListDragSensors();
    const visibleFolderDragIds = useMemo(
        () => visibleFolders.map((folder) => getFolderDragId(folder.id)),
        [visibleFolders],
    );
    const visibleAgentDragIds = useMemo(
        () => visibleAgents.map((agent) => getAgentDragId(getAgentIdentifier(agent))),
        [visibleAgents],
    );
    const dragAgentLabel = formatText('Drag agent');
    const dragFolderLabel = formatText('Drag folder');

    return {
        activeAgent: dragState.activeAgent,
        activeDragItemType: dragState.activeDragItem?.type ?? null,
        activeFolder: dragState.activeFolder,
        agentCount,
        agents,
        allAgentsLabel,
        allowFullCardDrag,
        breadcrumbFolders,
        contextMenuAgent,
        contextMenuAgentAnchorPoint,
        contextMenuAgentEmail,
        contextMenuAgentUrl,
        contextMenuFolder,
        contextMenuFolderAnchorPoint,
        contextMenuFolderContext,
        contextMenuIdentifier,
        currentFolderId,
        dragAgentLabel,
        dragFolderLabel,
        dropIndicator: dragState.dropIndicator,
        federatedAgents,
        federatedServersStatus,
        folderEditDialogInitialValues: folderState.folderEditDialogState?.initialValues ?? null,
        folderEditDialogMode: folderState.folderEditDialogState?.mode ?? null,
        folders,
        getAgentDragId,
        getFolderDragId,
        getFolderPreviewAgents,
        handleAgentContextMenu: overlayState.handleAgentContextMenu,
        handleCloseContextMenu: overlayState.handleCloseContextMenu,
        handleCloseFolderContextMenu: overlayState.handleCloseFolderContextMenu,
        handleCloseFolderEditDialog: folderState.handleCloseFolderEditDialog,
        handleCloseQrCode: overlayState.handleCloseQrCode,
        handleContextMenuAgentRenamed: agentState.handleContextMenuAgentRenamed,
        handleCreateFolder: folderState.handleCreateFolder,
        handleDelete: agentState.handleDelete,
        handleDeleteFolder: folderState.handleDeleteFolder,
        handleDragCancel: dragState.handleDragCancel,
        handleDragEnd: dragState.handleDragEnd,
        handleDragOver: dragState.handleDragOver,
        handleDragStart: dragState.handleDragStart,
        handleFolderContextMenu: overlayState.handleFolderContextMenu,
        handleRenameFolder: folderState.handleRenameFolder,
        handleRequestAgentVisibilityChange: agentState.handleRequestAgentVisibilityChange,
        handleRequestFolderVisibilityUpdate: folderState.handleRequestFolderVisibilityUpdate,
        handleShowQrCode: overlayState.handleShowQrCode,
        handleSubmitFolderEdit: folderState.handleSubmitFolderEdit,
        headingTitle,
        isFolderEditSubmitting: folderState.isFolderEditSubmitting,
        navigateToFolder,
        officeAgents,
        officeFolders,
        parentFolderInfo,
        qrCodeAgent,
        qrCodeAgentEmail,
        qrCodeAgentUrl,
        sensors,
        setViewMode,
        viewMode,
        visibleAgentDragIds,
        visibleAgents,
        visibleFolderDragIds,
        visibleFolders,
    };
}
