import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { resolveAgentAvatarFallbackUrl, resolveAgentAvatarImageUrl } from '../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../../src/utils/color/Color';
import { darken } from '../../../../../../src/utils/color/operators/darken';
import { textColor } from '../../../../../../src/utils/color/operators/furthest';
import { lighten } from '../../../../../../src/utils/color/operators/lighten';
import { buildFolderMaps, getFolderPathSegments, sortBySortOrder } from '../agentOrganizationUtils';
import { normalizeServerUrl } from './graphData';
import type { AgentOrganizationFolder } from '../../../utils/agentOrganization/types';
import type {
    AgentWithVisibility,
    AgentNodeData,
    FolderGroup,
    FolderLayout,
    GraphNode,
    NodeVisualStyle,
    ServerGroup,
    ServerLayout,
    StoredPositions,
} from './AgentsGraph.types';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const FOLDER_HEADER_HEIGHT = 24;
const FOLDER_PADDING_X = 24;
const FOLDER_PADDING_Y = 20;
const FOLDER_GAP_X = 40;
const FOLDER_GAP_Y = 32;
const AGENT_MAX_COLUMNS = 4;
const AGENT_HORIZONTAL_GAP = 16;
const AGENT_VERTICAL_GAP = 16;
const SERVER_HEADER_HEIGHT = 28;
const SERVER_PADDING_X = 32;
const SERVER_PADDING_Y = 24;
const SERVER_GAP = 64;

/**
 * Build a path label for a folder id.
 * @private function of AgentsGraph
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
 * @private function of AgentsGraph
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
 * Build server group descriptors from graph nodes and folders.
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

/**
 * Build the visual chip style for an agent node based on its brand color.
 * @private function of AgentsGraph
 */
const buildAgentChipStyle = (agent: AgentWithVisibility): NodeVisualStyle => {
    const brandColor = Color.fromSafe(agent.meta.color || PROMPTBOOK_COLOR);
    const softenedColor = brandColor.then(lighten(0.3));

    return {
        fill: softenedColor.toHex(),
        border: brandColor.then(darken(0.08)).toHex(),
        ring: brandColor.then(darken(0.04)).toHex(),
        text: softenedColor.then(textColor).toHex(),
    };
};

/**
 * Build the tooltip text for the node.
 * @private function of AgentsGraph
 */
const getAgentTooltip = (agent: AgentWithVisibility): string =>
    agent.meta.description || agent.personaDescription || agent.agentName;

/**
 * Resolve the agent image URLs for display and fallback handling.
 * @private function of AgentsGraph
 */
const getAgentImageUrls = (agent: AgentWithVisibility, publicUrl: string): { imageUrl: string; placeholderUrl: string } => {
    const serverUrl = getAgentServerUrl(agent, publicUrl);
    const fallbackId = agent.permanentId || agent.agentName;
    const placeholderUrl =
        resolveAgentAvatarFallbackUrl({ agent, baseUrl: serverUrl }) ||
        `/agents/${encodeURIComponent(fallbackId)}/images/default-avatar.png`;
    const imageUrl = resolveAgentAvatarImageUrl({ agent, baseUrl: serverUrl }) || placeholderUrl;

    return { imageUrl, placeholderUrl };
};

/**
 * Build nodes for servers, folders, and agents using a hierarchical grid layout that keeps the current server centered.
 */
