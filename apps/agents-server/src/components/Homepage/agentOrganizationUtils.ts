import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationUpdatePayload,
} from '../../utils/agentOrganization/types';
import { buildFolderPath, getFolderPathSegments } from '../../utils/agentOrganization/folderPath';

/**
 * Folder tree indexes for client-side navigation.
 *
 * @private function of AgentsList
 */
export type FolderMaps = {
    /**
     * Lookup table for folders by id.
     */
    folderById: Map<number, AgentOrganizationFolder>;
    /**
     * Child folder identifiers grouped by parent id.
     */
    childrenByParentId: Map<number | null, number[]>;
};

/**
 * Builds lookup maps for folders to support navigation and counts.
 *
 * @param folders - Folder list to index.
 * @returns Folder maps for tree traversal.
 */
export function buildFolderMaps(folders: ReadonlyArray<AgentOrganizationFolder>): FolderMaps {
    const folderById = new Map<number, AgentOrganizationFolder>();
    const childrenByParentId = new Map<number | null, number[]>();

    for (const folder of folders) {
        folderById.set(folder.id, folder);
        const parentId = folder.parentId ?? null;
        const siblings = childrenByParentId.get(parentId) || [];
        siblings.push(folder.id);
        childrenByParentId.set(parentId, siblings);
    }

    return { folderById, childrenByParentId };
}

/**
 * Splits a folder path string into decoded segments.
 *
 * @param folderParam - Raw folder query parameter value.
 * @returns Folder path segments in order.
 *
 * @private function of AgentsList
 */
export function parseFolderPath(folderParam: string | null): string[] {
    if (!folderParam) {
        return [];
    }

    return folderParam
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment));
}

/**
 * Resolves a folder id from a list of path segments.
 *
 * @param folders - Known folders to search.
 * @param segments - Folder path segments.
 * @returns Matching folder id or null if missing.
 *
 * @private function of AgentsList
 */
export function resolveFolderIdFromPath(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    segments: ReadonlyArray<string>,
): number | null {
    if (segments.length === 0) {
        return null;
    }

    let currentParentId: number | null = null;
    let resolvedId: number | null = null;

    for (const segment of segments) {
        const match = folders.find((folder) => folder.parentId === currentParentId && folder.name === segment);
        if (!match) {
            return null;
        }
        resolvedId = match.id;
        currentParentId = match.id;
    }

    return resolvedId;
}

export { buildFolderPath, getFolderPathSegments };

/**
 * Collects descendant folder ids including the starting folder.
 *
 * @param startId - Folder id to start from.
 * @param childrenByParentId - Child folder lookup table.
 * @returns Descendant folder identifiers.
 *
 * @private function of AgentsList
 */
export function collectDescendantFolderIds(
    startId: number,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
): number[] {
    const collected: number[] = [];
    const stack = [startId];

    while (stack.length > 0) {
        const currentId = stack.pop();
        if (currentId === undefined) {
            continue;
        }
        collected.push(currentId);
        const children = childrenByParentId.get(currentId) || [];
        for (const childId of children) {
            stack.push(childId);
        }
    }

    return collected;
}

/**
 * Picks preview agents for a folder using its subtree.
 *
 * @param agents - Agents to search within.
 * @param folderIds - Folder ids to match.
 * @param limit - Maximum number of preview agents.
 * @returns Preview agent list.
 *
 * @private function of AgentsList
 */
export function pickPreviewAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    folderIds: ReadonlySet<number>,
    limit: number,
): AgentOrganizationAgent[] {
    const preview: AgentOrganizationAgent[] = [];

    for (const agent of agents) {
        if (agent.folderId === null) {
            continue;
        }
        if (!folderIds.has(agent.folderId)) {
            continue;
        }
        preview.push(agent);
        if (preview.length >= limit) {
            break;
        }
    }

    return preview;
}

/**
 * Sorts items by sort order and a fallback string.
 *
 * @param items - Items to sort.
 * @param getFallback - Function returning fallback string value.
 * @returns Sorted copy of the input array.
 *
 * @private function of AgentsList
 */
export function sortBySortOrder<T>(items: ReadonlyArray<T>, getFallback: (item: T) => string): T[] {
    return [...items].sort((left, right) => {
        const leftOrder = (left as { sortOrder?: number }).sortOrder ?? 0;
        const rightOrder = (right as { sortOrder?: number }).sortOrder ?? 0;
        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }
        return getFallback(left).localeCompare(getFallback(right));
    });
}

