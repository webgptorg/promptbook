import type { AgentWithVisibility } from './buildGraphDataTypes';
import { normalizeServerUrl } from './normalizeServerUrl';
import { resolveAgentRouteIdentifier } from '../../utils/agentIdentifier';

/**
 * Return the canonical server URL for the agent or the fallback base.
 *
 * @private function of buildGraphData
 */
export const getAgentServerUrl = (agent: AgentWithVisibility, fallbackServerUrl: string): string =>
    normalizeServerUrl(agent.serverUrl || fallbackServerUrl);

/**
 * Build a stable node id for the agent.
 *
 * @private function of buildGraphData
 */
export const buildAgentNodeId = (agent: AgentWithVisibility, fallbackServerUrl: string): string => {
    const serverUrl = getAgentServerUrl(agent, fallbackServerUrl);
    return `${serverUrl}/${resolveAgentRouteIdentifier(agent)}`;
};

/**
 * Build the display name used for node labels.
 *
 * @private function of buildGraphData
 */
export const getAgentDisplayName = (agent: AgentWithVisibility): string => agent.meta.fullname || agent.agentName;
