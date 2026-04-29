'use client';

import {
    Settings2 as AdjustmentsHorizontalIcon,
    BarChart3Icon,
    CopyIcon,
    CopyPlusIcon,
    DownloadIcon,
    ExternalLinkIcon,
    FileTextIcon,
    FolderOpenIcon,
    MailIcon,
    MessageCircleQuestionIcon,
    MessageSquareIcon,
    MessageSquareShareIcon,
    MoreHorizontalIcon,
    PencilIcon,
    QrCodeIcon,
    SmartphoneIcon,
    SquareSplitHorizontalIcon,
    TrashIcon,
} from 'lucide-react';
import { buildFreshAgentChatHref } from '../../utils/agentRouting/agentRouteHrefs';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import type { ContextMenuItem, ContextMenuLinkItem } from '../ContextMenu/ContextMenuPanel';
import { useMetadataFlags } from '../MetadataFlags/MetadataFlagsContext';
import type { AgentContextMenuBaseProps } from './AgentContextMenu';
import { useAgentContextMenuActions } from './useAgentContextMenuActions';
import { useAgentContextMenuCopyFeedback } from './useAgentContextMenuCopyFeedback';

/**
 * Supported transient clipboard feedback states.
 *
 * @private function of AgentContextMenu
 */
type CopyFeedback = 'URL' | 'Email';

/**
 * Text formatter returned by the naming context.
 *
 * @private function of AgentContextMenu
 */
type FormatAgentContextMenuText = ReturnType<typeof useAgentNaming>['formatText'];

/**
 * Link metadata required by the menu-item factories.
 *
 * @private function of AgentContextMenu
 */
type AgentContextMenuNavigationLink = Pick<ContextMenuLinkItem, 'href' | 'icon'> & { readonly title: string };

/**
 * Builds one divider item.
 *
 * @returns Context-menu divider descriptor.
 */
function createDividerItem(): ContextMenuItem {
    return { type: 'divider' };
}

/**
 * Creates menu items specific to the directory-listing context.
 *
 * @param agentIdentifier - Current permanent id or routed agent name.
 * @param formatText - Agent-aware text formatter.
 * @param fromDirectoryListing - Whether the menu was opened in the directory listing.
 * @returns Optional directory-listing menu items.
 */
function createDirectoryListingMenuItems(
    agentIdentifier: string,
    formatText: FormatAgentContextMenuText,
    fromDirectoryListing?: boolean,
): ContextMenuItem[] {
    if (!fromDirectoryListing) {
        return [];
    }

    return [
        {
            type: 'link',
            href: buildFreshAgentChatHref(agentIdentifier),
            icon: ExternalLinkIcon,
            label: formatText('Open in new tab'),
            target: '_blank',
        },
        createDividerItem(),
    ];
}

/**
 * Creates the optional legacy update-URL menu items.
 *
 * @param formatText - Agent-aware text formatter.
 * @param handleUpdateUrl - URL update action handler.
 * @param isUpdateUrlActionVisible - Whether the legacy action should render.
 * @returns Optional update-URL menu items.
 */
function createUpdateUrlMenuItems(
    formatText: FormatAgentContextMenuText,
    handleUpdateUrl: () => Promise<void>,
    isUpdateUrlActionVisible: boolean,
): ContextMenuItem[] {
    if (!isUpdateUrlActionVisible) {
        return [];
    }

    return [
        {
            type: 'action',
            icon: MoreHorizontalIcon,
            label: formatText('Update URL'),
            onClick: handleUpdateUrl,
            highlight: true,
        },
        createDividerItem(),
    ];
}

/**
 * Creates the optional PWA install action.
 *
 * @param formatText - Agent-aware text formatter.
 * @param installPromptEvent - Browser install prompt event when available.
 * @param isExperimentalPwaAppEnabled - Whether the experimental install action is enabled.
 * @param isInstalled - Whether the app is already installed.
 * @param onInstallApp - Install action callback.
 * @returns Optional install menu item.
 */
function createInstallPromptMenuItems(
    formatText: FormatAgentContextMenuText,
    installPromptEvent: AgentContextMenuBaseProps['installPromptEvent'],
    isExperimentalPwaAppEnabled: boolean,
    isInstalled: boolean,
    onInstallApp?: () => void,
): ContextMenuItem[] {
    if (isInstalled || !installPromptEvent || !onInstallApp || !isExperimentalPwaAppEnabled) {
        return [];
    }

    return [
        {
            type: 'action',
            icon: SmartphoneIcon,
            label: formatText('Install Agent as App'),
            onClick: onInstallApp,
        },
    ];
}

