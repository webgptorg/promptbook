'use client';

import dynamic from 'next/dynamic';
import type { AgentProfile } from '../../app/agents/[agentName]/AgentProfileWrapper';
import type { AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentContextMenuRenamePayload } from '../AgentContextMenu/AgentContextMenu';
import type { FolderEditValues } from './FolderEditDialog';

/**
 * Props for the private dialog and popover surface owned by `AgentsList`.
 *
 * @private function of AgentsList
 */
type AgentsListDialogsProps = {
    /**
     * Agent currently targeted by the context menu.
     */
    readonly contextMenuAgent: AgentOrganizationAgent | null;
    /**
     * Anchor point for the agent context menu.
     */
    readonly contextMenuAgentAnchorPoint: { x: number; y: number } | null;
    /**
     * Email alias shown in the agent context menu.
     */
    readonly contextMenuAgentEmail: string;
    /**
     * Share URL shown in the agent context menu.
     */
    readonly contextMenuAgentUrl: string;
    /**
     * Folder currently targeted by the folder context menu.
     */
    readonly contextMenuFolder: AgentOrganizationFolder | null;
    /**
     * Anchor point for the folder context menu.
     */
    readonly contextMenuFolderAnchorPoint: { x: number; y: number } | null;
    /**
     * Folder-breadcrumb context for the selected agent.
     */
    readonly contextMenuFolderContext: AgentFolderContext | null;
    /**
     * Canonical identifier of the agent in the context menu.
     */
    readonly contextMenuIdentifier: string;
    /**
     * Initial values for the folder dialog.
     */
    readonly folderEditDialogInitialValues: FolderEditValues | null;
    /**
     * Current folder dialog mode.
     */
    readonly folderEditDialogMode: 'CREATE' | 'EDIT' | null;
    /**
     * Whether the folder dialog is currently submitting.
     */
    readonly isFolderEditSubmitting: boolean;
    /**
     * Whether the agent context menu should expose admin-only actions.
     */
    readonly isAdmin: boolean;
    /**
     * Applies an agent rename emitted from the context menu.
     */
    readonly onAgentRenamed: (payload: AgentContextMenuRenamePayload) => void;
    /**
     * Closes the agent context menu.
     */
    readonly onCloseContextMenu: () => void;
    /**
     * Closes the folder context menu.
     */
    readonly onCloseFolderContextMenu: () => void;
    /**
     * Closes the folder edit dialog.
     */
    readonly onCloseFolderEditDialog: () => void;
    /**
     * Closes the QR code modal.
     */
    readonly onCloseQrCode: () => void;
    /**
     * Deletes the folder currently targeted by the folder context menu.
     */
    readonly onDeleteContextMenuFolder?: () => void;
    /**
     * Opens the folder currently targeted by the folder context menu.
     */
    readonly onOpenContextMenuFolder?: () => void;
    /**
     * Renames the folder currently targeted by the folder context menu.
     */
    readonly onRenameContextMenuFolder?: () => void;
    /**
     * Opens the folder-subtree visibility flow for the targeted folder.
     */
    readonly onRequestContextMenuFolderVisibilityUpdate?: () => void;
    /**
     * Opens the QR code modal from the agent context menu.
     */
    readonly onShowQrCode: () => void;
    /**
     * Submits the folder edit dialog.
     */
    readonly onSubmitFolderEdit: (values: FolderEditValues) => Promise<void>;
    /**
     * Agent currently shown in the QR code modal.
     */
    readonly qrCodeAgent: AgentOrganizationAgent | null;
    /**
     * Email alias shown in the QR code modal.
     */
    readonly qrCodeAgentEmail: string;
    /**
     * Share URL shown in the QR code modal.
     */
    readonly qrCodeAgentUrl: string;
};

/**
 * Deferred agent context menu so directory browsing does not eagerly hydrate interaction-only code.
 *
 * @private function of AgentsList
 */
const DeferredAgentContextMenuPopover = dynamic(
    () => import('../AgentContextMenu/AgentContextMenu').then((mod) => mod.AgentContextMenuPopover),
    {
        ssr: false,
        loading: () => null,
    },
);

/**
 * Deferred folder context menu so directory browsing does not eagerly hydrate interaction-only code.
 *
 * @private function of AgentsList
 */
