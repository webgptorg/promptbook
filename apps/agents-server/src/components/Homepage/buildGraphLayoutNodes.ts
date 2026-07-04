import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { resolveAgentAvatarFallbackUrl, resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../src/utils/color/Color';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { textColor } from '../../../../../src/utils/color/operators/furthest';
import { lighten } from '../../../../../src/utils/color/operators/lighten';
import type { Node } from 'reactflow';
import type { AgentWithVisibility, GraphLink, GraphNode, ServerGroup } from './buildGraphDataTypes';
import {
    buildFreeGraphBoxLayout,
    type FreeGraphBoxLayoutLink,
    type FreeGraphBoxLayoutPosition,
} from './buildFreeGraphBoxLayout';
import { normalizeServerUrl } from './normalizeServerUrl';

/**
 * Width of each rendered agent node.
 *
 * @private function of AgentsGraph
 */
const NODE_WIDTH = 220;

/**
 * Height of each rendered agent node.
 *
 * @private function of AgentsGraph
 */
const NODE_HEIGHT = 64;

/**
 * Folder heading height used inside server groups.
 *
 * @private function of AgentsGraph
 */
const FOLDER_HEADER_HEIGHT = 24;

/**
 * Horizontal folder padding.
 *
 * @private function of AgentsGraph
 */
const FOLDER_PADDING_X = 24;

/**
 * Vertical folder padding.
 *
 * @private function of AgentsGraph
 */
const FOLDER_PADDING_Y = 20;

/**
 * Horizontal spacing between agent nodes.
 *
 * @private function of AgentsGraph
 */
const AGENT_HORIZONTAL_GAP = 16;

/**
 * Vertical spacing between agent nodes.
 *
 * @private function of AgentsGraph
 */
const AGENT_VERTICAL_GAP = 16;

/**
 * Server title strip height.
 *
 * @private function of AgentsGraph
 */
const SERVER_HEADER_HEIGHT = 28;

/**
 * Horizontal server padding.
 *
 * @private function of AgentsGraph
 */
const SERVER_PADDING_X = 32;

/**
 * Vertical server padding.
 *
 * @private function of AgentsGraph
 */
const SERVER_PADDING_Y = 24;

/**
 * Horizontal gap between server groups.
 *
 * @private function of AgentsGraph
 */
const SERVER_GAP_X = 96;

/**
 * Vertical gap between server groups.
 *
 * @private function of AgentsGraph
 */
const SERVER_GAP_Y = 80;

/**
 * Preferred distance between linked agent nodes during layout relaxation.
 *
 * @private function of AgentsGraph
 */
const AGENT_RELATIONSHIP_DISTANCE = 96;

/**
 * Strength used to pull linked agent nodes together.
 *
 * @private function of AgentsGraph
 */
const AGENT_RELATIONSHIP_STRENGTH = 0.045;

/**
 * Strength used to keep unrelated agent nodes near their seeded placement.
 *
 * @private function of AgentsGraph
 */
const AGENT_CENTER_PULL_STRENGTH = 0.014;

/**
 * Preferred distance between linked folder groups during layout relaxation.
 *
 * @private function of AgentsGraph
 */
const FOLDER_RELATIONSHIP_DISTANCE = 180;

/**
 * Strength used to pull linked folder groups together.
 *
 * @private function of AgentsGraph
 */
const FOLDER_RELATIONSHIP_STRENGTH = 0.035;

/**
 * Strength used to keep unrelated folder groups near their seeded placement.
 *
 * @private function of AgentsGraph
 */
const FOLDER_CENTER_PULL_STRENGTH = 0.012;

/**
 * Preferred distance between linked server groups during layout relaxation.
 *
 * @private function of AgentsGraph
 */
const SERVER_RELATIONSHIP_DISTANCE = 260;

/**
 * Strength used to pull linked server groups together.
 *
 * @private function of AgentsGraph
 */
const SERVER_RELATIONSHIP_STRENGTH = 0.028;

/**
 * Strength used to keep remote server groups around the current server.
 *
 * @private function of AgentsGraph
 */
const SERVER_CENTER_PULL_STRENGTH = 0.01;

/**
 * Storage key prefix for persisted node positions.
 *
 * @private function of AgentsGraph
 */
const GRAPH_POSITIONS_STORAGE_KEY = 'agents-graph-positions-v1';

/**
 * Visual styling for a node chip.
 *
 * @private function of AgentsGraph
 */
type NodeVisualStyle = {
    fill: string;
    border: string;
    ring: string;
    text: string;
};

/**
 * Folder layout metrics.
 *
 * @private function of AgentsGraph
 */
type FolderLayout = {
    folder: ServerGroup['folders'][number];
    nodeId: string;
    width: number;
    height: number;
    agentPositionsById: Map<string, FreeGraphBoxLayoutPosition>;
    orderIndex: number;
};

/**
 * Server layout metrics.
 *
 * @private function of AgentsGraph
 */
type ServerLayout = {
    serverGroup: ServerGroup;
    nodeId: string;
    folderLayouts: FolderLayout[];
    folderPositionsById: Map<string, FreeGraphBoxLayoutPosition>;
    width: number;
    height: number;
    orderIndex: number;
};

/**
 * Hierarchical placement metadata for one agent node.
 *
 * @private function of AgentsGraph
 */
type AgentLayoutLocation = {
    serverNodeId: string;
    folderNodeId: string;
};

/**
 * Weighted layout link accumulator.
 *
 * @private function of AgentsGraph
 */
type AggregatedLayoutLink = {
    sourceId: string;
    targetId: string;
    weight: number;
};

/**
 * Stored position for a draggable node.
 *
 * @private function of AgentsGraph
 */
export type StoredNodePosition = {
    x: number;
    y: number;
    parentId: string;
};

/**
 * Record of stored positions by node id.
 *
 * @private function of AgentsGraph
 */
export type StoredPositions = Record<string, StoredNodePosition>;

/**
 * Node data for agent nodes.
 *
 * @private function of AgentsGraph
 */
export type AgentNodeData = {
    name: string;
    agent: AgentWithVisibility;
    imageUrl: string;
    placeholderUrl: string;
    tooltip: string;
    style: NodeVisualStyle;
    orderIndex: number | null;
    isDimmed?: boolean;
    isHighlighted?: boolean;
    isNeighbor?: boolean;
    onOpen: () => void;
};

/**
 * Node data for server group nodes.
 *
 * @private function of AgentsGraph
 */
export type ServerGroupNodeData = {
    label: string;
    agentCount: number;
    isLocal: boolean;
};

/**
 * Node data for folder group nodes.
 *
 * @private function of AgentsGraph
 */
export type FolderGroupNodeData = {
    label: string;
    agentCount: number;
};

/**
 * Return the canonical server URL for the agent or fallback server URL.
 */
const getAgentServerUrl = (agent: AgentWithVisibility, fallbackServerUrl: string): string =>
    normalizeServerUrl(agent.serverUrl || fallbackServerUrl);

/**
 * Build the tooltip text for the node.
 */
const getAgentTooltip = (agent: AgentWithVisibility): string =>
    agent.meta.description || agent.personaDescription || agent.agentName;

/**
 * Resolve the agent image URLs for display and fallback handling.
 */
const getAgentImageUrls = (
    agent: AgentWithVisibility,
    publicUrl: string,
): { imageUrl: string; placeholderUrl: string } => {
    const serverUrl = getAgentServerUrl(agent, publicUrl);
    const fallbackId = agent.permanentId || agent.agentName;
    const placeholderUrl =
        resolveAgentAvatarFallbackUrl({ agent, baseUrl: serverUrl }) ||
        `/agents/${encodeURIComponent(fallbackId)}/images/default-avatar.png`;
    const imageUrl = resolveAgentAvatarImageUrl({ agent, baseUrl: serverUrl }) || placeholderUrl;

    return { imageUrl, placeholderUrl };
};

/**
 * Build the visual chip style for an agent node based on its brand color.
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
 * Build the storage key for graph positions.
 *
 * @private function of AgentsGraph
 */
export const buildPositionsStorageKey = (publicUrl: string): string => {
    const normalized = normalizeServerUrl(publicUrl);
    return `${GRAPH_POSITIONS_STORAGE_KEY}:${normalized}`;
};

/**
 * Load node positions from local storage.
 *
 * @private function of AgentsGraph
 */
export const loadStoredPositions = (storageKey: string): StoredPositions => {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as StoredPositions;
        return parsed || {};
    } catch {
        return {};
    }
};