/**
 * Descendant lookup for one folder subtree.
 *
 * @private function of AgentsList
 */
type FolderDescendantContext = {
    readonly ids: number[];
    readonly idSet: Set<number>;
};

/**
 * Outcome of validating and planning a folder move.
 *
 * @private function of AgentsList
 */
type FolderMovePlan =
    | { readonly type: 'NO_OP' }
    | { readonly type: 'INVALID_PARENT' }
    | {
          readonly type: 'UPDATES';
          readonly updates: AgentOrganizationFolder[];
      };

/**
 * Builds a stable identifier for one local agent.
 *
 * @param agent - Agent to identify.
 * @returns Stable identifier used throughout drag, sorting, and mutations.
 *
 * @private function of AgentsList
 */
export function getAgentIdentifier(agent: Pick<AgentOrganizationAgent, 'permanentId' | 'agentName'>): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Finds one agent by its stable list identifier.
 *
 * @param agents - Agents to search.
 * @param identifier - Agent identifier used throughout the UI.
 * @returns Matching agent or undefined.
 *
 * @private function of AgentsList
 */
export function findAgentByIdentifier(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    identifier: string,
): AgentOrganizationAgent | undefined {
    return agents.find((agent) => getAgentIdentifier(agent) === identifier);
}

/**
 * Finds one folder by its numeric identifier.
 *
 * @param folders - Folders to search.
 * @param folderId - Folder identifier.
 * @returns Matching folder or undefined.
 *
 * @private function of AgentsList
 */
export function findFolderById(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    folderId: number,
): AgentOrganizationFolder | undefined {
    return folders.find((folder) => folder.id === folderId);
}

/**
 * Builds descendant ids and a membership set for one folder subtree.
 *
 * @param folderId - Root folder id.
 * @param childrenByParentId - Child folder lookup.
 * @returns Descendant lookup metadata.
 *
 * @private function of AgentsList
 */
export function createFolderDescendantContext(
    folderId: number,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
): FolderDescendantContext {
    const ids = collectDescendantFolderIds(folderId, childrenByParentId);

    return {
        ids,
        idSet: new Set(ids),
    };
}

/**
 * Returns folders visible in the currently opened parent folder.
 *
 * @param folders - All folders in the organization.
 * @param currentFolderId - Current folder scope.
 * @returns Sorted folders visible in the current scope.
 *
 * @private function of AgentsList
 */
export function getVisibleFolders(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    currentFolderId: number | null,
): AgentOrganizationFolder[] {
    return sortBySortOrder(
        folders.filter((folder) => (folder.parentId ?? null) === (currentFolderId ?? null)),
        (folder) => folder.name,
    );
}

/**
 * Returns agents visible in the currently opened folder scope.
 *
 * @param agents - All agents in the organization.
 * @param currentFolderId - Current folder scope.
 * @returns Sorted agents visible in the current scope.
 *
 * @private function of AgentsList
 */
export function getVisibleAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    currentFolderId: number | null,
): AgentOrganizationAgent[] {
    return sortBySortOrder(
        agents.filter((agent) => (agent.folderId ?? null) === (currentFolderId ?? null)),
        (agent) => agent.agentName,
    );
}

/**
 * Resolves the folder set used by office-style views.
 *
 * @param currentFolderId - Current folder scope.
 * @param childrenByParentId - Folder child lookup.
 * @returns Folder id set for the office scope or null at the root.
 *
 * @private function of AgentsList
 */
export function createOfficeVisibleFolderIdSet(
    currentFolderId: number | null,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
): Set<number> | null {
    if (currentFolderId === null) {
        return null;
    }

    return new Set(collectDescendantFolderIds(currentFolderId, childrenByParentId));
}

/**
 * Filters agents for office-style subtree rendering.
 *
 * @param agents - All local agents.
 * @param officeVisibleFolderIds - Folder scope for office views.
 * @returns Agents visible in the office scope.
 *
 * @private function of AgentsList
 */
export function getOfficeAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    officeVisibleFolderIds: ReadonlySet<number> | null,
): AgentOrganizationAgent[] {
    if (officeVisibleFolderIds === null) {
        return Array.from(agents);
    }

    return agents.filter((agent) => agent.folderId !== null && officeVisibleFolderIds.has(agent.folderId));
}

