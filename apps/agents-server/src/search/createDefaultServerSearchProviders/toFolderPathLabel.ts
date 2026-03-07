import { getFolderPathSegments } from '../../utils/agentOrganization/folderPath';

/**
 * Folder descriptor needed for path assembly.
 *
 * @private function of createDefaultServerSearchProviders
 */
type FolderPathLabelRow = {
    id: number;
    name: string;
    parentId: number | null;
};

/**
 * Creates one readable folder-path label from a folder id.
 *
 * @param folderId Folder id to resolve.
 * @param folderById Folder map indexed by id.
 * @returns Human-readable folder path.
 * @private function of createDefaultServerSearchProviders
 */
export function toFolderPathLabel(folderId: number | null, folderById: Map<number, FolderPathLabelRow>): string {
    if (folderId === null) {
        return '';
    }

    const pathSegments = getFolderPathSegments(folderId, folderById);
    return pathSegments.map((folder) => folder.name).join(' / ');
}
