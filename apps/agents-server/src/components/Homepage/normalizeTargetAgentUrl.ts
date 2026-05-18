import type { AgentWithVisibility } from './buildGraphDataTypes';
import { getAgentServerUrl } from './buildAgentNodeId';
import { resolveAgentRouteIdentifier } from '../../utils/agentIdentifier';

/**
 * Normalize a target agent URL from a capability link.
 *
 * @private function of buildGraphData
 */
export const normalizeTargetAgentUrl = (
    agent: AgentWithVisibility,
    targetUrl: string,
    fallbackServerUrl: string,
): string => {
    if (targetUrl.includes('://')) {
        return targetUrl;
    }

    const baseUrl = getAgentServerUrl(agent, fallbackServerUrl);
    const sanitizedTarget = targetUrl.replace(/^\.\//, '').replace(/^\/agents\//, '').replace(/^\//, '');

    return `${baseUrl}/agents/${sanitizedTarget}`;
};

/**
 * Check whether an agent matches a target URL.
 *
 * @private function of buildGraphData
 */
export const matchesAgentUrl = (
    agent: AgentWithVisibility,
    targetUrl: string,
    fallbackServerUrl: string,
): boolean => {
    const baseUrl = getAgentServerUrl(agent, fallbackServerUrl);
    const nameUrl = `${baseUrl}/agents/${agent.agentName}`;
    const routeUrl = `${baseUrl}/agents/${resolveAgentRouteIdentifier(agent)}`;
    const explicitUrl = (agent as AgentWithVisibility & { url?: string }).url;

    return nameUrl === targetUrl || routeUrl === targetUrl || explicitUrl === targetUrl;
};
