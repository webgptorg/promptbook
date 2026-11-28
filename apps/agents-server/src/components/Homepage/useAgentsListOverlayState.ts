'use client';

import { useCallback, useState, type MouseEvent } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';

/**
 * State for the agent context menu.
 *
 * @private function of AgentsList
 */
type AgentContextMenuState = {
    readonly agent: AgentOrganizationAgent;
    readonly anchorPoint: { x: number; y: number };
};

/**
 * State for the folder context menu.
 *
 * @private function of AgentsList
 */
type FolderContextMenuState = {
    readonly folderId: number;
    readonly anchorPoint: { x: number; y: number };
};

/**
 * Overlay state for context menus and the QR-code modal.
 *
 * @private function of AgentsList
 */
type UseAgentsListOverlayStateResult = {
    readonly contextMenuState: AgentContextMenuState | null;
    readonly folderContextMenuState: FolderContextMenuState | null;
    readonly handleAgentContextMenu: (event: MouseEvent<HTMLDivElement>, agent: AgentOrganizationAgent) => void;
    readonly handleCloseContextMenu: () => void;
    readonly handleCloseFolderContextMenu: () => void;
    readonly handleCloseQrCode: () => void;
    readonly handleFolderContextMenu: (event: MouseEvent<HTMLDivElement>, folder: AgentOrganizationFolder) => void;
    readonly handleShowQrCode: () => void;
    readonly qrCodeAgent: AgentOrganizationAgent | null;
};

/**
 * Creates a stable anchor point for context menus.
 *
 * @param event - Mouse event that opened the menu.
 * @returns Cursor position used as the menu anchor.
 *
 * @private function of AgentsList
 */
function createContextMenuAnchorPoint(event: MouseEvent<HTMLDivElement>): { x: number; y: number } {
    return { x: event.clientX, y: event.clientY };
}

/**
 * Owns context-menu and QR-code overlay state for `AgentsList`.
 *
 * @returns Overlay state and handlers for context menus and the QR modal.
 *
 * @private function of AgentsList
 */
export function useAgentsListOverlayState(): UseAgentsListOverlayStateResult {
    const [contextMenuState, setContextMenuState] = useState<AgentContextMenuState | null>(null);
    const [folderContextMenuState, setFolderContextMenuState] = useState<FolderContextMenuState | null>(null);
    const [qrCodeAgent, setQrCodeAgent] = useState<AgentOrganizationAgent | null>(null);

    const handleAgentContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, agent: AgentOrganizationAgent) => {
        event.preventDefault();
        setFolderContextMenuState(null);
        setContextMenuState({ agent, anchorPoint: createContextMenuAnchorPoint(event) });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenuState(null);
    }, []);

    const handleFolderContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, folder: AgentOrganizationFolder) => {
        event.preventDefault();
        setContextMenuState(null);
        setFolderContextMenuState({ folderId: folder.id, anchorPoint: createContextMenuAnchorPoint(event) });
    }, []);

    const handleCloseFolderContextMenu = useCallback(() => {
        setFolderContextMenuState(null);
    }, []);

    const handleShowQrCode = useCallback(() => {
        if (contextMenuState) {
            setQrCodeAgent(contextMenuState.agent);
        }
    }, [contextMenuState]);

    const handleCloseQrCode = useCallback(() => {
        setQrCodeAgent(null);
    }, []);

    return {
        contextMenuState,
        folderContextMenuState,
        handleAgentContextMenu,
        handleCloseContextMenu,
        handleCloseFolderContextMenu,
        handleCloseQrCode,
        handleFolderContextMenu,
        handleShowQrCode,
        qrCodeAgent,
    };
}
