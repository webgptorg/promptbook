'use client';

import type { AgentBasicInformation } from '@promptbook-local/types';
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
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAgentLinks } from '../../app/agents/[agentName]/agentLinks';
import { deleteAgent } from '../../app/recycle-bin/actions';
import { DEFAULT_AGENT_VISIBILITY, type AgentVisibility } from '../../utils/agentVisibility';
import { promptCloneAgent } from '../AgentCloning/cloneAgent';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert, showConfirm, showPrompt, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
import type { ContextMenuItem } from '../ContextMenu/ContextMenuPanel';
import { useMetadataFlags } from '../MetadataFlags/MetadataFlagsContext';
import type { AgentContextMenuBaseProps } from './AgentContextMenu';

/**
 * Duration of clipboard feedback shown after copying an agent URL or email.
 *
 * @private function of AgentContextMenu
 */
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/**
 * Keeps the legacy update-URL action disabled without changing current behavior.
 *
 * @private function of AgentContextMenu
 */
const IS_UPDATE_URL_ACTION_ENABLED = false;

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
 * Agent-specific navigation link used by the menu.
 *
 * @private function of AgentContextMenu
 */
type AgentContextMenuLink = ReturnType<typeof getAgentLinks>[number];

/**
 * Async handlers and derived values used when building the menu sections.
 *
 * @private function of AgentContextMenu
 */
type UseAgentContextMenuActionsResult = {
    editBookLink: AgentContextMenuLink;
    handleCloneAgent: () => Promise<void>;
    handleDeleteAgent: () => Promise<void>;
    handleRenameAgent: () => Promise<void>;
    handleRequestVisibilityUpdate: () => Promise<void>;
    handleUpdateUrl: () => Promise<void>;
    integrationLink: AgentContextMenuLink;
    isUpdateUrlActionVisible: boolean;
    shouldShowVisibilityAction: boolean;
    usageAnalyticsHref: string;
};

/**
 * Builds one divider item.
 *
 * @returns Context-menu divider descriptor.
 */
function createDividerItem(): ContextMenuItem {
    return { type: 'divider' };
}

/**
 * Finds one required agent link by id.
 *
 * @param links - Available generated links.
 * @param id - Link identifier to resolve.
 * @returns Matching link metadata.
 */
function findAgentLink(
    links: ReadonlyArray<AgentContextMenuLink>,
    id: NonNullable<AgentContextMenuLink['id']>,
): AgentContextMenuLink {
    return links.find((link) => link.id === id)!;
}

/**
 * Builds the admin usage-analytics URL for the current agent filter.
 *
 * @param usageFilterAgentName - Agent name used in the analytics filter.
 * @returns Admin usage-analytics URL.
 */
function createUsageAnalyticsHref(usageFilterAgentName: string): string {
    const searchParams = new URLSearchParams();

    if (usageFilterAgentName) {
        searchParams.set('agentName', usageFilterAgentName);
    }

    searchParams.set('timeframe', '30d');
    const query = searchParams.toString();

    return query ? `/admin/usage?${query}` : '/admin/usage';
}

/**
 * Manages temporary clipboard feedback for copy actions.
 *
 * @returns Current feedback label and copy handler.
 */
