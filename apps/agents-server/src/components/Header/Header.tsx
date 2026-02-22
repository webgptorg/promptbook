'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { $createAgentAction, logoutAction } from '@/src/app/actions';
import {
    ArrowRight,
    ChevronDown,
    ChevronRight,
    FileTextIcon,
    FolderIcon,
    Lock,
    LogIn,
    LogOut,
    MessageSquareIcon,
    NotebookPenIcon,
} from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HamburgerMenu } from '../../../../../src/book-components/_common/HamburgerMenu/HamburgerMenu';
import { useMenuHoisting } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { just } from '../../../../../src/utils/organization/just';
import { RESERVED_PATHS } from '../../generated/reservedPaths';
import { buildFolderPath, getFolderPathSegments } from '../../utils/agentOrganization/folderPath';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { UserInfo } from '../../utils/getCurrentUser';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { HeadlessLink, pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert, showLoginDialog } from '../AsyncDialogs/asyncDialogs';
import { FolderAppearanceIcon } from '../FolderAppearance/FolderAppearanceIcon';
import { ChangePasswordDialog } from '../ChangePasswordDialog/ChangePasswordDialog';
import { useUsersAdmin } from '../UsersList/useUsersAdmin';
import { HeaderControlPanelDropdown } from './ControlPanel/ControlPanel';
import { HeaderSearchBox } from './HeaderSearchBox';

type HeaderProps = {
    /**
     * Is the user an admin
     */
    isAdmin?: boolean;

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

type SubMenuItem = {
    label: ReactNode;
    href?: string;
    onClick?: () => void | Promise<void>;
    isBold?: boolean;
    isBordered?: boolean;
    items?: SubMenuItem[];
};

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
 * Media query used to detect touch-centric environments where hover interactions are unavailable.
 */
const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

/**
 * Detects whether the current browser context prefers touch-first input.
 *
 * @returns True when touch or coarse pointer capabilities are available.
 */
const detectTouchFirstInput = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    const navigatorWithTouch = window.navigator as Navigator & { msMaxTouchPoints?: number };
    const hasTouchPoint =
        ('ontouchstart' in window && window.ontouchstart !== undefined) ||
        (navigatorWithTouch.maxTouchPoints ?? 0) > 0 ||
        (navigatorWithTouch.msMaxTouchPoints ?? 0) > 0;
    const prefersTouchMedia =
        typeof window.matchMedia === 'function' && window.matchMedia(TOUCH_INPUT_MEDIA_QUERY).matches;
    return hasTouchPoint || prefersTouchMedia;
};

/**
 * Tracks whether interactions should prioritize tap/click expansion over hover behavior.
 *
 * @returns True for touch-first or coarse-pointer devices.
 */
function useIsTouchInput() {
    const [isTouchInput, setIsTouchInput] = useState<boolean>(() => detectTouchFirstInput());

    useEffect(() => {
        const updateTouchInput = () => {
            setIsTouchInput(detectTouchFirstInput());
        };

        updateTouchInput();

        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQueryList = window.matchMedia(TOUCH_INPUT_MEDIA_QUERY);
        const legacyMediaQueryList = mediaQueryList as MediaQueryList & {
            addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
            removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
        };
        const handleMediaChange = () => updateTouchInput();

        if ('addEventListener' in mediaQueryList) {
            mediaQueryList.addEventListener('change', handleMediaChange);
            return () => void mediaQueryList.removeEventListener('change', handleMediaChange);
        }

        legacyMediaQueryList.addListener?.(handleMediaChange);
        return () => void legacyMediaQueryList.removeListener?.(handleMediaChange);
    }, []);

    return isTouchInput;
}

/**
 * @private Provides a reusable DOM node for rendering header submenus via portals.
 */
function useDropdownPortalContainer() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const element = document.createElement('div');
        element.setAttribute('data-header-dropdown-portal', 'true');
        document.body.appendChild(element);
        setContainer(element);

        return () => {
            document.body.removeChild(element);
        };
    }, []);

    return container;
}

/**
 * Props for a floating submenu portal used by the header dropdowns.
 */
type DropdownSubMenuPortalProps = {
    anchorRect: DOMRect;
    container: HTMLDivElement | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    children: ReactNode;
};

/**
 * @private Renders a floating sub-menu column that is detached from the scrollable dropdown content.
 */
function DropdownSubMenuPortal({
    anchorRect,
    container,
    onMouseEnter,
    onMouseLeave,
    children,
}: DropdownSubMenuPortalProps) {
    const [position, setPosition] = useState(() => ({
        top: anchorRect.top,
        left: anchorRect.right + 8,
    }));

    useLayoutEffect(() => {
        if (!container) {
            return;
        }

        const updatePosition = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const panelWidth = Math.min(320, viewportWidth - 32);
            const gap = 8;

            const canOpenOnRight = anchorRect.right + gap + panelWidth <= viewportWidth - 16;
            const left = canOpenOnRight
                ? anchorRect.right + gap
                : Math.max(16, Math.min(anchorRect.left - gap - panelWidth, viewportWidth - panelWidth - 16));

            const top = Math.min(Math.max(12, anchorRect.top), viewportHeight - 48);
            setPosition({ left, top });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRect.top, anchorRect.left, anchorRect.right, container]);

    if (!container) {
        return null;
    }

    return createPortal(
        <div
            className="fixed z-50"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>,
        container,
    );
}

/**
 * Helper type describing grouped commitments after filtering out unimplemented ones.
 */
type DocumentationCommitmentGroup = ReturnType<typeof getVisibleCommitmentDefinitions>[number];

/**
 * Commitments that stay at the top level of the Documentation dropdown.
 */
const IMPORTANT_COMMITMENT_TYPES = [
    'PERSONA',
    'KNOWLEDGE',
    'GOAL',
    'TEAM',
    'CLOSED',
    'INITIAL MESSAGE',
    'USE SEARCH ENGINE',
] as const;

