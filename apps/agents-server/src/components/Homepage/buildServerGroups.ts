import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { buildFolderMaps, getFolderPathSegments, sortBySortOrder } from './agentOrganizationUtils';
import type { FolderGroup, GraphNode, ServerGroup } from './buildGraphDataTypes';
import { normalizeServerUrl } from './normalizeServerUrl';

/**
 * Build a path label for a folder id.
 */
const buildFolderLabel = (folderId: number | null, folderMaps: ReturnType<typeof buildFolderMaps>): string => {
    if (folderId === null) {
        return 'Root';
    }

    const segments = getFolderPathSegments(folderId, folderMaps.folderById);
    if (segments.length === 0) {
        return `Folder ${folderId}`;
    }

    return segments.map((segment) => segment.name).join(' / ');
};

/**
 * Build ordered folder ids by traversing the folder tree.
 */
const buildOrderedFolderIds = (
    agentsByFolderId: Map<number | null, GraphNode[]>,
    folderMaps: ReturnType<typeof buildFolderMaps>,
): number[] => {
    const ordered: number[] = [];

    const visitFolder = (parentId: number | null) => {
        const childIds = folderMaps.childrenByParentId.get(parentId) || [];
        const childFolders = childIds
            .map((childId) => folderMaps.folderById.get(childId))
            .filter((folder): folder is AgentOrganizationFolder => Boolean(folder));
        const sortedFolders = sortBySortOrder(childFolders, (folder) => folder.name);

        sortedFolders.forEach((folder) => {
            if (agentsByFolderId.has(folder.id)) {
                ordered.push(folder.id);
            }
            visitFolder(folder.id);
        });
    };

    visitFolder(null);

    return ordered;
};

/**
 * Group visible graph nodes by server and folder for graph layout and summary views.
 *
 * @private function of AgentsGraph
 */
export const buildServerGroups = (
    nodes: GraphNode[],
    folders: AgentOrganizationFolder[],
    publicUrl: string,
    rootLabel: string,
): ServerGroup[] => {
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const nodesByServer = new Map<string, GraphNode[]>();

    nodes.forEach((node) => {
        const bucket = nodesByServer.get(node.serverUrl) || [];
        bucket.push(node);
        nodesByServer.set(node.serverUrl, bucket);
    });

    const serverUrls = Array.from(nodesByServer.keys()).sort((left, right) => {
        if (left === normalizedPublicUrl) {
            return -1;
        }
        if (right === normalizedPublicUrl) {
            return 1;
        }
        return left.localeCompare(right);
    });

    return serverUrls.map((serverUrl) => {
        const serverNodes = nodesByServer.get(serverUrl) || [];
        const isLocal = serverUrl === normalizedPublicUrl;
        const serverLabel = serverUrl.replace(/^https?:\/\//, '');

        if (!isLocal || folders.length === 0) {
            return {
                serverUrl,
                label: serverLabel,
                isLocal,
                folders: [
                    {
                        id: null,
                        label: rootLabel,
                        agents: sortBySortOrder(serverNodes, (node) => node.name),
                    },
                ],
            };
        }

        const folderMaps = buildFolderMaps(folders);
        const agentsByFolderId = new Map<number | null, GraphNode[]>();
        serverNodes.forEach((node) => {
            const folderId = node.folderId ?? null;
            const bucket = agentsByFolderId.get(folderId) || [];
            bucket.push(node);
            agentsByFolderId.set(folderId, bucket);
        });

        const folderGroups: FolderGroup[] = [];
        if (agentsByFolderId.has(null)) {
            folderGroups.push({
                id: null,
                label: buildFolderLabel(null, folderMaps),
                agents: sortBySortOrder(agentsByFolderId.get(null) || [], (node) => node.name),
            });
        }

        const orderedFolderIds = buildOrderedFolderIds(agentsByFolderId, folderMaps);
        orderedFolderIds.forEach((folderId) => {
            const agentsInFolder = agentsByFolderId.get(folderId);
            if (!agentsInFolder) {
                return;
            }

            folderGroups.push({
                id: folderId,
                label: buildFolderLabel(folderId, folderMaps),
                agents: sortBySortOrder(agentsInFolder, (node) => node.name),
            });
        });

        if (folderGroups.length === 0) {
            folderGroups.push({
                id: null,
                label: rootLabel,
                agents: sortBySortOrder(serverNodes, (node) => node.name),
            });
        }

        return {
            serverUrl,
            label: serverLabel,
            isLocal,
            folders: folderGroups,
        };
    });
};
