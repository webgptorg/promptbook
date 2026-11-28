import { buildFolderPath, getFolderPathSegments } from './folderPath';

/**
 * Folder context for linking to the agent's folder view.
 */
export type AgentFolderContext = {
    /**
     * URL to open the folder view in the agents list.
     */
    readonly href: string;
    /**
     * Human-readable folder path label.
     */
    readonly label: string;
};

/**
 * Builds folder context data for an agent, if it belongs to a folder.
 *
 * @param folderId - Folder identifier for the agent.
 * @param folderById - Folder lookup map used to resolve the path.
 * @returns Folder context for the agent or null when no folder is available.
 */
export function buildAgentFolderContext<TFolder extends { id: number; parentId: number | null; name: string }>(
    folderId: number | null,
    folderById: Map<number, TFolder>,
): AgentFolderContext | null {
    if (folderId === null) {
        return null;
    }

    const segments = getFolderPathSegments(folderId, folderById);
    if (segments.length === 0) {
        return null;
    }

    const label = segments.map((folder) => folder.name).join(' / ');
    const path = buildFolderPath(segments.map((folder) => folder.name));
    if (!path) {
        return null;
    }

    return { href: `/?folder=${path}`, label };
}
