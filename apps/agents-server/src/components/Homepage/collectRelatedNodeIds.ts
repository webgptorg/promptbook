import type { GraphLink } from './buildGraphDataTypes';

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
