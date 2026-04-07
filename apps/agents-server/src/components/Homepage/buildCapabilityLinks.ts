import { buildAgentNodeId } from './buildAgentNodeId';
import { matchesAgentUrl, normalizeTargetAgentUrl } from './normalizeTargetAgentUrl';
import type { AgentWithVisibility, ConnectionType, GraphLink } from './buildGraphDataTypes';

/**
 * Build graph links from agent capabilities.
 *
 * @private function of buildGraphData
 */
export const buildCapabilityLinks = (
    agents: AgentWithVisibility[],
    filterType: ConnectionType[],
    publicUrl: string,
): GraphLink[] => {
    const links: GraphLink[] = [];

    agents.forEach((agent) => {
        const agentNodeId = buildAgentNodeId(agent, publicUrl);

        agent.capabilities?.forEach((capability) => {
            if (!capability.agentUrl) {
                return;
            }

            if (!filterType.includes(capability.type as ConnectionType)) {
                return;
            }

            const targetUrl = normalizeTargetAgentUrl(agent, capability.agentUrl, publicUrl);
            const targetAgent = agents.find((candidate) => matchesAgentUrl(candidate, targetUrl, publicUrl));

            if (!targetAgent) {
                return;
            }

            links.push({
                source: agentNodeId,
                target: buildAgentNodeId(targetAgent, publicUrl),
                type: capability.type as ConnectionType,
            });
        });
    });

    return links;
};