/**
 * Fast lookups for commits that must stay top-level.
 */
const IMPORTANT_COMMITMENT_TYPE_SET = new Set<string>(IMPORTANT_COMMITMENT_TYPES);

/**
 * Creates a label node that reuses the existing alias styling.
 *
 * @param primary - Primary commitment definition.
 * @param aliases - Additional alias names for the commitment.
 * @returns JSX node with the commitment type and aliases.
 */
function createDocumentationCommitmentLabel(primary: { type: string }, aliases: string[]): ReactNode {
    return (
        <>
            {primary.type}
            {aliases.length > 0 && <span className="text-gray-400 font-normal"> / {aliases.join(' / ')}</span>}
        </>
    );
}

/**
 * Maps a commitment group to a documentation submenu item.
 *
 * @param group - Commitment metadata returned from the registry.
 * @returns Configured submenu item linking to the commitment page.
 */
function createDocumentationCommitmentItem(group: DocumentationCommitmentGroup): SubMenuItem {
    return {
        label: createDocumentationCommitmentLabel(group.primary, group.aliases),
        href: `/docs/${group.primary.type}`,
    };
}

/**
 * Builds the dropdown structure for the Documentation menu, highlighting important
 * commitments and nesting the rest under an “All” submenu.
 *
 * @param groups - Visible commitment definitions.
 * @returns Ordered list of submenu items for the Documentation dropdown.
 */
function buildDocumentationDropdownItems(groups: ReadonlyArray<DocumentationCommitmentGroup>): SubMenuItem[] {
    const commitmentByType = new Map<string, DocumentationCommitmentGroup>();
    groups.forEach((group) => {
        commitmentByType.set(group.primary.type, group);
    });

    const highlightedCommitments = IMPORTANT_COMMITMENT_TYPES.map((type) => commitmentByType.get(type)).filter(
        (group): group is DocumentationCommitmentGroup => Boolean(group),
    );

    const remainingCommitments = groups.filter((group) => !IMPORTANT_COMMITMENT_TYPE_SET.has(group.primary.type));

    const items: SubMenuItem[] = [
        {
            label: 'Overview',
            href: '/docs',
            isBold: true,
            isBordered: true,
        },
        {
            label: 'API Reference',
            href: '/swagger',
            isBold: true,
            isBordered: true,
        },
        ...highlightedCommitments.map(createDocumentationCommitmentItem),
    ];

    if (remainingCommitments.length > 0) {
        items.push({
            label: 'All',
            items: remainingCommitments.map(createDocumentationCommitmentItem),
        });
    }

    return items;
}

/**
 * Agent data required for the folder-organized header menu.
 */
type HeaderAgentMenuAgent = Pick<
    AgentOrganizationAgent,
    'agentName' | 'permanentId' | 'meta' | 'folderId' | 'sortOrder'
>;

/**
 * Folder data required for the folder-organized header menu.
 */
type HeaderAgentMenuFolder = Pick<AgentOrganizationFolder, 'id' | 'name' | 'parentId' | 'sortOrder' | 'icon' | 'color'>;

/**
 * Pixel offset used for each depth level in nested menu labels.
 */
const MENU_DEPTH_PADDING_PX = 14;

/**
 * Avatar size classes applied to agent labels inside the menu.
 *
 * @private
 */
const AGENT_MENU_AVATAR_SIZE_CLASS = 'h-6 w-6';

/**
 * Text styling applied to agent labels inside the menu.
 *
 * @private
 */
const AGENT_MENU_TEXT_CLASS = 'text-sm font-semibold text-gray-900';

/**
 * Maximum width applied to agent label text so it truncates gracefully.
 *
 * @private
 */
const AGENT_MENU_MAX_WIDTH_CLASS = 'max-w-[220px]';

/**
 * Views that can be selected for one active agent in the hierarchy.
 */
type AgentHierarchyView = 'Profile' | 'Chat' | 'Book';

/**
 * Icon displayed next to each hierarchy view label.
 *
 * @private
 */
const AGENT_VIEW_ICON_MAP: Record<AgentHierarchyView, typeof FileTextIcon> = {
    Profile: FileTextIcon,
    Chat: MessageSquareIcon,
    Book: NotebookPenIcon,
};

/**
 * Props for the agent label that includes its avatar.
 *
 * @private
 */
type AgentNameWithAvatarProps = {
    /**
     * Human-readable label for the agent.
     */
    readonly label: string;
    /**
     * Resolved avatar image URL or null when missing.
     */
    readonly avatarUrl: string | null;
    /**
     * Tailwind classes used to size the avatar element.
     */
    readonly avatarSizeClassName?: string;
    /**
     * Tailwind classes that style the text portion of the label.
     */
    readonly textClassName?: string;
    /**
     * Tailwind classes that limit the label width.
     */
    readonly maxWidthClassName?: string;

    /**
     * Optional fallback content when no avatar URL is provided.
     */
    readonly fallbackIcon?: ReactNode;
};

/**
 * Renders an agent label with a rounded avatar circle preceding the text.
 *
 * @private
 */
