import type { Edge } from 'reactflow';
import { EDGE_STYLES, type GraphData } from './buildGraphData';

/**
 * Build React Flow edges from graph links.
 *
 * @private function of AgentsGraph
 */
export const buildGraphEdges = (graphData: GraphData): Edge[] => {
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
 *
 * @private function of AgentsGraph
 */
export const applyEdgeHighlighting = (
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
