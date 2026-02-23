'use client';

import type { AgentBasicInformation, TODO_any, string_agent_permanent_id } from '@promptbook-local/types';
import {
    BarChart3Icon,
    CopyIcon,
    CopyPlusIcon,
    DownloadIcon,
    ExternalLinkIcon,
    FileTextIcon,
    FolderOpenIcon,
    GlobeIcon,
    LockIcon,
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
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { just } from '../../../../../src/utils/organization/just';
import { getAgentLinks } from '../../app/agents/[agentName]/agentLinks';
import { deleteAgent } from '../../app/recycle-bin/actions';
import type { AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import { promptCloneAgent } from '../AgentCloning/cloneAgent';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert, showConfirm, showPrompt } from '../AsyncDialogs/asyncDialogs';
import { ContextMenuPanel, type ContextMenuItem } from '../ContextMenu/ContextMenuPanel';
import {
    type ContextMenuAnchorPoint,
    useClampedMenuPosition,
    useCloseOnOutsideClick,
} from '../ContextMenu/contextMenuUtils';
import { useMetadataFlags } from '../MetadataFlags/MetadataFlagsContext';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

/**
 * Agent data required to populate agent menu actions.
 */
type AgentContextMenuAgent = AgentBasicInformation & {
    /**
     * Visibility of the agent (PUBLIC or PRIVATE) when known.
     */
    readonly visibility?: 'PUBLIC' | 'PRIVATE';
};

/**
 * Payload passed when an agent is successfully renamed.
 */
export type AgentContextMenuRenamePayload = {
    /**
     * Updated agent profile returned from the rename API.
     */
    readonly agent: AgentBasicInformation;
    /**
     * Identifier used before the rename (permanent id or agent name).
     */
    readonly previousIdentifier: string;
};

/**
 * Base props shared by agent context menu variants.
 */
type AgentContextMenuBaseProps = {
    /**
     * Agent profile with visibility status.
     */
    readonly agent: AgentContextMenuAgent;
    /**
     * Agent name used in the current route or list context.
     */
    readonly agentName: string;
    /**
     * Agent name derived from the source content.
     */
    readonly derivedAgentName: string;
    /**
     * Permanent id for the agent, when available.
     */
    readonly permanentId?: string_agent_permanent_id;
    /**
     * Full agent URL used for share/copy actions.
     */
    readonly agentUrl: string;
    /**
     * Agent email address used for share/copy actions.
     */
    readonly agentEmail: string;
    /**
     * Folder context for navigating to the agent's folder, when available.
     */
    readonly folderContext?: AgentFolderContext | null;
    /**
     * Whether the current user is an admin.
     */
    readonly isAdmin?: boolean;
    /**
     * Callback to open the QR code modal.
     */
    readonly onShowQrCode?: () => void;
    /**
     * Callback fired after the agent is renamed.
     */
    readonly onAgentRenamed?: (payload: AgentContextMenuRenamePayload) => void;
    /**
     * Callback invoked to close the menu.
     */
    readonly onRequestClose?: () => void;
    /**
     * Stored install prompt event, when available.
     */
    readonly installPromptEvent?: BeforeInstallPromptEvent | null;
    /**
     * Whether the app is already installed.
     */
    readonly isInstalled?: boolean;
    /**
     * Callback to trigger the install prompt.
     */
    readonly onInstallApp?: () => void;
    /**
     * Whether the menu is opened from the directory listing.
     */
    readonly fromDirectoryListing?: boolean;
};

/**
 * Props for the button-triggered context menu.
 */
type AgentContextMenuButtonProps = AgentContextMenuBaseProps;

/**
 * Props for the right-click context menu popover.
 */
type AgentContextMenuPopoverProps = AgentContextMenuBaseProps & {
    /**
     * Whether the popover is open.
     */
    readonly isOpen: boolean;
    /**
     * Cursor anchor point for positioning the menu.
     */
    readonly anchorPoint: ContextMenuAnchorPoint | null;
    /**
     * Callback to close the popover.
     */
    readonly onClose: () => void;
};

/**
 * Keeps track of PWA install prompt state for the menu.
 *
 * @returns Install prompt event, install status, and installer callback.
 */
export function useInstallPromptState() {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        /**
         * Captures the browser PWA install prompt event for later use.
         *
         * @param event - Before-install prompt event.
         */
        function handleBeforeInstallPrompt(event: Event) {
            event.preventDefault();
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
        }

        /**
         * Updates the installed status based on display mode.
         */
        function updateInstalledStatus() {
            const mediaMatch = window.matchMedia('(display-mode: standalone)');
            const standalone = mediaMatch.matches || (window.navigator as TODO_any).standalone === true;
            setIsInstalled(standalone);
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        updateInstalledStatus();
        window.matchMedia('(display-mode: standalone)').addEventListener('change', updateInstalledStatus);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateInstalledStatus);
        };
    }, []);

    /**
     * Triggers the install prompt when available.
     */
    const handleInstallApp = useCallback(async () => {
        if (!installPromptEvent) {
            return;
        }
        try {
            installPromptEvent.prompt();
            const choice = await installPromptEvent.userChoice.catch(() => null);
            if (choice?.outcome === 'accepted') {
                setIsInstalled(true);
            }
        } finally {
            setInstallPromptEvent(null);
        }
    }, [installPromptEvent]);

    return { installPromptEvent, isInstalled, handleInstallApp };
}