function AgentNameWithAvatar({
    label,
    avatarUrl,
    avatarSizeClassName,
    textClassName,
    maxWidthClassName,
    fallbackIcon,
}: AgentNameWithAvatarProps) {
    const safeLabel = label || 'Agent';
    const fallbackLetter = safeLabel.split('/').pop()?.trim().charAt(0)?.toUpperCase() || 'A';
    const avatarSize = avatarSizeClassName ?? 'h-5 w-5';
    const textClasses = `truncate ${textClassName ?? 'text-sm font-semibold text-gray-900'} ${
        maxWidthClassName ?? ''
    }`.trim();
    const fallbackContent = fallbackIcon ?? fallbackLetter;

    return (
        <span className="flex min-w-0 items-center gap-2">
            <span
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white text-xs font-semibold uppercase text-gray-500 ${avatarSize}`}
            >
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={`${safeLabel} avatar`}
                        className="h-full w-full object-cover"
                        width={64}
                        height={64}
                        unoptimized
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    fallbackContent
                )}
            </span>
            <span className={textClasses}>{safeLabel}</span>
        </span>
    );
}

/**
 * Builds a labeled view switcher entry that includes an icon.
 *
 * @private
 */
function createAgentViewLabel(view: AgentHierarchyView, formatText: (value: string) => string) {
    const Icon = AGENT_VIEW_ICON_MAP[view];
    return (
        <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-500" aria-hidden />
            <span>{formatText(view)}</span>
        </span>
    );
}

/**
 * Resolved route context used to render hierarchy crumbs.
 */
type ActiveAgentNavigation = {
    agentIdentifier: string | null;
    view: AgentHierarchyView | null;
};

/**
 * Reserved top-level routes that cannot be interpreted as an agent alias.
 */
const RESERVED_PATH_SET = new Set<string>(RESERVED_PATHS);

/**
 * Returns canonical identifier used in routes for one agent.
 *
 * @param agent - Agent used in the menu hierarchy.
 * @returns Permanent id when available, otherwise agent name.
 */
function getAgentNavigationId(agent: HeaderAgentMenuAgent): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Resolves the hierarchy view label from URL segment.
 *
 * @param segment - Route segment after the agent identifier.
 * @returns Human-friendly view label, or null when unsupported.
 */
function resolveAgentHierarchyView(segment: string | undefined): AgentHierarchyView | null {
    if (!segment) {
        return 'Profile';
    }

    if (segment === 'chat') {
        return 'Chat';
    }

    if (segment === 'book') {
        return 'Book';
    }

    return null;
}

/**
 * Parses current pathname and extracts active agent + hierarchy view context.
 *
 * @param pathname - Current browser pathname.
 * @returns Navigation context for hierarchy crumbs.
 */
function resolveActiveAgentNavigation(pathname: string | null): ActiveAgentNavigation {
    if (!pathname) {
        return { agentIdentifier: null, view: null };
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
        return { agentIdentifier: null, view: null };
    }

    if (pathSegments[0] === 'agents') {
        if (!pathSegments[1]) {
            return { agentIdentifier: null, view: null };
        }

        return {
            agentIdentifier: decodeURIComponent(pathSegments[1]),
            view: resolveAgentHierarchyView(pathSegments[2]),
        };
    }

    if (RESERVED_PATH_SET.has(pathSegments[0])) {
        return { agentIdentifier: null, view: null };
    }

    return {
        agentIdentifier: decodeURIComponent(pathSegments[0]),
        view: resolveAgentHierarchyView(pathSegments[1]),
    };
}

/**
 * Builds hierarchy label for the active agent, including folder path when available.
 *
 * @param agent - Active agent metadata.
 * @param folderById - Folder lookup table.
 * @returns Display label for breadcrumb-like hierarchy.
 */
function createAgentHierarchyLabel(
    agent: HeaderAgentMenuAgent,
    folderById: Map<number, HeaderAgentMenuFolder>,
): string {
    const folderSegments = getFolderPathSegments(agent.folderId, folderById).map((folder) => folder.name);
    const agentLabel = getAgentMenuLabel(agent);

    if (folderSegments.length === 0) {
        return agentLabel;
    }

    return `${folderSegments.join(' / ')} / ${agentLabel}`;
}

/**
 * Resolves the display label for an agent in the menu.
 *
 * @param agent - Agent shown in the header menu.
 * @returns Human-friendly agent label.
 */
function getAgentMenuLabel(agent: HeaderAgentMenuAgent): string {
    return agent.meta?.fullname || agent.agentName;
}

/**
 * Sorts folder or agent items by sortOrder and then by a human-friendly label.
 *
 * @param items - Items to sort.
 * @param getLabel - Label getter for stable fallback sorting.
 * @returns Sorted copy of the provided list.
 */
function sortBySortOrderAndLabel<TItem extends { sortOrder: number }>(
    items: ReadonlyArray<TItem>,
    getLabel: (item: TItem) => string,
): TItem[] {
    return [...items].sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
        }
        return getLabel(left).localeCompare(getLabel(right));
    });
}

/**
 * Wraps the provided content with indentation based on the menu depth.
 *
 * @param content - Node rendered inside the label.
 * @param depth - Nesting depth used for indentation.
 * @returns Renderable menu label node.
 * @private
 */
function createIndentedMenuLabel(content: ReactNode, depth: number): ReactNode {
    return (
        <span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * MENU_DEPTH_PADDING_PX}px` }}>
            {content}
        </span>
    );
}

/**
 * Builds a folder label that includes an icon followed by the folder name.
 *
 * @param folder - Folder metadata used to render label and icon styling.
 * @param depth - Nesting depth used for indentation.
 * @returns React node representing the folder label.
 * @private
 */
function createFolderMenuEntryLabel(folder: HeaderAgentMenuFolder, depth: number): ReactNode {
    return createIndentedMenuLabel(
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
            <FolderAppearanceIcon
                icon={folder.icon}
                color={folder.color}
                containerClassName="flex h-5 w-5 items-center justify-center rounded-md border"
                iconClassName="h-3.5 w-3.5"
            />
            <span className="truncate">{folder.name}</span>
        </span>,
        depth,
    );
}

/**
 * Builds an agent label that combines the avatar and agent name.
 *
 * @param label - Human-friendly agent label.
 * @param avatarUrl - Resolved avatar URL or null.
 * @param depth - Nesting depth used for indentation.
 * @returns React node representing the agent label.
 * @private
 */
