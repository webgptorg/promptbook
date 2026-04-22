import type { ReactNode } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { buildFolderPath, getFolderPathSegments } from '../../utils/agentOrganization/folderPath';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { buildDefaultAgentRoutePath } from '../../utils/agentRouting/buildAgentRouteHref';
import { FolderAppearanceIcon } from '../FolderAppearance/FolderAppearanceIcon';
import { AgentNameWithAvatar } from './AgentNameWithAvatar';
import type {
    AgentMenuAgentNode,
    AgentMenuFolderNode,
    AgentMenuStructure,
    AgentMenuTreeNode,
    HeaderAgentMenuFolder,
} from './AgentMenuStructure';
import { getAgentMenuLabel } from './getAgentMenuLabel';
import { getAgentNavigationId } from './resolveActiveAgentNavigation';

/**
 * Pixel offset used for each depth level in nested menu labels.
 */
const MENU_DEPTH_PADDING_PX = 14;

/**
 * Avatar size classes applied to agent labels inside the menu.
 *
 * @private function of Header
 */
const AGENT_MENU_AVATAR_SIZE_CLASS = 'h-6 w-6';

/**
 * Text styling applied to agent labels inside the menu.
 *
 * @private function of Header
 */
const AGENT_MENU_TEXT_CLASS = 'text-sm font-semibold text-gray-900';

/**
 * Maximum width applied to agent label text so it truncates gracefully.
 *
 * @private function of Header
 */
const AGENT_MENU_MAX_WIDTH_CLASS = 'max-w-[220px]';

/**
 * Internal agent shape used while building the header menu.
 *
 * @private type of buildAgentMenuStructure
 */
type HeaderAgentMenuAgent = AgentOrganizationAgent;

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
 *
 * @private function of Header
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
 *
 * @private function of Header
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
 *
 * @private function of Header
 */
function createAgentMenuEntryLabel(
    agent: HeaderAgentMenuAgent,
    label: string,
    avatarUrl: string | null,
    depth: number,
): ReactNode {
    return createIndentedMenuLabel(
        <AgentNameWithAvatar
            agent={agent}
            label={label}
            avatarUrl={avatarUrl}
            avatarSizeClassName={AGENT_MENU_AVATAR_SIZE_CLASS}
            avatarSize={24}
            textClassName={AGENT_MENU_TEXT_CLASS}
            maxWidthClassName={AGENT_MENU_MAX_WIDTH_CLASS}
        />,
        depth,
    );
}

/**
 * Indexes used to build the agent menu structure.
 *
 * @private type of Header
 */
type AgentMenuData = {
    folderById: Map<number, HeaderAgentMenuFolder>;
    sortedFolderIdsByParentId: Map<number | null, number[]>;
    agentsByFolderId: Map<number | null, HeaderAgentMenuAgent[]>;
};

/**
 * Builds lookup tables that speed up folder and agent ordering.
 *
 * @private function of Header
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
 * Creates a stable folder traversal order that starts with real roots and
 * falls back to any disconnected or cyclic folders.
 *
 * @private function of Header
 */
function createMenuRootFolderIds(
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
    sortedFolderIdsByParentId: ReadonlyMap<number | null, number[]>,
): number[] {
    const rootFolderIds = [...(sortedFolderIdsByParentId.get(null) || [])];
    const includedFolderIds = new Set<number>(rootFolderIds);

    for (const folder of sortBySortOrderAndLabel(folders, (currentFolder) => currentFolder.name)) {
        if (includedFolderIds.has(folder.id)) {
            continue;
        }

        includedFolderIds.add(folder.id);
        rootFolderIds.push(folder.id);
    }

    return rootFolderIds;
}

/**
 * Resolves the folder href used by both tree and flat menu items.
 *
 * @private function of Header
 */
function createFolderHref(folderId: number, folderById: Map<number, HeaderAgentMenuFolder>): string {
    const folderPath = buildFolderPath(getFolderPathSegments(folderId, folderById).map((segment) => segment.name));
    return `/?folder=${folderPath}`;
}

/**
 * Resolves the agent href used by both tree and flat menu items.
 *
 * @private function of Header
 */
function createAgentHref(agent: HeaderAgentMenuAgent): string {
    return buildDefaultAgentRoutePath(getAgentNavigationId(agent));
}

/**
 * Computes agent avatar URLs keyed by their route navigation identifier.
 *
 * @private function of Header
 */
function createAgentAvatarByIdentifier(agents: ReadonlyArray<HeaderAgentMenuAgent>): Map<string, string | null> {
    const agentAvatarByIdentifier = new Map<string, string | null>();

    for (const agent of agents) {
        agentAvatarByIdentifier.set(getAgentNavigationId(agent), resolveAgentAvatarImageUrl({ agent }));
    }

    return agentAvatarByIdentifier;
}

/**
 * Creates a flat submenu representation used by the mobile and legacy menu
 * renderers.
 *
 * @private function of Header
 */
