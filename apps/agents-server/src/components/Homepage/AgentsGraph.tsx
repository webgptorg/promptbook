'use client';

import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { string_url } from '@promptbook-local/types';
import { toPng, toSvg } from 'html-to-image';
import { Code, FileImage, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    useNodesState,
    type Edge,
    type Node,
    type NodeProps,
    type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import {
    resolveAgentAvatarFallbackUrl,
    resolveAgentAvatarImageUrl,
} from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../src/utils/color/Color';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { textColor } from '../../../../../src/utils/color/operators/furthest';
import { lighten } from '../../../../../src/utils/color/operators/lighten';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { buildFolderMaps, getFolderPathSegments, sortBySortOrder } from './agentOrganizationUtils';

const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;
const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];
const GRAPH_MIN_HEIGHT = 480;
const GRAPH_HEIGHT_OFFSET = 340;
const GRAPH_DOWNLOAD_PREFIX = 'agents-graph';
const GRAPH_POSITIONS_STORAGE_KEY = 'agents-graph-positions-v1';
const GRAPH_EXPORT_BACKGROUND = '#f8fafc';
const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const FOLDER_HEADER_HEIGHT = 24;
const FOLDER_PADDING_X = 24;
const FOLDER_PADDING_Y = 20;
const FOLDER_GAP = 32;
const SERVER_HEADER_HEIGHT = 28;
const SERVER_PADDING_X = 32;
const SERVER_PADDING_Y = 24;
const SERVER_GAP = 64;

/**
 * Agent metadata plus visibility, server, and folder details used by the graph UI.
 */
type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
    serverUrl?: string;
    folderId?: number | null;
    sortOrder?: number;
};

/**
 * Graph connection types supported by the UI.
 */
type ConnectionType = (typeof CONNECTION_TYPES)[number];

/**
 * Link types used in the graph view.
 */
type GraphLinkKind = ConnectionType | 'order';

/**
 * Visual styling for a node chip.
 */
type NodeVisualStyle = {
    fill: string;
    border: string;
    ring: string;
    text: string;
};

/**
 * Props for the AgentsGraph component.
 */
type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
    readonly folders: AgentOrganizationFolder[];
};

/**
 * Graph node data for a single agent.
 */
type GraphNode = {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    serverUrl: string;
    isLocal: boolean;
    folderId: number | null;
    sortOrder: number;
};

/**
 * Graph link between two agents.
 */
type GraphLink = {
    source: string;
    target: string;
    type: GraphLinkKind;
};

/**
 * Aggregated nodes and links for rendering.
 */
type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
    orderLinks: GraphLink[];
    orderIndexByNodeId: Map<string, number>;
};

/**
 * Summary metrics derived from the current graph data.
 */
type GraphSummaryInfo = {
    agentCount: number;
    serverCount: number;
    totalConnections: number;
    connectionCountByType: Record<ConnectionType, number>;
    orderLinkCount: number;
};

/**
 * Inputs needed to build the graph data structure.
 */
type GraphDataInput = {
    agents: AgentWithVisibility[];
    federatedAgents: AgentWithVisibility[];
    filterType: ConnectionType[];
    selectedServerUrl: string | null;
    selectedAgentName: string | null;
    publicUrl: string;
};

/**
 * Folder grouping information for layout.
 */
type FolderGroup = {
    id: number | null;
    label: string;
    agents: GraphNode[];
};

/**
 * Server grouping information for layout.
 */
type ServerGroup = {
    serverUrl: string;
    label: string;
    isLocal: boolean;
    folders: FolderGroup[];
};

/**
 * Stored position for a draggable node.
 */
type StoredNodePosition = {
    x: number;
    y: number;
    parentId: string;
};

/**
 * Record of stored positions by node id.
 */
type StoredPositions = Record<string, StoredNodePosition>;

/**
 * Node data for agent nodes.
 */
type AgentNodeData = {
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
 */
type ServerGroupNodeData = {
    label: string;
    agentCount: number;
    isLocal: boolean;
};

/**
 * Node data for folder group nodes.
 */
type FolderGroupNodeData = {
    label: string;
    agentCount: number;
};

const EDGE_STYLES: Record<GraphLinkKind, { color: string; width: number; dash?: string }> = {
    inheritance: { color: '#38bdf8', width: 1.6, dash: '6 6' },
    import: { color: '#94a3b8', width: 1.25 },
    team: { color: '#34d399', width: 2.5 },
    order: { color: '#f59e0b', width: 1.1, dash: '2 6' },
};
const EDGE_LABELS: Record<GraphLinkKind, string> = {
    inheritance: 'Parent',
    import: 'Import',
    team: 'Team',
    order: 'Folder order',
};

/**
 * Normalize a server URL by removing any trailing slash.
 */
const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');

/**
 * Normalize a selected agent identifier by stripping agent URL prefixes.
 */
const normalizeSelectedAgentIdentifier = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const withoutHash = trimmed.split('#')[0] ?? trimmed;
    const withoutQuery = withoutHash.split('?')[0] ?? withoutHash;
    const normalized = withoutQuery.replace(/\/$/, '');
    const agentsIndex = normalized.lastIndexOf('/agents/');
    if (agentsIndex >= 0) {
        return normalized.slice(agentsIndex + '/agents/'.length);
    }

    return normalized.replace(/^\/agents\//, '');
};

/**
 * Parse the selected agent input into identifier and optional server URL.
 */
const parseSelectedAgentInput = (value: string): { identifier: string; serverUrl: string | null } => {
    const trimmed = value.trim();
    if (!trimmed) {
        return { identifier: '', serverUrl: null };
    }

    if (trimmed.includes('://') && trimmed.includes('/agents/')) {
        const [serverPart] = trimmed.split('/agents/');
        return {
            identifier: normalizeSelectedAgentIdentifier(trimmed),
            serverUrl: normalizeServerUrl(serverPart),
        };
    }

    return { identifier: normalizeSelectedAgentIdentifier(trimmed), serverUrl: null };
};

/**
 * Check whether the agent matches the selected identifier.
 */
const matchesSelectedAgentIdentifier = (agent: AgentWithVisibility, identifier: string): boolean => {
    if (!identifier) {
        return false;
    }

    return agent.agentName === identifier || agent.permanentId === identifier;
};

/**
 * Check if a capability type is a graph connection type.
 */
const isConnectionType = (value: string): value is ConnectionType => CONNECTION_TYPES.includes(value as ConnectionType);

/**
 * Parse URL query parameters into a list of connection types.
 */
const parseConnectionTypes = (value: string | null): ConnectionType[] => {
    if (!value) {
        return DEFAULT_CONNECTION_TYPES;
    }

    const selected = value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => isConnectionType(item)) as ConnectionType[];

    return selected.length > 0 ? selected : DEFAULT_CONNECTION_TYPES;
};