/**
 * Builds the menu item list for agent menus.
 *
 * @param props - Agent menu configuration.
 * @returns Ordered list of context menu items.
 */
export function useAgentContextMenuItems(props: AgentContextMenuBaseProps): ContextMenuItem[] {
    const {
        agent,
        agentName,
        derivedAgentName,
        permanentId,
        agentUrl,
        agentEmail,
        folderContext,
        isAdmin = false,
        onShowQrCode,
        onAgentRenamed,
        onRequestClose,
        installPromptEvent,
        isInstalled = false,
        onInstallApp,
        fromDirectoryListing,
    } = props;

    const { isExperimentalPwaAppEnabled } = useMetadataFlags();

    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);
    const { formatText } = useAgentNaming();
    const router = useRouter();

    /**
     * Clears pending copy feedback timeout.
     */
    const clearCopyTimeout = useCallback(() => {
        if (copyTimeoutRef.current !== null) {
            window.clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            clearCopyTimeout();
        };
    }, [clearCopyTimeout]);

    /**
     * Copies a value to the clipboard and updates feedback state.
     *
     * @param value - The value to copy.
     * @param label - Feedback label to show.
     */
    const handleCopy = useCallback(
        async (value: string, label: string) => {
            try {
                await navigator.clipboard.writeText(value);
                clearCopyTimeout();
                setCopyFeedback(label);
                copyTimeoutRef.current = window.setTimeout(() => setCopyFeedback(null), 2000);
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        },
        [clearCopyTimeout],
    );

    const links = useMemo(
        () => getAgentLinks(permanentId || agentName, formatText),
        [agentName, formatText, permanentId],
    );
    const editBookLink = links.find((link) => link.id === 'book')!;
    const integrationLink = links.find((link) => link.id === 'integration')!;
    const usageFilterAgentName = derivedAgentName || agentName;
    const usageAnalyticsHref = useMemo(() => {
        const searchParams = new URLSearchParams();
        if (usageFilterAgentName) {
            searchParams.set('agentName', usageFilterAgentName);
        }
        searchParams.set('timeframe', '30d');
        const query = searchParams.toString();
        return query ? `/admin/usage?${query}` : '/admin/usage';
    }, [usageFilterAgentName]);

    const showUpdateUrl = agentName !== derivedAgentName;
    const updateUrlHref = `/agents/${encodeURIComponent(derivedAgentName)}`;

    /**
     * Confirms and performs the URL update redirect.
     */
    const handleUpdateUrl = useCallback(async () => {
        const updateUrlTitle = formatText('Update agent URL');
        const updateUrlMessage = `${formatText(
            'Are you sure you want to change the agent URL from',
        )} "/agents/${agentName}" to "/agents/${derivedAgentName}"?`;
        const confirmed = await showConfirm({
            title: updateUrlTitle,
            message: updateUrlMessage,
            confirmLabel: formatText('Update URL'),
            cancelLabel: 'Cancel',
        }).catch(() => false);

        if (confirmed) {
            window.location.href = updateUrlHref;
        }
    }, [agentName, derivedAgentName, formatText, updateUrlHref]);

    /**
     * Deletes the agent after confirmation.
     */
    const handleDeleteAgent = useCallback(async () => {
        const agentIdentifier = permanentId || agentName;
        const displayName = derivedAgentName || agentName;
        const deleteAgentTitle = formatText('Delete agent');
        const deleteAgentMessage = `${formatText(
            'Are you sure you want to delete the agent',
        )} "${displayName}"? ${formatText('This action can be undone by restoring it from the recycle bin.')}`;
        const confirmed = await showConfirm({
            title: deleteAgentTitle,
            message: deleteAgentMessage,
            confirmLabel: formatText('Delete agent'),
            cancelLabel: 'Cancel',
        }).catch(() => false);

        if (!confirmed) {
            return;
        }

        try {
            await deleteAgent(agentIdentifier);
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to delete agent:', error);
            await showAlert({
                title: 'Delete failed',
                message: formatText('Failed to delete agent. Please try again.'),
            }).catch(() => undefined);
        }
    }, [agentName, derivedAgentName, formatText, permanentId]);

    /**
     * Prompts for a new agent name and updates it via the API.
     */
    const handleRenameAgent = useCallback(async () => {
        const name = await showPrompt({
            title: formatText('Rename agent'),
            message: formatText('Enter a new name for this agent.'),
            defaultValue: derivedAgentName || agentName,
            confirmLabel: formatText('Rename'),
            cancelLabel: 'Cancel',
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
            const agentIdentifier = permanentId || agentName;
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
                title: 'Rename failed',
                message: error instanceof Error ? error.message : formatText('Failed to rename agent.'),
            }).catch(() => undefined);
        }
    }, [agentName, derivedAgentName, formatText, onAgentRenamed, onRequestClose, permanentId]);

    /**
     * Prompts for a clone name, clones the agent, and navigates to the cloned agent.
     */
    const handleCloneAgent = useCallback(async () => {
        const agentIdentifier = permanentId || agentName;
        const displayName = derivedAgentName || agentName;
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
    }, [agentName, derivedAgentName, formatText, onRequestClose, permanentId, router]);

    /**
     * Updates agent visibility (public/private) via API.
     *
     * @param visibility - The new visibility state.
     */
    const handleSetVisibility = useCallback(
        async (visibility: 'PUBLIC' | 'PRIVATE') => {
            try {
                const agentIdentifier = permanentId || agentName;
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
                    title: 'Update failed',
                    message: error instanceof Error ? error.message : formatText('Failed to update agent visibility.'),
                }).catch(() => undefined);
            }
        },
        [agentName, formatText, permanentId],
    );

    const shouldShowVisibilityToggle = Boolean(isAdmin && agent.visibility);
    const menuItems: ContextMenuItem[] = [
        ...(fromDirectoryListing
            ? [
                  {
                      type: 'link' as const,
                      href: `/agents/${encodeURIComponent(agentName)}`,
                      icon: ExternalLinkIcon,
                      label: 'Open in new tab',
                      target: '_blank',
                  },
                  { type: 'divider' as const },
              ]
            : []),
        ...(showUpdateUrl &&
        just(
            false /* <- Note: We are now using links like `/agents/qRoRGSPiRwq8RN` not `/agents/john-show` so this is confusing option*/,
        )
            ? [
                  {
                      type: 'action' as const,
                      icon: MoreHorizontalIcon,
                      label: 'Update URL',
                      onClick: handleUpdateUrl,
                      highlight: true,
                  },
                  { type: 'divider' as const },
              ]
            : []),

        ...(!isInstalled && installPromptEvent && onInstallApp && isExperimentalPwaAppEnabled
            ? [
                  {
                      type: 'action' as const,
                      icon: SmartphoneIcon,
                      label: formatText('Install Agent as App'),
                      onClick: onInstallApp,
                  },
              ]
            : []),
        {
            type: 'action' as const,
            icon: CopyIcon,
            label: copyFeedback === 'URL' ? 'Copied!' : formatText('Copy Agent URL'),
            onClick: () => handleCopy(agentUrl, 'URL'),
        },
        {
            type: 'action' as const,
            icon: MailIcon,
            label: copyFeedback === 'Email' ? 'Copied!' : formatText('Copy Agent Email'),
            onClick: () => handleCopy(agentEmail, 'Email'),
        },
        {
            type: 'action' as const,
            icon: QrCodeIcon,
            label: 'Show QR Code',
            onClick: onShowQrCode,
        },

        { type: 'divider' as const },

        ...(folderContext
            ? [
                  {
                      type: 'link' as const,
                      href: folderContext.href,
                      icon: FolderOpenIcon,
                      label: `${formatText('Open Folder')}: ${folderContext.label}`,
                  },
              ]
            : []),
        {
            type: 'link' as const,
            href: `/agents/${encodeURIComponent(agentName)}/chat`,
            icon: MessageSquareShareIcon,
            label: 'Standalone Chat',
        },
        {
            type: 'link' as const,
            href: `/agents/${encodeURIComponent(agentName)}/book+chat`,
            icon: SquareSplitHorizontalIcon,
            label: 'Edit Book & Chat',
        },
        {
            type: 'link' as const,
            href: editBookLink.href,
            icon: editBookLink.icon,
            label: editBookLink.title,
        },

        { type: 'divider' as const },

        {
            type: 'action' as const,
            icon: PencilIcon,
            label: formatText('Rename Agent'),
            onClick: handleRenameAgent,
        },
        {
            type: 'action' as const,
            icon: CopyPlusIcon,
            label: formatText('Clone agent'),
            onClick: handleCloneAgent,
        },
        {
            type: 'action' as const,
            icon: TrashIcon,
            label: formatText('Delete Agent'),
            onClick: handleDeleteAgent,
        },

        ...(isAdmin
            ? [
                  { type: 'divider' as const },
                  ...(shouldShowVisibilityToggle
                      ? [
                            agent.visibility === 'PRIVATE'
                                ? {
                                      type: 'action' as const,
                                      icon: GlobeIcon,
                                      label: formatText('Make Public'),
                                      onClick: () => handleSetVisibility('PUBLIC'),
                                  }
                                : {
                                      type: 'action' as const,
                                      icon: LockIcon,
                                      label: formatText('Make Private'),
                                      onClick: () => handleSetVisibility('PRIVATE'),
                                  },
                            { type: 'divider' as const },
                        ]
                      : []),
                  {
                      type: 'link' as const,
                      href: `/admin/chat-history?agentName=${encodeURIComponent(agentName)}`,
                      icon: MessageSquareIcon,
                      label: 'Chat History',
                  },
                  {
                      type: 'link' as const,
                      href: usageAnalyticsHref,
                      icon: BarChart3Icon,
                      label: 'Usage Analytics',
                  },
                  {
                      type: 'link' as const,
                      href: `/admin/chat-feedback?agentName=${encodeURIComponent(agentName)}`,
                      icon: MessageCircleQuestionIcon,
                      label: 'Chat Feedback',
                  },
                  { type: 'divider' as const },
                  {
                      type: 'link' as const,
                      href: integrationLink.href,
                      icon: integrationLink.icon,
                      label: integrationLink.title,
                  },
                  {
                      type: 'link' as const,
                      href: `/agents/${encodeURIComponent(agentName)}/system-message`,
                      icon: FileTextIcon,
                      label: 'Show System Message',
                  },
                  {
                      type: 'link' as const,
                      href: `/agents/${encodeURIComponent(agentName)}/export-as-transpiled-code`,
                      icon: DownloadIcon,
                      label: formatText('Export Agent'),
                  },
                  { type: 'divider' as const },
              ]
            : []),
    ];

    return menuItems;
}

