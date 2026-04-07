import { sortBySortOrder } from './agentOrganizationUtils';
import type { GraphLink, GraphNode } from './buildGraphDataTypes';

/**
 * Build folder order links and index mapping for local agents.
 *
 * @private function of buildGraphData
 */
export const buildFolderOrderLinks = (
    nodes: GraphNode[],
): { links: GraphLink[]; orderIndexByNodeId: Map<string, number> } => {
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
