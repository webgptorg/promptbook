'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { logoutAction } from '@/src/app/actions';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import {
    ArrowRight,
    BarChart3,
    ChevronDown,
    ChevronRight,
    Code2,
    FolderIcon,
    Globe2,
    KeyRound,
    Lock,
    LogIn,
    LogOut,
    Settings2,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HamburgerMenu } from '../../../../../src/book-components/_common/HamburgerMenu/HamburgerMenu';
import { useMenuHoisting } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { ArrowIcon } from '../../../../../src/book-components/icons/ArrowIcon';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { just } from '../../../../../src/utils/organization/just';
import { RESERVED_PATHS } from '../../generated/reservedPaths';
import { buildAgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { UserInfo } from '../../utils/getCurrentUser';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { HeadlessLink, pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import {
    useAgentContextMenuItems,
    useInstallPromptState,
    type AgentContextMenuRenamePayload,
} from '../AgentContextMenu/AgentContextMenu';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { QrCodeModal } from '../AgentProfile/QrCodeModal';
import { showAlert, showLoginDialog } from '../AsyncDialogs/asyncDialogs';
import { ChangePasswordDialog } from '../ChangePasswordDialog/ChangePasswordDialog';
import { useNewAgentDialog } from '../NewAgentDialog/useNewAgentDialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { DropdownSubMenuPortal } from './DropdownSubMenuPortal';
import {
    AgentDirectoryDropdown,
    AgentNameWithAvatar,
    appendFolderActionNodes,
    buildAgentMenuStructure,
    createAgentHierarchyLabel,
    createAgentHierarchyMobileItems,
    createAgentViewLabel,
    createFallbackAgent,
    getAgentNavigationId,
    mapContextMenuItemsToSubMenuItems,
    resolveActiveAgentNavigation,
    type HeaderAgentMenuFolder,
} from './buildAgentMenuStructure';
import { buildDocumentationDropdownItems } from './buildDocumentationDropdownItems';
import { HeaderControlPanelDropdown } from './ControlPanel/ControlPanel';
import { HeaderSearchBox } from './HeaderSearchBox';
import type { SubMenuItem } from './SubMenuItem';
import { useHeaderDropdownPortalContainer } from './useHeaderDropdownPortalContainer';
import { useHeaderTouchInput } from './useHeaderTouchInput';

type HeaderProps = {
    /**
     * Is the user an admin
     */
    isAdmin?: boolean;
    /**
     * Whether the current admin is the environment-backed super-admin.
     */
    isGlobalAdmin?: boolean;

    /**
     * Current user info (if logged in)
     */
    currentUser?: UserInfo | null;

    /**
     * The name of the server
     */
    serverName: string;

    /**
     * The URL of the logo displayed in the heading bar
     */
    serverLogoUrl: string | null;

    /**
     * List of agents
     */
    agents: Array<AgentOrganizationAgent>;

    /**
     * List of folders that organize local agents.
     */
    agentFolders: Array<AgentOrganizationFolder>;

    /**
     * List of federated servers for navigation dropdown
     */
    federatedServers: Array<{ url: string; title: string; logoUrl?: string | null }>;

    /**
     * Is the experimental app enabled
     */
    isExperimental?: boolean;
    /**
     * Determines whether chat feedback should be exposed inside the menu.
     */
    isFeedbackEnabled?: boolean;
};

/* TODO: [🐱‍🚀] Make this Agents server native  */

type MenuItemBase = {
    /**
     * @private Unique identifier used for hover timers and shared actions.
     */
    readonly id: string;
};

type MenuItem =
    | (MenuItemBase & {
          type: 'link';
          label: ReactNode;
          href: string;
      })
    | (MenuItemBase & {
          type: 'dropdown';
          label: ReactNode;
          isOpen: boolean;
          setIsOpen: (isOpen: boolean) => void;
          isMobileOpen: boolean;
          setIsMobileOpen: (isOpen: boolean) => void;
          items: Array<SubMenuItem>;
          renderMenu?: () => ReactNode;
      });

/**
 * Tracks the currently open nested dropdown along with its anchor rectangle.
 */
type OpenSubMenuState = {
    key: string;
    rect: DOMRect;
    items: SubMenuItem[];
};

const SUBMENU_CLOSE_DELAY_MS = 240;

/**
 * @private Delay used when the user leaves a header dropdown so it stays open long enough to reach the panel.
 */
const HEADER_DROPDOWN_CLOSE_DELAY_MS = 280;
/**
 * Horizontal indentation applied for each nested submenu level in mobile navigation.
 */
const MOBILE_SUBMENU_INDENT_PX = 14;

/**
 * Supported category names inside the System dropdown.
 */
type SystemCategoryLabel =
    | 'My Account'
    | 'Administration'
    | 'Monitoring & Usage'
    | 'Integrations & Keys'
    | 'Developer / Debug'
    | 'Legal & About';

/**
 * Default icon used for each System dropdown category.
 */
const SYSTEM_CATEGORY_ICON_MAP: Record<SystemCategoryLabel, LucideIcon> = {
    'My Account': UserRound,
    Administration: Settings2,
    'Monitoring & Usage': BarChart3,
    'Integrations & Keys': KeyRound,
    'Developer / Debug': Code2,
    'Legal & About': Globe2,
};

/**
 * Propagates one fallback icon to submenu entries that do not specify their own icon.
 */
function applyFallbackSubMenuIcon(items: ReadonlyArray<SubMenuItem>, fallbackIcon: LucideIcon): SubMenuItem[] {
    return items.map((item) => {
        const resolvedIcon = item.icon ?? fallbackIcon;
        return {
            ...item,
            icon: resolvedIcon,
            items: item.items ? applyFallbackSubMenuIcon(item.items, resolvedIcon) : item.items,
        };
    });
}

/**
 * Reserved top-level routes that cannot be interpreted as an agent alias.
 */
const RESERVED_PATH_SET = new Set<string>(RESERVED_PATHS);

export function Header(props: HeaderProps) {
    const {
        isAdmin = false,
        isGlobalAdmin = false,
        currentUser = null,
        serverName,
        serverLogoUrl,
        agents,
        agentFolders,
        federatedServers,
        isExperimental = false,
        isFeedbackEnabled = true,
    } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isAgentsOpen, setIsAgentsOpen] = useState(false);
    const [isAgentViewOpen, setIsAgentViewOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileAgentsOpen, setIsMobileAgentsOpen] = useState(false);
    const [isMobileAgentViewOpen, setIsMobileAgentViewOpen] = useState(false);
    const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);
    const [isMobileSystemOpen, setIsMobileSystemOpen] = useState(false);
    const [mobileOpenSubMenus, setMobileOpenSubMenus] = useState<Record<string, boolean>>({});
    const dropdownPortalContainer = useHeaderDropdownPortalContainer();
    const [openSubMenu, setOpenSubMenu] = useState<OpenSubMenuState | null>(null);
    const subMenuCloseTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const menuCloseTimers = useRef<Record<string, ReturnType<typeof window.setTimeout> | null>>({});
    const router = useRouter();
    const pathname = usePathname();
    const isHeadless = useIsHeadless();
    const isTouchInput = useHeaderTouchInput();
    const menuHoisting = useMenuHoisting();
    const { naming } = useAgentNaming();
    const { t } = useServerLanguage();
    const [desktopExpandedSubMenus, setDesktopExpandedSubMenus] = useState<Record<string, boolean>>({});
    const [isAgentQrCodeOpen, setIsAgentQrCodeOpen] = useState(false);
    const { installPromptEvent, isInstalled, handleInstallApp } = useInstallPromptState();
    const headerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isMenuOpen) {
            setMobileOpenSubMenus({});
            setIsMobileAgentsOpen(false);
            setIsMobileAgentViewOpen(false);
            setIsMobileDocsOpen(false);
            setIsMobileSystemOpen(false);
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isDocsOpen && !isSystemOpen) {
            setOpenSubMenu(null);
            setDesktopExpandedSubMenus({});
        }
    }, [isDocsOpen, isSystemOpen]);

    useEffect(() => {
        setDesktopExpandedSubMenus({});
        setOpenSubMenu(null);

        if (subMenuCloseTimer.current) {
            clearTimeout(subMenuCloseTimer.current);
            subMenuCloseTimer.current = null;
        }
        Object.values(menuCloseTimers.current).forEach((timer) => {
            if (timer) {
                clearTimeout(timer);
            }
        });
        menuCloseTimers.current = {};
    }, [isTouchInput]);

    useEffect(() => {
        return () => {
            if (subMenuCloseTimer.current) {
                clearTimeout(subMenuCloseTimer.current);
                subMenuCloseTimer.current = null;
            }
            Object.values(menuCloseTimers.current).forEach((timer) => {
                if (timer) {
                    clearTimeout(timer);
                }
            });
            menuCloseTimers.current = {};
        };
    }, []);

    const cancelSubMenuClose = () => {
        if (subMenuCloseTimer.current) {
            clearTimeout(subMenuCloseTimer.current);
            subMenuCloseTimer.current = null;
        }
    };

    const scheduleSubMenuClose = (key: string) => {
        cancelSubMenuClose();
        subMenuCloseTimer.current = setTimeout(() => {
            setOpenSubMenu((current) => (current?.key === key ? null : current));
            subMenuCloseTimer.current = null;
        }, SUBMENU_CLOSE_DELAY_MS);
    };

    const handleSubMenuMouseEnter = (key: string, items: SubMenuItem[], event: MouseEvent<HTMLDivElement>) => {
        cancelSubMenuClose();
        const rect = event.currentTarget.getBoundingClientRect();
        setOpenSubMenu({
            key,
            rect,
            items,
        });
    };

    const handleSubMenuMouseLeave = (key: string) => {
        scheduleSubMenuClose(key);
    };

    const keepSubMenuOpen = () => {
        cancelSubMenuClose();
    };

    const handleSubMenuPortalLeave = () => {
        if (openSubMenu) {
            scheduleSubMenuClose(openSubMenu.key);
        }
    };

    /**
     * @private Cancels the pending close timer of a header dropdown.
     */
    const cancelMenuClose = (menuId: string) => {
        const pendingTimer = menuCloseTimers.current[menuId];
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            menuCloseTimers.current[menuId] = null;
        }
    };

    /**
     * @private Schedules a delayed close for a header dropdown.
     */
    const scheduleMenuClose = (menuId: string, close: () => void) => {
        if (isTouchInput) {
            return;
        }
        cancelMenuClose(menuId);
        menuCloseTimers.current[menuId] = setTimeout(() => {
            close();
            menuCloseTimers.current[menuId] = null;
        }, HEADER_DROPDOWN_CLOSE_DELAY_MS);
    };

    /**
     * Closes all desktop header dropdowns and nested submenu state.
     *
     * @private
     */
    const closeAllDesktopHeaderDropdowns = useCallback(() => {
        setIsFederatedOpen(false);
        setIsAgentsOpen(false);
        setIsAgentViewOpen(false);
        setIsDocsOpen(false);
        setIsSystemOpen(false);
        setIsProfileOpen(false);
        setOpenSubMenu(null);
        setDesktopExpandedSubMenus({});
    }, []);

    /**
     * On touch/coarse-pointer layouts, close desktop dropdowns when tapping outside
     * the header so tap-based expansion remains predictable without hover timers.
     *
     * @private
     */
    useEffect(() => {
        if (!isTouchInput) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!headerRef.current) {
                return;
            }

            if (headerRef.current.contains(event.target as Node)) {
                return;
            }

            closeAllDesktopHeaderDropdowns();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [closeAllDesktopHeaderDropdowns, isTouchInput]);

    const visibleDocumentationCommitments = useMemo(() => getVisibleCommitmentDefinitions(), []);
    const documentationDropdownItems = useMemo(
        () => buildDocumentationDropdownItems(visibleDocumentationCommitments, t),
        [t, visibleDocumentationCommitments],
    );

    const toggleMobileSubMenu = (key: string) => {
        setMobileOpenSubMenus((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    /**
     * Toggles one desktop dropdown branch for tap-based navigation.
     */
    const toggleDesktopSubMenu = (key: string) => {
        setDesktopExpandedSubMenus((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    /**
     * Returns consistent left padding for one mobile menu depth level.
     */
    const createMobileMenuItemPaddingStyle = (depth: number) => ({
        paddingLeft: `${12 + depth * MOBILE_SUBMENU_INDENT_PX}px`,
    });

    /**
     * Renders one submenu label with a consistent optional leading icon.
     */
    const renderSubMenuItemLabel = (item: SubMenuItem): ReactNode => {
        const ItemIcon = item.icon;

        if (!ItemIcon) {
            return item.label;
        }

        return (
            <span className="flex min-w-0 items-center gap-2">
                <ItemIcon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                <span className="min-w-0">{item.label}</span>
            </span>
        );
    };

    /**
     * Renders one leaf mobile menu item as link, action button, or plain label.
     */
    const renderMobileMenuLeafItem = (
        item: SubMenuItem,
        itemKey: string,
        depth: number,
        className: string,
        style: CSSProperties,
    ) => {
        if (item.onClick) {
            return (
                <button
                    key={itemKey}
                    className={`${className} w-full text-left`}
                    style={style}
                    onClick={() => {
                        void item.onClick?.();
                        setIsMenuOpen(false);
                    }}
                >
                    {renderSubMenuItemLabel(item)}
                </button>
            );
        }

        if (item.href) {
            return (
                <HeadlessLink
                    key={itemKey}
                    href={item.href}
                    className={className}
                    style={style}
                    onClick={() => setIsMenuOpen(false)}
                >
                    {renderSubMenuItemLabel(item)}
                </HeadlessLink>
            );
        }

        return (
            <span key={itemKey} className={className} style={createMobileMenuItemPaddingStyle(depth)}>
                {renderSubMenuItemLabel(item)}
            </span>
        );
    };

    /**
     * Renders nested mobile submenu items with click-to-toggle behavior.
     */
    const renderMobileNestedMenuItems = (
        items: ReadonlyArray<SubMenuItem>,
        keyPrefix: string,
        depth = 0,
    ): ReactNode => {
        return (
            <div className={`w-full flex flex-col gap-1 ${depth > 0 ? 'mt-1 border-l border-gray-200 pl-1.5' : ''}`}>
                {items.map((item, index) => {
                    const itemKey = `${keyPrefix}-${index}`;
                    const hasChildren = Boolean(item.items && item.items.length > 0);
                    const isSubMenuOpen = Boolean(mobileOpenSubMenus[itemKey]);
                    const borderClass = item.isBordered ? 'border-b border-gray-200' : '';
                    const leafClassName =
                        `block rounded-md py-2.5 pr-3 text-sm transition-all duration-150 hover:shadow-sm active:scale-98 ${
                            item.isBold
                                ? 'font-semibold text-gray-900 hover:bg-blue-50 hover:text-blue-600'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        } ${borderClass}`.trim();
                    const indentationStyle = createMobileMenuItemPaddingStyle(depth);

                    if (!hasChildren) {
                        return renderMobileMenuLeafItem(item, itemKey, depth, leafClassName, indentationStyle);
                    }

                    return (
                        <div key={itemKey} className={`w-full flex flex-col ${borderClass}`}>
                            <button
                                className="w-full flex items-center justify-between gap-2 rounded-md py-2.5 pr-3 text-left text-sm font-semibold text-gray-800 hover:bg-white hover:text-blue-600 active:bg-gray-100 active:scale-98 transition-all duration-150"
                                style={indentationStyle}
                                onClick={() => toggleMobileSubMenu(itemKey)}
                            >
                                <span className="min-w-0 flex-1">{renderSubMenuItemLabel(item)}</span>
                                <ChevronDown
                                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                                        isSubMenuOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            {isSubMenuOpen && renderMobileNestedMenuItems(item.items || [], itemKey, depth + 1)}
                        </div>
                    );
                })}
            </div>
        );
    };

    /**
     * Renders agent view dropdown items with nested "More" sections.
     */
    const renderAgentViewDropdownItems = (items: ReadonlyArray<SubMenuItem>, keyPrefix: string, depth = 0): ReactNode =>
        items.map((item, index) => {
            const itemKey = `${keyPrefix}-${index}`;
            const hasChildren = Boolean(item.items && item.items.length > 0);
            const borderClass = item.isBordered ? 'border-b border-gray-100' : '';
            const paddingClass = depth > 0 ? 'pl-4' : '';
            const baseClassName = `mx-1 block rounded-lg px-3 py-2 text-sm transition-colors ${paddingClass} ${
                item.isBold ? 'font-medium text-gray-900' : 'text-gray-700'
            } hover:bg-gray-50 hover:text-gray-900 ${borderClass}`.trim();

            if (!hasChildren) {
                if (item.onClick) {
                    return (
                        <button
                            key={itemKey}
                            className={`${baseClassName} w-full text-left`}
                            onClick={() => {
                                void item.onClick?.();
                                closeAgentViewDropdown();
                            }}
                        >
                            {renderSubMenuItemLabel(item)}
                        </button>
                    );
                }

                if (item.href) {
                    return (
                        <HeadlessLink
                            key={itemKey}
                            href={item.href}
                            className={baseClassName}
                            onClick={closeAgentViewDropdown}
                        >
                            {renderSubMenuItemLabel(item)}
                        </HeadlessLink>
                    );
                }

                return (
                    <span key={itemKey} className={baseClassName}>
                        {renderSubMenuItemLabel(item)}
                    </span>
                );
            }

            const isSubMenuOpen = Boolean(desktopExpandedSubMenus[itemKey]);

            return (
                <div key={itemKey} className={`mx-1 ${borderClass}`}>
                    <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 ${paddingClass}`}
                        onClick={() => toggleDesktopSubMenu(itemKey)}
                    >
                        <span className="min-w-0 flex-1">{renderSubMenuItemLabel(item)}</span>
                        <ChevronDown
                            className={`h-3 w-3 text-gray-400 transition-transform ${
                                isSubMenuOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>
                    {isSubMenuOpen && (
                        <div className="mt-1 border-l border-gray-100 pl-2">
                            {renderAgentViewDropdownItems(item.items || [], itemKey, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });

    const agentMenuStructure = useMemo(() => buildAgentMenuStructure(agents, agentFolders), [agents, agentFolders]);
    const agentFolderById = useMemo(
        () => new Map(agentFolders.map((folder) => [folder.id, folder as HeaderAgentMenuFolder])),
        [agentFolders],
    );
    const agentByIdentifier = useMemo(() => {
        const map = new Map<string, AgentOrganizationAgent>();
        for (const agent of agents) {
            map.set(agent.agentName, agent);
            if (agent.permanentId) {
                map.set(agent.permanentId, agent);
            }
        }
        return map;
    }, [agents]);
    const activeAgentNavigation = useMemo(() => resolveActiveAgentNavigation(pathname), [pathname]);
    const activeAgent = useMemo(() => {
        if (!activeAgentNavigation.agentIdentifier) {
            return null;
        }
        return agentByIdentifier.get(activeAgentNavigation.agentIdentifier) || null;
    }, [activeAgentNavigation.agentIdentifier, agentByIdentifier]);
    const activeAgentIdentifier = activeAgentNavigation.agentIdentifier;
    const activeAgentNavigationId = activeAgent ? getAgentNavigationId(activeAgent) : activeAgentIdentifier || null;
    const activeAgentHref = activeAgentNavigationId
        ? `/agents/${encodeURIComponent(activeAgentNavigationId)}`
        : '/agents';
    const activeAgentLabel = activeAgent
        ? createAgentHierarchyLabel(activeAgent, agentFolderById)
        : activeAgentIdentifier || t('header.agentsLabelFallback', { agentsPlural: naming.plural });
    const activeAgentView = activeAgentNavigation.view;
    const activeAgentFallback = useMemo(() => createFallbackAgent(activeAgentNavigationId), [activeAgentNavigationId]);
    const activeAgentMenuAgent = activeAgent || activeAgentFallback;
    const activeAgentFolderContext = useMemo(
        () => buildAgentFolderContext(activeAgentMenuAgent.folderId, agentFolderById),
        [activeAgentMenuAgent.folderId, agentFolderById],
    );
    const activeAgentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const activeAgentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const activeAgentUrl = activeAgentNavigationId ? `${activeAgentOrigin}${activeAgentHref}` : '';
    const activeAgentEmail =
        activeAgentNavigationId && activeAgentHostname ? `${activeAgentNavigationId}@${activeAgentHostname}` : '';
    const activeAgentAvatarUrl = useMemo(() => {
        if (!activeAgent) {
            return null;
        }

        return resolveAgentAvatarImageUrl({ agent: activeAgent });
    }, [activeAgent]);
    const currentUserDisplayName = currentUser?.username || t('common.admin');
    const currentUserAvatarLabel = currentUserDisplayName.slice(0, 1).toUpperCase();
    const currentUserProfileImageUrl = currentUser?.profileImageUrl?.trim() || null;
    /**
     * Opens the active agent QR code modal.
     */
    const handleShowAgentQrCode = useCallback(() => {
        setIsAgentQrCodeOpen(true);
    }, []);

    /**
     * Closes the active agent QR code modal.
     */
    const handleCloseAgentQrCode = useCallback(() => {
        setIsAgentQrCodeOpen(false);
    }, []);

    /**
     * Closes the agent view dropdown after a selection.
     */
    const closeAgentViewDropdown = () => {
        setIsAgentViewOpen(false);
        setIsMenuOpen(false);
    };

    /**
     * Updates the current route after a rename initiated from the header menu.
     *
     * @param payload - Rename payload from the agent menu.
     */
    const handleAgentRenamedFromHeader = useCallback(
        (payload: AgentContextMenuRenamePayload) => {
            const nextAgentName = payload.agent.agentName;
            if (!nextAgentName) {
                return;
            }

            const usesPermanentId =
                Boolean(activeAgent?.permanentId) && activeAgentNavigationId === activeAgent?.permanentId;

            if (usesPermanentId) {
                router.refresh();
                return;
            }

            if (!pathname) {
                router.refresh();
                return;
            }

            const pathSegments = pathname.split('/').filter(Boolean);
            if (pathSegments.length === 0) {
                router.refresh();
                return;
            }

            if (pathSegments[0] === 'agents' && pathSegments[1]) {
                pathSegments[1] = encodeURIComponent(nextAgentName);
            } else if (!RESERVED_PATH_SET.has(pathSegments[0])) {
                pathSegments[0] = encodeURIComponent(nextAgentName);
            } else {
                router.refresh();
                return;
            }

            const search = typeof window !== 'undefined' ? window.location.search : '';
            router.replace(`/${pathSegments.join('/')}${search}`);
        },
        [activeAgent?.permanentId, activeAgentNavigationId, pathname, router],
    );

    const agentContextMenuItems = useAgentContextMenuItems({
        agent: activeAgentMenuAgent,
        agentName: activeAgentNavigationId || activeAgentMenuAgent.agentName,
        derivedAgentName: activeAgent?.agentName || activeAgentNavigationId || activeAgentMenuAgent.agentName,
        permanentId: activeAgent?.permanentId,
        agentUrl: activeAgentUrl,
        agentEmail: activeAgentEmail,
        folderContext: activeAgentFolderContext,
        isAdmin,
        onShowQrCode: handleShowAgentQrCode,
        onAgentRenamed: handleAgentRenamedFromHeader,
        onRequestClose: closeAgentViewDropdown,
        installPromptEvent,
        isInstalled,
        onInstallApp: handleInstallApp,
    });
    const agentMoreViewItems = useMemo(
        () => mapContextMenuItemsToSubMenuItems(agentContextMenuItems),
        [agentContextMenuItems],
    );

    const activeAgentViewItems: SubMenuItem[] = activeAgentNavigationId
        ? [
              {
                  label: createAgentViewLabel('Profile', t),
                  href: `/agents/${encodeURIComponent(activeAgentNavigationId)}`,
              },
              {
                  label: createAgentViewLabel('Chat', t),
                  href: `/agents/${encodeURIComponent(activeAgentNavigationId)}/chat`,
              },
              ...(isAdmin
                  ? [
                        {
                            label: createAgentViewLabel('Book', t),
                            href: `/agents/${encodeURIComponent(activeAgentNavigationId)}/book`,
                        } as SubMenuItem,
                    ]
                  : []),
              ...(agentMoreViewItems.length > 0
                  ? [
                        {
                            label: createAgentViewLabel('More', t),
                            items: agentMoreViewItems,
                        } as SubMenuItem,
                    ]
                  : []),
          ]
        : [];

    const closeAgentsDropdown = () => {
        setIsAgentsOpen(false);
        setIsMenuOpen(false);
    };

    const handleLogout = async () => {
        await logoutAction();
    };

    const {
        isPreparingDialog,
        openNewAgentDialog,
        dialog: newAgentDialog,
    } = useNewAgentDialog({
        onCreated: ({ permanentId }) => {
            pushWithHeadless(router, `/agents/${encodeURIComponent(permanentId)}`, isHeadless);
        },
        onCreateFailed: async (error) => {
            console.error('Failed to create agent:', error);
            await showAlert({
                title: t('header.createFailedTitle', { agentSingular: naming.singular }),
                message:
                    error instanceof Error
                        ? error.message
                        : t('header.createFailedMessage', { agentSingular: naming.singular }),
            }).catch(() => undefined);
        },
        onPrepareFailed: async (error) => {
            console.error('Failed to generate agent boilerplate:', error);
            await showAlert({
                title: t('header.createFailedTitle', { agentSingular: naming.singular }),
                message:
                    error instanceof Error
                        ? error.message
                        : t('header.createFailedMessage', { agentSingular: naming.singular }),
            }).catch(() => undefined);
        },
    });

    const createNewAgentLabel = useMemo(
        () =>
            isPreparingDialog ? (
                <div className="flex items-center">
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    {t('header.creatingAgent', { agentSingular: naming.singular })}
                </div>
            ) : (
                t('header.createNewAgent', { agentSingular: naming.singular })
            ),
        [isPreparingDialog, naming.singular, t],
    );
    const createNewAgentText = t('header.createNewAgent', { agentSingular: naming.singular });
    const viewAllAgentsLabel = t('header.viewAllAgents', { agentsPlural: naming.plural });

    const handleCreateAgent = useCallback(
        (folderId: number | null) => {
            void openNewAgentDialog({ folderId });
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        },
        [openNewAgentDialog],
    );

    const agentMenuTree = useMemo(
        () =>
            appendFolderActionNodes(agentMenuStructure.tree, {
                viewAllLabel: viewAllAgentsLabel,
                createLabel: createNewAgentText,
                renderCreateLabel: createNewAgentLabel,
                onCreateInFolder: isPreparingDialog ? undefined : (folderId) => handleCreateAgent(folderId),
            }),
        [
            agentMenuStructure.tree,
            viewAllAgentsLabel,
            createNewAgentText,
            createNewAgentLabel,
            isPreparingDialog,
            handleCreateAgent,
        ],
    );

    /**
     * Static entries appended below the dynamic hierarchy in the Agents menu.
     */
    const hierarchyAgentActionItems: SubMenuItem[] = [
        {
            label: viewAllAgentsLabel,
            href: '/agents',
            isBold: true,
            isBordered: true,
        },
        {
            label: createNewAgentLabel,
            onClick: isPreparingDialog ? undefined : () => handleCreateAgent(null),
            isBold: true,
        },
    ];
    /**
     * Hierarchical mobile Agents menu data with appended action items.
     */
    const hierarchyAgentMobileItems: SubMenuItem[] = [
        ...createAgentHierarchyMobileItems(agentMenuTree),
        ...hierarchyAgentActionItems,
    ];

    // Federated servers dropdown items (respect logo, only current is not clickable)
    const [isFederatedOpen, setIsFederatedOpen] = useState(false);
    // const [isMobileFederatedOpen, setIsMobileFederatedOpen] = useState(false);

    const federatedDropdownItems: SubMenuItem[] = federatedServers.map((server) => {
        const isCurrent = server.url === (typeof window !== 'undefined' ? window.location.origin : '');
        return isCurrent
            ? {
                  label: (
                      <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                              src={server.logoUrl || serverLogoUrl || promptbookLogoBlueTransparent.src}
                              alt={server.title}
                              width={20}
                              height={20}
                              className="w-5 h-5 object-contain rounded-full"
                          />
                          <span className="font-semibold">{server.title.replace(/^Federated: /, '')}</span>
                          <span className="ml-1 text-xs text-blue-600">{t('header.currentFederatedServer')}</span>
                      </span>
                  ),
                  isBold: true,
                  isBordered: true,
              }
            : {
                  label: (
                      <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                              src={server.logoUrl || promptbookLogoBlueTransparent.src}
                              alt={server.title}
                              width={20}
                              height={20}
                              className="w-5 h-5 object-contain rounded-full"
                          />
                          <span>{server.title.replace(/^Federated: /, '')}</span>
                      </span>
                  ),
                  href: server.url,
              };
    });

    /**
     * @private Creates one category entry inside the System dropdown when there are items to show.
     */
    const createSystemCategory = (
        label: SystemCategoryLabel,
        items: ReadonlyArray<SubMenuItem>,
    ): SubMenuItem[] => {
        if (items.length === 0) {
            return [];
        }

        const categoryIcon = SYSTEM_CATEGORY_ICON_MAP[label];
        return [
            {
                label,
                icon: categoryIcon,
                items: applyFallbackSubMenuIcon(items, categoryIcon),
            },
        ];
    };

    /**
     * @private Personal account links available to authenticated users.
     */
    const userAccountSystemItems: SubMenuItem[] = currentUser
        ? [
              {
                  label: t('common.profile'),
                  href: '/system/profile',
              },
              {
                  label: t('header.userMemory'),
                  href: '/system/user-memory',
              },
              {
                  label: t('header.userWallet'),
                  href: '/system/user-wallet',
              },
          ]
        : [];

    /**
     * @private Informational links grouped under the Legal & About category.
     */
    const legalAndAboutSystemItems: SubMenuItem[] = [
        ...(isAdmin
            ? [
                  {
                      label: t('header.versionInfo'),
                      href: '/admin/about',
                  } as SubMenuItem,
              ]
            : []),
        {
            label: t('header.landingPage'),
            href: 'https://ptbk.io/',
        },
    ];

    /**
     * @private System menu entries exposed to non-admin users.
     */
    const userSystemItems: SubMenuItem[] = [
        ...createSystemCategory('My Account', userAccountSystemItems),
        ...createSystemCategory('Legal & About', legalAndAboutSystemItems),
    ];

    /**
     * @private Shared dropdown props that keep every System menu item wired to the same open/close state.
     */
    const systemDropdownBase: Omit<Extract<MenuItem, { type: 'dropdown' }>, 'items'> = {
        type: 'dropdown' as const,
        id: 'system',
        label: t('header.systemMenuLabel'),
        isOpen: isSystemOpen,
        setIsOpen: setIsSystemOpen,
        isMobileOpen: isMobileSystemOpen,
        setIsMobileOpen: setIsMobileSystemOpen,
    };

    /**
     * @private Build a System dropdown menu entry that reuses the shared toggle state.
     */
    const buildSystemMenuItem = (items: SubMenuItem[]): MenuItem => ({
        ...systemDropdownBase,
        items,
    });

    /**
     * @private Administration-focused actions shown inside the System dropdown.
     */
    const administrationSystemItems: SubMenuItem[] = [
        /*
        Note: [🙍] `/dashboard` page is disabled

        {
            label: 'Dashboard',
            href: '/dashboard',
            isBold: true,
            isBordered: true,
        } as SubMenuItem,
        */
        ...(isGlobalAdmin
            ? [
                  {
                      label: t('header.servers'),
                      href: '/admin/servers',
                      isBold: true,
                  } as SubMenuItem,
              ]
            : []),
        {
            label: t('header.models'),
            href: '/admin/models',
        },
        {
            label: t('header.metadata'),
            href: '/admin/metadata',
        },
        {
            label: 'Tool limits',
            href: '/admin/tool-limits',
        },
        {
            label: t('header.messagesEmails'),
            href: '/admin/messages',
        },
        {
            label: 'Backups',
            href: '/admin/backup',
            isBordered: true,
        },
        {
            label: t('header.users'),
            href: '/admin/users',
            isBold: true,
            isBordered: true,
        },
        {
            label: t('header.customCss'),
            href: '/admin/custom-css',
        },
        {
            label: t('header.customJs'),
            href: '/admin/custom-js',
        },
        {
            label: t('header.imagesGallery'),
            href: '/admin/images',
        },
        {
            label: t('header.files'),
            href: '/admin/files',
        },
    ];

    /**
     * @private Monitoring and analytics links shown inside the System dropdown.
     */
    const monitoringAndUsageSystemItems: SubMenuItem[] = [
        {
            label: t('header.usageAnalytics'),
            href: '/admin/usage',
        },
        {
            label: t('header.taskManager'),
            href: '/admin/task-manager',
        },
        {
            label: t('header.chatHistory'),
            href: '/admin/chat-history',
        },
        ...(isFeedbackEnabled
            ? [
                  {
                      label: t('header.chatFeedback'),
                      href: '/admin/chat-feedback',
                  } as SubMenuItem,
              ]
            : []),
    ];

    /**
     * @private API and external integration entry points shown inside the System dropdown.
     */
    const integrationsAndKeysSystemItems: SubMenuItem[] = [
        {
            label: t('header.apiTokens'),
            href: '/admin/api-tokens',
        },
        {
            label: t('header.openApiDocumentation'),
            href: '/swagger',
        },
    ];

    /**
     * @private Developer and debugging tools shown inside the System dropdown.
     */
    const developerDebugSystemItems: SubMenuItem[] = [
        {
            label: t('header.browser'),
            href: '/admin/browser-test',
        },
        {
            label: t('header.voiceInputTest'),
            href: '/admin/voice-input-test',
        },
        // Note: Commented out because image generator can became a paid feature later for the clients
        // {
        //     label: 'Image Generator Test',
        //     href: '/admin/image-generator-test',
        // },
        {
            label: t('header.searchEngineTest'),
            href: '/admin/search-engine-test',
        },
        {
            label: 'Error simulation',
            href: '/admin/error-simulation',
        },
        ...(isExperimental
            ? [
                  {
                      label: t('header.story'),
                      href: '/experiments/story',
                      isBold: true,
                  } as SubMenuItem,
              ]
            : []),
    ];

    /**
     * @private System menu entries exposed to admins.
     */
    const adminSystemMenuItems: SubMenuItem[] = [
        ...createSystemCategory('My Account', userAccountSystemItems),
        ...createSystemCategory('Administration', administrationSystemItems),
        ...createSystemCategory('Monitoring & Usage', monitoringAndUsageSystemItems),
        ...createSystemCategory('Integrations & Keys', integrationsAndKeysSystemItems),
        ...createSystemCategory('Developer / Debug', developerDebugSystemItems),
        ...createSystemCategory('Legal & About', legalAndAboutSystemItems),
    ];

    const hasMenuAccess = Boolean(currentUser || isAdmin);
    const systemMenuEntries = isAdmin ? adminSystemMenuItems : userSystemItems;
    const shouldShowSystemMenu = hasMenuAccess && systemMenuEntries.length > 0;

    // Menu items configuration (DRY principle)
    const menuItems: MenuItem[] = [
        ...(hasMenuAccess
            ? [
                  {
                      id: 'documentation',
                      type: 'dropdown' as const,
                      label: t('header.documentationMenuLabel'),
                      isOpen: isDocsOpen,
                      setIsOpen: setIsDocsOpen,
                      isMobileOpen: isMobileDocsOpen,
                      setIsMobileOpen: setIsMobileDocsOpen,
                      items: documentationDropdownItems,
                  },
              ]
            : []),
        ...(shouldShowSystemMenu ? [buildSystemMenuItem(systemMenuEntries)] : []),
    ];


    /**
     * Renders desktop top-level navigation entries shown to the right of the centered search slot.
     */
    const renderDesktopTopMenuNavigation = () => (
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            {menuItems.map((item, index) => {
                if (item.type === 'link') {
                    return (
                        <HeadlessLink
                            key={index}
                            href={item.href}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            {item.label}
                        </HeadlessLink>
                    );
                }

                if (item.type === 'dropdown') {
                    const dropdownItems = item.items ?? [];
                    const closeDropdown = () => {
                        cancelMenuClose(item.id);
                        item.setIsOpen(false);
                        setOpenSubMenu(null);
                        setDesktopExpandedSubMenus({});
                    };
                    const toggleDropdown = () => {
                        cancelMenuClose(item.id);
                        item.setIsOpen(!item.isOpen);
                        if (item.isOpen) {
                            setOpenSubMenu(null);
                            setDesktopExpandedSubMenus({});
                        }
                    };

                    const renderDropdownLink = (
                        linkItem: SubMenuItem,
                        keySuffix: string,
                        className: string,
                    ) => {
                        if (linkItem.onClick) {
                            return (
                                <button
                                    key={keySuffix}
                                    onClick={linkItem.onClick}
                                    className={`${className} w-full text-left`}
                                >
                                    {renderSubMenuItemLabel(linkItem)}
                                </button>
                            );
                        }

                        if (linkItem.href) {
                            return (
                                <HeadlessLink
                                    key={keySuffix}
                                    href={linkItem.href}
                                    className={className}
                                    onClick={() => closeDropdown()}
                                >
                                    {renderSubMenuItemLabel(linkItem)}
                                </HeadlessLink>
                            );
                        }

                        return (
                            <span key={keySuffix} className={className}>
                                {renderSubMenuItemLabel(linkItem)}
                            </span>
                        );
                    };

                    /**
                     * Renders nested dropdown branches for touch-first desktop navigation.
                     */
                    const renderTouchNestedDropdownItems = (
                        nestedItems: ReadonlyArray<SubMenuItem>,
                        keyPrefix: string,
                        depth = 0,
                    ): ReactNode => (
                        <div
                            className={`grid auto-rows-min gap-1 ${
                                depth > 0 ? 'mt-1 border-l border-gray-200 pl-2' : ''
                            }`}
                        >
                            {nestedItems.map((nestedItem, nestedIndex) => {
                                const nestedKey = `${keyPrefix}-${nestedIndex}`;
                                const hasNestedChildren = Boolean(
                                    nestedItem.items && nestedItem.items.length > 0,
                                );
                                const borderClass = nestedItem.isBordered
                                    ? 'border-b border-gray-100 pb-1'
                                    : '';
                                const leafClassName = `block rounded-lg px-3 py-2 text-sm ${
                                    nestedItem.isBold
                                        ? 'font-medium text-gray-900'
                                        : 'text-gray-700'
                                } hover:bg-white hover:text-gray-900 transition-colors ${borderClass}`;

                                if (!hasNestedChildren) {
                                    return renderDropdownLink(nestedItem, nestedKey, leafClassName);
                                }

                                const isNestedOpen = Boolean(desktopExpandedSubMenus[nestedKey]);
                                return (
                                    <div key={nestedKey} className={borderClass}>
                                        <button
                                            type="button"
                                            onClick={() => toggleDesktopSubMenu(nestedKey)}
                                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-white hover:text-gray-900"
                                        >
                                            <span className="min-w-0 flex-1">
                                                {renderSubMenuItemLabel(nestedItem)}
                                            </span>
                                            <ChevronDown
                                                className={`h-3 w-3 text-gray-400 transition-transform ${
                                                    isNestedOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                        {isNestedOpen &&
                                            renderTouchNestedDropdownItems(
                                                nestedItem.items || [],
                                                nestedKey,
                                                depth + 1,
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    );

                    const renderDropdownItems = () =>
                        dropdownItems.map((subItem, subIndex) => {
                            const borderClass = subItem.isBordered
                                ? 'border-b border-gray-100'
                                : '';
                            const baseClassName = `mx-1 block rounded-lg px-3 py-2.5 text-sm ${
                                subItem.isBold ? 'font-medium text-gray-900' : 'text-gray-600'
                            } hover:bg-gray-50 hover:text-gray-900 transition-colors ${borderClass}`;

                            if (subItem.items && subItem.items.length > 0) {
                                const submenuKey = `${item.id}-dropdown-${subIndex}`;
                                const isSubMenuOpen =
                                    !isTouchInput && openSubMenu?.key === submenuKey;
                                const isTapSubMenuOpen = Boolean(
                                    desktopExpandedSubMenus[submenuKey],
                                );
                                const childItems = subItem.items!;
                                return (
                                    <div
                                        key={submenuKey}
                                        className={`relative mx-1 rounded-lg ${borderClass}`}
                                        onMouseEnter={(event) => {
                                            if (isTouchInput) {
                                                return;
                                            }
                                            handleSubMenuMouseEnter(submenuKey, childItems, event);
                                            cancelMenuClose(item.id);
                                        }}
                                        onMouseLeave={() => {
                                            if (isTouchInput) {
                                                return;
                                            }
                                            handleSubMenuMouseLeave(submenuKey);
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                                                subItem.isBold
                                                    ? 'font-medium text-gray-900'
                                                    : 'text-gray-600'
                                            } hover:bg-gray-50 hover:text-gray-900 transition-colors`}
                                            onClick={(event) => {
                                                cancelMenuClose(item.id);
                                                if (isTouchInput) {
                                                    toggleDesktopSubMenu(submenuKey);
                                                    return;
                                                }
                                                const rect = (
                                                    event.currentTarget.parentElement ??
                                                    event.currentTarget
                                                ).getBoundingClientRect();
                                                setOpenSubMenu((current) =>
                                                    current?.key === submenuKey
                                                        ? null
                                                        : {
                                                              key: submenuKey,
                                                              rect,
                                                              items: childItems,
                                                          },
                                                );
                                            }}
                                        >
                                            <span className="min-w-0 flex-1">
                                                {renderSubMenuItemLabel(subItem)}
                                            </span>
                                            <ChevronRight
                                                className={`h-3 w-3 text-gray-400 transition-transform ${
                                                    isTouchInput && isTapSubMenuOpen
                                                        ? 'rotate-90'
                                                        : ''
                                                }`}
                                            />
                                        </button>

                                        {isTouchInput && isTapSubMenuOpen && (
                                            <div className="mx-1 mb-2 rounded-xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/80 p-2">
                                                {renderTouchNestedDropdownItems(
                                                    childItems,
                                                    submenuKey,
                                                )}
                                            </div>
                                        )}

                                        {isSubMenuOpen && openSubMenu && (
                                            <DropdownSubMenuPortal
                                                anchorRect={openSubMenu.rect}
                                                container={dropdownPortalContainer}
                                                onMouseEnter={() => {
                                                    keepSubMenuOpen();
                                                    cancelMenuClose(item.id);
                                                }}
                                                onMouseLeave={() => {
                                                    handleSubMenuPortalLeave();
                                                    scheduleMenuClose(item.id, () =>
                                                        item.setIsOpen(false),
                                                    );
                                                }}
                                            >
                                                <div className="pointer-events-auto max-h-[70vh] w-[min(320px,calc(100vw-4rem))] overflow-y-auto rounded-xl border border-gray-100 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur">
                                                    <div className="flex flex-col gap-1">
                                                        {childItems.map((child, childIndex) =>
                                                            renderDropdownLink(
                                                                child,
                                                                `${submenuKey}-portal-child-${childIndex}`,
                                                                'block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </DropdownSubMenuPortal>
                                        )}
                                    </div>
                                );
                            }

                            return renderDropdownLink(
                                subItem,
                                `dropdown-${subIndex}`,
                                baseClassName,
                            );
                        });

                    return (
                        <div
                            key={index}
                            className="relative"
                            onMouseEnter={() => {
                                cancelMenuClose(item.id);
                                if (!isTouchInput) {
                                    item.setIsOpen(true);
                                }
                            }}
                            onMouseLeave={() =>
                                scheduleMenuClose(item.id, () => item.setIsOpen(false))
                            }
                        >
                            <button
                                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                onClick={toggleDropdown}
                                onMouseEnter={() => {
                                    cancelMenuClose(item.id);
                                    if (!isTouchInput) {
                                        item.setIsOpen(true);
                                    }
                                }}
                                onBlur={() =>
                                    scheduleMenuClose(item.id, () => item.setIsOpen(false))
                                }
                            >
                                {item.label}
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {item.isOpen && (
                                <div
                                    className="absolute left-0 top-full z-50 mt-2 w-[min(420px,90vw)] rounded-2xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 backdrop-blur"
                                    onMouseEnter={() => cancelMenuClose(item.id)}
                                    onMouseLeave={() =>
                                        scheduleMenuClose(item.id, () => item.setIsOpen(false))
                                    }
                                >
                                    {item.renderMenu ? (
                                        <div className="relative">{item.renderMenu()}</div>
                                    ) : (
                                        <div className="max-h-[80vh] overflow-y-auto overflow-x-visible">
                                            {renderDropdownItems()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }

                return null;
            })}
        </nav>
    );

    return (
        <header
            ref={headerRef}
            className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16"
        >
            {isChangePasswordOpen && <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} />}
            {isAgentQrCodeOpen && activeAgent && (
                <QrCodeModal
                    onClose={handleCloseAgentQrCode}
                    agentName={activeAgentNavigationId || activeAgent.agentName}
                    meta={activeAgent.meta}
                    personaDescription={activeAgent.personaDescription || ''}
                    agentUrl={activeAgentUrl}
                    agentEmail={activeAgentEmail}
                    brandColorHex={activeAgent.meta.color || PROMPTBOOK_COLOR.toHex()}
                />
            )}
            <div className="relative w-full px-4 h-full">
                <div className="flex h-full items-center gap-2 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5">
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-white/90 px-2 sm:px-3 md:px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm shadow-slate-200/60 backdrop-blur">
                            <div className="relative flex min-w-0 items-center gap-3">
                                <HeadlessLink
                                    href="/"
                                    className="flex min-w-0 items-center gap-3 hover:opacity-80 transition-opacity"
                                >
                                    {serverLogoUrl ? (
                                        // Note: `next/image` does not load external images well without extra config
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={serverLogoUrl}
                                            alt={serverName}
                                            width={32}
                                            height={32}
                                            className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
                                        />
                                    ) : (
                                        <Image
                                            src={promptbookLogoBlueTransparent}
                                            alt={serverName}
                                            width={32}
                                            height={32}
                                            className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
                                        />
                                    )}
                                    <span className="text-base font-bold tracking-tight text-gray-900 truncate max-w-[180px] sm:max-w-[200px] md:max-w-[250px] lg:max-w-none">
                                        <span className="hidden sm:inline">{serverName}</span>
                                        <span className="sm:hidden">{serverName.split(' ')[0]}</span>
                                    </span>
                                </HeadlessLink>
                                {federatedServers.length > 0 && (
                                    <div
                                        className="relative hidden lg:block"
                                        onMouseEnter={() => cancelMenuClose('federated-server-switcher')}
                                        onMouseLeave={() =>
                                            scheduleMenuClose('federated-server-switcher', () =>
                                                setIsFederatedOpen(false),
                                            )
                                        }
                                    >
                                        <button
                                            className="inline-flex p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                            onClick={() => {
                                                cancelMenuClose('federated-server-switcher');
                                                setIsFederatedOpen(!isFederatedOpen);
                                            }}
                                            onMouseEnter={() => {
                                                cancelMenuClose('federated-server-switcher');
                                                if (!isTouchInput) {
                                                    setIsFederatedOpen(true);
                                                }
                                            }}
                                            onBlur={() =>
                                                scheduleMenuClose('federated-server-switcher', () =>
                                                    setIsFederatedOpen(false),
                                                )
                                            }
                                            title={t('header.switchServerAria')}
                                            aria-label={t('header.switchServerAria')}
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        {isFederatedOpen && (
                                            <div
                                                className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto backdrop-blur"
                                                onMouseEnter={() => cancelMenuClose('federated-server-switcher')}
                                                onMouseLeave={() =>
                                                    scheduleMenuClose('federated-server-switcher', () =>
                                                        setIsFederatedOpen(false),
                                                    )
                                                }
                                            >
                                                {federatedDropdownItems.map((subItem, subIndex) => {
                                                    const className = `mx-1 block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${
                                                        subItem.isBold ? 'font-medium' : ''
                                                    } ${subItem.isBordered ? 'border-b border-gray-100' : ''}`;

                                                    if (subItem.href) {
                                                        return (
                                                            <HeadlessLink
                                                                key={`federated-${subIndex}`}
                                                                href={subItem.href}
                                                                className={className}
                                                                onClick={() => setIsFederatedOpen(false)}
                                                            >
                                                                {subItem.label}
                                                            </HeadlessLink>
                                                        );
                                                    }

                                                    return (
                                                        <span key={`federated-${subIndex}`} className={className}>
                                                            {subItem.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <ArrowIcon direction="right" className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />

                            {isAdmin ? (
                                <div
                                    className="relative min-w-0"
                                    onMouseEnter={() => {
                                        cancelMenuClose('agents-hierarchy');
                                        if (!isTouchInput) {
                                            setIsAgentsOpen(true);
                                        }
                                    }}
                                    onMouseLeave={() =>
                                        scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))
                                    }
                                >
                                    <button
                                        className="flex min-w-0 items-center gap-2 rounded-full border border-transparent px-2 sm:px-3 py-1 hover:border-gray-200 hover:bg-gray-100 transition"
                                        onClick={() => {
                                            cancelMenuClose('agents-hierarchy');
                                            setIsAgentsOpen(!isAgentsOpen);
                                        }}
                                        onMouseEnter={() => {
                                            cancelMenuClose('agents-hierarchy');
                                            if (!isTouchInput) {
                                                setIsAgentsOpen(true);
                                            }
                                        }}
                                        onBlur={() =>
                                            scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))
                                        }
                                    >
                                        <AgentNameWithAvatar
                                            label={activeAgentLabel}
                                            avatarUrl={activeAgentAvatarUrl}
                                            avatarSizeClassName="h-5 w-5"
                                            textClassName="text-xs sm:text-sm font-semibold text-gray-900"
                                            maxWidthClassName="max-w-[80px] sm:max-w-[120px] md:max-w-[180px] lg:max-w-[200px]"
                                            fallbackIcon={
                                                !activeAgent ? (
                                                    <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
                                                ) : undefined
                                            }
                                        />
                                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                    </button>
                                    {isAgentsOpen && (
                                        <div
                                            className="absolute left-0 top-full z-50 mt-2 w-[min(420px,90vw)] rounded-2xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 overflow-visible backdrop-blur"
                                            onMouseEnter={() => cancelMenuClose('agents-hierarchy')}
                                            onMouseLeave={() =>
                                                scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))
                                            }
                                        >
                                            <AgentDirectoryDropdown
                                                nodes={agentMenuTree}
                                                onNavigate={closeAgentsDropdown}
                                                isTouchInput={isTouchInput}
                                            />
                                            <div className="border-t border-gray-100 p-1.5">
                                                <HeadlessLink
                                                    href="/agents"
                                                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                                                    onClick={closeAgentsDropdown}
                                                >
                                                    {t('header.viewAllAgents', { agentsPlural: naming.plural })}
                                                </HeadlessLink>
                                                <button
                                                    onClick={
                                                        isPreparingDialog ? undefined : () => handleCreateAgent(null)
                                                    }
                                                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                                                >
                                                    {isPreparingDialog ? (
                                                        <span className="inline-flex items-center">
                                                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                                            {t('header.creatingAgent', {
                                                                agentSingular: naming.singular,
                                                            })}
                                                        </span>
                                                    ) : (
                                                        t('header.createNewAgent', {
                                                            agentSingular: naming.singular,
                                                        })
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <HeadlessLink
                                    href={activeAgentHref}
                                    className="inline-flex min-w-0 items-center gap-2 rounded-full px-2 sm:px-3 py-1 hover:bg-gray-100 transition"
                                >
                                    <AgentNameWithAvatar
                                        label={activeAgentLabel}
                                        avatarUrl={activeAgentAvatarUrl}
                                        avatarSizeClassName="h-7 w-7"
                                        textClassName="text-xs sm:text-sm font-semibold text-gray-900"
                                        maxWidthClassName="max-w-[80px] sm:max-w-[120px] md:max-w-[180px] lg:max-w-[200px]"
                                        fallbackIcon={
                                            !activeAgent ? (
                                                <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
                                            ) : undefined
                                        }
                                    />
                                </HeadlessLink>
                            )}

                            {activeAgentView && activeAgentViewItems.length > 0 && (
                                <>
                                    <ArrowIcon direction="right" className="hidden sm:block h-4 w-4 text-gray-500" />
                                    <div
                                        className="relative hidden sm:block"
                                        onMouseEnter={() => {
                                            cancelMenuClose('agent-view');
                                            if (!isTouchInput) {
                                                setIsAgentViewOpen(true);
                                            }
                                        }}
                                        onMouseLeave={() =>
                                            scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))
                                        }
                                    >
                                        <button
                                            className="flex items-center gap-2 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                                            onClick={() => {
                                                cancelMenuClose('agent-view');
                                                setIsAgentViewOpen(!isAgentViewOpen);
                                            }}
                                            onMouseEnter={() => {
                                                cancelMenuClose('agent-view');
                                                if (!isTouchInput) {
                                                    setIsAgentViewOpen(true);
                                                }
                                            }}
                                            onBlur={() =>
                                                scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))
                                            }
                                        >
                                            {createAgentViewLabel(activeAgentView, t)}
                                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                        </button>
                                        {isAgentViewOpen && (
                                            <div
                                                className="absolute left-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 backdrop-blur"
                                                onMouseEnter={() => cancelMenuClose('agent-view')}
                                                onMouseLeave={() =>
                                                    scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))
                                                }
                                            >
                                                {renderAgentViewDropdownItems(
                                                    activeAgentViewItems,
                                                    'agent-view-dropdown',
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="hidden items-center justify-center px-2 lg:flex xl:px-4">
                        <div className="hidden w-[clamp(12rem,20vw,22.5rem)] xl:block">
                            <HeaderSearchBox className="w-full" />
                        </div>
                    </div>


                    {/* CTA Button & Mobile Menu Toggle */}
                    <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 lg:ml-0 lg:justify-self-end">
                        {renderDesktopTopMenuNavigation()}
                        {menuHoisting && menuHoisting.menu.length > 0 && (
                            <div className="hidden lg:flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
                                {menuHoisting.menu.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={item.onClick}
                                        className={`p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 ${
                                            item.isActive ? 'bg-gray-100 text-gray-900' : ''
                                        }`}
                                        title={item.name}
                                    >
                                        {item.icon}
                                    </button>
                                ))}
                            </div>
                        )}
                        <HeaderControlPanelDropdown />
                        {just(false /* TODO: [🧠] Figure out what to do with call to action */) && (
                            <a href="https://ptbk.io/?modal=get-started" target="_blank" className="hidden md:block">
                                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90">
                                    Get Started
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </a>
                        )}

                        {!currentUser && !isAdmin && (
                            <button
                                onClick={() => {
                                    void showLoginDialog().catch(() => undefined);
                                    setIsMenuOpen(false);
                                }}
                                className="hidden lg:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                                {t('header.logIn')}
                                <LogIn className="ml-2 w-4 h-4" />
                            </button>
                        )}

                        {(currentUser || isAdmin) && (
                            <div className="hidden lg:flex items-center gap-3">
                                <div
                                    className="relative"
                                    onMouseEnter={() => cancelMenuClose('profile-menu')}
                                    onMouseLeave={() =>
                                        scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))
                                    }
                                >
                                    <button
                                        onClick={() => {
                                            cancelMenuClose('profile-menu');
                                            setIsProfileOpen(!isProfileOpen);
                                        }}
                                        onMouseEnter={() => {
                                            cancelMenuClose('profile-menu');
                                            if (!isTouchInput) {
                                                setIsProfileOpen(true);
                                            }
                                        }}
                                        onBlur={() => scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))}
                                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
                                    >
                                        <div className="relative flex h-8 w-8 items-center justify-center">
                                            {currentUserProfileImageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={currentUserProfileImageUrl}
                                                    alt={`${currentUserDisplayName} avatar`}
                                                    className="h-8 w-8 rounded-full border border-gray-100 object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                                    {currentUserAvatarLabel}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="leading-none">{currentUserDisplayName}</span>
                                            {(currentUser?.isAdmin || isAdmin) && (
                                                <span className="text-xs text-blue-600">{t('common.admin')}</span>
                                            )}
                                        </div>
                                        <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                                    </button>

                                    {isProfileOpen && (
                                        <div
                                            className="absolute top-full right-0 mt-2 w-56 bg-white/95 rounded-xl shadow-xl shadow-slate-900/10 border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur"
                                            onMouseEnter={() => cancelMenuClose('profile-menu')}
                                            onMouseLeave={() =>
                                                scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))
                                            }
                                        >
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {currentUserDisplayName}
                                                </p>
                                                {(currentUser?.isAdmin || isAdmin) && (
                                                    <p className="text-xs text-blue-600 mt-1">{t('common.admin')}</p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => setIsChangePasswordOpen(true)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                            >
                                                <Lock className="w-4 h-4" />
                                                {t('header.changePassword')}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                {t('header.logOut')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <div className="lg:hidden">
                            <HamburgerMenu
                                isOpen={isMenuOpen}
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 text-gray-600 hover:text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Backdrop */}
                {isMenuOpen && (
                    <div
                        className="lg:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                        onClick={() => setIsMenuOpen(false)}
                    />
                )}

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div
                        className="lg:hidden absolute top-16 left-0 right-0 z-50 bg-white shadow-2xl py-6 border-t border-gray-200 animate-in slide-in-from-top-2 h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                        style={{
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        <nav className="mx-auto flex flex-col items-center gap-6 px-6 max-w-md pb-8">
                            <div className="w-full border-b border-gray-200 pb-6 text-center">
                                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-gray-400 mb-3">
                                    <span>{t('header.menuLabel')}</span>
                                    {federatedServers.length > 0 && (
                                        <button
                                            className="inline-flex p-1 text-gray-500 hover:text-gray-800"
                                            onClick={() => setIsFederatedOpen(!isFederatedOpen)}
                                            aria-label={t('header.switchServerAria')}
                                        >
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform duration-200 ${
                                                    isFederatedOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xl font-bold text-gray-900 truncate px-4">{serverName}</p>
                                {isFederatedOpen && federatedDropdownItems.length > 0 && (
                                    <div className="mt-4 mx-auto w-full max-w-[90vw] flex flex-col gap-1 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                        {federatedDropdownItems.map((subItem, subIndex) => {
                                            const className = `block rounded-md px-4 py-3 text-sm text-gray-700 hover:bg-white hover:shadow-sm active:scale-98 transition-all duration-150 ${
                                                subItem.isBold ? 'font-semibold' : ''
                                            }`;
                                            if (subItem.href) {
                                                return (
                                                    <HeadlessLink
                                                        key={`mobile-federated-${subIndex}`}
                                                        href={subItem.href}
                                                        className={className}
                                                        onClick={() => setIsMenuOpen(false)}
                                                    >
                                                        {subItem.label}
                                                    </HeadlessLink>
                                                );
                                            }
                                            return (
                                                <span key={`mobile-federated-${subIndex}`} className={className}>
                                                    {subItem.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-6 flex flex-col items-center gap-4 w-full">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                        <ArrowIcon direction="right" className="h-4 w-4 text-gray-500" />
                                        {isAdmin ? (
                                            <button
                                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-all duration-150"
                                                onClick={() => setIsMobileAgentsOpen(!isMobileAgentsOpen)}
                                            >
                                                <AgentNameWithAvatar
                                                    label={activeAgentLabel}
                                                    avatarUrl={activeAgentAvatarUrl}
                                                    avatarSizeClassName="h-6 w-6"
                                                    textClassName="text-sm font-semibold text-gray-900"
                                                    maxWidthClassName="max-w-[60vw]"
                                                    fallbackIcon={
                                                        !activeAgent ? (
                                                            <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
                                                        ) : undefined
                                                    }
                                                />
                                                <ChevronDown
                                                    className={`h-4 w-4 transition-transform duration-200 ${
                                                        isMobileAgentsOpen ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                        ) : (
                                            <HeadlessLink
                                                href={activeAgentHref}
                                                className="flex min-w-0 items-center gap-2"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <AgentNameWithAvatar
                                                    label={activeAgentLabel}
                                                    avatarUrl={activeAgentAvatarUrl}
                                                    avatarSizeClassName="h-6 w-6"
                                                    textClassName="text-sm font-semibold text-gray-900"
                                                    maxWidthClassName="max-w-[60vw]"
                                                    fallbackIcon={
                                                        !activeAgent ? (
                                                            <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
                                                        ) : undefined
                                                    }
                                                />
                                            </HeadlessLink>
                                        )}
                                    </div>

                                    {isAdmin && isMobileAgentsOpen && (
                                        <div className="w-full max-w-[90vw] flex flex-col gap-1 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 max-h-[40vh] overflow-y-auto shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                            {renderMobileNestedMenuItems(hierarchyAgentMobileItems, 'mobile-agents')}
                                        </div>
                                    )}

                                    {activeAgentView && activeAgentViewItems.length > 0 && (
                                        <div className="w-full max-w-[90vw] flex flex-col gap-1">
                                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                                                <ArrowIcon direction="right" className="h-4 w-4 text-gray-500" />
                                                <button
                                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition"
                                                    onClick={() => setIsMobileAgentViewOpen(!isMobileAgentViewOpen)}
                                                >
                                                    {createAgentViewLabel(activeAgentView, t)}
                                                    <ChevronDown
                                                        className={`h-4 w-4 transition-transform duration-200 ${
                                                            isMobileAgentViewOpen ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            {isMobileAgentViewOpen && (
                                                <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                                    {renderMobileNestedMenuItems(
                                                        activeAgentViewItems,
                                                        'mobile-agent-view',
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="w-full max-w-[90vw] pt-1">
                                        <HeaderSearchBox
                                            placeholder={t('header.searchThisServerPlaceholder')}
                                            onNavigate={() => setIsMenuOpen(false)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Hoisted Menu Items for Mobile */}
                            {menuHoisting && menuHoisting.menu.length > 0 && (
                                <div className="w-full py-3 border-b border-gray-200 flex justify-center gap-3 overflow-x-auto">
                                    {menuHoisting.menu.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                item.onClick();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`p-3 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-150 text-gray-600 hover:text-gray-900 shadow-sm hover:shadow active:scale-95 ${
                                                item.isActive ? 'bg-blue-50 text-blue-600 shadow' : ''
                                            }`}
                                            title={item.name}
                                        >
                                            {item.icon}
                                            <span className="sr-only">{item.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Login Status for Mobile */}
                            <div className="w-full py-4 border-b border-gray-200 flex flex-col items-center gap-3">
                                {!currentUser && !isAdmin && (
                                    <button
                                        onClick={() => {
                                            void showLoginDialog().catch(() => undefined);
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center gap-3 px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-md hover:shadow-lg active:scale-98 transition-all duration-150"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        {t('header.logIn')}
                                    </button>
                                )}

                                {(currentUser || isAdmin) && (
                                    <div className="w-full flex flex-col items-center gap-3 bg-gradient-to-b from-gray-50 to-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
                                                {currentUserProfileImageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={currentUserProfileImageUrl}
                                                        alt={`${currentUserDisplayName} avatar`}
                                                        className="h-12 w-12 rounded-full object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    currentUserAvatarLabel
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-700 font-medium">
                                                {t('header.loggedInAs', { username: currentUserDisplayName })}
                                                {(currentUser?.isAdmin || isAdmin) && (
                                                    <span className="ml-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                                                        {t('common.admin')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsChangePasswordOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:shadow active:scale-98 transition-all duration-150"
                                        >
                                            <Lock className="w-4 h-4" />
                                            {t('header.changePassword')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-lg shadow-sm hover:shadow active:scale-98 transition-all duration-150"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            {t('header.logOut')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {menuItems.map((item, index) => {
                                if (item.type === 'link') {
                                    return (
                                        <HeadlessLink
                                            key={index}
                                            href={item.href}
                                            className="block w-full text-base font-semibold text-gray-700 hover:text-blue-600 py-3 px-4 text-center rounded-lg hover:bg-gray-50 active:bg-gray-100 active:scale-98 transition-all duration-150"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item.label}
                                        </HeadlessLink>
                                    );
                                }

                                if (item.type === 'dropdown') {
                                    return (
                                        <div key={index} className="w-full flex flex-col items-center gap-2">
                                            <button
                                                className="w-full flex items-center justify-center gap-2 text-base font-semibold text-gray-700 hover:text-blue-600 py-3 px-4 rounded-lg hover:bg-gray-50 active:bg-gray-100 active:scale-98 transition-all duration-150"
                                                onClick={() => item.setIsMobileOpen(!item.isMobileOpen)}
                                            >
                                                {item.label}
                                                <ChevronDown
                                                    className={`w-4 h-4 transition-transform duration-200 ${
                                                        item.isMobileOpen ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                            {item.isMobileOpen && (
                                                <div className="w-full flex flex-col items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                                    {renderMobileNestedMenuItems(item.items, `mobile-menu-${index}`)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return null;
                            })}

                            {just(false /* TODO: [🧠] Figure out what to do with these links */) && (
                                <a
                                    href="https://ptbk.io/"
                                    target="_blank"
                                    className="text-base font-medium text-gray-600 hover:text-gray-900 py-2 text-center"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Create your server
                                </a>
                            )}
                        </nav>
                    </div>
                )}
            </div>
            {newAgentDialog}
        </header>
    );
}
