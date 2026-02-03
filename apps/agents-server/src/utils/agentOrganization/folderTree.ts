/**
 * Folder tree indexes for fast traversal.
 */
export type FolderTree<TFolder extends { id: number; parentId: number | null }> = {
    /**
     * Lookup table for folders by id.
     */
    folderById: Map<number, TFolder>;
    /**
     * Child folder identifiers grouped by parent id.
     */
    childrenByParentId: Map<number | null, number[]>;
};

/**
 * Builds lookup maps for folder traversal.
 *
 * @param folders - Folders to index.
 * @returns Folder tree indexes for traversal.
 */
export function buildFolderTree<TFolder extends { id: number; parentId: number | null }>(
    folders: TFolder[],
): FolderTree<TFolder> {
    const folderById = new Map<number, TFolder>();
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
 * Collects all descendant folder identifiers including the starting folder.
 *
 * @param startId - Folder identifier to start from.
 * @param childrenByParentId - Child folder index.
 * @returns Array of descendant folder ids including the start.
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
 * Collects all ancestor folder identifiers including the starting folder.
 *
 * @param startId - Folder identifier to start from.
 * @param folderById - Folder lookup table.
 * @returns Array of ancestor folder ids including the start.
 */
export function collectAncestorFolderIds(
    startId: number,
    folderById: Map<number, { parentId: number | null }>,
): number[] {
    const ancestors: number[] = [];
    let currentId: number | null = startId;

    while (currentId !== null) {
        ancestors.push(currentId);
        const currentFolder = folderById.get(currentId);
        currentId = currentFolder?.parentId ?? null;
    }

    return ancestors;
}