/**
 * Filters folders for office-style subtree rendering.
 *
 * @param folders - All folders in the organization.
 * @param officeVisibleFolderIds - Folder scope for office views.
 * @returns Folders visible in the office scope.
 *
 * @private function of AgentsList
 */
export function getOfficeFolders(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    officeVisibleFolderIds: ReadonlySet<number> | null,
): AgentOrganizationFolder[] {
    if (officeVisibleFolderIds === null) {
        return Array.from(folders);
    }

    return folders.filter((folder) => officeVisibleFolderIds.has(folder.id));
}

/**
 * Creates the POST payload used to persist folder organization changes.
 *
 * @param folders - Updated folders to persist.
 * @returns Organization update payload containing folder updates.
 *
 * @private function of AgentsList
 */
export function buildFolderOrganizationUpdates(
    folders: ReadonlyArray<AgentOrganizationFolder>,
): AgentOrganizationUpdatePayload {
    return {
        folders: folders.map((folder) => ({
            id: folder.id,
            parentId: folder.parentId ?? null,
            sortOrder: folder.sortOrder,
        })),
    };
}

/**
 * Creates the POST payload used to persist agent organization changes.
 *
 * @param agents - Updated agents to persist.
 * @returns Organization update payload containing agent updates.
 *
 * @private function of AgentsList
 */
export function buildAgentOrganizationUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
): AgentOrganizationUpdatePayload {
    return {
        agents: agents.map((agent) => ({
            identifier: getAgentIdentifier(agent),
            folderId: agent.folderId ?? null,
            sortOrder: agent.sortOrder,
        })),
    };
}

/**
 * Applies folder updates over the current local folder list.
 *
 * @param folders - Existing local folders.
 * @param updates - Updated folders to merge.
 * @returns Folder list with updates applied.
 *
 * @private function of AgentsList
 */
export function applyFolderUpdates(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    updates: ReadonlyArray<AgentOrganizationFolder>,
): AgentOrganizationFolder[] {
    const updatedMap = new Map(updates.map((folder) => [folder.id, folder]));

    return folders.map((folder) => updatedMap.get(folder.id) || folder);
}

/**
 * Applies agent updates over the current local agent list.
 *
 * @param agents - Existing local agents.
 * @param updates - Updated agents to merge.
 * @returns Agent list with updates applied.
 *
 * @private function of AgentsList
 */
export function applyAgentUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    updates: ReadonlyArray<AgentOrganizationAgent>,
): AgentOrganizationAgent[] {
    const updatedMap = new Map(updates.map((agent) => [getAgentIdentifier(agent), agent]));

    return agents.map((agent) => updatedMap.get(getAgentIdentifier(agent)) || agent);
}

/**
 * Moves an item within an array.
 *
 * @param items - Items to reorder.
 * @param fromIndex - Source index.
 * @param toIndex - Target index.
 * @returns Reordered array copy.
 *
 * @private function of AgentsList
 */
function moveItem<T>(items: ReadonlyArray<T>, fromIndex: number, toIndex: number): T[] {
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    const clampedIndex = Math.max(0, Math.min(updated.length, toIndex));
    updated.splice(clampedIndex, 0, moved);
    return updated;
}

/**
 * Resolves the next append position for a sorted sibling list.
 *
 * @param items - Sorted sibling list.
 * @returns Sort order for an appended item.
 *
 * @private function of AgentsList
 */
function resolveNextSortOrder<T extends { sortOrder: number }>(items: ReadonlyArray<T>): number {
    return items.length > 0 ? items[items.length - 1].sortOrder + 1 : 0;
}

/**
 * Plans folder reordering inside the current folder scope.
 *
 * @param folders - All local folders.
 * @param visibleFolders - Folders visible in the current scope.
 * @param draggedId - Folder id being moved.
 * @param targetId - Folder id being targeted.
 * @returns Updated folders or null when no reorder is needed.
 *
 * @private function of AgentsList
 */