/**
 * Persist node positions to local storage.
 *
 * @private function of AgentsGraph
 */
export const saveStoredPositions = (storageKey: string, positions: StoredPositions): void => {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(positions));
    } catch (error) {
        console.warn('Failed to save graph positions.', error);
    }
};

/**
 * Build the stable React Flow server group node id.
 */
const buildServerNodeId = (serverUrl: string): string => `server:${serverUrl}`;

/**
 * Build the stable React Flow folder group node id.
 */
const buildFolderNodeId = (serverUrl: string, folderId: number | null): string =>
    `folder:${serverUrl}:${folderId ?? 'root'}`;

/**
 * Add or increment an undirected layout link.
 */
function addAggregatedLayoutLink(
    linksByKey: Map<string, AggregatedLayoutLink>,
    sourceId: string,
    targetId: string,
): void {
    if (sourceId === targetId) {
        return;
    }

    const isSourceFirst = sourceId.localeCompare(targetId) <= 0;
    const normalizedSourceId = isSourceFirst ? sourceId : targetId;
    const normalizedTargetId = isSourceFirst ? targetId : sourceId;
    const key = `${normalizedSourceId}->${normalizedTargetId}`;
    const existingLink = linksByKey.get(key);

    if (existingLink) {
        existingLink.weight += 1;
        return;
    }

    linksByKey.set(key, {
        sourceId: normalizedSourceId,
        targetId: normalizedTargetId,
        weight: 1,
    });
}