export const buildGraphLayoutNodes = (params: {
    serverGroups: ServerGroup[];
    orderIndexByNodeId: Map<string, number>;
    publicUrl: string;
    storedPositions: StoredPositions;
    onNodeOpen: (node: GraphNode) => void;
}): import('reactflow').Node[] => {
    const { serverGroups, orderIndexByNodeId, publicUrl, storedPositions, onNodeOpen } = params;
    const nodes: import('reactflow').Node[] = [];

    if (serverGroups.length === 0) {
        return nodes;
    }

    const serverLayouts = serverGroups.map((serverGroup) => {
        const folderLayouts: FolderLayout[] = serverGroup.folders.map((folder): FolderLayout => {
            const agentCount = folder.agents.length;
            const agentColumns = Math.max(1, Math.min(AGENT_MAX_COLUMNS, Math.ceil(Math.sqrt(agentCount || 1))));
            const rows = Math.max(1, Math.ceil(agentCount / agentColumns));
            const contentWidth = agentColumns * NODE_WIDTH + Math.max(0, agentColumns - 1) * AGENT_HORIZONTAL_GAP;
            const contentHeight = rows * NODE_HEIGHT + Math.max(0, rows - 1) * AGENT_VERTICAL_GAP;
            const width = Math.max(contentWidth + FOLDER_PADDING_X * 2, NODE_WIDTH + FOLDER_PADDING_X * 2);
            const height = Math.max(
                contentHeight + FOLDER_PADDING_Y * 2 + FOLDER_HEADER_HEIGHT,
                NODE_HEIGHT + FOLDER_PADDING_Y * 2 + FOLDER_HEADER_HEIGHT,
            );

            return {
                folder,
                width,
                height,
                agentColumns,
                contentWidth,
                contentHeight,
            };
        });

        const folderColumnCount = Math.max(1, Math.ceil(Math.sqrt(folderLayouts.length)));
        const folderRowCount = Math.max(1, Math.ceil(folderLayouts.length / folderColumnCount));
        const columnWidths = Array(folderColumnCount).fill(0);
        const rowHeights = Array(folderRowCount).fill(0);

        folderLayouts.forEach((layout, index) => {
            const column = index % folderColumnCount;
            const row = Math.floor(index / folderColumnCount);
            layout.column = column;
            layout.row = row;
            columnWidths[column] = Math.max(columnWidths[column], layout.width);
            rowHeights[row] = Math.max(rowHeights[row], layout.height);
        });

        const columnOffsets: number[] = [];
        for (let columnIndex = 0; columnIndex < folderColumnCount; columnIndex += 1) {
            columnOffsets[columnIndex] =
                columnIndex === 0
                    ? SERVER_PADDING_X
                    : columnOffsets[columnIndex - 1] + columnWidths[columnIndex - 1] + FOLDER_GAP_X;
        }

        const rowOffsets: number[] = [];
        for (let rowIndex = 0; rowIndex < folderRowCount; rowIndex += 1) {
            rowOffsets[rowIndex] =
                rowIndex === 0
                    ? SERVER_HEADER_HEIGHT + SERVER_PADDING_Y
                    : rowOffsets[rowIndex - 1] + rowHeights[rowIndex - 1] + FOLDER_GAP_Y;
        }

        folderLayouts.forEach((layout) => {
            layout.x = columnOffsets[layout.column ?? 0];
            layout.y = rowOffsets[layout.row ?? 0];
        });

        const serverWidth =
            columnWidths.reduce((sum, width) => sum + width, 0) +
            Math.max(folderColumnCount - 1, 0) * FOLDER_GAP_X +
            SERVER_PADDING_X * 2;
        const serverHeight =
            SERVER_HEADER_HEIGHT +
            SERVER_PADDING_Y * 2 +
            rowHeights.reduce((sum, height) => sum + height, 0) +
            Math.max(folderRowCount - 1, 0) * FOLDER_GAP_Y;

        return { serverGroup, folderLayouts, width: serverWidth, height: serverHeight } satisfies ServerLayout;
    });

    const maxServerWidth = Math.max(NODE_WIDTH, ...serverLayouts.map((layout) => layout.width));
    const maxServerHeight = Math.max(NODE_HEIGHT, ...serverLayouts.map((layout) => layout.height));
    const serverColumnCount = Math.max(1, Math.ceil(Math.sqrt(serverLayouts.length)));
    const serverRowCount = Math.ceil(serverLayouts.length / serverColumnCount);
    const centerColumn = (serverColumnCount - 1) / 2;
    const centerRow = (serverRowCount - 1) / 2;
    const serverSpacingX = maxServerWidth + SERVER_GAP;
    const serverSpacingY = maxServerHeight + SERVER_GAP;

    const serverCoords: { row: number; column: number }[] = [];
    for (let row = 0; row < serverRowCount; row += 1) {
        for (let column = 0; column < serverColumnCount; column += 1) {
            serverCoords.push({ row, column });
        }
    }

    serverCoords.sort((left, right) => {
        const leftDistance = Math.abs(left.row - centerRow) + Math.abs(left.column - centerColumn);
        const rightDistance = Math.abs(right.row - centerRow) + Math.abs(right.column - centerColumn);
        if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
        }
        if (left.row !== right.row) {
            return left.row - right.row;
        }
        return left.column - right.column;
    });

    const centerOffsetX = centerColumn * serverSpacingX;
    const centerOffsetY = centerRow * serverSpacingY;

    serverLayouts.forEach((layout, index) => {
        const coord = serverCoords[index];
        if (!coord) {
            return;
        }
        const serverX = coord.column * serverSpacingX - centerOffsetX;
        const serverY = coord.row * serverSpacingY - centerOffsetY;
        const serverNodeId = `server:${layout.serverGroup.serverUrl}`;

        nodes.push({
            id: serverNodeId,
            type: 'serverGroup',
            position: { x: serverX, y: serverY },
            data: {
                label: layout.serverGroup.label,
                agentCount: layout.serverGroup.folders.reduce((sum, folder) => sum + folder.agents.length, 0),
                isLocal: layout.serverGroup.isLocal,
            },
            style: {
                width: layout.width,
                height: layout.height,
                zIndex: 0,
            },
            selectable: false,
            draggable: false,
        });

        layout.folderLayouts.forEach((folderLayout) => {
            const folderNodeId = `folder:${layout.serverGroup.serverUrl}:${folderLayout.folder.id ?? 'root'}`;
            nodes.push({
                id: folderNodeId,
                type: 'folderGroup',
                parentId: serverNodeId,
                extent: 'parent',
                position: {
                    x: folderLayout.x ?? SERVER_PADDING_X,
                    y: folderLayout.y ?? SERVER_HEADER_HEIGHT + SERVER_PADDING_Y,
                },
                data: {
                    label: folderLayout.folder.label,
                    agentCount: folderLayout.folder.agents.length,
                },
                style: {
                    width: folderLayout.width,
                    height: folderLayout.height,
                    zIndex: 1,
                },
                selectable: false,
                draggable: false,
            });

            folderLayout.folder.agents.forEach((agent, agentIndex) => {
                const { imageUrl, placeholderUrl } = getAgentImageUrls(agent.agent, publicUrl);
                const style = buildAgentChipStyle(agent.agent);
                const orderIndex = orderIndexByNodeId.get(agent.id) ?? null;
                const tooltipParts = [getAgentTooltip(agent.agent)];
                if (folderLayout.folder.label) {
                    tooltipParts.push(`Folder: ${folderLayout.folder.label}`);
                }
                const tooltip = tooltipParts.filter(Boolean).join('\\n');

                const column = agentIndex % folderLayout.agentColumns;
                const row = Math.floor(agentIndex / folderLayout.agentColumns);
                const horizontalAvailable = folderLayout.width - FOLDER_PADDING_X * 2;
                const horizontalOffset = Math.max(0, (horizontalAvailable - folderLayout.contentWidth) / 2);
                const agentX = FOLDER_PADDING_X + horizontalOffset + column * (NODE_WIDTH + AGENT_HORIZONTAL_GAP);
                const verticalAvailable = folderLayout.height - FOLDER_PADDING_Y * 2 - FOLDER_HEADER_HEIGHT;
                const verticalOffset = Math.max(0, (verticalAvailable - folderLayout.contentHeight) / 2);
                const agentY =
                    FOLDER_HEADER_HEIGHT + FOLDER_PADDING_Y + verticalOffset + row * (NODE_HEIGHT + AGENT_VERTICAL_GAP);

                const storedPosition = storedPositions[agent.id];
                const finalPosition =
                    storedPosition && storedPosition.parentId === folderNodeId
                        ? { x: storedPosition.x, y: storedPosition.y }
                        : { x: agentX, y: agentY };

                nodes.push({
                    id: agent.id,
                    type: 'agent',
                    parentId: folderNodeId,
                    extent: 'parent',
                    position: finalPosition,
                    data: {
                        name: agent.name,
                        agent: agent.agent,
                        imageUrl,
                        placeholderUrl,
                        tooltip,
                        style,
                        orderIndex,
                        onOpen: () => onNodeOpen(agent),
                    } satisfies AgentNodeData,
                    style: {
                        width: NODE_WIDTH,
                        height: NODE_HEIGHT,
                        zIndex: 2,
                    },
                    draggable: true,
                });
            });
        });
    });

    return nodes;
};