/**
 * Shared menu content for agent menus.
 */
function AgentContextMenuContent(props: AgentContextMenuBaseProps & { onClose: () => void }) {
    const { onClose } = props;
    const menuItems = useAgentContextMenuItems(props);

    return <ContextMenuPanel menuItems={menuItems} onClose={onClose} />;
}

/**
 * Renders the agent context menu using a dot-button trigger.
 */
export function AgentContextMenuButton(props: AgentContextMenuButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const { installPromptEvent, isInstalled, handleInstallApp } = useInstallPromptState();

    /**
     * Closes the menu popover.
     */
    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    useCloseOnOutsideClick(menuRef, handleClose, isOpen);

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="p-3 rounded-full hover:bg-white/30 transition-all duration-200"
                aria-label="More options"
            >
                <MoreHorizontalIcon className="w-5 h-5 text-black" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-40">
                    <AgentContextMenuContent
                        {...props}
                        installPromptEvent={installPromptEvent}
                        isInstalled={isInstalled}
                        onInstallApp={handleInstallApp}
                        onRequestClose={handleClose}
                        onClose={handleClose}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Renders the agent context menu at a cursor position.
 */
export function AgentContextMenuPopover(props: AgentContextMenuPopoverProps) {
    const { isOpen, anchorPoint, onClose, ...menuProps } = props;
    const menuRef = useRef<HTMLDivElement>(null);
    const clampedPosition = useClampedMenuPosition(anchorPoint, isOpen, menuRef);
    const { installPromptEvent, isInstalled, handleInstallApp } = useInstallPromptState();

    useCloseOnOutsideClick(menuRef, onClose, isOpen);

    if (!isOpen || !anchorPoint) {
        return null;
    }

    const style: CSSProperties | undefined = clampedPosition
        ? { left: clampedPosition.x, top: clampedPosition.y }
        : { left: anchorPoint.x, top: anchorPoint.y };

    return (
        <div ref={menuRef} className="fixed z-40" style={style}>
            <AgentContextMenuContent
                {...menuProps}
                installPromptEvent={installPromptEvent}
                isInstalled={isInstalled}
                onInstallApp={handleInstallApp}
                onRequestClose={onClose}
                onClose={onClose}
            />
        </div>
    );
}
