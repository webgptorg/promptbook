import { AgentCollection } from '@promptbook-local/types';

type Agent = Awaited<ReturnType<AgentCollection['listAgents']>>[number];

type AgentWithUrl = Agent & {
    url: string;
};

type AgentsApiResponse = {
    agents: AgentWithUrl[];
    federatedServers: string[];
};

export type AgentsByServer = {
    serverUrl: string;
    agents: AgentWithUrl[];
};

/**
 * Fetches agents from federated servers recursively
 */
export async function getFederatedAgents(initialServers: string[]): Promise<AgentsByServer[]> {
    const visited = new Set<string>();
    const queue = [...initialServers];
    const agentsByServer = new Map<string, AgentWithUrl[]>();
    const MAX_SERVERS = 20;

    while (queue.length > 0 && visited.size < MAX_SERVERS) {
        const serverUrl = queue.shift();
        if (!serverUrl) continue;

        const normalizedUrl = serverUrl.trim().replace(/\/$/, '');
        if (visited.has(normalizedUrl)) continue;
        visited.add(normalizedUrl);

        try {
            // TODO: [🧠] Should we use some shorter timeout?
            const response = await fetch(`${normalizedUrl}/api/agents`, {
                next: { revalidate: 600 }, // Cache for 10 minutes
            });

            if (!response.ok) {
                console.warn(`Failed to fetch agents from ${normalizedUrl}: ${response.status} ${response.statusText}`);
                continue;
            }

            const data: AgentsApiResponse = await response.json();

            if (data.agents && Array.isArray(data.agents)) {
                const serverAgents: AgentWithUrl[] = [];
                const existingAgentUrls = new Set<string>();

                // Collect all existing agent URLs across all servers
                for (const agents of agentsByServer.values()) {
                    for (const agent of agents) {
                        existingAgentUrls.add(agent.url);
                    }
                }

                for (const agent of data.agents) {
                    if (agent.url && !existingAgentUrls.has(agent.url)) {
                        serverAgents.push(agent);
                        existingAgentUrls.add(agent.url);
                    }
                }

                if (serverAgents.length > 0) {
                    agentsByServer.set(normalizedUrl, serverAgents);
                }
            }

            if (data.federatedServers && Array.isArray(data.federatedServers)) {
                for (const server of data.federatedServers) {
                    const normalizedServer = server.trim().replace(/\/$/, '');
                    if (!visited.has(normalizedServer) && normalizedServer !== '') {
                        queue.push(normalizedServer);
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching agents from ${normalizedUrl}:`, error);
        }
    }

    return Array.from(agentsByServer.entries()).map(([serverUrl, agents]) => ({
        serverUrl,
        agents,
    }));
}