function createAgentMenuEntryLabel(label: string, avatarUrl: string | null, depth: number): ReactNode {
    return createIndentedMenuLabel(
        <AgentNameWithAvatar
            label={label}
            avatarUrl={avatarUrl}
            avatarSizeClassName={AGENT_MENU_AVATAR_SIZE_CLASS}
            textClassName={AGENT_MENU_TEXT_CLASS}
            maxWidthClassName={AGENT_MENU_MAX_WIDTH_CLASS}
        />,
        depth,
    );
}

/**
 * @private
 * Node representing a folder inside the header menu hierarchy.
 */
type AgentMenuFolderNode = {
    type: 'folder';
    id: number;
    label: string;
    renderLabel?: ReactNode;
    href: string;
    children: AgentMenuTreeNode[];
};

/**
 * @private
 * Node representing an agent inside the header menu hierarchy.
 */
type AgentMenuAgentNode = {
    type: 'agent';
    agentName: string;
    label: string;
    renderLabel?: ReactNode;
    href: string;
};

/**
 * @private
 * Unified node type for the agent menu tree.
 */
type AgentMenuTreeNode = AgentMenuFolderNode | AgentMenuAgentNode;

/**
 * @private
 * Structure describing the agent menu tree and flat submenu items.
 */
type AgentMenuStructure = {
    tree: AgentMenuTreeNode[];
    items: Array<SubMenuItem>;
};

/**
 * @private
 * Indexes used to build the agent menu structure.
 */
type AgentMenuData = {
    folderById: Map<number, HeaderAgentMenuFolder>;
    sortedFolderIdsByParentId: Map<number | null, number[]>;
    agentsByFolderId: Map<number | null, HeaderAgentMenuAgent[]>;
};

/**
 * @private
 * Builds lookup tables that speed up folder and agent ordering.
 */
function prepareAgentMenuData(
    agents: ReadonlyArray<HeaderAgentMenuAgent>,
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
): AgentMenuData {
    const folderById = new Map<number, HeaderAgentMenuFolder>();
    const childFolderIdsByParentId = new Map<number | null, number[]>();
    const agentsByFolderId = new Map<number | null, HeaderAgentMenuAgent[]>();

    for (const folder of folders) {
        folderById.set(folder.id, folder);
    }

    for (const folder of folders) {
        const hasValidParent = folder.parentId !== null && folderById.has(folder.parentId);
        const parentId = hasValidParent ? folder.parentId : null;
        const siblingFolderIds = childFolderIdsByParentId.get(parentId) || [];
        siblingFolderIds.push(folder.id);
        childFolderIdsByParentId.set(parentId, siblingFolderIds);
    }

    for (const agent of agents) {
        const normalizedFolderId = agent.folderId !== null && folderById.has(agent.folderId) ? agent.folderId : null;
        const folderAgents = agentsByFolderId.get(normalizedFolderId) || [];
        folderAgents.push(agent);
        agentsByFolderId.set(normalizedFolderId, folderAgents);
    }

    const sortedFolderIdsByParentId = new Map<number | null, number[]>();
    for (const [parentId, siblingFolderIds] of childFolderIdsByParentId.entries()) {
        const sortedIds = sortBySortOrderAndLabel(
            siblingFolderIds
                .map((folderId) => folderById.get(folderId))
                .filter((folder): folder is HeaderAgentMenuFolder => folder !== undefined),
            (folder) => folder.name,
        ).map((folder) => folder.id);
        sortedFolderIdsByParentId.set(parentId, sortedIds);
    }

    for (const [folderId, folderAgents] of agentsByFolderId.entries()) {
        agentsByFolderId.set(folderId, sortBySortOrderAndLabel(folderAgents, getAgentMenuLabel));
    }

    return { folderById, sortedFolderIdsByParentId, agentsByFolderId };
}

/**
 * @private
 * Builds the hierarchical and flat agent menu data for the header.
 */
