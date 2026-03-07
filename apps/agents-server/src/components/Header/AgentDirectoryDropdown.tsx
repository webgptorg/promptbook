'use client';

import {
    ChevronRight,
    FileTextIcon,
    MessageSquareIcon,
    MoreHorizontalIcon,
    NotebookPenIcon,
} from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { RESERVED_PATHS } from '../../generated/reservedPaths';
import { buildFolderPath, getFolderPathSegments } from '../../utils/agentOrganization/folderPath';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import type { ContextMenuItem } from '../ContextMenu/ContextMenuPanel';
import { FolderAppearanceIcon } from '../FolderAppearance/FolderAppearanceIcon';
import { HeadlessLink } from '../_utils/headlessParam';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Agent payload shape required by the header hierarchy menu.
 *
 * @private internal type of <Header/>
 */
export type HeaderAgentMenuAgent = AgentOrganizationAgent;

/**
 * Folder data required for the folder-organized header menu.
 *
 * @private internal type of <Header/>
 */
export type HeaderAgentMenuFolder = Pick<
    AgentOrganizationFolder,
    'id' | 'name' | 'parentId' | 'sortOrder' | 'icon' | 'color'
>;

/**
 * Pixel offset used for each depth level in nested menu labels.
 */
const MENU_DEPTH_PADDING_PX = 14;

/**
 * Avatar size classes applied to agent labels inside the menu.
 *
 * @private function of <Header/>
 */
const AGENT_MENU_AVATAR_SIZE_CLASS = 'h-6 w-6';

/**
 * Text styling applied to agent labels inside the menu.
 *
 * @private function of <Header/>
 */
const AGENT_MENU_TEXT_CLASS = 'text-sm font-semibold text-gray-900';

/**
 * Maximum width applied to agent label text so it truncates gracefully.
 *
 * @private function of <Header/>
 */
const AGENT_MENU_MAX_WIDTH_CLASS = 'max-w-[220px]';

/**
 * Views that can be selected for one active agent in the hierarchy.
 */
export type AgentHierarchyView = 'Profile' | 'Chat' | 'Book' | 'More';

/**
 * Icon displayed next to each hierarchy view label.
 *
 * @private function of <Header/>
 */
const AGENT_VIEW_ICON_MAP: Record<AgentHierarchyView, typeof FileTextIcon> = {
    Profile: FileTextIcon,
    Chat: MessageSquareIcon,
    Book: NotebookPenIcon,
    More: MoreHorizontalIcon,
};

/**
 * Props for the agent label that includes its avatar.
 *
 * @private function of <Header/>
 */
