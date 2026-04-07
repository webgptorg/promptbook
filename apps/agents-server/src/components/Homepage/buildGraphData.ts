import { buildCapabilityLinks } from './buildCapabilityLinks';
import { buildFolderOrderLinks } from './buildFolderOrderLinks';
import { buildGraphNodes } from './buildGraphNodes';
import type { GraphData, GraphDataInput } from './buildGraphDataTypes';
import { filterGraphData } from './filterGraphData';
import { normalizeServerUrl } from './normalizeServerUrl';

export {
    CONNECTION_TYPES,
    DEFAULT_CONNECTION_TYPES,
    EDGE_LABELS,
    EDGE_STYLES,
    type AgentWithVisibility,
    type ConnectionType,
    type FolderGroup,
    type GraphLink,
    type GraphLinkKind,
    type GraphNode,
    type GraphSummaryInfo,
    type ServerGroup,
} from './buildGraphDataTypes';
export type { GraphData, GraphDataInput } from './buildGraphDataTypes';
export { buildAsciiGraph } from './buildAsciiGraph';
export { buildGraphSummaryInfo } from './buildGraphSummaryInfo';
export { buildServerGroups } from './buildServerGroups';
export { collectRelatedNodeIds } from './collectRelatedNodeIds';
export { normalizeServerUrl } from './normalizeServerUrl';
export { parseConnectionTypes } from './parseConnectionTypes';

/**
 * Build the graph nodes and links from agents and filters.
 *
 * @private function of AgentsGraph
 */
export const buildGraphData = (input: GraphDataInput): GraphData => {
    const { agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, publicUrl } = input;
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const allAgents = [...agents, ...federatedAgents];
    const nodes = buildGraphNodes(allAgents, normalizedPublicUrl);
    const links = buildCapabilityLinks(allAgents, filterType, normalizedPublicUrl);
    const normalizedSelectedServerUrl =
        selectedServerUrl && selectedServerUrl !== 'ALL' ? normalizeServerUrl(selectedServerUrl) : selectedServerUrl;
    const filteredGraph = filterGraphData(nodes, links, normalizedSelectedServerUrl, selectedAgentName);
    const { links: orderLinks, orderIndexByNodeId } = buildFolderOrderLinks(filteredGraph.nodes);

    return {
        nodes: filteredGraph.nodes,
        links: filteredGraph.links,
        orderLinks,
        orderIndexByNodeId,
    };
};
