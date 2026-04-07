import type { AgentWithVisibility, GraphNode } from './buildGraphDataTypes';
import { buildAgentNodeId, getAgentDisplayName, getAgentServerUrl } from './buildAgentNodeId';

/**
 * Build graph nodes from a list of agents.
 *
 * @private function of buildGraphData
 */
export const buildGraphNodes = (agents: AgentWithVisibility[], publicUrl: string): GraphNode[] =>
    agents.map((agent) => {
        const serverUrl = getAgentServerUrl(agent, publicUrl);
        const id = buildAgentNodeId(agent, publicUrl);
        const folderId = agent.folderId ?? null;
        const sortOrder = agent.sortOrder ?? 0;

        return {
            id,
            name: getAgentDisplayName(agent),
            agent,
            serverUrl,
            isLocal: serverUrl === publicUrl,
            folderId,
            sortOrder,
        };
    });