function useAgentContextMenuCopyFeedback(): {
    copyFeedback: CopyFeedback | null;
    handleCopy: (value: string, label: CopyFeedback) => Promise<void>;
} {
    const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    /**
     * Clears any pending clipboard feedback timeout.
     */
    const clearCopyTimeout = useCallback(() => {
        if (copyTimeoutRef.current !== null) {
            window.clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => clearCopyTimeout, [clearCopyTimeout]);

    /**
     * Copies a value to the clipboard and shows short-lived success feedback.
     *
     * @param value - Text to copy.
     * @param label - Feedback label for the copied value.
     */
    const handleCopy = useCallback(
        async (value: string, label: CopyFeedback) => {
            try {
                await navigator.clipboard.writeText(value);
                clearCopyTimeout();
                setCopyFeedback(label);
                copyTimeoutRef.current = window.setTimeout(() => setCopyFeedback(null), COPY_FEEDBACK_TIMEOUT_MS);
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        },
        [clearCopyTimeout],
    );

    return { copyFeedback, handleCopy };
}

/**
 * Resolves all action handlers and derived link state used by the menu.
 *
 * @param props - Shared agent menu props.
 * @param formatText - Agent-aware text formatter.
 * @returns Derived menu handlers and links.
 */
function useAgentContextMenuActions(
    props: AgentContextMenuBaseProps,
    formatText: FormatAgentContextMenuText,
): UseAgentContextMenuActionsResult {
    const { agent, agentName, derivedAgentName, permanentId, isAdmin = false, onAgentRenamed, onRequestClose } = props;

    const router = useRouter();
    const agentIdentifier = permanentId || agentName;
    const displayName = derivedAgentName || agentName;
    const usageFilterAgentName = derivedAgentName || agentName;

    const links = useMemo(() => getAgentLinks(agentIdentifier, formatText), [agentIdentifier, formatText]);
    const editBookLink = useMemo(() => findAgentLink(links, 'book'), [links]);
    const integrationLink = useMemo(() => findAgentLink(links, 'integration'), [links]);
    const usageAnalyticsHref = useMemo(
        () => createUsageAnalyticsHref(usageFilterAgentName),
        [usageFilterAgentName],
    );

    const isUpdateUrlActionVisible = IS_UPDATE_URL_ACTION_ENABLED && agentName !== derivedAgentName;
    const shouldShowVisibilityAction = Boolean(isAdmin && agent.visibility);
    const updateUrlHref = `/agents/${encodeURIComponent(derivedAgentName)}`;

    /**
     * Confirms and performs the legacy URL update redirect.
     */
    const handleUpdateUrl = useCallback(async () => {
        const updateUrlTitle = formatText('Update agent URL');
        const updateUrlMessage = `${formatText(
            'Are you sure you want to change the agent URL from',
        )} "/agents/${agentName}" to "/agents/${derivedAgentName}"?`;
        const isConfirmed = await showConfirm({
            title: updateUrlTitle,
            message: updateUrlMessage,
            confirmLabel: formatText('Update URL'),
            cancelLabel: formatText('Cancel'),
        }).catch(() => false);

        if (isConfirmed) {
            window.location.href = updateUrlHref;
        }
    }, [agentName, derivedAgentName, formatText, updateUrlHref]);

    /**
     * Confirms deletion, removes the agent, and redirects to the homepage.
     */
    const handleDeleteAgent = useCallback(async () => {
        const deleteAgentTitle = formatText('Delete agent');
        const deleteAgentMessage = `${formatText(
            'Are you sure you want to delete the agent',
        )} "${displayName}"? ${formatText('This action can be undone by restoring it from the recycle bin.')}`;
        const isConfirmed = await showConfirm({
            title: deleteAgentTitle,
            message: deleteAgentMessage,
            confirmLabel: formatText('Delete agent'),
            cancelLabel: formatText('Cancel'),
        }).catch(() => false);

        if (!isConfirmed) {
            return;
        }

        try {
            await deleteAgent(agentIdentifier);
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to delete agent:', error);
            await showAlert({
                title: formatText('Delete failed'),
                message: formatText('Failed to delete agent. Please try again.'),
            }).catch(() => undefined);
        }
    }, [agentIdentifier, displayName, formatText]);

    /**
     * Prompts for a new name, patches the agent, and notifies the caller.
     */
    const handleRenameAgent = useCallback(async () => {
        const name = await showPrompt({
            title: formatText('Rename agent'),
            message: formatText('Enter a new name for this agent.'),
            defaultValue: displayName,
            confirmLabel: formatText('Rename'),
            cancelLabel: formatText('Cancel'),
            placeholder: formatText('Agent name'),
            inputLabel: formatText('Agent name'),
        }).catch(() => null);

        if (!name) {
            return;
        }

        const trimmedName = name.trim();

        if (!trimmedName) {
            await showAlert({
                title: formatText('Invalid name'),
                message: formatText('Agent name cannot be empty.'),
            }).catch(() => undefined);
            return;
        }

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName }),
            });
            const data = (await response.json()) as { success: boolean; agent?: AgentBasicInformation; error?: string };

            if (!response.ok || !data.agent) {
                throw new Error(data.error || formatText('Failed to rename agent.'));
            }

            onAgentRenamed?.({ agent: data.agent, previousIdentifier: agentIdentifier });
            onRequestClose?.();
        } catch (error) {
            await showAlert({
                title: formatText('Rename failed'),
                message: error instanceof Error ? error.message : formatText('Failed to rename agent.'),
            }).catch(() => undefined);
        }
    }, [agentIdentifier, displayName, formatText, onAgentRenamed, onRequestClose]);

    /**
     * Prompts for clone metadata, duplicates the agent, and opens the clone.
     */
    const handleCloneAgent = useCallback(async () => {
        const clonedAgent = await promptCloneAgent({
            agentIdentifier,
            agentName: displayName,
            formatText,
        });

        if (!clonedAgent) {
            return;
        }

        onRequestClose?.();
        router.push(`/agents/${encodeURIComponent(clonedAgent.agentName)}`);
    }, [agentIdentifier, displayName, formatText, onRequestClose, router]);

    /**
     * Persists a new agent visibility and refreshes the page when successful.
     *
     * @param visibility - Visibility chosen in the dialog.
     */
    const handleSetVisibility = useCallback(
        async (visibility: AgentVisibility) => {
            try {
                const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visibility }),
                });
                const data = (await response.json()) as { success: boolean; error?: string };

                if (!response.ok || !data.success) {
                    throw new Error(data.error || formatText('Failed to update agent visibility.'));
                }

                window.location.reload();
            } catch (error) {
                await showAlert({
                    title: formatText('Update failed'),
                    message: error instanceof Error ? error.message : formatText('Failed to update agent visibility.'),
                }).catch(() => undefined);
            }
        },
        [agentIdentifier, formatText],
    );

    /**
     * Opens the visibility dialog and applies the selected value when it changes.
     */
    const handleRequestVisibilityUpdate = useCallback(async () => {
        const currentVisibility = agent.visibility ?? DEFAULT_AGENT_VISIBILITY;
        const selectedVisibility = await showVisibilityDialog({
            title: formatText('Update visibility'),
            description: `${formatText('Set visibility for agent')} "${agent.agentName}".`,
            confirmLabel: formatText('Update visibility'),
            initialVisibility: currentVisibility,
        }).catch(() => null);

        if (!selectedVisibility || selectedVisibility === agent.visibility) {
            return;
        }

        await handleSetVisibility(selectedVisibility);
    }, [agent.agentName, agent.visibility, formatText, handleSetVisibility]);

    return {
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
    };
}