function buildAgentMenuStructure(
    agents: ReadonlyArray<HeaderAgentMenuAgent>,
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
): AgentMenuStructure {
    const { folderById, sortedFolderIdsByParentId, agentsByFolderId } = prepareAgentMenuData(agents, folders);

    const agentAvatarByIdentifier = new Map<string, string | null>();
    for (const agent of agents) {
        const identifier = getAgentNavigationId(agent);
        agentAvatarByIdentifier.set(identifier, resolveAgentAvatarImageUrl({ agent }));
    }

    const getAgentAvatarUrl = (agent: HeaderAgentMenuAgent): string | null =>
        agentAvatarByIdentifier.get(getAgentNavigationId(agent)) ?? null;

    const items: Array<SubMenuItem> = [];
    const visitedFolderIds = new Set<number>();

    const appendFolderBranch = (folderId: number, depth: number): void => {
        if (visitedFolderIds.has(folderId)) {
            return;
        }
        visitedFolderIds.add(folderId);

        const folder = folderById.get(folderId);
        if (!folder) {
            return;
        }

        const folderPath = buildFolderPath(getFolderPathSegments(folderId, folderById).map((segment) => segment.name));

        items.push({
            label: createFolderMenuEntryLabel(folder, depth),
            href: `/?folder=${folderPath}`,
            isBold: true,
        });

        const folderAgents = agentsByFolderId.get(folderId) || [];
        for (const agent of folderAgents) {
            items.push({
                label: createAgentMenuEntryLabel(getAgentMenuLabel(agent), getAgentAvatarUrl(agent), depth + 1),
                href: `/agents/${encodeURIComponent(getAgentNavigationId(agent))}`,
            });
        }

        const childFolderIds = sortedFolderIdsByParentId.get(folderId) || [];
        for (const childFolderId of childFolderIds) {
            appendFolderBranch(childFolderId, depth + 1);
        }
    };

    const rootFolderIds = sortedFolderIdsByParentId.get(null) || [];
    for (const rootFolderId of rootFolderIds) {
        appendFolderBranch(rootFolderId, 0);
    }
    for (const folder of sortBySortOrderAndLabel(folders, (currentFolder) => currentFolder.name)) {
        if (!visitedFolderIds.has(folder.id)) {
            appendFolderBranch(folder.id, 0);
        }
    }

    const rootAgents = agentsByFolderId.get(null) || [];
    for (const agent of rootAgents) {
        items.push({
            label: createAgentMenuEntryLabel(getAgentMenuLabel(agent), getAgentAvatarUrl(agent), 0),
            href: `/agents/${encodeURIComponent(getAgentNavigationId(agent))}`,
        });
    }

    const treeVisitedFolderIds = new Set<number>();
    const createAgentNode = (agent: HeaderAgentMenuAgent): AgentMenuAgentNode => {
        const label = getAgentMenuLabel(agent);
        return {
            type: 'agent',
            agentName: agent.agentName,
            label,
            renderLabel: createAgentMenuEntryLabel(label, getAgentAvatarUrl(agent), 0),
            href: `/agents/${encodeURIComponent(getAgentNavigationId(agent))}`,
        };
    };

    const createFolderNode = (folderId: number): AgentMenuFolderNode | null => {
        if (treeVisitedFolderIds.has(folderId)) {
            return null;
        }

        const folder = folderById.get(folderId);
        if (!folder) {
            return null;
        }

        treeVisitedFolderIds.add(folderId);
        const folderPath = buildFolderPath(getFolderPathSegments(folderId, folderById).map((segment) => segment.name));

        const childNodes: AgentMenuTreeNode[] = [];
        const childFolderIds = sortedFolderIdsByParentId.get(folderId) || [];
        for (const childFolderId of childFolderIds) {
            const childNode = createFolderNode(childFolderId);
            if (childNode) {
                childNodes.push(childNode);
            }
        }

        const folderAgents = agentsByFolderId.get(folderId) || [];
        childNodes.push(...folderAgents.map(createAgentNode));

        return {
            type: 'folder',
            id: folder.id,
            label: folder.name,
            renderLabel: createFolderMenuEntryLabel(folder, 0),
            href: `/?folder=${folderPath}`,
            children: childNodes,
        };
    };

    const treeRoots: AgentMenuTreeNode[] = [];
    for (const rootFolderId of rootFolderIds) {
        const node = createFolderNode(rootFolderId);
        if (node) {
            treeRoots.push(node);
        }
    }
    for (const folder of sortBySortOrderAndLabel(folders, (currentFolder) => currentFolder.name)) {
        if (!treeVisitedFolderIds.has(folder.id)) {
            const node = createFolderNode(folder.id);
            if (node) {
                treeRoots.push(node);
            }
        }
    }

    treeRoots.push(...rootAgents.map(createAgentNode));

    return {
        tree: treeRoots,
        items,
    };
}

/**
 * @private
 * Props for the agent directory dropdown renderer.
 */
type AgentDirectoryDropdownProps = {
    nodes: ReadonlyArray<AgentMenuTreeNode>;
    onNavigate: () => void;
    isTouchInput: boolean;
};

/**
 * @private
 * Renders the nested agents menu with hover columns on pointer devices and
 * tap-expand behavior on touch-first devices.
 */
function AgentDirectoryDropdown({ nodes, onNavigate, isTouchInput }: AgentDirectoryDropdownProps) {
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setExpandedFolders({});
    }, [nodes, isTouchInput]);

    /**
     * Toggles one folder subtree visibility in touch-first mode.
     */
    const toggleFolder = (folderKey: string) => {
        setExpandedFolders((previous) => ({
            ...previous,
            [folderKey]: !previous[folderKey],
        }));
    };

    return (
        <div className="pointer-events-auto">
            <AgentMenuColumn
                nodes={nodes}
                onNavigate={onNavigate}
                depth={0}
                isTouchInput={isTouchInput}
                keyPrefix="root"
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
            />
        </div>
    );
}

/**
 * @private
 * Props for a single column in the agent menu tree.
 */
type AgentMenuColumnProps = AgentDirectoryDropdownProps & {
    depth: number;
    keyPrefix: string;
    expandedFolders: Record<string, boolean>;
    toggleFolder: (folderKey: string) => void;
};

/**
 * @private
 * Renders one column of the agent tree, showing folders and agents.
 */
