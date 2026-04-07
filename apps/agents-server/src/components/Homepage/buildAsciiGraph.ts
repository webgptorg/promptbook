import { EDGE_LABELS, type GraphData, type ServerGroup } from './buildGraphDataTypes';

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
