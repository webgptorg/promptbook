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
export function getFolderPathSegments<TFolder extends { id: number; parentId: number | null }>(
    folderId: number | null,
    folderById: Map<number, TFolder>,
): TFolder[] {
    if (folderId === null) {
        return [];
    }

    const segments: TFolder[] = [];
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