/**
 * Creates menu items specific to the directory-listing context.
 *
 * @param agentName - Current routed agent name.
 * @param formatText - Agent-aware text formatter.
 * @param fromDirectoryListing - Whether the menu was opened in the directory listing.
 * @returns Optional directory-listing menu items.
 */
function createDirectoryListingMenuItems(
    agentName: string,
    formatText: FormatAgentContextMenuText,
    fromDirectoryListing?: boolean,
): ContextMenuItem[] {
    if (!fromDirectoryListing) {
        return [];
    }

    return [
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentName)}`,
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
 * @param agentName - Current routed agent name.
 * @param editBookLink - Generated edit-book link metadata.
 * @param folderContext - Optional folder navigation context.
 * @param formatText - Agent-aware text formatter.
 * @returns Navigation and workspace menu items.
 */
function createWorkspaceMenuItems(
    agentName: string,
    editBookLink: AgentContextMenuLink,
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
            href: `/agents/${encodeURIComponent(agentName)}/chat`,
            icon: MessageSquareShareIcon,
            label: formatText('Standalone Chat'),
        },
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentName)}/book+chat`,
            icon: SquareSplitHorizontalIcon,
            label: formatText('Edit Book & Chat'),
        },
        {
            type: 'link',
            href: `/agents/${encodeURIComponent(agentName)}/textarea`,
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
    integrationLink: AgentContextMenuLink,
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
        ...createDirectoryListingMenuItems(agentName, formatText, fromDirectoryListing),
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
        ...createWorkspaceMenuItems(agentName, editBookLink, folderContext, formatText),
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
