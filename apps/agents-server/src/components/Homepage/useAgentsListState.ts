'use client';

import { string_url } from '@promptbook-local/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import { buildAgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import {
    buildFolderMaps,
    buildFolderPath,
    findFolderById,
    getAgentIdentifier,
    getFolderPathSegments,
} from './agentOrganizationUtils';
import type { HomeViewMode } from './homeViewMode';
import { getHomeViewQueryValue, resolveHomeViewMode } from './homeViewMode';
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
import { useAgentsListOrganizationActions } from './useAgentsListOrganizationActions';
import { useAgentsListOverlayState } from './useAgentsListOverlayState';
import { useAgentsListSyncState } from './useAgentsListSyncState';
import { useFederatedAgents, type AgentWithVisibility } from './useFederatedAgents';
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
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsSnapshot = searchParams.toString();
    const routeSyncKey = `${pathname}?${searchParamsSnapshot}`;
    const folderQuery = searchParams.get('folder');
    const viewMode = resolveHomeViewMode(searchParams.get('view'));
    const { formatText } = useAgentNaming();
    const normalizedPublicUrl = useMemo(
        () => (publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`),
        [publicUrl],
    );
    const publicUrlHost = useMemo(() => {
        try {
            return new URL(normalizedPublicUrl).hostname;
        } catch {
            return '';
        }
    }, [normalizedPublicUrl]);
    const shouldRefreshFederatedAgents = showFederatedAgents && viewMode !== 'LIST';
    const { federatedAgents, federatedServersStatus } = useFederatedAgents(
        showFederatedAgents,
        initialExternalAgents,
        shouldRefreshFederatedAgents,
    );
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
        router,
        searchParamsSnapshot,
    });

    const buildAgentUrl = useCallback(
        (identifier: string) => `${normalizedPublicUrl}${encodeURIComponent(identifier)}`,
        [normalizedPublicUrl],
    );
    const buildAgentEmail = useCallback(
        (identifier: string) => (publicUrlHost ? `${identifier}@${publicUrlHost}` : ''),
        [publicUrlHost],
    );

    const setViewMode = useCallback(
        (mode: HomeViewMode) => {
            const params = new URLSearchParams(searchParams.toString());
            const viewQueryValue = getHomeViewQueryValue(mode);

            if (viewQueryValue === null) {
                params.delete('view');
            } else {
                params.set('view', viewQueryValue);
            }

            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    const navigateToFolder = useCallback(
        (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => {
            const targetFolders = overrideFolders || folders;
            const { folderById } = buildFolderMaps(targetFolders);
            const targetSegments = getFolderPathSegments(folderId, folderById).map((folder) => folder.name);
            const params = new URLSearchParams(searchParams.toString());

            if (targetSegments.length === 0) {
                params.delete('folder');
            } else {
                params.set('folder', buildFolderPath(targetSegments));
            }

            router.push(`?${params.toString()}`, { scroll: false });
        },
        [folders, router, searchParams],
    );

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

    const contextMenuAgent = overlayState.contextMenuState?.agent ?? null;
    const contextMenuFolder =
        overlayState.folderContextMenuState === null
            ? null
            : findFolderById(folders, overlayState.folderContextMenuState.folderId) || null;
    const contextMenuIdentifier = contextMenuAgent ? getAgentIdentifier(contextMenuAgent) : '';
    const contextMenuAgentUrl = contextMenuAgent ? buildAgentUrl(contextMenuIdentifier) : '';
    const contextMenuAgentEmail = contextMenuAgent ? buildAgentEmail(contextMenuIdentifier) : '';
    const contextMenuFolderContext = useMemo<AgentFolderContext | null>(() => {
        if (!contextMenuAgent) {
            return null;
        }

        return buildAgentFolderContext(contextMenuAgent.folderId ?? null, folderMaps.folderById);
    }, [contextMenuAgent, folderMaps.folderById]);
    const qrCodeIdentifier = overlayState.qrCodeAgent ? getAgentIdentifier(overlayState.qrCodeAgent) : '';
    const qrCodeAgentUrl = overlayState.qrCodeAgent ? buildAgentUrl(qrCodeIdentifier) : '';
    const qrCodeAgentEmail = overlayState.qrCodeAgent ? buildAgentEmail(qrCodeIdentifier) : '';

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
        contextMenuAgentAnchorPoint: overlayState.contextMenuState?.anchorPoint ?? null,
        contextMenuAgentEmail,
        contextMenuAgentUrl,
        contextMenuFolder,
        contextMenuFolderAnchorPoint: overlayState.folderContextMenuState?.anchorPoint ?? null,
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
        qrCodeAgent: overlayState.qrCodeAgent,
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