export function createReorderedFolderUpdates(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    visibleFolders: ReadonlyArray<AgentOrganizationFolder>,
    draggedId: number,
    targetId: number,
): AgentOrganizationFolder[] | null {
    const orderedFolderIds = visibleFolders.map((folder) => folder.id);
    const fromIndex = orderedFolderIds.indexOf(draggedId);
    const targetIndex = orderedFolderIds.indexOf(targetId);

    if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
        return null;
    }

    return moveItem(orderedFolderIds, fromIndex, targetIndex)
        .map((id, index) => {
            const folder = findFolderById(folders, id);

            return folder ? { ...folder, sortOrder: index } : null;
        })
        .filter((folder): folder is AgentOrganizationFolder => folder !== null);
}

/**
 * Plans agent reordering inside the current folder scope.
 *
 * @param agents - All local agents.
 * @param visibleAgents - Agents visible in the current scope.
 * @param draggedId - Agent identifier being moved.
 * @param targetId - Agent identifier being targeted.
 * @returns Updated agents or null when no reorder is needed.
 *
 * @private function of AgentsList
 */
export function createReorderedAgentUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    visibleAgents: ReadonlyArray<AgentOrganizationAgent>,
    draggedId: string,
    targetId: string,
): AgentOrganizationAgent[] | null {
    const orderedAgentIds = visibleAgents.map((agent) => getAgentIdentifier(agent));
    const fromIndex = orderedAgentIds.indexOf(draggedId);
    const targetIndex = orderedAgentIds.indexOf(targetId);

    if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
        return null;
    }

    return moveItem(orderedAgentIds, fromIndex, targetIndex)
        .map((identifier, index) => {
            const agent = findAgentByIdentifier(agents, identifier);

            return agent ? { ...agent, sortOrder: index } : null;
        })
        .filter((agent): agent is AgentOrganizationAgent => agent !== null);
}

/**
 * Plans a folder move into another folder or the root.
 *
 * @param folders - All local folders.
 * @param childrenByParentId - Child folder lookup.
 * @param folderId - Folder being moved.
 * @param targetParentId - Target parent folder id.
 * @returns Validated folder move plan.
 *
 * @private function of AgentsList
 */
export function createFolderMovePlan(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
    folderId: number,
    targetParentId: number | null,
): FolderMovePlan {
    if (folderId === targetParentId) {
        return { type: 'NO_OP' };
    }

    const folder = findFolderById(folders, folderId);
    if (!folder) {
        return { type: 'NO_OP' };
    }

    const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
    if (targetParentId !== null && descendantContext.idSet.has(targetParentId)) {
        return { type: 'INVALID_PARENT' };
    }

    const sourceParentId = folder.parentId ?? null;
    const sourceSiblings = sortBySortOrder(
        folders.filter((item) => (item.parentId ?? null) === sourceParentId && item.id !== folderId),
        (item) => item.name,
    );
    const targetSiblings = sortBySortOrder(
        folders.filter((item) => (item.parentId ?? null) === (targetParentId ?? null) && item.id !== folderId),
        (item) => item.name,
    );
    const updatedFolder = {
        ...folder,
        parentId: targetParentId,
        sortOrder: resolveNextSortOrder(targetSiblings),
    };

    return {
        type: 'UPDATES',
        updates: [...sourceSiblings.map((item, index) => ({ ...item, sortOrder: index })), updatedFolder],
    };
}

/**
 * Plans moving one agent into another folder or the root.
 *
 * @param agents - All local agents.
 * @param identifier - Agent identifier being moved.
 * @param targetFolderId - Target folder id.
 * @returns Updated agents or null when no move is needed.
 *
 * @private function of AgentsList
 */
export function createAgentMoveUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    identifier: string,
    targetFolderId: number | null,
): AgentOrganizationAgent[] | null {
    const agent = findAgentByIdentifier(agents, identifier);
    if (!agent) {
        return null;
    }

    const sourceFolderId = agent.folderId ?? null;
    if (sourceFolderId === targetFolderId) {
        return null;
    }

    const sourceAgents = sortBySortOrder(
        agents.filter((item) => (item.folderId ?? null) === sourceFolderId && getAgentIdentifier(item) !== identifier),
        (item) => item.agentName,
    );
    const targetAgents = sortBySortOrder(
        agents.filter((item) => (item.folderId ?? null) === targetFolderId),
        (item) => item.agentName,
    );
    const updatedAgent = {
        ...agent,
        folderId: targetFolderId,
        sortOrder: resolveNextSortOrder(targetAgents),
    };

    return [...sourceAgents.map((item, index) => ({ ...item, sortOrder: index })), updatedAgent];
}
