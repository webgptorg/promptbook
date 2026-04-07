import { collectRelatedNodeIds } from './collectRelatedNodeIds';
import { normalizeServerUrl } from './normalizeServerUrl';
import type { AgentWithVisibility, GraphLink, GraphNode } from './buildGraphDataTypes';

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
 * Filter graph nodes and links by the current server or agent selection.
 *
 * @private function of buildGraphData
 */
export const filterGraphData = (
    nodes: GraphNode[],
    links: GraphLink[],
    selectedServerUrl: string | null,
    selectedAgentName: string | null,
): { nodes: GraphNode[]; links: GraphLink[] } => {
    const focusedNodeIds = resolveFocusedNodeIds(nodes, selectedServerUrl, selectedAgentName);

    if (focusedNodeIds.size > 0) {
        const relatedNodeIds = collectRelatedNodeIds(links, focusedNodeIds);
        return {
            nodes: nodes.filter((node) => relatedNodeIds.has(node.id)),
            links: links.filter((link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target)),
        };
    }

    if (selectedServerUrl && selectedServerUrl !== 'ALL') {
        const serverNodes = nodes.filter((node) => node.serverUrl === selectedServerUrl);
        const serverNodeIds = new Set(serverNodes.map((node) => node.id));

        return {
            nodes: serverNodes,
            links: links.filter((link) => serverNodeIds.has(link.source) && serverNodeIds.has(link.target)),
        };
    }

    if (selectedAgentName) {
        return { nodes: [], links: [] };
    }

    return { nodes, links };
};
