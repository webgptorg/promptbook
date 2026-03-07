import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { buildFolderMaps, getFolderPathSegments, sortBySortOrder } from './agentOrganizationUtils';

/**
 * Supported graph link categories.
 *
 * @private function of AgentsGraph
 */
export const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;

/**
 * Default connection categories shown in the graph.
 *
 * @private function of AgentsGraph
 */
export const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];

/**
 * Agent metadata plus visibility, server, and folder details used by the graph UI.
 *
 * @private function of AgentsGraph
 */
export type AgentWithVisibility = AgentBasicInformation & {
    visibility?: AgentVisibility;
    serverUrl?: string;
    folderId?: number | null;
    sortOrder?: number;
};

/**
 * Graph connection types supported by the UI.
 *
 * @private function of AgentsGraph
 */
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

/**
 * Link types used in the graph view.
 *
 * @private function of AgentsGraph
 */
export type GraphLinkKind = ConnectionType | 'order';

/**
 * Graph node data for a single agent.
 *
 * @private function of AgentsGraph
 */
export type GraphNode = {
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
 *
 * @private function of AgentsGraph
 */
export type GraphLink = {
    source: string;
    target: string;
    type: GraphLinkKind;
};

/**
 * Aggregated nodes and links for rendering.
 *
 * @private function of AgentsGraph
 */
export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
    orderLinks: GraphLink[];
    orderIndexByNodeId: Map<string, number>;
};

/**
 * Summary metrics derived from the current graph data.
 *
 * @private function of AgentsGraph
 */
export type GraphSummaryInfo = {
    agentCount: number;
    serverCount: number;
    totalConnections: number;
    connectionCountByType: Record<ConnectionType, number>;
    orderLinkCount: number;
};

/**
 * Inputs needed to build the graph data structure.
 *
 * @private function of AgentsGraph
 */
export type GraphDataInput = {
    agents: AgentWithVisibility[];
    federatedAgents: AgentWithVisibility[];
    filterType: ConnectionType[];
    selectedServerUrl: string | null;
    selectedAgentName: string | null;
    publicUrl: string;
};

/**
 * Folder grouping information for layout.
 *
 * @private function of AgentsGraph
 */
export type FolderGroup = {
    id: number | null;
    label: string;
    agents: GraphNode[];
};

/**
 * Server grouping information for layout.
 *
 * @private function of AgentsGraph
 */
export type ServerGroup = {
    serverUrl: string;
    label: string;
    isLocal: boolean;
    folders: FolderGroup[];
};

/**
 * Visual style definitions for each graph edge kind.
 *
 * @private function of AgentsGraph
 */
export const EDGE_STYLES: Record<GraphLinkKind, { color: string; width: number; dash?: string }> = {
    inheritance: { color: '#38bdf8', width: 1.6, dash: '6 6' },
    import: { color: '#94a3b8', width: 1.25 },
    team: { color: '#34d399', width: 2.5 },
    order: { color: '#f59e0b', width: 1.1, dash: '2 6' },
};

/**
 * Human-readable labels for each graph edge kind.
 *
 * @private function of AgentsGraph
 */
export const EDGE_LABELS: Record<GraphLinkKind, string> = {
    inheritance: 'Parent',
    import: 'Import',
    team: 'Team',
    order: 'Folder order',
};

/**
 * Normalize a server URL by removing any trailing slash.
 *
 * @private function of AgentsGraph
 */
export const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');

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
 *
 * @private function of AgentsGraph
 */
export const parseConnectionTypes = (value: string | null): ConnectionType[] => {
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
 *
 * @private function of AgentsGraph
 */
export const collectRelatedNodeIds = (links: GraphLink[], focusedNodeIds: Set<string>): Set<string> => {
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
 *
 * @private function of AgentsGraph
 */
export const buildGraphData = (input: GraphDataInput): GraphData => {
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
 *
 * @private function of AgentsGraph
 */
export const buildGraphSummaryInfo = (graphData: GraphData, serverGroups: ServerGroup[]): GraphSummaryInfo => {
    const connectionCountByType = CONNECTION_TYPES.reduce<Record<ConnectionType, number>>((acc, type) => {
        acc[type] = 0;
        return acc;
    }, {} as Record<ConnectionType, number>);

    graphData.links.forEach((link) => {
        if (link.type === 'order') {
            return;
        }
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

/**
 * Build a readable ASCII summary of the graph.
 *
 * @private function of AgentsGraph
 */
export const buildAsciiGraph = (graphData: GraphData, serverGroups: ServerGroup[]): string => {
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