/**
 * Convert aggregated layout links to the free-layout helper shape.
 */
function finalizeAggregatedLayoutLinks(linksByKey: ReadonlyMap<string, AggregatedLayoutLink>): FreeGraphBoxLayoutLink[] {
    return Array.from(linksByKey.values()).map((link) => ({
        sourceId: link.sourceId,
        targetId: link.targetId,
        weight: link.weight,
    }));
}

/**
 * Build server and folder lookup metadata for every agent node.
 */
function buildAgentLayoutLocationById(serverGroups: ReadonlyArray<ServerGroup>): Map<string, AgentLayoutLocation> {
    const agentLayoutLocationById = new Map<string, AgentLayoutLocation>();

    serverGroups.forEach((serverGroup) => {
        const serverNodeId = buildServerNodeId(serverGroup.serverUrl);

        serverGroup.folders.forEach((folder) => {
            const folderNodeId = buildFolderNodeId(serverGroup.serverUrl, folder.id);

            folder.agents.forEach((agent) => {
                agentLayoutLocationById.set(agent.id, {
                    serverNodeId,
                    folderNodeId,
                });
            });
        });
    });

    return agentLayoutLocationById;
}

/**
 * Build weighted layout links between agents inside one folder.
 */
function buildAgentLayoutLinks(
    folder: ServerGroup['folders'][number],
    graphLinks: ReadonlyArray<GraphLink>,
): FreeGraphBoxLayoutLink[] {
    const agentIds = new Set(folder.agents.map((agent) => agent.id));
    const linksByKey = new Map<string, AggregatedLayoutLink>();

    graphLinks.forEach((link) => {
        if (!agentIds.has(link.source) || !agentIds.has(link.target)) {
            return;
        }

        addAggregatedLayoutLink(linksByKey, link.source, link.target);
    });

    return finalizeAggregatedLayoutLinks(linksByKey);
}

/**
 * Build weighted layout links between folders inside one server.
 */
function buildFolderLayoutLinks(
    serverNodeId: string,
    graphLinks: ReadonlyArray<GraphLink>,
    agentLayoutLocationById: ReadonlyMap<string, AgentLayoutLocation>,
): FreeGraphBoxLayoutLink[] {
    const linksByKey = new Map<string, AggregatedLayoutLink>();

    graphLinks.forEach((link) => {
        const sourceLocation = agentLayoutLocationById.get(link.source);
        const targetLocation = agentLayoutLocationById.get(link.target);

        if (!sourceLocation || !targetLocation) {
            return;
        }

        if (sourceLocation.serverNodeId !== serverNodeId || targetLocation.serverNodeId !== serverNodeId) {
            return;
        }

        addAggregatedLayoutLink(linksByKey, sourceLocation.folderNodeId, targetLocation.folderNodeId);
    });

    return finalizeAggregatedLayoutLinks(linksByKey);
}

/**
 * Build weighted layout links between server groups.
 */
function buildServerLayoutLinks(
    graphLinks: ReadonlyArray<GraphLink>,
    agentLayoutLocationById: ReadonlyMap<string, AgentLayoutLocation>,
): FreeGraphBoxLayoutLink[] {
    const linksByKey = new Map<string, AggregatedLayoutLink>();

    graphLinks.forEach((link) => {
        const sourceLocation = agentLayoutLocationById.get(link.source);
        const targetLocation = agentLayoutLocationById.get(link.target);

        if (!sourceLocation || !targetLocation) {
            return;
        }

        addAggregatedLayoutLink(linksByKey, sourceLocation.serverNodeId, targetLocation.serverNodeId);
    });

    return finalizeAggregatedLayoutLinks(linksByKey);
}

/**
 * Build the free-layout dimensions and node positions for one folder.
 */
