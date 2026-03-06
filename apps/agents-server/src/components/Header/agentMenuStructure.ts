import { FileTextIcon, MessageSquareIcon, MoreHorizontalIcon, NotebookPenIcon } from 'lucide-react';
import { createElement, type ReactNode } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { RESERVED_PATHS } from '../../generated/reservedPaths';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { buildFolderPath, getFolderPathSegments } from '../../utils/agentOrganization/folderPath';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { FolderAppearanceIcon } from '../FolderAppearance/FolderAppearanceIcon';
import { AgentNameWithAvatar } from './AgentNameWithAvatar';
import type { SubMenuItem } from './HeaderMenuTypes';

/**
 * @private Defines the available views inside the agent hierarchy.
 */
export type AgentHierarchyView = 'Profile' | 'Chat' | 'Book' | 'More';

/**
 * @private Maps the hierarchy view to its icon component.
 */
const AGENT_VIEW_ICON_MAP: Record<AgentHierarchyView, typeof FileTextIcon> = {
    Profile: FileTextIcon,
    Chat: MessageSquareIcon,
    Book: NotebookPenIcon,
    More: MoreHorizontalIcon,
};

/**
 * @private Identifies routes that should never be interpreted as agent identifiers.
 */
const RESERVED_PATH_SET = new Set<string>(RESERVED_PATHS);

/**
 * @private Horizontal padding applied to nested menu labels.
 */
const MENU_DEPTH_PADDING_PX = 14;

/**
 * @private Default avatar size class used in menu rows.
 */
const AGENT_MENU_AVATAR_SIZE_CLASS = 'h-6 w-6';

/**
 * @private Default text styling for agent rows.
 */
const AGENT_MENU_TEXT_CLASS = 'text-sm font-semibold text-gray-900';

/**
 * @private Maximum width applied to agent labels to keep truncation consistent.
 */
const AGENT_MENU_MAX_WIDTH_CLASS = 'max-w-[220px]';

/**
 * @private Computes a navigation-friendly label for folder and agent entries.
 */
function createIndentedMenuLabel(content: ReactNode, depth: number): ReactNode {
    return createElement(
        'span',
        {
            className: 'flex min-w-0 items-center gap-2',
            style: { paddingLeft: `${depth * MENU_DEPTH_PADDING_PX}px` },
        },
        content,
    );
}

/**
 * @private function of Header
 */
function createFolderMenuEntryLabel(folder: HeaderAgentMenuFolder, depth: number): ReactNode {
    return createIndentedMenuLabel(
        createElement(
            'span',
            { className: 'flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900' },
            createElement(FolderAppearanceIcon, {
                icon: folder.icon,
                color: folder.color,
                containerClassName: 'flex h-5 w-5 items-center justify-center rounded-md border',
                iconClassName: 'h-3.5 w-3.5',
            }),
            createElement('span', { className: 'truncate' }, folder.name),
        ),
        depth,
    );
}

/**
 * @private function of Header
 */
function createAgentMenuEntryLabel(label: string, avatarUrl: string | null, depth: number): ReactNode {
    return createIndentedMenuLabel(
        createElement(AgentNameWithAvatar, {
            label,
            avatarUrl,
            avatarSizeClassName: AGENT_MENU_AVATAR_SIZE_CLASS,
            textClassName: AGENT_MENU_TEXT_CLASS,
            maxWidthClassName: AGENT_MENU_MAX_WIDTH_CLASS,
        }),
        depth,
    );
}

/**
 * @private Sorts items by sort order before falling back to a friendly label.
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
 * @private Default metadata representing a folder.
 */
export type HeaderAgentMenuFolder = Pick<
    AgentOrganizationFolder,
    'id' | 'name' | 'parentId' | 'sortOrder' | 'icon' | 'color'
>;

/**
 * @private Default metadata representing an agent.
 */
export type HeaderAgentMenuAgent = AgentOrganizationAgent;

/**
 * @private Builds ordering caches for folders and agents.
 */
type AgentMenuData = {
    folderById: Map<number, HeaderAgentMenuFolder>;
    sortedFolderIdsByParentId: Map<number | null, number[]>;
    agentsByFolderId: Map<number | null, HeaderAgentMenuAgent[]>;
};

/**
 * @private Builds flattening indexes used by the dropdowns.
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
 * @private Node representing a folder in the header hierarchy.
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
 * @private Node representing a single agent in the hierarchy.
 */
type AgentMenuAgentNode = {
    type: 'agent';
    agentName: string;
    label: string;
    renderLabel?: ReactNode;
    href: string;
};

/**
 * @private Action node appended inside folder branches.
 */
