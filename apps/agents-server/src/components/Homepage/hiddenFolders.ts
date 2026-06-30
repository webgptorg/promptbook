import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { buildFolderMaps, collectDescendantFolderIds } from './agentOrganizationUtils';

/**
 * Prefix that marks a folder as hidden from default homepage listings.
 *
 * Folders whose name starts with this prefix (for example `.core`) are excluded
 * from the agents list, graph, and office views unless the user explicitly toggles
 * hidden-folder visibility on.
 *
 * @private function of AgentsList
 */
export const HIDDEN_FOLDER_NAME_PREFIX = '.';

/**
 * Determines whether one folder name represents a hidden folder.
 *
 * @param folderName - Folder name persisted in the database.
 * @returns True when the folder should be hidden by default.
 *
 * @private function of AgentsList
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
 * @private function of AgentsList
 */
export function collectHiddenFolderIds(folders: ReadonlyArray<AgentOrganizationFolder>): Set<number> {
    const folderMaps = buildFolderMaps(folders);
    const hiddenFolderIds = new Set<number>();

    for (const folder of folders) {
        if (!isHiddenFolderName(folder.name)) {
            continue;
        }

        for (const descendantId of collectDescendantFolderIds(folder.id, folderMaps.childrenByParentId)) {
            hiddenFolderIds.add(descendantId);
        }
    }

    return hiddenFolderIds;
}

/**
 * Result of removing hidden folders and their agents from one organization snapshot.
 *
 * @private function of AgentsList
 */
type FilterHiddenFolderTreeResult = {
    readonly folders: AgentOrganizationFolder[];
    readonly agents: AgentOrganizationAgent[];
    readonly hasHiddenFolders: boolean;
};

/**
 * Removes hidden folders and their agents from one organization snapshot.
 *
 * When `isHiddenFoldersVisible` is true the snapshot passes through unchanged so the
 * caller can render every folder. When false, all hidden folders (including their
 * descendants and the agents inside them) are removed in one pass — keeping the
 * single filtering rule in one place across list, graph, and office views.
 *
 * @param folders - All folders in the organization.
 * @param agents - All agents in the organization.
 * @param isHiddenFoldersVisible - Whether the user has opted to display hidden folders.
 * @returns Filtered organization snapshot together with the unfiltered detection flag.
 *
 * @private function of AgentsList
 */
export function filterHiddenFolderTree(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    agents: ReadonlyArray<AgentOrganizationAgent>,
    isHiddenFoldersVisible: boolean,
): FilterHiddenFolderTreeResult {
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