function createAgentMenuItems(
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
    { folderById, sortedFolderIdsByParentId, agentsByFolderId }: AgentMenuData,
    getAgentAvatarUrl: (agent: HeaderAgentMenuAgent) => string | null,
): Array<{
    label: ReactNode;
    href: string;
    isBold?: boolean;
}> {
    const items: Array<{ label: ReactNode; href: string; isBold?: boolean }> = [];
    const visitedFolderIds = new Set<number>();
    const rootFolderIds = createMenuRootFolderIds(folders, sortedFolderIdsByParentId);

    const appendFolderBranchItems = (folderId: number, depth: number): void => {
        if (visitedFolderIds.has(folderId)) {
            return;
        }

        visitedFolderIds.add(folderId);

        const folder = folderById.get(folderId);
        if (!folder) {
            return;
        }

        items.push({
            label: createFolderMenuEntryLabel(folder, depth),
            href: createFolderHref(folderId, folderById),
            isBold: true,
        });

        for (const agent of agentsByFolderId.get(folderId) || []) {
            items.push({
                label: createAgentMenuEntryLabel(agent, getAgentMenuLabel(agent), getAgentAvatarUrl(agent), depth + 1),
                href: createAgentHref(agent),
            });
        }

        for (const childFolderId of sortedFolderIdsByParentId.get(folderId) || []) {
            appendFolderBranchItems(childFolderId, depth + 1);
        }
    };

    for (const rootFolderId of rootFolderIds) {
        appendFolderBranchItems(rootFolderId, 0);
    }

    for (const agent of agentsByFolderId.get(null) || []) {
        items.push({
            label: createAgentMenuEntryLabel(agent, getAgentMenuLabel(agent), getAgentAvatarUrl(agent), 0),
            href: createAgentHref(agent),
        });
    }

    return items;
}

/**
 * Creates one tree node for an agent branch leaf.
 *
 * @private function of Header
 */
function createAgentNode(
    agent: HeaderAgentMenuAgent,
    getAgentAvatarUrl: (agent: HeaderAgentMenuAgent) => string | null,
): AgentMenuAgentNode {
    const label = getAgentMenuLabel(agent);

    return {
        type: 'agent',
        agentName: agent.agentName,
        label,
        renderLabel: createAgentMenuEntryLabel(agent, label, getAgentAvatarUrl(agent), 0),
        href: createAgentHref(agent),
    };
}

/**
 * Recursively creates a folder tree branch while guarding against repeated
 * visits caused by inconsistent data.
 *
 * @private function of Header
 */
function createFolderNode(
    folderId: number,
    { folderById, sortedFolderIdsByParentId, agentsByFolderId }: AgentMenuData,
    visitedFolderIds: Set<number>,
    getAgentAvatarUrl: (agent: HeaderAgentMenuAgent) => string | null,
): AgentMenuFolderNode | null {
    if (visitedFolderIds.has(folderId)) {
        return null;
    }

    const folder = folderById.get(folderId);
    if (!folder) {
        return null;
    }

    visitedFolderIds.add(folderId);

    const childNodes: AgentMenuTreeNode[] = [];

    for (const childFolderId of sortedFolderIdsByParentId.get(folderId) || []) {
        const childNode = createFolderNode(
            childFolderId,
            { folderById, sortedFolderIdsByParentId, agentsByFolderId },
            visitedFolderIds,
            getAgentAvatarUrl,
        );
        if (childNode) {
            childNodes.push(childNode);
        }
    }

    childNodes.push(
        ...(agentsByFolderId.get(folderId) || []).map((agent) => createAgentNode(agent, getAgentAvatarUrl)),
    );

    return {
        type: 'folder',
        id: folder.id,
        label: folder.name,
        renderLabel: createFolderMenuEntryLabel(folder, 0),
        href: createFolderHref(folderId, folderById),
        children: childNodes,
    };
}

/**
 * Creates the hierarchical agent tree used by the desktop dropdown.
 *
 * @private function of Header
 */
function createAgentTree(
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
    agentMenuData: AgentMenuData,
    getAgentAvatarUrl: (agent: HeaderAgentMenuAgent) => string | null,
): AgentMenuTreeNode[] {
    const treeRoots: AgentMenuTreeNode[] = [];
    const visitedFolderIds = new Set<number>();

    for (const rootFolderId of createMenuRootFolderIds(folders, agentMenuData.sortedFolderIdsByParentId)) {
        const node = createFolderNode(rootFolderId, agentMenuData, visitedFolderIds, getAgentAvatarUrl);
        if (node) {
            treeRoots.push(node);
        }
    }

    treeRoots.push(
        ...(agentMenuData.agentsByFolderId.get(null) || []).map((agent) => createAgentNode(agent, getAgentAvatarUrl)),
    );

    return treeRoots;
}

/**
 * Builds the hierarchical and flat agent menu data for the header.
 *
 * @private function of Header
 */
export function buildAgentMenuStructure(
    agents: ReadonlyArray<HeaderAgentMenuAgent>,
    folders: ReadonlyArray<HeaderAgentMenuFolder>,
): AgentMenuStructure {
    const agentMenuData = prepareAgentMenuData(agents, folders);
    const agentAvatarByIdentifier = createAgentAvatarByIdentifier(agents);

    const getAgentAvatarUrl = (agent: HeaderAgentMenuAgent): string | null =>
        agentAvatarByIdentifier.get(getAgentNavigationId(agent)) ?? null;

    return {
        tree: createAgentTree(folders, agentMenuData, getAgentAvatarUrl),
        items: createAgentMenuItems(folders, agentMenuData, getAgentAvatarUrl),
    };
}