type AgentMenuActionNode = {
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
 * @private Represents any node visible inside the agent menu tree.
 */
export type AgentMenuTreeNode = AgentMenuFolderNode | AgentMenuAgentNode | AgentMenuActionNode;

/**
 * @private Shared type describing the tree and flat list returned by the builder.
 */
type AgentMenuStructure = {
    tree: AgentMenuTreeNode[];
    items: Array<SubMenuItem>;
};

/**
 * @private Configuration for folder action nodes.
 */
type FolderActionNodeConfig = {
    readonly viewAllLabel: string;
    readonly createLabel: string;
    readonly renderCreateLabel?: ReactNode;
    readonly onCreateInFolder?: (folderId: number) => void;
};

/**
 * @private Tracks the active agent identifier and view parsed from the pathname.
 */
export type ActiveAgentNavigation = {
    agentIdentifier: string | null;
    view: AgentHierarchyView | null;
};

/**
 * @private Returns the canonical identifier used for routing.
 */
export function getAgentNavigationId(agent: HeaderAgentMenuAgent): string {
    return agent.permanentId || agent.agentName;
}

/**
 * @private Returns the display label for the agent menu.
 */
export function getAgentMenuLabel(agent: HeaderAgentMenuAgent): string {
    return agent.meta?.fullname || agent.agentName;
}

/**
 * @private Builds the fallback agent payload used for menu rendering.
 */
export function createFallbackAgent(agentIdentifier: string | null): HeaderAgentMenuAgent {
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
 * @private Helper that renders a single agent node.
 */
function createAgentNode(agent: HeaderAgentMenuAgent, avatarCache: Map<string, string | null>): AgentMenuAgentNode {
    const label = getAgentMenuLabel(agent);
    return {
        type: 'agent',
        agentName: agent.agentName,
        label,
        renderLabel: createAgentMenuEntryLabel(label, avatarCache.get(getAgentNavigationId(agent)) ?? null, 0),
        href: `/agents/${encodeURIComponent(getAgentNavigationId(agent))}`,
    };
}

/**
 * @private Helper that renders a folder node recursively.
 */
function createFolderNode(
    folderId: number,
    folderById: Map<number, HeaderAgentMenuFolder>,
    sortedFolderIdsByParentId: Map<number | null, number[]>,
    agentsByFolderId: Map<number | null, HeaderAgentMenuAgent[]>,
    avatarCache: Map<string, string | null>,
    visited: Set<number>,
): AgentMenuFolderNode | null {
    if (visited.has(folderId)) {
        return null;
    }

    const folder = folderById.get(folderId);
    if (!folder) {
        return null;
    }

    visited.add(folderId);
    const folderPath = buildFolderPath(getFolderPathSegments(folderId, folderById).map((segment) => segment.name));

    const childNodes: AgentMenuTreeNode[] = [];
    const childFolderIds = sortedFolderIdsByParentId.get(folderId) || [];
    for (const childFolderId of childFolderIds) {
        const childNode = createFolderNode(
            childFolderId,
            folderById,
            sortedFolderIdsByParentId,
            agentsByFolderId,
            avatarCache,
            visited,
        );
        if (childNode) {
            childNodes.push(childNode);
        }
    }

    const folderAgents = agentsByFolderId.get(folderId) || [];
    childNodes.push(...folderAgents.map((agent) => createAgentNode(agent, avatarCache)));

    return {
        type: 'folder',
        id: folder.id,
        label: folder.name,
        renderLabel: createFolderMenuEntryLabel(folder, 0),
        href: `/?folder=${folderPath}`,
        children: childNodes,
    };
}

/**
 * @private Builds the hierarchical agent menu.
 */
export function buildAgentMenuStructure(
    agents: ReadonlyArray<HeaderAgentMenuAgent>,
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
): AgentMenuStructure {
    const { folderById, sortedFolderIdsByParentId, agentsByFolderId } = prepareAgentMenuData(agents, folders);
    const avatarCache = new Map<string, string | null>();

    for (const agent of agents) {
        avatarCache.set(getAgentNavigationId(agent), resolveAgentAvatarImageUrl({ agent }));
    }

    const items: Array<SubMenuItem> = [];
    const visitedFolderIds = new Set<number>();

    const appendFolderBranch = (folderId: number, depth: number) => {
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
                label: createAgentMenuEntryLabel(
                    getAgentMenuLabel(agent),
                    avatarCache.get(getAgentNavigationId(agent)) ?? null,
                    depth + 1,
                ),
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
            label: createAgentMenuEntryLabel(
                getAgentMenuLabel(agent),
                avatarCache.get(getAgentNavigationId(agent)) ?? null,
                0,
            ),
            href: `/agents/${encodeURIComponent(getAgentNavigationId(agent))}`,
        });
    }

    const treeRoots: AgentMenuTreeNode[] = [];
    for (const rootFolderId of rootFolderIds) {
        const node = createFolderNode(
            rootFolderId,
            folderById,
            sortedFolderIdsByParentId,
            agentsByFolderId,
            avatarCache,
            new Set<number>(),
        );
        if (node) {
            treeRoots.push(node);
        }
    }
    for (const folder of sortBySortOrderAndLabel(folders, (currentFolder) => currentFolder.name)) {
        if (!treeRoots.some((node) => node.type === 'folder' && node.id === folder.id)) {
            const node = createFolderNode(
                folder.id,
                folderById,
                sortedFolderIdsByParentId,
                agentsByFolderId,
                avatarCache,
                new Set<number>(),
            );
            if (node) {
                treeRoots.push(node);
            }
        }
    }

    treeRoots.push(...rootAgents.map((agent) => createAgentNode(agent, avatarCache)));

    return {
        tree: treeRoots,
        items,
    };
}

/**
 * @private Adds shared action entries to each folder branch.
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
 * @private Extracts the view label from the current pathname segment.
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
 * @private Returns the navigation context for the active agent.
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
 * @private Builds the label rendered inside the view dropdown.
 */
export function createAgentViewLabel(
    view: AgentHierarchyView,
    translate: (key: ServerTranslationKey) => string,
): ReactNode {
    const Icon = AGENT_VIEW_ICON_MAP[view];
    const translationKeyByView: Record<AgentHierarchyView, ServerTranslationKey> = {
        Profile: 'common.profile',
        Chat: 'common.chat',
        Book: 'common.book',
        More: 'common.more',
    };

    return createElement(
        'span',
        { className: 'flex items-center gap-2' },
        createElement(Icon, { className: 'h-4 w-4 text-gray-500', 'aria-hidden': true }),
        createElement('span', null, translate(translationKeyByView[view])),
    );
}

/**
 * @private Builds the breadcrumb-like label for the active agent.
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