function AgentMenuColumn({
    nodes,
    onNavigate,
    depth,
    isTouchInput,
    keyPrefix,
    expandedFolders,
    toggleFolder,
}: AgentMenuColumnProps) {
    return (
        <div
            className={`relative flex flex-col gap-1 px-1 py-1 ${isTouchInput && depth > 0 ? 'bg-transparent' : 'bg-white'}`}
            style={{ minWidth: isTouchInput ? undefined : depth === 0 ? 260 : 240 }}
        >
            {nodes.map((node) => {
                if (node.type === 'folder') {
                    const folderKey = `${keyPrefix}-folder-${node.id}`;
                    const hasChildren = node.children.length > 0;
                    const isExpanded = Boolean(expandedFolders[folderKey]);

                    return (
                        <div key={`folder-${node.id}`} className={`relative ${isTouchInput ? '' : 'group'}`}>
                            <HeadlessLink
                                href={node.href}
                                onClick={(event) => {
                                    if (isTouchInput && hasChildren && !isExpanded) {
                                        event.preventDefault();
                                        toggleFolder(folderKey);
                                        return;
                                    }
                                    onNavigate();
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors ${
                                    isTouchInput
                                        ? 'text-gray-800 hover:bg-white active:bg-gray-100'
                                        : 'text-gray-800 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                                title={node.label}
                            >
                                <span className="min-w-0">
                                    {node.renderLabel ?? <span className="truncate">{node.label}</span>}
                                </span>
                                {hasChildren && (
                                    <ChevronRight
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${
                                            isTouchInput && isExpanded ? 'rotate-90' : ''
                                        }`}
                                    />
                                )}
                            </HeadlessLink>

                            {hasChildren &&
                                (isTouchInput ? (
                                    <div
                                        className={`ml-3 border-l border-gray-200 pl-2 ${
                                            isExpanded ? 'mt-1 block' : 'hidden'
                                        }`}
                                    >
                                        <AgentMenuColumn
                                            nodes={node.children}
                                            onNavigate={onNavigate}
                                            depth={depth + 1}
                                            isTouchInput={isTouchInput}
                                            keyPrefix={folderKey}
                                            expandedFolders={expandedFolders}
                                            toggleFolder={toggleFolder}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="absolute left-full top-0 z-50 mt-0 hidden w-[260px] rounded-xl border border-gray-100 bg-white shadow-xl shadow-slate-900/10 group-hover:block"
                                    >
                                        <AgentMenuColumn
                                            nodes={node.children}
                                            onNavigate={onNavigate}
                                            depth={depth + 1}
                                            isTouchInput={isTouchInput}
                                            keyPrefix={folderKey}
                                            expandedFolders={expandedFolders}
                                            toggleFolder={toggleFolder}
                                        />
                                    </div>
                                ))}
                        </div>
                    );
                }

                return (
                    <HeadlessLink
                        key={`agent-${node.agentName}`}
                        href={node.href}
                        onClick={onNavigate}
                        className={`flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors ${
                            isTouchInput
                                ? 'text-gray-700 hover:bg-white active:bg-gray-100'
                                : 'text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title={node.label}
                    >
                        <span className="min-w-0">
                            {node.renderLabel ?? <span className="truncate">{node.label}</span>}
                        </span>
                    </HeadlessLink>
                );
            })}
        </div>
    );
}

/**
 * @private
 * Converts agent tree nodes into nested submenu items used by mobile rendering.
 */
function createAgentHierarchyMobileItems(nodes: ReadonlyArray<AgentMenuTreeNode>): SubMenuItem[] {
    return nodes.map((node) => {
        if (node.type === 'folder') {
            const childItems = createAgentHierarchyMobileItems(node.children);
            return {
                label: node.renderLabel ?? node.label,
                href: node.href,
                isBold: true,
                items: childItems.length > 0 ? childItems : undefined,
            };
        }

        return {
            label: node.renderLabel ?? node.label,
            href: node.href,
        };
    });
}

export function Header(props: HeaderProps) {
    const {
        isAdmin = false,
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
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const dropdownPortalContainer = useDropdownPortalContainer();
    const [openSubMenu, setOpenSubMenu] = useState<OpenSubMenuState | null>(null);
    const subMenuCloseTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const menuCloseTimers = useRef<Record<string, ReturnType<typeof window.setTimeout> | null>>({});
    const router = useRouter();
    const pathname = usePathname();
    const isHeadless = useIsHeadless();
    const isTouchInput = useIsTouchInput();
    const menuHoisting = useMenuHoisting();
    const { formatText } = useAgentNaming();
    const [desktopExpandedSubMenus, setDesktopExpandedSubMenus] = useState<Record<string, boolean>>({});

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
        cancelMenuClose(menuId);
        menuCloseTimers.current[menuId] = setTimeout(() => {
            close();
            menuCloseTimers.current[menuId] = null;
        }, HEADER_DROPDOWN_CLOSE_DELAY_MS);
    };

    const visibleDocumentationCommitments = useMemo(() => getVisibleCommitmentDefinitions(), []);
    const documentationDropdownItems = useMemo(
        () => buildDocumentationDropdownItems(visibleDocumentationCommitments),
        [visibleDocumentationCommitments],
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
                    {item.label}
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
                    {item.label}
                </HeadlessLink>
            );
        }

        return (
            <span key={itemKey} className={className} style={createMobileMenuItemPaddingStyle(depth)}>
                {item.label}
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
                                <span className="min-w-0 flex-1">{item.label}</span>
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

    const { users: adminUsers } = useUsersAdmin();
    const agentMenuStructure = useMemo(() => buildAgentMenuStructure(agents, agentFolders), [agents, agentFolders]);
    const agentMenuTree = agentMenuStructure.tree;
    const agentFolderById = useMemo(
        () => new Map(agentFolders.map((folder) => [folder.id, folder as HeaderAgentMenuFolder])),
        [agentFolders],
    );
    const agentByIdentifier = useMemo(() => {
        const map = new Map<string, HeaderAgentMenuAgent>();
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
        : activeAgentIdentifier || formatText('Agents');
    const activeAgentView = activeAgentNavigation.view;
    const activeAgentAvatarUrl = useMemo(() => {
        if (!activeAgent) {
            return null;
        }

        return resolveAgentAvatarImageUrl({ agent: activeAgent });
    }, [activeAgent]);
    const currentUserDisplayName = currentUser?.username || 'Admin';
    const currentUserAvatarLabel = currentUserDisplayName.slice(0, 1).toUpperCase();
    const currentUserProfileImageUrl = currentUser?.profileImageUrl?.trim() || null;
    const activeAgentViewItems: SubMenuItem[] = activeAgentNavigationId
        ? [
              {
                  label: createAgentViewLabel('Profile', formatText),
                  href: `/agents/${encodeURIComponent(activeAgentNavigationId)}`,
              },
              {
                  label: createAgentViewLabel('Chat', formatText),
                  href: `/agents/${encodeURIComponent(activeAgentNavigationId)}/chat`,
              },
              ...(isAdmin
                  ? [
                        {
                            label: createAgentViewLabel('Book', formatText),
                            href: `/agents/${encodeURIComponent(activeAgentNavigationId)}/book`,
                        } as SubMenuItem,
                    ]
                  : []),
          ]
        : [];
    const closeAgentsDropdown = () => {
        setIsAgentsOpen(false);
        setIsMenuOpen(false);
    };
    const closeAgentViewDropdown = () => {
        setIsAgentViewOpen(false);
        setIsMenuOpen(false);
    };

    const handleLogout = async () => {
        await logoutAction();
    };

    const handleCreateAgent = async () => {
        setIsCreatingAgent(true);
        try {
            const agentName = await $createAgentAction();

            if (agentName) {
                pushWithHeadless(router, `/agents/${agentName}`, isHeadless);
            } else {
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to create agent:', error);
            await showAlert({
                title: formatText('Create failed'),
                message:
                    error instanceof Error ? error.message : formatText('Failed to create agent. Please try again.'),
            }).catch(() => undefined);
        } finally {
            setIsCreatingAgent(false);
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        }
    };
    /**
     * Static entries appended below the dynamic hierarchy in the Agents menu.
     */
    const hierarchyAgentActionItems: SubMenuItem[] = [
        {
            label: formatText('View all agents'),
            href: '/agents',
            isBold: true,
            isBordered: true,
        },
        {
            label: isCreatingAgent ? (
                <div className="flex items-center">
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    {formatText('Creating agent...')}
                </div>
            ) : (
                formatText('Create new agent')
            ),
            onClick: isCreatingAgent ? undefined : handleCreateAgent,
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
                          <span className="ml-1 text-xs text-blue-600">(current)</span>
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

    const userSystemItems: SubMenuItem[] = [
        ...(currentUser
            ? [
                  {
                      label: 'Profile',
                      href: '/system/profile',
                  } as SubMenuItem,
                  {
                      label: 'User Memory',
                      href: '/system/user-memory',
                  } as SubMenuItem,
              ]
            : []),
        {
            label: 'Landing page',
            href: 'https://ptbk.io/',
        },
    ];

    /**
     * @private Shared dropdown props that keep every System menu item wired to the same open/close state.
     */
    const systemDropdownBase: Omit<Extract<MenuItem, { type: 'dropdown' }>, 'items'> = {
        type: 'dropdown' as const,
        id: 'system',
        label: 'System',
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
     * @private System menu entries exposed to admins.
     */
    const adminUsersSystemItems: SubMenuItem[] = [
        ...adminUsers.map(
            (user) =>
                ({
                    label: user.username,
                    href: `/admin/users/${encodeURIComponent(user.username)}`,
                } as SubMenuItem),
        ),
        {
            label: 'View all users',
            href: '/admin/users',
            isBold: true,
            isBordered: true,
        } as SubMenuItem,
        {
            label: 'Create new user',
            href: '/admin/users#create-user',
            isBold: true,
        } as SubMenuItem,
    ];

    /**
     * @private System menu entries exposed to admins.
     */
    const adminSystemMenuItems: SubMenuItem[] = [
        ...userSystemItems,
        /*
        Note: [🙍] `/dashboard` page is disabled

        {
            label: 'Dashboard',
            href: '/dashboard',
            isBold: true,
            isBordered: true,
        } as SubMenuItem,
        */
        {
            label: 'Models',
            href: '/admin/models',
        },
        {
            label: 'OpenAPI Documentation',
            href: '/swagger',
        },
        {
            label: 'API Tokens',
            href: '/admin/api-tokens',
        },
        {
            label: 'Metadata',
            href: '/admin/metadata',
        },
        {
            label: 'Chat history',
            href: '/admin/chat-history',
        },
        {
            label: 'Usage analytics',
            href: '/admin/usage',
        },
        {
            label: 'Messages & Emails',
            href: '/admin/messages',
        },
        ...(isFeedbackEnabled
            ? [
                  {
                      label: 'Chat feedback',
                      href: '/admin/chat-feedback',
                  },
              ]
            : []),
        {
            label: 'Browser',
            href: '/admin/browser-test',
        },
        {
            label: 'Voice Input Test',
            href: '/admin/voice-input-test',
        },
        // Note: Commented out because image generator can became a paid feature later for the clients
        // {
        //     label: 'Image Generator Test',
        //     href: '/admin/image-generator-test',
        // },
        {
            label: 'Search Engine Test',
            href: '/admin/search-engine-test',
        },
        {
            label: 'Images gallery',
            href: '/admin/images',
        },
        {
            label: 'Files',
            href: '/admin/files',
        },
        {
            label: 'Users',
            items: adminUsersSystemItems,
            isBordered: true,
        },
        {
            label: 'Version info',
            href: '/admin/about',
        },
        ...(isExperimental
            ? [
                  {
                      label: 'Experiments',
                      items: [
                          {
                              label: 'Story',
                              href: '/experiments/story',
                              isBold: true,
                          },
                      ],
                      isBordered: true,
                  } as SubMenuItem,
              ]
            : []),
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
                      label: 'Documentation',
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

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16">
            {isChangePasswordOpen && <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} />}
            <div className="relative w-full px-4 h-full">
                <div className="flex items-center justify-between h-full gap-2 sm:gap-4 lg:gap-6">
                    <div className="flex-shrink min-w-0 flex-1 lg:flex-initial">
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
                                            scheduleMenuClose('federated-server-switcher', () => setIsFederatedOpen(false))
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
                                                scheduleMenuClose('federated-server-switcher', () => setIsFederatedOpen(false))
                                            }
                                            title="Switch server"
                                            aria-label="Switch server"
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

                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />

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
                                        onBlur={() => scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))}
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
                                                    {formatText('View all agents')}
                                                </HeadlessLink>
                                                <button
                                                    onClick={isCreatingAgent ? undefined : handleCreateAgent}
                                                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                                                >
                                                    {isCreatingAgent ? (
                                                        <span className="inline-flex items-center">
                                                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                                            {formatText('Creating agent...')}
                                                        </span>
                                                    ) : (
                                                        formatText('Create new agent')
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
                                    <ChevronRight className="hidden sm:block h-4 w-4 text-gray-300" />
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
                                            onBlur={() => scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))}
                                        >
                                            {createAgentViewLabel(activeAgentView, formatText)}
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
                                                {activeAgentViewItems.map((viewItem, index) => (
                                                    <HeadlessLink
                                                        key={`view-${index}`}
                                                        href={viewItem.href!}
                                                        className="mx-1 block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={closeAgentViewDropdown}
                                                    >
                                                        {viewItem.label}
                                                    </HeadlessLink>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                        </div>
                    </div>

                    <div className="hidden lg:flex pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2 items-center">
                        <div className="pointer-events-auto flex items-center gap-5">
                            <div className="flex-1 min-w-[220px] max-w-[360px]">
                                <HeaderSearchBox className="w-full" />
                            </div>
                            <nav className="pointer-events-auto flex items-center gap-6">
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
                                                    {linkItem.label}
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
                                                    {linkItem.label}
                                                </HeadlessLink>
                                            );
                                        }

                                        return (
                                            <span key={keySuffix} className={className}>
                                                {linkItem.label}
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
                                            className={`grid auto-rows-min gap-1 ${depth > 0 ? 'mt-1 border-l border-gray-200 pl-2' : ''}`}
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
                                                    nestedItem.isBold ? 'font-medium text-gray-900' : 'text-gray-700'
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
                                                            <span>{nestedItem.label}</span>
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
                                            const borderClass = subItem.isBordered ? 'border-b border-gray-100' : '';
                                            const baseClassName = `mx-1 block rounded-lg px-3 py-2.5 text-sm ${
                                                subItem.isBold ? 'font-medium text-gray-900' : 'text-gray-600'
                                            } hover:bg-gray-50 hover:text-gray-900 transition-colors ${borderClass}`;

                                            if (subItem.items && subItem.items.length > 0) {
                                                const submenuKey = `${item.id}-dropdown-${subIndex}`;
                                                const isSubMenuOpen = !isTouchInput && openSubMenu?.key === submenuKey;
                                                const isTapSubMenuOpen = Boolean(desktopExpandedSubMenus[submenuKey]);
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
                                                                        : { key: submenuKey, rect, items: childItems },
                                                                );
                                                            }}
                                                        >
                                                            <span>{subItem.label}</span>
                                                            <ChevronRight
                                                                className={`h-3 w-3 text-gray-400 transition-transform ${
                                                                    isTouchInput && isTapSubMenuOpen ? 'rotate-90' : ''
                                                                }`}
                                                            />
                                                        </button>

                                                        {isTouchInput && isTapSubMenuOpen && (
                                                            <div className="mx-1 mb-2 rounded-xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/80 p-2">
                                                                {renderTouchNestedDropdownItems(childItems, submenuKey)}
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
                                                                    scheduleMenuClose(item.id, () => item.setIsOpen(false));
                                                                }}
                                                            >
                                                                <div className="pointer-events-auto max-h-[70vh] w-[min(320px,calc(100vw-4rem))] overflow-y-auto rounded-xl border border-gray-100 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur">
                                                                    <div className="grid auto-rows-min gap-1 sm:grid-cols-2">
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

                                            return renderDropdownLink(subItem, `dropdown-${subIndex}`, baseClassName);
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
                                            onMouseLeave={() => scheduleMenuClose(item.id, () => item.setIsOpen(false))}
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
                                                onBlur={() => scheduleMenuClose(item.id, () => item.setIsOpen(false))}
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
                    </div>
                </div>

                    {/* CTA Button & Mobile Menu Toggle */}
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
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
                                Log in
                                <LogIn className="ml-2 w-4 h-4" />
                            </button>
                        )}

                        {(currentUser || isAdmin) && (
                            <div className="hidden lg:flex items-center gap-3">
                                <div
                                    className="relative"
                                    onMouseEnter={() => cancelMenuClose('profile-menu')}
                                    onMouseLeave={() => scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))}
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
                                                <span className="text-xs text-blue-600">Admin</span>
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
                                                    <p className="text-xs text-blue-600 mt-1">Administrator</p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => setIsChangePasswordOpen(true)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                            >
                                                <Lock className="w-4 h-4" />
                                                Change Password
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Log out
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
                                    <span>Menu</span>
                                    {federatedServers.length > 0 && (
                                        <button
                                            className="inline-flex p-1 text-gray-500 hover:text-gray-800"
                                            onClick={() => setIsFederatedOpen(!isFederatedOpen)}
                                            aria-label="Switch server"
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
                                        <ChevronRight className="h-4 w-4 text-gray-300" />
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
                                                <ChevronRight className="h-4 w-4 text-gray-300" />
                                                <button
                                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition"
                                                    onClick={() => setIsMobileAgentViewOpen(!isMobileAgentViewOpen)}
                                                >
                                                    {createAgentViewLabel(activeAgentView, formatText)}
                                                    <ChevronDown
                                                        className={`h-4 w-4 transition-transform duration-200 ${
                                                            isMobileAgentViewOpen ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            {isMobileAgentViewOpen && (
                                                <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                                    {activeAgentViewItems.map((viewItem, index) => (
                                                        <HeadlessLink
                                                            key={`mobile-view-item-${index}`}
                                                            href={viewItem.href || '/agents'}
                                                            className="block rounded-md px-4 py-3 text-sm text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm active:scale-98 transition-all duration-150"
                                                            onClick={() => setIsMenuOpen(false)}
                                                        >
                                                            {viewItem.label}
                                                        </HeadlessLink>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="w-full max-w-[90vw] pt-1">
                                        <HeaderSearchBox
                                            placeholder="Search this server..."
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
                                        Log in
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
                                                Logged in as <strong>{currentUserDisplayName}</strong>
                                                {(currentUser?.isAdmin || isAdmin) && (
                                                    <span className="ml-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                                                        Admin
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
                                            Change Password
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-lg shadow-sm hover:shadow active:scale-98 transition-all duration-150"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Log out
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
        </header>
    );
}