/**
 * Creates copy and share actions that are always visible in the menu.
 *
 * @param agentEmail - Shareable agent email.
 * @param agentUrl - Shareable agent URL.
 * @param copyFeedback - Temporary copied state.
 * @param formatText - Agent-aware text formatter.
 * @param handleCopy - Clipboard action helper.
 * @param onShowQrCode - QR-code modal trigger.
 * @returns Copy and share menu items.
 */
function createSharingMenuItems(
    agentEmail: string,
    agentUrl: string,
    copyFeedback: CopyFeedback | null,
    formatText: FormatAgentContextMenuText,
    handleCopy: (value: string, label: CopyFeedback) => Promise<void>,
    onShowQrCode?: () => void,
): ContextMenuItem[] {
    return [
        {
            type: 'action',
            icon: CopyIcon,
            label: copyFeedback === 'URL' ? formatText('Copied!') : formatText('Copy Agent URL'),
            onClick: () => handleCopy(agentUrl, 'URL'),
        },
        {
            type: 'action',
            icon: MailIcon,
            label: copyFeedback === 'Email' ? formatText('Copied!') : formatText('Copy Agent Email'),
            onClick: () => handleCopy(agentEmail, 'Email'),
        },
        {
            type: 'action',
            icon: QrCodeIcon,
            label: formatText('Show QR Code'),
            onClick: onShowQrCode,
        },
    ];
}

/**
 * Creates navigation items for opening the current agent in related views.
 *
 * @param agentIdentifier - Current permanent id or routed agent name.
 * @param editBookLink - Generated edit-book link metadata.
 * @param folderContext - Optional folder navigation context.
 * @param formatText - Agent-aware text formatter.
 * @returns Navigation and workspace menu items.
 */
function createWorkspaceMenuItems(
    agentIdentifier: string,
    editBookLink: AgentContextMenuNavigationLink,
    folderContext: AgentContextMenuBaseProps['folderContext'],
    formatText: FormatAgentContextMenuText,
): ContextMenuItem[] {
    const menuItems: ContextMenuItem[] = [];

    if (folderContext) {
        menuItems.push({
            type: 'link',
            href: folderContext.href,
            icon: FolderOpenIcon,
            label: `${formatText('Open Folder')}: ${folderContext.label}`,
        });
    }

    menuItems.push(
        {
            type: 'link',
            href: buildFreshAgentChatHref(agentIdentifier),
            icon: MessageSquareShareIcon,
            label: formatText('Standalone Chat'),
        },
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentIdentifier)}/book+chat`,
            icon: SquareSplitHorizontalIcon,
            label: formatText('Edit Book & Chat'),
        },
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentIdentifier)}/textarea`,
            icon: MessageSquareIcon,
            label: formatText('Textarea Entry'),
        },
        {
            type: 'link',
            href: editBookLink.href,
            icon: editBookLink.icon,
            label: editBookLink.title,
        },
    );

    return menuItems;
}

/**
 * Creates destructive and maintenance actions for the current agent.
 *
 * @param formatText - Agent-aware text formatter.
 * @param handleCloneAgent - Clone action handler.
 * @param handleDeleteAgent - Delete action handler.
 * @param handleRenameAgent - Rename action handler.
 * @returns Management menu items.
 */
function createManagementMenuItems(
    formatText: FormatAgentContextMenuText,
    handleCloneAgent: () => Promise<void>,
    handleDeleteAgent: () => Promise<void>,
    handleRenameAgent: () => Promise<void>,
): ContextMenuItem[] {
    return [
        {
            type: 'action',
            icon: PencilIcon,
            label: formatText('Rename Agent'),
            onClick: handleRenameAgent,
        },
        {
            type: 'action',
            icon: CopyPlusIcon,
            label: formatText('Clone agent'),
            onClick: handleCloneAgent,
        },
        {
            type: 'action',
            icon: TrashIcon,
            label: formatText('Delete Agent'),
            onClick: handleDeleteAgent,
        },
    ];
}