/**
 * Return the canonical server URL for the agent or the fallback base.
 */
const getAgentServerUrl = (agent: AgentWithVisibility, fallbackServerUrl: string): string =>
    normalizeServerUrl(agent.serverUrl || fallbackServerUrl);

/**
 * Build a stable node id for the agent.
 */
const buildAgentNodeId = (agent: AgentWithVisibility, fallbackServerUrl: string): string => {
    const serverUrl = getAgentServerUrl(agent, fallbackServerUrl);
    return `${serverUrl}/${agent.agentName}`;
};

/**
 * Build the display name used for node labels.
 */
const getAgentDisplayName = (agent: AgentWithVisibility): string => agent.meta.fullname || agent.agentName;

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
 * Normalize a target agent URL from a capability link.
 */
const normalizeTargetAgentUrl = (agent: AgentWithVisibility, targetUrl: string, fallbackServerUrl: string): string => {
    if (targetUrl.includes('://')) {
        return targetUrl;
    }

    const baseUrl = getAgentServerUrl(agent, fallbackServerUrl);
    const sanitizedTarget = targetUrl
        .replace(/^\.\//, '')
        .replace(/^\/agents\//, '')
        .replace(/^\//, '');

    return `${baseUrl}/agents/${sanitizedTarget}`;
};

/**
 * Check whether an agent matches a target URL.
 */
const matchesAgentUrl = (agent: AgentWithVisibility, targetUrl: string, fallbackServerUrl: string): boolean => {
    const baseUrl = getAgentServerUrl(agent, fallbackServerUrl);
    const nameUrl = `${baseUrl}/agents/${agent.agentName}`;
    const permanentUrl = agent.permanentId ? `${baseUrl}/agents/${agent.permanentId}` : null;
    const explicitUrl = (agent as AgentWithVisibility & { url?: string }).url;

    return nameUrl === targetUrl || permanentUrl === targetUrl || explicitUrl === targetUrl;
};

/**
 * Resolve focused node ids based on server and agent selection.
 */
const resolveFocusedNodeIds = (
    nodes: GraphNode[],
    selectedServerUrl: string | null,
    selectedAgentName: string | null,
): Set<string> => {
    if (!selectedAgentName) {
        return new Set();
    }

    const parsedSelection = parseSelectedAgentInput(selectedAgentName);
    if (!parsedSelection.identifier) {
        return new Set();
    }

    const serverFilter =
        parsedSelection.serverUrl && parsedSelection.serverUrl !== 'ALL'
            ? parsedSelection.serverUrl
            : selectedServerUrl && selectedServerUrl !== 'ALL'
            ? selectedServerUrl
            : null;

    const focusedNodes = nodes.filter((node) => {
        if (serverFilter && node.serverUrl !== serverFilter) {
            return false;
        }

        return matchesSelectedAgentIdentifier(node.agent, parsedSelection.identifier);
    });

    return new Set(focusedNodes.map((node) => node.id));
};

/**
 * Collect node ids connected to any focused node via graph links.
 */
const collectRelatedNodeIds = (links: GraphLink[], focusedNodeIds: Set<string>): Set<string> => {
    const relatedNodeIds = new Set(focusedNodeIds);

    links.forEach((link) => {
        if (focusedNodeIds.has(link.source)) {
            relatedNodeIds.add(link.target);
        }

        if (focusedNodeIds.has(link.target)) {
            relatedNodeIds.add(link.source);
        }
    });

    return relatedNodeIds;
};

/**
 * Build folder order links and index mapping for local agents.
 */
const buildFolderOrderLinks = (nodes: GraphNode[]): { links: GraphLink[]; orderIndexByNodeId: Map<string, number> } => {
    const links: GraphLink[] = [];
    const orderIndexByNodeId = new Map<string, number>();
    const nodesByFolder = new Map<number | null, GraphNode[]>();

    nodes
        .filter((node) => node.isLocal)
        .forEach((node) => {
            const folderId = node.folderId ?? null;
            const bucket = nodesByFolder.get(folderId) || [];
            bucket.push(node);
            nodesByFolder.set(folderId, bucket);
        });

    nodesByFolder.forEach((folderNodes) => {
        const orderedNodes = sortBySortOrder(folderNodes, (node) => node.name);
        orderedNodes.forEach((node, index) => {
            orderIndexByNodeId.set(node.id, index + 1);
            const nextNode = orderedNodes[index + 1];
            if (nextNode) {
                links.push({ source: node.id, target: nextNode.id, type: 'order' });
            }
        });
    });

    return { links, orderIndexByNodeId };
};

/**
 * Build the graph nodes and links from agents and filters.
 */
const buildGraphData = (input: GraphDataInput): GraphData => {
    const { agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, publicUrl } = input;
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const allAgents = [...agents, ...federatedAgents];

    const nodes: GraphNode[] = allAgents.map((agent) => {
        const serverUrl = getAgentServerUrl(agent, normalizedPublicUrl);
        const id = buildAgentNodeId(agent, normalizedPublicUrl);
        const folderId = agent.folderId ?? null;
        const sortOrder = agent.sortOrder ?? 0;

        return {
            id,
            name: getAgentDisplayName(agent),
            agent,
            serverUrl,
            isLocal: serverUrl === normalizedPublicUrl,
            folderId,
            sortOrder,
        };
    });

    const links: GraphLink[] = [];

    allAgents.forEach((agent) => {
        const agentNodeId = buildAgentNodeId(agent, normalizedPublicUrl);

        agent.capabilities?.forEach((capability) => {
            if (!capability.agentUrl || !isConnectionType(capability.type)) {
                return;
            }

            if (!filterType.includes(capability.type)) {
                return;
            }

            const targetUrl = normalizeTargetAgentUrl(agent, capability.agentUrl, normalizedPublicUrl);
            const targetAgent = allAgents.find((candidate) =>
                matchesAgentUrl(candidate, targetUrl, normalizedPublicUrl),
            );

            if (!targetAgent) {
                return;
            }

            links.push({
                source: agentNodeId,
                target: buildAgentNodeId(targetAgent, normalizedPublicUrl),
                type: capability.type,
            });
        });
    });

    let filteredNodes = nodes;
    let filteredLinks = links;
    const normalizedSelectedServerUrl =
        selectedServerUrl && selectedServerUrl !== 'ALL' ? normalizeServerUrl(selectedServerUrl) : selectedServerUrl;

    const focusedNodeIds = resolveFocusedNodeIds(nodes, normalizedSelectedServerUrl, selectedAgentName);

    if (focusedNodeIds.size > 0) {
        const relatedNodeIds = collectRelatedNodeIds(links, focusedNodeIds);
        filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
        filteredLinks = links.filter((link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target));
    } else if (normalizedSelectedServerUrl && normalizedSelectedServerUrl !== 'ALL') {
        const serverNodes = nodes.filter((node) => node.serverUrl === normalizedSelectedServerUrl);
        const serverNodeIds = new Set(serverNodes.map((node) => node.id));
        filteredNodes = serverNodes;
        filteredLinks = links.filter((link) => serverNodeIds.has(link.source) && serverNodeIds.has(link.target));
    } else if (selectedAgentName) {
        filteredNodes = [];
        filteredLinks = [];
    }

    const { links: orderLinks, orderIndexByNodeId } = buildFolderOrderLinks(filteredNodes);

    return { nodes: filteredNodes, links: filteredLinks, orderLinks, orderIndexByNodeId };
};

/**
 * Build summary metrics derived from the current graph data and visible server groups.
 */
const buildGraphSummaryInfo = (graphData: GraphData, serverGroups: ServerGroup[]): GraphSummaryInfo => {
    const connectionCountByType = CONNECTION_TYPES.reduce<Record<ConnectionType, number>>((acc, type) => {
        acc[type] = 0;
        return acc;
    }, {} as Record<ConnectionType, number>);

    graphData.links.forEach((link) => {
        connectionCountByType[link.type] += 1;
    });

    return {
        agentCount: graphData.nodes.length,
        serverCount: serverGroups.length,
        totalConnections: graphData.links.length,
        connectionCountByType,
        orderLinkCount: graphData.orderLinks.length,
    };
};

/**
 * Props for the graph summary card.
 */
type GraphSummaryCardProps = {
    readonly label: string;
    readonly value: number;
    readonly helperText?: string;
};

/**
 * Simple stat card used inside the overview panel.
 */
function GraphSummaryCard({ label, value, helperText }: GraphSummaryCardProps) {
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm">
            <div className="text-3xl font-semibold leading-tight text-slate-900 tabular-nums">{value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            {helperText ? (
                <p className="mt-1 text-[10px] font-medium text-slate-400">{helperText}</p>
            ) : null}
        </div>
    );
}

/**
 * Props for the connection legend list.
 */
type GraphConnectionLegendProps = {
    readonly connectionCountByType: Record<ConnectionType, number>;
};

/**
 * Displays connection counts for each link type with color cues.
 */
function GraphConnectionLegend({ connectionCountByType }: GraphConnectionLegendProps) {
    return (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
            {CONNECTION_TYPES.map((type) => {
                const style: CSSProperties = {
                    borderBottomWidth: 2,
                    borderBottomStyle: EDGE_STYLES[type].dash ? 'dashed' : 'solid',
                    borderBottomColor: EDGE_STYLES[type].color,
                    width: 36,
                    display: 'inline-block',
                };

                return (
                    <div
                        key={type}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] text-slate-600 shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="inline-block" style={style}></span>
                            <span className="font-semibold text-slate-700">{EDGE_LABELS[type]}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{connectionCountByType[type]}</span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Props for the graph summary overview panel.
 */
type GraphSummaryPanelProps = {
    readonly summary: GraphSummaryInfo;
};

/**
 * Overview UI displayed above the graph that surfaces top-level metrics.
 */
function GraphSummaryPanel({ summary }: GraphSummaryPanelProps) {
    const cards = [
        { label: 'Visible agents', value: summary.agentCount },
        { label: 'Servers represented', value: summary.serverCount },
        { label: 'Explicit connections', value: summary.totalConnections, helperText: 'Inheritance / Import / Team' },
        { label: 'Folder order links', value: summary.orderLinkCount },
    ];

    return (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
                {cards.map((card) => (
                    <GraphSummaryCard key={card.label} {...card} />
                ))}
            </div>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Connections by type</p>
                <GraphConnectionLegend connectionCountByType={summary.connectionCountByType} />
            </div>
        </div>
    );
}

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
 * Build server group descriptors from graph nodes and folders.
 */
const buildServerGroups = (
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
 * Build a timestamped filename for graph downloads.
 */
const buildGraphFilename = (extension: string): string => {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    return `${GRAPH_DOWNLOAD_PREFIX}-${timestamp}.${extension}`;
};

/**
 * Trigger a browser download for the provided blob payload.
 */
const triggerBlobDownload = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/**
 * Build the storage key for graph positions.
 */
const buildPositionsStorageKey = (publicUrl: string): string => {
    const normalized = normalizeServerUrl(publicUrl);
    return `${GRAPH_POSITIONS_STORAGE_KEY}:${normalized}`;
};

/**
 * Load node positions from local storage.
 */
const loadStoredPositions = (storageKey: string): StoredPositions => {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as StoredPositions;
        return parsed || {};
    } catch (error) {
        return {};
    }
};

/**
 * Persist node positions to local storage.
 */
const saveStoredPositions = (storageKey: string, positions: StoredPositions): void => {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(positions));
    } catch (error) {
        console.warn('Failed to save graph positions.', error);
    }
};

/**
 * Convert a data URL into a blob.
 */
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
};

/**
 * Determine whether a DOM node should be included in exports.
 */
const shouldExportNode = (node: HTMLElement): boolean => {
    if (node.dataset?.exportExclude === 'true') {
        return false;
    }

    if (node.classList?.contains('react-flow__panel')) {
        return false;
    }

    return true;
};

/**
 * Build a readable ASCII summary of the graph.
 */
const buildAsciiGraph = (graphData: GraphData, serverGroups: ServerGroup[]): string => {
    const lines: string[] = [];
    const nodeNameById = new Map(graphData.nodes.map((node) => [node.id, node.name]));

    serverGroups.forEach((serverGroup) => {
        lines.push(`Server: ${serverGroup.label}`);
        serverGroup.folders.forEach((folder) => {
            lines.push(`  Folder: ${folder.label}`);
            folder.agents.forEach((agent) => {
                const orderIndex = graphData.orderIndexByNodeId.get(agent.id);
                const orderLabel = orderIndex ? `#${orderIndex} ` : '';
                lines.push(`    ${orderLabel}${agent.name}`);
            });
        });
        lines.push('');
    });

    if (graphData.links.length > 0) {
        lines.push('Relationships:');
        graphData.links.forEach((link) => {
            const source = nodeNameById.get(link.source) || link.source;
            const target = nodeNameById.get(link.target) || link.target;
            lines.push(`  ${source} --${EDGE_LABELS[link.type]}--> ${target}`);
        });
        lines.push('');
    }

    if (graphData.orderLinks.length > 0) {
        lines.push('Folder order:');
        graphData.orderLinks.forEach((link) => {
            const source = nodeNameById.get(link.source) || link.source;
            const target = nodeNameById.get(link.target) || link.target;
            lines.push(`  ${source} -> ${target}`);
        });
    }

    return lines.join('\n');
};

/**
 * Create agent nodes, folder nodes, and server nodes for the graph layout.
 */
const buildGraphLayoutNodes = (params: {
    serverGroups: ServerGroup[];
    orderIndexByNodeId: Map<string, number>;
    publicUrl: string;
    storedPositions: StoredPositions;
    onNodeOpen: (node: GraphNode) => void;
}): Node[] => {
    const { serverGroups, orderIndexByNodeId, publicUrl, storedPositions, onNodeOpen } = params;
    const nodes: Node[] = [];
    let cursorX = 0;
    const cursorY = 0;

    serverGroups.forEach((serverGroup) => {
        const folderLayouts = serverGroup.folders.map((folder) => {
            const agentCount = folder.agents.length;
            if (agentCount === 0) {
                return { width: 0, height: 0 };
            }

            const radius = Math.max(1, agentCount - 1) * 64;
            const folderWidth = radius * 2 + NODE_WIDTH + FOLDER_PADDING_X * 2;
            const folderHeight = radius * 2 + NODE_HEIGHT + FOLDER_PADDING_Y * 2 + FOLDER_HEADER_HEIGHT;

            return {
                width: folderWidth,
                height: folderHeight,
            };
        });

        const maxFolderWidth = folderLayouts.reduce((max, layout) => Math.max(max, layout.width), 0);
        const totalFolderHeight = folderLayouts.reduce((sum, layout) => sum + layout.height, 0);
        const totalFolderGap = Math.max(folderLayouts.length - 1, 0) * FOLDER_GAP;
        const serverWidth = maxFolderWidth + SERVER_PADDING_X * 2;
        const serverHeight = SERVER_HEADER_HEIGHT + SERVER_PADDING_Y * 2 + totalFolderHeight + totalFolderGap;
        const serverNodeId = `server:${serverGroup.serverUrl}`;

        nodes.push({
            id: serverNodeId,
            type: 'serverGroup',
            position: { x: cursorX, y: cursorY },
            data: {
                label: serverGroup.label,
                agentCount: serverGroup.folders.reduce((sum, folder) => sum + folder.agents.length, 0),
                isLocal: serverGroup.isLocal,
            } satisfies ServerGroupNodeData,
            style: {
                width: serverWidth,
                height: serverHeight,
                zIndex: 0,
            },
            selectable: false,
            draggable: false,
        });

        let folderCursorY = SERVER_HEADER_HEIGHT + SERVER_PADDING_Y;
        serverGroup.folders.forEach((folder, folderIndex) => {
            const folderLayout = folderLayouts[folderIndex];
            if (!folderLayout || folder.agents.length === 0) {
                return;
            }
            const folderNodeId = `folder:${serverGroup.serverUrl}:${folder.id ?? 'root'}`;

            nodes.push({
                id: folderNodeId,
                type: 'folderGroup',
                parentId: serverNodeId,
                extent: 'parent',
                position: { x: SERVER_PADDING_X, y: folderCursorY },
                data: {
                    label: folder.label,
                    agentCount: folder.agents.length,
                } satisfies FolderGroupNodeData,
                style: {
                    width: folderLayout.width,
                    height: folderLayout.height,
                    zIndex: 1,
                },
                selectable: false,
                draggable: false,
            });

            const agentCount = folder.agents.length;
            const centerX = folderLayout.width / 2;
            const centerY = folderLayout.height / 2 + FOLDER_HEADER_HEIGHT / 2;
            const radius = Math.max(1, agentCount - 1) * 64;

            folder.agents.forEach((agent, index) => {
                const { imageUrl, placeholderUrl } = getAgentImageUrls(agent.agent, publicUrl);
                const style = buildAgentChipStyle(agent.agent);
                const orderIndex = orderIndexByNodeId.get(agent.id) ?? null;
                const tooltipParts = [getAgentTooltip(agent.agent)];
                if (folder.label) {
                    tooltipParts.push(`Folder: ${folder.label}`);
                }
                const tooltip = tooltipParts.filter(Boolean).join('\n');

                let position;
                if (agentCount === 1) {
                    position = {
                        x: centerX - NODE_WIDTH / 2,
                        y: centerY - NODE_HEIGHT / 2,
                    };
                } else {
                    const angle = (index / agentCount) * 2 * Math.PI;
                    position = {
                        x: centerX + radius * Math.cos(angle) - NODE_WIDTH / 2,
                        y: centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2,
                    };
                }

                const storedPosition = storedPositions[agent.id];
                const finalPosition =
                    storedPosition && storedPosition.parentId === folderNodeId
                        ? { x: storedPosition.x, y: storedPosition.y }
                        : position;

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

            folderCursorY += folderLayout.height + FOLDER_GAP;
        });

        cursorX += serverWidth + SERVER_GAP;
    });

    return nodes;
};

/**
 * Renders an agent node inside the React Flow canvas.
 */
function AgentGraphNode({ data }: NodeProps<AgentNodeData>) {
    const [imageSrc, setImageSrc] = useState(data.imageUrl);

    useEffect(() => {
        setImageSrc(data.imageUrl);
    }, [data.imageUrl]);

    const handleImageError = () => {
        if (imageSrc !== data.placeholderUrl) {
            setImageSrc(data.placeholderUrl);
        }
    };

    const highlightClass = data.isHighlighted
        ? 'ring-2 ring-sky-400 shadow-lg'
        : data.isNeighbor
        ? 'ring-1 ring-sky-200'
        : '';
    const dimClass = data.isDimmed ? 'opacity-40' : 'opacity-100';

    return (
        <div
            className={`agents-graph-node relative h-full w-full rounded-2xl border shadow-sm cursor-pointer transition-transform duration-200 ${highlightClass} ${dimClass}`}
            style={{ backgroundColor: data.style.fill, borderColor: data.style.border, color: data.style.text }}
            onClick={data.onOpen}
            title={data.tooltip}
        >
            {data.orderIndex ? (
                <div className="absolute top-1.5 right-1.5 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow">
                    {data.orderIndex}
                </div>
            ) : null}
            <div className="flex h-full items-center gap-3 px-3">
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                    style={{ borderColor: data.style.ring }}
                >
                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageSrc}
                            alt={data.name}
                            className="h-full w-full object-cover"
                            onError={handleImageError}
                        />
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{data.name}</div>
                    <div className="text-[11px] text-slate-600 truncate">{data.agent.agentName}</div>
                </div>
            </div>
        </div>
    );
}

/**
 * Renders a server group container.
 */
function ServerGroupNode({ data }: NodeProps<ServerGroupNodeData>) {
    const ringClass = data.isLocal ? 'border-sky-200 bg-sky-50/40' : 'border-slate-200 bg-white/70';
    const { formatText } = useAgentNaming();
    const countLabel = formatText(`${data.agentCount} agents`);

    return (
        <div className={`relative h-full w-full rounded-[28px] border ${ringClass} shadow-sm`}>
            <div className="absolute left-4 top-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {data.label}
            </div>
            <div className="absolute right-4 top-3 text-[11px] text-slate-400">{countLabel}</div>
        </div>
    );
}

/**
 * Renders a folder group container.
 */
function FolderGroupNode({ data }: NodeProps<FolderGroupNodeData>) {
    const { formatText } = useAgentNaming();
    const countLabel = formatText(`${data.agentCount} agents`);

    return (
        <div className="relative h-full w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
            <div className="absolute left-3 top-2 text-xs font-semibold text-slate-500">{data.label}</div>
            <div className="absolute right-3 top-2 text-[10px] text-slate-400">{countLabel}</div>
        </div>
    );
}

/**
 * Build React Flow edges from graph links.
 */
const buildGraphEdges = (graphData: GraphData): Edge[] => {
    const links = [...graphData.links, ...graphData.orderLinks];

    return links.map((link, index) => ({
        id: `edge:${link.type}:${link.source}:${link.target}:${index}`,
        source: link.source,
        target: link.target,
        type: 'smoothstep',
        data: { type: link.type },
        style: {
            stroke: EDGE_STYLES[link.type].color,
            strokeWidth: EDGE_STYLES[link.type].width,
            strokeDasharray: EDGE_STYLES[link.type].dash,
            opacity: 0.8,
        },
        selectable: false,
    }));
};

/**
 * Apply hover-based styling to edges.
 */
const applyEdgeHighlighting = (
    edges: Edge[],
    hoveredNodeId: string | null,
    relatedNodeIds: Set<string> | null,
): Edge[] => {
    if (!hoveredNodeId || !relatedNodeIds) {
        return edges;
    }

    return edges.map((edge) => {
        const isRelated = relatedNodeIds.has(edge.source) && relatedNodeIds.has(edge.target);
        const isPrimary = edge.source === hoveredNodeId || edge.target === hoveredNodeId;
        const opacity = isRelated ? (isPrimary ? 1 : 0.8) : 0.15;

        return {
            ...edge,
            style: {
                ...edge.style,
                opacity,
            },
        };
    });
};

/**
 * Render the AgentsGraph component.
 */
export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl, folders } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { formatText } = useAgentNaming();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);
    const [filterType, setFilterType] = useState<ConnectionType[]>(
        parseConnectionTypes(searchParams.get('connectionTypes')),
    );
    const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(() => {
        const value = searchParams.get('selectedServer');
        if (!value) {
            return null;
        }
        if (value === 'ALL') {
            return 'ALL';
        }
        return normalizeServerUrl(value);
    });
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
        searchParams.get('selectedAgent') || null,
    );
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const storedPositionsRef = useRef<StoredPositions>({});
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const graphWrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateHeight = () => {
            setGraphHeight(Math.max(GRAPH_MIN_HEIGHT, window.innerHeight - GRAPH_HEIGHT_OFFSET));
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const storageKey = useMemo(() => buildPositionsStorageKey(normalizedPublicUrl), [normalizedPublicUrl]);

    useEffect(() => {
        storedPositionsRef.current = loadStoredPositions(storageKey);
    }, [storageKey]);

    const graphData = useMemo(
        () =>
            buildGraphData({
                agents,
                federatedAgents,
                filterType,
                selectedServerUrl,
                selectedAgentName,
                publicUrl: normalizedPublicUrl,
            }),
        [agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, normalizedPublicUrl],
    );

    const serverGroups = useMemo(() => {
        const rootLabel = formatText('Agents');
        return buildServerGroups(graphData.nodes, folders, normalizedPublicUrl, rootLabel);
    }, [graphData.nodes, folders, normalizedPublicUrl, formatText]);
    const graphSummary = useMemo(
        () => buildGraphSummaryInfo(graphData, serverGroups),
        [graphData, serverGroups],
    );

    /**
     * Open the agent page or federated agent URL when a node is clicked.
     */
    const handleNodeClick = useCallback(
        (node: GraphNode) => {
            const agent = node.agent;
            if (agent.serverUrl && normalizeServerUrl(agent.serverUrl) !== normalizedPublicUrl) {
                window.open(`${agent.serverUrl}/agents/${agent.agentName}`, '_blank');
            } else {
                router.push(`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`);
            }
        },
        [router, normalizedPublicUrl],
    );

    const layoutNodes = useMemo(
        () =>
            buildGraphLayoutNodes({
                serverGroups,
                orderIndexByNodeId: graphData.orderIndexByNodeId,
                publicUrl: normalizedPublicUrl,
                storedPositions: storedPositionsRef.current,
                onNodeOpen: handleNodeClick,
            }),
        [serverGroups, graphData.orderIndexByNodeId, normalizedPublicUrl, handleNodeClick],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

    useEffect(() => {
        setNodes(layoutNodes);
        if (layoutNodes.length > 0) {
            requestAnimationFrame(() => {
                reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [layoutNodes, setNodes]);

    const baseEdges = useMemo(() => buildGraphEdges(graphData), [graphData]);

    const relatedNodeIds = useMemo(() => {
        if (!hoveredNodeId) {
            return null;
        }

        return collectRelatedNodeIds([...graphData.links, ...graphData.orderLinks], new Set([hoveredNodeId]));
    }, [hoveredNodeId, graphData.links, graphData.orderLinks]);

    const displayedNodes = useMemo(() => {
        if (!relatedNodeIds) {
            return nodes;
        }

        return nodes.map((node) => {
            if (node.type !== 'agent') {
                return node;
            }

            const isRelated = relatedNodeIds.has(node.id);
            const isHighlighted = hoveredNodeId === node.id;

            return {
                ...node,
                data: {
                    ...(node.data as AgentNodeData),
                    isDimmed: !isRelated,
                    isHighlighted,
                    isNeighbor: isRelated && !isHighlighted,
                } satisfies AgentNodeData,
            };
        });
    }, [nodes, relatedNodeIds, hoveredNodeId]);

    const displayedEdges = useMemo(
        () => applyEdgeHighlighting(baseEdges, hoveredNodeId, relatedNodeIds),
        [baseEdges, hoveredNodeId, relatedNodeIds],
    );

    /**
     * Update URL query params to reflect graph filters and selections.
     */
    const updateUrl = useCallback(
        (newFilters: ConnectionType[], newSelectedServer: string | null, newSelectedAgent: string | null) => {
            const params = new URLSearchParams(searchParams.toString());

            if (newFilters.length === CONNECTION_TYPES.length) {
                params.delete('connectionTypes');
            } else {
                params.set('connectionTypes', newFilters.join(','));
            }

            if (newSelectedServer) {
                params.set('selectedServer', newSelectedServer);
            } else {
                params.delete('selectedServer');
            }

            if (newSelectedAgent) {
                params.set('selectedAgent', newSelectedAgent);
            } else {
                params.delete('selectedAgent');
            }

            params.set('view', 'graph');

            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    /**
     * Toggle a connection type filter.
     */
    const toggleFilter = useCallback(
        (type: ConnectionType) => {
            const nextFilters = filterType.includes(type)
                ? filterType.filter((item) => item !== type)
                : [...filterType, type];
            setFilterType(nextFilters);
            updateUrl(nextFilters, selectedServerUrl, selectedAgentName);
        },
        [filterType, selectedAgentName, selectedServerUrl, updateUrl],
    );

    /**
     * Apply the selected server/agent filter and persist to the URL.
     */
    const selectServerAndAgent = useCallback(
        (value: string) => {
            if (value === '') {
                setSelectedServerUrl(null);
                setSelectedAgentName(null);
                updateUrl(filterType, null, null);
                return;
            }

            if (value === 'ALL') {
                setSelectedServerUrl('ALL');
                setSelectedAgentName(null);
                updateUrl(filterType, 'ALL', null);
                return;
            }

            if (value.startsWith('SERVER:')) {
                const serverUrl = normalizeServerUrl(value.replace('SERVER:', ''));
                setSelectedServerUrl(serverUrl);
                setSelectedAgentName(null);
                updateUrl(filterType, serverUrl, null);
                return;
            }

            const [serverUrl, agentName] = value.split('|');
            const normalizedServerUrl = normalizeServerUrl(serverUrl || '');
            setSelectedServerUrl(normalizedServerUrl);
            setSelectedAgentName(agentName || null);
            updateUrl(filterType, normalizedServerUrl, agentName || null);
        },
        [filterType, updateUrl],
    );

    /**
     * Handle click events within the React Flow canvas.
     */
    const handleFlowNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        if (node.type !== 'agent') {
            return;
        }
        const nodeData = node.data as AgentNodeData;
        nodeData.onOpen();
    }, []);

    /**
     * Track hover state for highlighting.
     */
    const handleNodeHover = useCallback((node: Node | null) => {
        if (!node || node.type !== 'agent') {
            setHoveredNodeId(null);
            return;
        }
        setHoveredNodeId(node.id);
    }, []);

    /**
     * Persist node positions after dragging.
     */
    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (node.type !== 'agent' || !node.parentId) {
                return;
            }

            storedPositionsRef.current[node.id] = {
                x: node.position.x,
                y: node.position.y,
                parentId: node.parentId,
            };
            saveStoredPositions(storageKey, storedPositionsRef.current);
        },
        [storageKey],
    );

    const canDownloadPng = graphData.nodes.length > 0;
    const canDownloadSvg = graphData.nodes.length > 0;
    const canDownloadAscii = graphData.nodes.length > 0;

    /**
     * Download the rendered graph as a PNG.
     */
    const handleDownloadPng = useCallback(async () => {
        if (!graphWrapperRef.current) {
            return;
        }

        try {
            const dataUrl = await toPng(graphWrapperRef.current, {
                backgroundColor: GRAPH_EXPORT_BACKGROUND,
                filter: (node) => shouldExportNode(node as HTMLElement),
                pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
            });
            const blob = await dataUrlToBlob(dataUrl);
            triggerBlobDownload(blob, buildGraphFilename('png'));
        } catch (error) {
            console.error('Failed to export graph as PNG.', error);
            await showAlert({
                title: 'Export failed',
                message: 'Failed to export PNG. Try downloading the SVG instead.',
            }).catch(() => undefined);
        }
    }, []);

    /**
     * Download the rendered graph as an SVG.
     */
    const handleDownloadSvg = useCallback(async () => {
        if (!graphWrapperRef.current) {
            return;
        }

        try {
            const dataUrl = await toSvg(graphWrapperRef.current, {
                backgroundColor: GRAPH_EXPORT_BACKGROUND,
                filter: (node) => shouldExportNode(node as HTMLElement),
            });
            const blob = await dataUrlToBlob(dataUrl);
            triggerBlobDownload(blob, buildGraphFilename('svg'));
        } catch (error) {
            console.error('Failed to export graph as SVG.', error);
            await showAlert({
                title: 'Export failed',
                message: 'Failed to export SVG. Try downloading the PNG instead.',
            }).catch(() => undefined);
        }
    }, []);

    /**
     * Download the graph as ASCII text.
     */
    const handleDownloadAscii = useCallback(() => {
        const ascii = buildAsciiGraph(graphData, serverGroups);
        const blob = new Blob([ascii], { type: 'text/plain;charset=utf-8' });
        triggerBlobDownload(blob, buildGraphFilename('txt'));
    }, [graphData, serverGroups]);

    const nodeTypes = useMemo(
        () => ({
            agent: AgentGraphNode,
            serverGroup: ServerGroupNode,
            folderGroup: FolderGroupNode,
        }),
        [],
    );

    if (agents.length === 0 && federatedAgents.length === 0) {
        return (
            <div className="flex justify-center py-12 text-gray-500">{formatText('No agents to show in graph.')}</div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Show connections:</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes('inheritance')}
                                onChange={() => toggleFilter('inheritance')}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">Parent</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes('import')}
                                onChange={() => toggleFilter('import')}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">Import</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes('team')}
                                onChange={() => toggleFilter('team')}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">Team</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Filter:</span>
                        <select
                            value={
                                selectedAgentName
                                    ? `${selectedServerUrl}|${selectedAgentName}`
                                    : selectedServerUrl === 'ALL'
                                    ? 'ALL'
                                    : selectedServerUrl
                                    ? `SERVER:${selectedServerUrl}`
                                    : ''
                            }
                            onChange={(event) => selectServerAndAgent(event.target.value)}
                            className="text-sm border rounded-md p-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{formatText('All Agents')}</option>
                            <optgroup label="This Server">
                                <option value={`SERVER:${normalizedPublicUrl}`}>Entire This Server</option>
                                {agents.map((agent) => (
                                    <option key={agent.agentName} value={`${normalizedPublicUrl}|${agent.agentName}`}>
                                        {agent.meta.fullname || agent.agentName}
                                    </option>
                                ))}
                            </optgroup>
                            {Object.entries(federatedServersStatus).map(([serverUrl, status]) => (
                                <optgroup
                                    key={serverUrl}
                                    label={
                                        serverUrl.replace(/^https?:\/\//, '') +
                                        (status.status === 'loading'
                                            ? ' (loading...)'
                                            : status.status === 'error'
                                            ? ' (error)'
                                            : '')
                                    }
                                >
                                    <option value={`SERVER:${serverUrl}`}>Entire Server</option>
                                    {federatedAgents
                                        .filter((agent) => agent.serverUrl === serverUrl)
                                        .map((agent) => (
                                            <option key={agent.agentName} value={`${serverUrl}|${agent.agentName}`}>
                                                {agent.meta.fullname || agent.agentName}
                                            </option>
                                        ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {(selectedAgentName || selectedServerUrl) && (
                        <button
                            type="button"
                            onClick={() => selectServerAndAgent('')}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Clear focus
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <span className="text-xs font-medium text-slate-500">Download:</span>
                    <button
                        type="button"
                        onClick={handleDownloadPng}
                        disabled={!canDownloadPng}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            canDownloadPng
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Download graph as PNG"
                    >
                        <FileImage className="w-4 h-4" />
                        PNG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        disabled={!canDownloadSvg}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            canDownloadSvg
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Download graph as SVG"
                    >
                        <Code className="w-4 h-4" />
                        SVG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadAscii}
                        disabled={!canDownloadAscii}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            canDownloadAscii
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Download graph as ASCII"
                    >
                        <FileText className="w-4 h-4" />
                        ASCII
                    </button>
                </div>
            </div>

            <GraphSummaryPanel summary={graphSummary} />

            <div
                className="agents-graph-surface relative overflow-hidden rounded-2xl border border-slate-200 shadow-inner"
                style={{ height: graphHeight }}
            >
                {graphData.nodes.length === 0 ? (
                    <div className="flex justify-center py-12 text-gray-500">
                        {formatText('No agents to show in graph.')}
                    </div>
                ) : (
                    <div ref={graphWrapperRef} className="agents-graph-canvas h-full w-full" role="presentation">
                        <ReactFlow
                            nodes={displayedNodes}
                            edges={displayedEdges}
                            nodeTypes={nodeTypes}
                            onNodesChange={onNodesChange}
                            onNodeClick={handleFlowNodeClick}
                            onNodeMouseEnter={(_, node) => handleNodeHover(node)}
                            onNodeMouseLeave={() => handleNodeHover(null)}
                            onNodeDragStop={handleNodeDragStop}
                            onInit={(instance) => {
                                reactFlowInstanceRef.current = instance;
                            }}
                            fitView
                            panOnScroll
                            minZoom={0.2}
                            maxZoom={2.5}
                            snapToGrid
                            snapGrid={[8, 8]}
                            nodesConnectable={false}
                            nodesDraggable
                            className="agents-graph-flow"
                        >
                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={28}
                                size={1}
                                color="rgba(148, 163, 184, 0.35)"
                            />
                            <MiniMap
                                position="bottom-left"
                                zoomable
                                pannable
                                nodeColor={(node) => {
                                    if (node.type === 'agent') {
                                        const nodeData = node.data as AgentNodeData;
                                        return nodeData.style.fill;
                                    }
                                    if (node.type === 'serverGroup') {
                                        return '#e2e8f0';
                                    }
                                    return '#f1f5f9';
                                }}
                            />
                            <Controls position="bottom-right" />
                        </ReactFlow>
                    </div>
                )}

                <div
                    data-export-exclude="true"
                    className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 text-[10px] rounded-lg border border-slate-200 bg-white/80 p-2 shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-2 border-dashed border-sky-400"></div>
                        <span>Parent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-2 border-slate-400"></div>
                        <span>Import</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-4 border-emerald-400"></div>
                        <span>Team</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-2 border-dashed border-amber-400"></div>
                        <span>Folder order</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