export type AgentNameWithAvatarProps = {
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
 * @private function of <Header/>
 */
export function AgentNameWithAvatar({
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
 * @private function of <Header/>
 */
export function createAgentViewLabel(view: AgentHierarchyView, translate: (key: ServerTranslationKey) => string) {
    const Icon = AGENT_VIEW_ICON_MAP[view];
    const translationKeyByView: Record<AgentHierarchyView, ServerTranslationKey> = {
        Profile: 'common.profile',
        Chat: 'common.chat',
        Book: 'common.book',
        More: 'common.more',
    };
    return (
        <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-500" aria-hidden />
            <span>{translate(translationKeyByView[view])}</span>
        </span>
    );
}

/**
 * Converts context menu items into submenu entries for the agent view dropdown.
 *
 * @param menuItems - Context menu entries to map.
 * @returns View submenu items with divider boundaries preserved as borders.
 *
 * @private function of <Header/>
 */
export function mapContextMenuItemsToSubMenuItems(menuItems: ReadonlyArray<ContextMenuItem>): SubMenuItem[] {
    const items: SubMenuItem[] = [];
    let lastItemIndex = -1;

    menuItems.forEach((item) => {
        if (item.type === 'divider') {
            if (lastItemIndex >= 0) {
                items[lastItemIndex] = { ...items[lastItemIndex], isBordered: true };
            }
            return;
        }

        const mappedItem: SubMenuItem =
            item.type === 'link'
                ? {
                      label: item.label,
                      href: item.href,
                  }
                : {
                      label: item.label,
                      onClick: item.onClick,
                  };

        items.push(mappedItem);
        lastItemIndex = items.length - 1;
    });

    return items;
}

/**
 * Builds a minimal agent payload for menu rendering fallback scenarios.
 *
 * @param agentIdentifier - Active agent identifier when available.
 * @returns Placeholder agent data to satisfy menu helpers.
 *
 * @private function of <Header/>
 */
export function createFallbackAgent(agentIdentifier: string | null): AgentOrganizationAgent {
    return {
        agentName: agentIdentifier || 'Agent',
        agentHash: '',
        personaDescription: null,
        initialMessage: null,
        meta: {},
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        visibility: 'UNLISTED',
        folderId: null,
        sortOrder: 0,
    };
}

/**
 * Resolved route context used to render hierarchy crumbs.
 */
export type ActiveAgentNavigation = {
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
 *
 * @private function of <Header/>
 */
export function getAgentNavigationId(agent: HeaderAgentMenuAgent): string {
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

    return 'More';
}

/**
 * Parses current pathname and extracts active agent + hierarchy view context.
 *
 * @param pathname - Current browser pathname.
 * @returns Navigation context for hierarchy crumbs.
 *
 * @private function of <Header/>
 */
export function resolveActiveAgentNavigation(pathname: string | null): ActiveAgentNavigation {
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
 *
 * @private function of <Header/>
 */
export function createAgentHierarchyLabel(
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
 * @private function of <Header/>
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
export type AgentMenuFolderNode = {
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
export type AgentMenuAgentNode = {
    type: 'agent';
    agentName: string;
    label: string;
    renderLabel?: ReactNode;
    href: string;
};

/**
 * @private
 * Node representing a folder-level action entry inside the header menu hierarchy.
 */
export type AgentMenuActionNode = {
    type: 'action';
    id: string;
    label: string;
    renderLabel?: ReactNode;
    href?: string;
    onClick?: () => void | Promise<void>;
    isBold?: boolean;
    isBordered?: boolean;
};

/**
 * @private
 * Unified node type for the agent menu tree.
 */
export type AgentMenuTreeNode = AgentMenuFolderNode | AgentMenuAgentNode | AgentMenuActionNode;

/**
 * @private
 * Structure describing the agent menu tree and flat submenu items.
 */
export type AgentMenuStructure = {
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
 * @private function of <Header/>
 * Builds the hierarchical and flat agent menu data for the header.
 */
export function buildAgentMenuStructure(
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
 * Configuration for injecting reusable folder action nodes into each folder branch.
 */
export type FolderActionNodeConfig = {
    /**
     * Label displayed for the "view all agents in this folder" action.
     */
    readonly viewAllLabel: string;
    /**
     * Text fallback displayed for the "create new agent" action.
     */
    readonly createLabel: string;
    /**
     * Optional richer node displayed for the create action.
     */
    readonly renderCreateLabel?: ReactNode;
    /**
     * Optional callback that opens the create flow scoped to a folder.
     */
    readonly onCreateInFolder?: (folderId: number) => void;
};

/**
 * Appends "View all agents" and optional "Create new agent" actions to each folder branch.
 *
 * @param nodes - Existing folder/agent hierarchy.
 * @param config - Labels and callbacks used for action injection.
 * @returns New hierarchy with per-folder action nodes.
 *
 * @private function of <Header/>
 */
export function appendFolderActionNodes(
    nodes: ReadonlyArray<AgentMenuTreeNode>,
    config: FolderActionNodeConfig,
): AgentMenuTreeNode[] {
    return nodes.map((node) => {
        if (node.type !== 'folder') {
            return node;
        }

        const nestedChildren = appendFolderActionNodes(node.children, config);
        const actionNodes: AgentMenuActionNode[] = [
            {
                type: 'action',
                id: `folder-${node.id}-view-all`,
                label: config.viewAllLabel,
                href: node.href,
                isBold: true,
                isBordered: nestedChildren.length > 0,
            },
        ];

        if (config.onCreateInFolder) {
            actionNodes.push({
                type: 'action',
                id: `folder-${node.id}-create`,
                label: config.createLabel,
                renderLabel: config.renderCreateLabel,
                onClick: () => config.onCreateInFolder?.(node.id),
                isBold: true,
            });
        }

        return {
            ...node,
            children: [...nestedChildren, ...actionNodes],
        };
    });
}

/**
 * @private function of <Header/>
 * Props for the agent directory dropdown renderer.
 */
export type AgentDirectoryDropdownProps = {
    nodes: ReadonlyArray<AgentMenuTreeNode>;
    onNavigate: () => void;
    isTouchInput: boolean;
};

/**
 * @private function of <Header/>
 * Renders the nested agents menu with hover columns on pointer devices and
 * tap-expand behavior on touch-first devices.
 */
export function AgentDirectoryDropdown({ nodes, onNavigate, isTouchInput }: AgentDirectoryDropdownProps) {
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
            className={`relative flex flex-col gap-1 px-1 py-1 ${
                isTouchInput && depth > 0 ? 'bg-transparent' : 'bg-white'
            }`}
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
                                    <div className="absolute left-full top-0 z-50 mt-0 hidden w-[260px] rounded-xl border border-gray-100 bg-white shadow-xl shadow-slate-900/10 group-hover:block">
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

                if (node.type === 'action') {
                    const baseClassName = `flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        node.isBold ? 'font-semibold text-gray-900' : 'text-gray-700'
                    } ${
                        isTouchInput
                            ? 'hover:bg-white active:bg-gray-100'
                            : 'hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                    }`.trim();

                    if (node.onClick) {
                        return (
                            <button
                                key={`action-${node.id}`}
                                type="button"
                                onClick={() => {
                                    void node.onClick?.();
                                    onNavigate();
                                }}
                                className={`${baseClassName} w-full text-left ${node.isBordered ? 'mt-1 border-t border-gray-100 pt-3' : ''}`}
                                title={node.label}
                            >
                                <span className="min-w-0">{node.renderLabel ?? <span className="truncate">{node.label}</span>}</span>
                            </button>
                        );
                    }

                    if (node.href) {
                        return (
                            <HeadlessLink
                                key={`action-${node.id}`}
                                href={node.href}
                                onClick={onNavigate}
                                className={`${baseClassName} ${node.isBordered ? 'mt-1 border-t border-gray-100 pt-3' : ''}`}
                                title={node.label}
                            >
                                <span className="min-w-0">{node.renderLabel ?? <span className="truncate">{node.label}</span>}</span>
                            </HeadlessLink>
                        );
                    }

                    return (
                        <span
                            key={`action-${node.id}`}
                            className={`${baseClassName} ${node.isBordered ? 'mt-1 border-t border-gray-100 pt-3' : ''}`}
                            title={node.label}
                        >
                            <span className="min-w-0">{node.renderLabel ?? <span className="truncate">{node.label}</span>}</span>
                        </span>
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
 * @private function of <Header/>
 * Converts agent tree nodes into nested submenu items used by mobile rendering.
 */
export function createAgentHierarchyMobileItems(nodes: ReadonlyArray<AgentMenuTreeNode>): SubMenuItem[] {
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

        if (node.type === 'action') {
            return {
                label: node.renderLabel ?? node.label,
                href: node.href,
                onClick: node.onClick,
                isBold: node.isBold,
                isBordered: node.isBordered,
            };
        }

        return {
            label: node.renderLabel ?? node.label,
            href: node.href,
        };
    });
}