/**
 * Creates the admin-only menu section.
 *
 * @param agentName - Current routed agent name.
 * @param formatText - Agent-aware text formatter.
 * @param handleRequestVisibilityUpdate - Visibility dialog action.
 * @param integrationLink - Generated integration link metadata.
 * @param isAdmin - Whether the current user is an admin.
 * @param shouldShowVisibilityAction - Whether visibility editing is available.
 * @param usageAnalyticsHref - Usage analytics URL for the current agent.
 * @returns Admin-only menu items.
 */
function createAdminMenuItems(
    agentName: string,
    formatText: FormatAgentContextMenuText,
    handleRequestVisibilityUpdate: () => Promise<void>,
    integrationLink: AgentContextMenuNavigationLink,
    isAdmin: boolean,
    shouldShowVisibilityAction: boolean,
    usageAnalyticsHref: string,
): ContextMenuItem[] {
    if (!isAdmin) {
        return [];
    }

    const menuItems: ContextMenuItem[] = [createDividerItem()];

    if (shouldShowVisibilityAction) {
        menuItems.push(
            {
                type: 'action',
                icon: AdjustmentsHorizontalIcon,
                label: formatText('Update visibility'),
                onClick: handleRequestVisibilityUpdate,
            },
            createDividerItem(),
        );
    }

    menuItems.push(
        {
            type: 'link',
            href: `/admin/chat-history?agentName=${encodeURIComponent(agentName)}`,
            icon: MessageSquareIcon,
            label: formatText('Chat History'),
        },
        {
            type: 'link',
            href: usageAnalyticsHref,
            icon: BarChart3Icon,
            label: formatText('Usage Analytics'),
        },
        {
            type: 'link',
            href: `/admin/chat-feedback?agentName=${encodeURIComponent(agentName)}`,
            icon: MessageCircleQuestionIcon,
            label: formatText('Chat Feedback'),
        },
        createDividerItem(),
        {
            type: 'link',
            href: integrationLink.href,
            icon: integrationLink.icon,
            label: integrationLink.title,
        },
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentName)}/system-message`,
            icon: FileTextIcon,
            label: formatText('Show System Message'),
        },
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentName)}/export-as-transpiled-code`,
            icon: DownloadIcon,
            label: formatText('Export Agent'),
        },
        createDividerItem(),
    );

    return menuItems;
}

/**
 * Builds the ordered menu items for agent context menus.
 *
 * @param props - Shared agent menu configuration.
 * @returns Ordered list of context-menu items.
 *
 * @private function of AgentContextMenu
 */
export function useAgentContextMenuItems(props: AgentContextMenuBaseProps): ContextMenuItem[] {
    const {
        agentName,
        agentUrl,
        agentEmail,
        permanentId,
        folderContext,
        isAdmin = false,
        onShowQrCode,
        installPromptEvent,
        isInstalled = false,
        onInstallApp,
        fromDirectoryListing,
    } = props;

    const { isExperimentalPwaAppEnabled } = useMetadataFlags();
    const { formatText } = useAgentNaming();
    const { copyFeedback, handleCopy } = useAgentContextMenuCopyFeedback();
    const agentIdentifier = permanentId || agentName;
    const {
        editBookLink,
        handleCloneAgent,
        handleDeleteAgent,
        handleRenameAgent,
        handleRequestVisibilityUpdate,
        handleUpdateUrl,
        integrationLink,
        isUpdateUrlActionVisible,
        shouldShowVisibilityAction,
        usageAnalyticsHref,
    } = useAgentContextMenuActions(props, formatText);

    return [
        ...createDirectoryListingMenuItems(agentIdentifier, formatText, fromDirectoryListing),
        ...createUpdateUrlMenuItems(formatText, handleUpdateUrl, isUpdateUrlActionVisible),
        ...createInstallPromptMenuItems(
            formatText,
            installPromptEvent,
            isExperimentalPwaAppEnabled,
            isInstalled,
            onInstallApp,
        ),
        ...createSharingMenuItems(agentEmail, agentUrl, copyFeedback, formatText, handleCopy, onShowQrCode),
        createDividerItem(),
        ...createWorkspaceMenuItems(agentIdentifier, editBookLink, folderContext, formatText),
        createDividerItem(),
        ...createManagementMenuItems(formatText, handleCloneAgent, handleDeleteAgent, handleRenameAgent),
        ...createAdminMenuItems(
            agentName,
            formatText,
            handleRequestVisibilityUpdate,
            integrationLink,
            isAdmin,
            shouldShowVisibilityAction,
            usageAnalyticsHref,
        ),
    ];
}