function buildFolderLayout(
    serverUrl: string,
    folder: ServerGroup['folders'][number],
    orderIndex: number,
    graphLinks: ReadonlyArray<GraphLink>,
): FolderLayout {
    const nodeId = buildFolderNodeId(serverUrl, folder.id);
    const agentLayout = buildFreeGraphBoxLayout(
        folder.agents.map((agent, agentIndex) => ({
            id: agent.id,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            orderIndex: agentIndex,
        })),
        buildAgentLayoutLinks(folder, graphLinks),
        {
            paddingX: FOLDER_PADDING_X,
            paddingY: FOLDER_PADDING_Y,
            gapX: AGENT_HORIZONTAL_GAP,
            gapY: AGENT_VERTICAL_GAP,
            relationshipDistance: AGENT_RELATIONSHIP_DISTANCE,
            relationshipStrength: AGENT_RELATIONSHIP_STRENGTH,
            centerPullStrength: AGENT_CENTER_PULL_STRENGTH,
        },
    );

    return {
        folder,
        nodeId,
        width: Math.max(agentLayout.width, NODE_WIDTH + FOLDER_PADDING_X * 2),
        height: Math.max(agentLayout.height + FOLDER_HEADER_HEIGHT, NODE_HEIGHT + FOLDER_PADDING_Y * 2 + FOLDER_HEADER_HEIGHT),
        agentPositionsById: agentLayout.positionsById,
        orderIndex,
    };
}

/**
 * Build the free-layout dimensions and folder positions for one server.
 */
function buildServerLayout(
    serverGroup: ServerGroup,
    orderIndex: number,
    graphLinks: ReadonlyArray<GraphLink>,
    agentLayoutLocationById: ReadonlyMap<string, AgentLayoutLocation>,
): ServerLayout {
    const nodeId = buildServerNodeId(serverGroup.serverUrl);
    const folderLayouts = serverGroup.folders.map((folder, folderIndex) =>
        buildFolderLayout(serverGroup.serverUrl, folder, folderIndex, graphLinks),
    );
    const rootFolder = folderLayouts.find((folderLayout) => folderLayout.folder.id === null);
    const folderLayout = buildFreeGraphBoxLayout(
        folderLayouts.map((layout) => ({
            id: layout.nodeId,
            width: layout.width,
            height: layout.height,
            orderIndex: layout.orderIndex,
        })),
        buildFolderLayoutLinks(nodeId, graphLinks, agentLayoutLocationById),
        {
            paddingX: SERVER_PADDING_X,
            paddingY: SERVER_PADDING_Y,
            gapX: FOLDER_PADDING_X * 2,
            gapY: FOLDER_PADDING_Y * 2,
            relationshipDistance: FOLDER_RELATIONSHIP_DISTANCE,
            relationshipStrength: FOLDER_RELATIONSHIP_STRENGTH,
            centerPullStrength: FOLDER_CENTER_PULL_STRENGTH,
            centerItemId: rootFolder?.nodeId,
        },
    );

    return {
        serverGroup,
        nodeId,
        folderLayouts,
        folderPositionsById: folderLayout.positionsById,
        width: Math.max(folderLayout.width, NODE_WIDTH + SERVER_PADDING_X * 2),
        height: Math.max(folderLayout.height + SERVER_HEADER_HEIGHT, NODE_HEIGHT + SERVER_PADDING_Y * 2 + SERVER_HEADER_HEIGHT),
        orderIndex,
    };
}

/**
 * Build free-layout server group positions while keeping the current server centered.
 */
function buildServerPositionsById(
    serverLayouts: ReadonlyArray<ServerLayout>,
    graphLinks: ReadonlyArray<GraphLink>,
    agentLayoutLocationById: ReadonlyMap<string, AgentLayoutLocation>,
    publicUrl: string,
): Map<string, FreeGraphBoxLayoutPosition> {
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const currentServerNodeId = buildServerNodeId(normalizedPublicUrl);
    const centerServerLayout =
        serverLayouts.find((layout) => layout.nodeId === currentServerNodeId) || serverLayouts[0] || null;
    const serverLayout = buildFreeGraphBoxLayout(
        serverLayouts.map((layout) => ({
            id: layout.nodeId,
            width: layout.width,
            height: layout.height,
            orderIndex: layout.orderIndex,
        })),
        buildServerLayoutLinks(graphLinks, agentLayoutLocationById),
        {
            paddingX: 0,
            paddingY: 0,
            gapX: SERVER_GAP_X,
            gapY: SERVER_GAP_Y,
            relationshipDistance: SERVER_RELATIONSHIP_DISTANCE,
            relationshipStrength: SERVER_RELATIONSHIP_STRENGTH,
            centerPullStrength: SERVER_CENTER_PULL_STRENGTH,
            centerItemId: centerServerLayout?.nodeId,
        },
    );

    if (!centerServerLayout) {
        return serverLayout.positionsById;
    }

    const centerServerPosition = serverLayout.positionsById.get(centerServerLayout.nodeId);
    if (!centerServerPosition) {
        return serverLayout.positionsById;
    }

    const centerX = centerServerPosition.x + centerServerLayout.width / 2;
    const centerY = centerServerPosition.y + centerServerLayout.height / 2;
    const centeredPositionsById = new Map<string, FreeGraphBoxLayoutPosition>();

    serverLayout.positionsById.forEach((position, serverNodeId) => {
        centeredPositionsById.set(serverNodeId, {
            x: position.x - centerX,
            y: position.y - centerY,
        });
    });

    return centeredPositionsById;
}