const DeferredFolderContextMenuPopover = dynamic(
    () => import('../FolderContextMenu/FolderContextMenu').then((mod) => mod.FolderContextMenuPopover),
    {
        ssr: false,
        loading: () => null,
    },
);

/**
 * Deferred folder editor dialog used only after explicit user actions.
 *
 * @private function of AgentsList
 */
const DeferredFolderEditDialog = dynamic(() => import('./FolderEditDialog').then((mod) => mod.FolderEditDialog), {
    ssr: false,
    loading: () => null,
});

/**
 * Deferred QR-code dialog used only after explicit user actions.
 *
 * @private function of AgentsList
 */
const DeferredAgentQrCodeModal = dynamic(() => import('./AgentQrCodeModal').then((mod) => mod.AgentQrCodeModal), {
    ssr: false,
    loading: () => null,
});

/**
 * Renders the private dialog and popover surface for `AgentsList`.
 *
 * @param props - Dialog state, derived share metadata, and dialog callbacks.
 * @returns Dialog and popover elements conditionally mounted for the list.
 *
 * @private function of AgentsList
 */
export function AgentsListDialogs({
    contextMenuAgent,
    contextMenuAgentAnchorPoint,
    contextMenuAgentEmail,
    contextMenuAgentUrl,
    contextMenuFolder,
    contextMenuFolderAnchorPoint,
    contextMenuFolderContext,
    contextMenuIdentifier,
    folderEditDialogInitialValues,
    folderEditDialogMode,
    isFolderEditSubmitting,
    isAdmin,
    onAgentRenamed,
    onCloseContextMenu,
    onCloseFolderContextMenu,
    onCloseFolderEditDialog,
    onCloseQrCode,
    onDeleteContextMenuFolder,
    onOpenContextMenuFolder,
    onRenameContextMenuFolder,
    onRequestContextMenuFolderVisibilityUpdate,
    onShowQrCode,
    onSubmitFolderEdit,
    qrCodeAgent,
    qrCodeAgentEmail,
    qrCodeAgentUrl,
}: AgentsListDialogsProps) {
    return (
        <>
            {folderEditDialogMode && folderEditDialogInitialValues && (
                <DeferredFolderEditDialog
                    isOpen
                    mode={folderEditDialogMode}
                    initialValues={folderEditDialogInitialValues}
                    isSubmitting={isFolderEditSubmitting}
                    onClose={onCloseFolderEditDialog}
                    onSubmit={onSubmitFolderEdit}
                />
            )}
            {contextMenuAgent && (
                <DeferredAgentContextMenuPopover
                    agent={contextMenuAgent as AgentProfile}
                    isOpen
                    anchorPoint={contextMenuAgentAnchorPoint}
                    onClose={onCloseContextMenu}
                    agentName={contextMenuIdentifier}
                    derivedAgentName={contextMenuAgent.agentName}
                    permanentId={contextMenuAgent.permanentId}
                    agentUrl={contextMenuAgentUrl}
                    agentEmail={contextMenuAgentEmail}
                    folderContext={contextMenuFolderContext}
                    isAdmin={isAdmin}
                    onShowQrCode={onShowQrCode}
                    onAgentRenamed={onAgentRenamed}
                    fromDirectoryListing
                />
            )}
            {contextMenuFolder && onOpenContextMenuFolder && (
                <DeferredFolderContextMenuPopover
                    folder={contextMenuFolder}
                    isOpen
                    anchorPoint={contextMenuFolderAnchorPoint}
                    onClose={onCloseFolderContextMenu}
                    onOpenFolder={onOpenContextMenuFolder}
                    onRenameFolder={onRenameContextMenuFolder}
                    onDeleteFolder={onDeleteContextMenuFolder}
                    onRequestVisibilityUpdate={onRequestContextMenuFolderVisibilityUpdate}
                />
            )}
            {qrCodeAgent && (
                <DeferredAgentQrCodeModal
                    agent={qrCodeAgent}
                    agentUrl={qrCodeAgentUrl}
                    agentEmail={qrCodeAgentEmail}
                    onClose={onCloseQrCode}
                />
            )}
        </>
    );
}
