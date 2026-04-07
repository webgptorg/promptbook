import { CONNECTION_TYPES, type ConnectionType, type GraphData, type GraphSummaryInfo, type ServerGroup } from './buildGraphDataTypes';

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
