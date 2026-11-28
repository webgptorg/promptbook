import { buildFolderTree, collectDescendantFolderIds } from './folderTree';

/**
 * Prefix that marks a folder as hidden from default organization listings.
 *
 * Folders whose name starts with this prefix (for example `.core`) are excluded
 * from default agent/folder listings unless the caller explicitly opts into showing them.
 *
 * @private shared hidden-folder helper for Agents Server
 */
export const HIDDEN_FOLDER_NAME_PREFIX = '.';

/**
 * Minimal folder shape required by the hidden-folder utilities.
 *
 * @private shared hidden-folder helper for Agents Server
 */
type HiddenFolderTreeFolder = {
    readonly id: number;
    readonly name: string;
    readonly parentId: number | null;
};

/**
 * Minimal agent shape required by the hidden-folder utilities.
 *
 * @private shared hidden-folder helper for Agents Server
 */
type HiddenFolderTreeAgent = {
    readonly folderId: number | null;
};

/**
 * Result of removing hidden folders and their agents from one organization snapshot.
 *
 * @private shared hidden-folder helper for Agents Server
 */
type FilterHiddenFolderTreeResult<TFolder extends HiddenFolderTreeFolder, TAgent extends HiddenFolderTreeAgent> = {
    readonly folders: TFolder[];
    readonly agents: TAgent[];
    readonly hasHiddenFolders: boolean;
};

/**
 * Determines whether one folder name represents a hidden folder.
 *
 * @param folderName - Folder name persisted in the database.
 * @returns True when the folder should be hidden by default.
 *
 * @private shared hidden-folder helper for Agents Server
 */
export function isHiddenFolderName(folderName: string): boolean {
    return folderName.startsWith(HIDDEN_FOLDER_NAME_PREFIX);
}

/**
 * Collects identifiers of all hidden folders together with their descendant folders.
 *
 * A folder is hidden when its own name starts with the hidden-folder prefix, or when
 * it lives under another hidden folder. Descendants are included so that nested
 * content is hidden together with the marker folder.
 *
 * @param folders - All folders in the organization.
 * @returns Set of folder identifiers that should be excluded from default views.
 *
 * @private shared hidden-folder helper for Agents Server
 */
export function collectHiddenFolderIds(folders: ReadonlyArray<HiddenFolderTreeFolder>): Set<number> {
    const folderTree = buildFolderTree(Array.from(folders));
    const hiddenFolderIds = new Set<number>();

    for (const folder of folders) {
        if (!isHiddenFolderName(folder.name)) {
            continue;
        }

        for (const descendantId of collectDescendantFolderIds(folder.id, folderTree.childrenByParentId)) {
            hiddenFolderIds.add(descendantId);
        }
    }

    return hiddenFolderIds;
}

/**
 * Removes hidden folders and their agents from one organization snapshot.
 *
 * When `isHiddenFoldersVisible` is true the snapshot passes through unchanged so the
 * caller can render every folder. When false, all hidden folders (including their
 * descendants and the agents inside them) are removed in one pass.
 *
 * @param folders - All folders in the organization.
 * @param agents - All agents in the organization.
 * @param isHiddenFoldersVisible - Whether the user has opted to display hidden folders.
 * @returns Filtered organization snapshot together with the unfiltered detection flag.
 *
 * @private shared hidden-folder helper for Agents Server
 */
export function filterHiddenFolderTree<
    TFolder extends HiddenFolderTreeFolder,
    TAgent extends HiddenFolderTreeAgent,
>(
    folders: ReadonlyArray<TFolder>,
    agents: ReadonlyArray<TAgent>,
    isHiddenFoldersVisible: boolean,
): FilterHiddenFolderTreeResult<TFolder, TAgent> {
    const hasHiddenFolders = folders.some((folder) => isHiddenFolderName(folder.name));

    if (isHiddenFoldersVisible || !hasHiddenFolders) {
        return {
            folders: Array.from(folders),
            agents: Array.from(agents),
            hasHiddenFolders,
        };
    }

    const hiddenFolderIds = collectHiddenFolderIds(folders);

    return {
        folders: folders.filter((folder) => !hiddenFolderIds.has(folder.id)),
        agents: agents.filter((agent) => agent.folderId === null || !hiddenFolderIds.has(agent.folderId)),
        hasHiddenFolders,
    };
}
