import { collectDescendantFolderIds } from '../../../utils/agentOrganization/folderTree';

/**
 * @private Configuration for agent-scope resolution.
 */
type ResolveAllowedAgentNamesOptions = {
    requestedAgentName: string | null;
    requestedFolderId: number | null;
    agents: Array<{ agentName: string; folderId: number | null }>;
    childrenByParentId: Map<number | null, number[]>;
};

/**
 * @private Helper that determines which agents are visible for a given filter scope.
 */
export const UsageScope = {
    resolveAllowedAgentNames,
} as const;

/**
 * @private Internal implementation for resolving agent scope for analytics filters.
 */
function resolveAllowedAgentNames(options: ResolveAllowedAgentNamesOptions): Set<string> | null {
    const { requestedAgentName, requestedFolderId, agents, childrenByParentId } = options;

    if (requestedAgentName) {
        return new Set([requestedAgentName]);
    }

    if (requestedFolderId === null) {
        return null;
    }

    const descendantIds = new Set(collectDescendantFolderIds(requestedFolderId, childrenByParentId));
    const inFolder = agents
        .filter((agent) => agent.folderId !== null && descendantIds.has(agent.folderId))
        .map((agent) => agent.agentName);
    return new Set(inFolder);
}
