'use client';

import type { AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import { buildAgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { findFolderById, getAgentIdentifier } from './agentOrganizationUtils';
import { useAgentsListOverlayState } from './useAgentsListOverlayState';

/**
 * Props accepted by the private overlay-details hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListOverlayDetailsStateProps = {
    readonly buildAgentEmail: (identifier: string) => string;
    readonly buildAgentUrl: (identifier: string) => string;
    readonly folderById: Map<number, AgentOrganizationFolder>;
    readonly folders: AgentOrganizationFolder[];
    readonly overlayState: ReturnType<typeof useAgentsListOverlayState>;
};

/**
 * Context-menu and QR-code details returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListOverlayDetailsStateResult = {
    readonly contextMenuAgent: AgentOrganizationAgent | null;
    readonly contextMenuAgentAnchorPoint: { x: number; y: number } | null;
    readonly contextMenuAgentEmail: string;
    readonly contextMenuAgentUrl: string;
    readonly contextMenuFolder: AgentOrganizationFolder | null;
    readonly contextMenuFolderAnchorPoint: { x: number; y: number } | null;
    readonly contextMenuFolderContext: AgentFolderContext | null;
    readonly contextMenuIdentifier: string;
    readonly qrCodeAgent: AgentOrganizationAgent | null;
    readonly qrCodeAgentEmail: string;
    readonly qrCodeAgentUrl: string;
};

/**
 * Derives context-menu and QR-code presentation data from the mutable overlay state.
 *
 * @param props - Overlay state plus folder and agent-address helpers.
 * @returns Render-ready overlay details for dialogs and menus.
 *
 * @private function of AgentsList
 */
export function useAgentsListOverlayDetailsState({
    buildAgentEmail,
    buildAgentUrl,
    folderById,
    folders,
    overlayState,
}: UseAgentsListOverlayDetailsStateProps): UseAgentsListOverlayDetailsStateResult {
    const contextMenuAgent = overlayState.contextMenuState?.agent ?? null;
    const contextMenuFolder =
        overlayState.folderContextMenuState === null
            ? null
            : findFolderById(folders, overlayState.folderContextMenuState.folderId) || null;
    const contextMenuIdentifier = contextMenuAgent ? getAgentIdentifier(contextMenuAgent) : '';
    const contextMenuFolderContext =
        contextMenuAgent === null ? null : buildAgentFolderContext(contextMenuAgent.folderId ?? null, folderById);
    const contextMenuAgentUrl = contextMenuAgent ? buildAgentUrl(contextMenuIdentifier) : '';
    const contextMenuAgentEmail = contextMenuAgent ? buildAgentEmail(contextMenuIdentifier) : '';
    const qrCodeAgent = overlayState.qrCodeAgent;
    const qrCodeIdentifier = qrCodeAgent ? getAgentIdentifier(qrCodeAgent) : '';
    const qrCodeAgentUrl = qrCodeAgent ? buildAgentUrl(qrCodeIdentifier) : '';
    const qrCodeAgentEmail = qrCodeAgent ? buildAgentEmail(qrCodeIdentifier) : '';

    return {
        contextMenuAgent,
        contextMenuAgentAnchorPoint: overlayState.contextMenuState?.anchorPoint ?? null,
        contextMenuAgentEmail,
        contextMenuAgentUrl,
        contextMenuFolder,
        contextMenuFolderAnchorPoint: overlayState.folderContextMenuState?.anchorPoint ?? null,
        contextMenuFolderContext,
        contextMenuIdentifier,
        qrCodeAgent,
        qrCodeAgentEmail,
        qrCodeAgentUrl,
    };
}
