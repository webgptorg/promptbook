'use client';

import type { AgentWithVisibility } from './useFederatedAgents';
import { normalizeServerUrl } from './normalizeServerUrl';

/**
 * API payload returned by one federated `/api/agents` endpoint.
 */
type FederatedAgentsResponse = {
    readonly agents?: ReadonlyArray<AgentWithVisibility>;
};

/**
 * Builds a canonical agent URL when the remote payload does not include one explicitly.
 *
 * @param serverUrl - Base URL of the federated server.
 * @param agent - Federated agent record.
 * @returns Canonical agent profile URL.
 */
function createFederatedAgentUrl(serverUrl: string, agent: AgentWithVisibility): string {
    return `${serverUrl}/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`;
}

/**
 * Parses one federated `/api/agents` response into the shared local card shape.
 *
 * @param response - HTTP response returned by the federated endpoint.
 * @param serverUrl - Base URL of the federated server.
 * @returns Federated agents enriched with visibility and server metadata.
 */
async function parseFederatedAgentsResponse(
    response: Response,
    serverUrl: string,
): Promise<Array<AgentWithVisibility>> {
    if (!response.ok) {
        throw new Error(`Failed to fetch agents from ${serverUrl} (Status: ${response.status})`);
    }

    const payload = (await response.json().catch(() => ({}))) as FederatedAgentsResponse;
    const agents = Array.isArray(payload.agents) ? payload.agents : [];

    return agents.map((agent) => ({
        ...agent,
        visibility: 'PUBLIC',
        serverUrl,
        url: agent.url || createFederatedAgentUrl(serverUrl, agent),
    }));
}

/**
 * Loads agents from one federated server, first directly and then through the existing proxy fallback.
 *
 * @param serverUrl - Raw configured federated server URL.
 * @returns Agents returned by the remote server.
 */
export async function loadFederatedServerAgents(serverUrl: string): Promise<Array<AgentWithVisibility>> {
    const normalizedUrl = normalizeServerUrl(serverUrl);

    try {
        const directResponse = await fetch(`${normalizedUrl}/api/agents`);
        return await parseFederatedAgentsResponse(directResponse, normalizedUrl);
    } catch (directError) {
        try {
            const proxyResponse = await fetch(`/agents/${encodeURIComponent(normalizedUrl)}/api/agents`);
            return await parseFederatedAgentsResponse(proxyResponse, normalizedUrl);
        } catch (proxyError) {
            if (proxyError instanceof Error) {
                throw proxyError;
            }

            if (directError instanceof Error) {
                throw directError;
            }

            throw new Error(`Failed to fetch agents from ${normalizedUrl}`);
        }
    }
}
