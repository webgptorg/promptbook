import { sortBySortOrder } from '../agentOrganizationUtils';
import type {
    AgentWithVisibility,
    ConnectionType,
    GraphData,
    GraphDataInput,
    GraphLink,
    GraphNode,
    GraphSummaryInfo,
    ServerGroup,
} from './AgentsGraph.types';
import { CONNECTION_TYPES, DEFAULT_CONNECTION_TYPES } from './AgentsGraph.types';

/**
 * Normalize a server URL by removing any trailing slash.
 */
export const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');

/**
 * Normalize a selected agent identifier by stripping agent URL prefixes.
 * @private function of AgentsGraph
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
 * @private function of AgentsGraph
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
 * @private function of AgentsGraph
 */
const matchesSelectedAgentIdentifier = (agent: AgentWithVisibility, identifier: string): boolean => {
    if (!identifier) {
        return false;
    }

    return agent.agentName === identifier || agent.permanentId === identifier;
};

/**
 * Check if a capability type is a graph connection type.
 * @private function of AgentsGraph
 */
const isConnectionType = (value: string): value is ConnectionType => CONNECTION_TYPES.includes(value as ConnectionType);

/**
 * Parse URL query parameters into a list of connection types.
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
 * @private function of AgentsGraph
 */
const getAgentServerUrl = (agent: AgentWithVisibility, fallbackServerUrl: string): string =>
    normalizeServerUrl(agent.serverUrl || fallbackServerUrl);

/**
 * Build a stable node id for the agent.
 * @private function of AgentsGraph
 */
const buildAgentNodeId = (agent: AgentWithVisibility, fallbackServerUrl: string): string => {
    const serverUrl = getAgentServerUrl(agent, fallbackServerUrl);
    return `${serverUrl}/${agent.agentName}`;
};

/**
 * Normalize a target agent URL from a capability link.
 * @private function of AgentsGraph
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
 * @private function of AgentsGraph
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
 * @private function of AgentsGraph
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
 * @private function of AgentsGraph
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
            name: agent.meta.fullname || agent.agentName,
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
        filteredLinks = links.filter(
            (link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target),
        );
    } else if (normalizedSelectedServerUrl && normalizedSelectedServerUrl !== 'ALL') {
        const serverNodes = nodes.filter((node) => node.serverUrl === normalizedSelectedServerUrl);
        const serverNodeIds = new Set(serverNodes.map((node) => node.id));
        filteredNodes = serverNodes;
        filteredLinks = links.filter(
            (link) => serverNodeIds.has(link.source) && serverNodeIds.has(link.target),
        );
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