/**
 * Build nodes for servers, folders, and agents using a hierarchical free layout that keeps the current server centered.
 *
 * @private function of AgentsGraph
 */
export const buildGraphLayoutNodes = (params: {
    serverGroups: ServerGroup[];
    links: GraphLink[];
    orderIndexByNodeId: Map<string, number>;
    publicUrl: string;
    storedPositions: StoredPositions;
    onNodeOpen: (node: GraphNode) => void;
}): Node[] => {
    const { serverGroups, links, orderIndexByNodeId, publicUrl, storedPositions, onNodeOpen } = params;
    const nodes: Node[] = [];

    if (serverGroups.length === 0) {
        return nodes;
    }

    const agentLayoutLocationById = buildAgentLayoutLocationById(serverGroups);
    const serverLayouts = serverGroups.map((serverGroup, serverIndex) =>
        buildServerLayout(serverGroup, serverIndex, links, agentLayoutLocationById),
    );
    const serverPositionsById = buildServerPositionsById(serverLayouts, links, agentLayoutLocationById, publicUrl);

    serverLayouts.forEach((layout) => {
        const serverPosition = serverPositionsById.get(layout.nodeId) ?? { x: 0, y: 0 };

        nodes.push({
            id: layout.nodeId,
            type: 'serverGroup',
            position: serverPosition,
            data: {
                label: layout.serverGroup.label,
                agentCount: layout.serverGroup.folders.reduce((sum, folder) => sum + folder.agents.length, 0),
                isLocal: layout.serverGroup.isLocal,
            } satisfies ServerGroupNodeData,
            style: {
                width: layout.width,
                height: layout.height,
                zIndex: 0,
            },
            selectable: false,
            draggable: false,
        });

        layout.folderLayouts.forEach((folderLayout) => {
            const folderPosition = layout.folderPositionsById.get(folderLayout.nodeId) ?? {
                x: SERVER_PADDING_X,
                y: SERVER_PADDING_Y,
            };

            nodes.push({
                id: folderLayout.nodeId,
                type: 'folderGroup',
                parentId: layout.nodeId,
                extent: 'parent',
                position: {
                    x: folderPosition.x,
                    y: SERVER_HEADER_HEIGHT + folderPosition.y,
                },
                data: {
                    label: folderLayout.folder.label,
                    agentCount: folderLayout.folder.agents.length,
                } satisfies FolderGroupNodeData,
                style: {
                    width: folderLayout.width,
                    height: folderLayout.height,
                    zIndex: 1,
                },
                selectable: false,
                draggable: false,
            });

            folderLayout.folder.agents.forEach((agent) => {
                const { imageUrl, placeholderUrl } = getAgentImageUrls(agent.agent, publicUrl);
                const style = buildAgentChipStyle(agent.agent);
                const orderIndex = orderIndexByNodeId.get(agent.id) ?? null;
                const tooltipParts = [getAgentTooltip(agent.agent)];
                if (folderLayout.folder.label) {
                    tooltipParts.push(`Folder: ${folderLayout.folder.label}`);
                }
                const tooltip = tooltipParts.filter(Boolean).join('\n');
                const agentPosition = folderLayout.agentPositionsById.get(agent.id) ?? {
                    x: FOLDER_PADDING_X,
                    y: FOLDER_PADDING_Y,
                };
                const storedPosition = storedPositions[agent.id];
                const finalPosition =
                    storedPosition && storedPosition.parentId === folderLayout.nodeId
                        ? { x: storedPosition.x, y: storedPosition.y }
                        : { x: agentPosition.x, y: FOLDER_HEADER_HEIGHT + agentPosition.y };

                nodes.push({
                    id: agent.id,
                    type: 'agent',
                    parentId: folderLayout.nodeId,
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
