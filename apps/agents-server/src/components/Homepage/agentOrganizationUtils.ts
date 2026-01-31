import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';

/**
 * Folder tree indexes for client-side navigation.
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
export function buildFolderMaps(folders: AgentOrganizationFolder[]): FolderMaps {
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
 */
export function resolveFolderIdFromPath(folders: AgentOrganizationFolder[], segments: string[]): number | null {
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

/**
 * Builds a folder path string from segments.
 *
 * @param segments - Folder name segments.
 * @returns Encoded folder path for URLs.
 */
export function buildFolderPath(segments: string[]): string {
    return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

/**
 * Gets the folder path segments from root to the target folder.
 *
 * @param folderId - Folder identifier.
 * @param folderById - Folder lookup map.
 * @returns Ordered folder segments from root to the folder.
 */
export function getFolderPathSegments(
    folderId: number | null,
    folderById: Map<number, AgentOrganizationFolder>,
): AgentOrganizationFolder[] {
    if (folderId === null) {
        return [];
    }

    const segments: AgentOrganizationFolder[] = [];
    let currentId: number | null = folderId;

    while (currentId !== null) {
        const currentFolder = folderById.get(currentId);
        if (!currentFolder) {
            break;
        }
        segments.unshift(currentFolder);
        currentId = currentFolder.parentId ?? null;
    }

    return segments;
}

/**
 * Collects descendant folder ids including the starting folder.
 *
 * @param startId - Folder id to start from.
 * @param childrenByParentId - Child folder lookup table.
 * @returns Descendant folder identifiers.
 */
export function collectDescendantFolderIds(
    startId: number,
    childrenByParentId: Map<number | null, number[]>,
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
 */
export function pickPreviewAgents(
    agents: AgentOrganizationAgent[],
    folderIds: Set<number>,
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
 */
export function sortBySortOrder<T>(
    items: T[],
    getFallback: (item: T) => string,
): T[] {
    return [...items].sort((left, right) => {
        const leftOrder = (left as { sortOrder?: number }).sortOrder ?? 0;
        const rightOrder = (right as { sortOrder?: number }).sortOrder ?? 0;
        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }
        return getFallback(left).localeCompare(getFallback(right));
    });
}
