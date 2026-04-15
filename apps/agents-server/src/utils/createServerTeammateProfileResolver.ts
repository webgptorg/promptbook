import type { AgentBasicInformation } from '../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { TeammateProfile, TeammateProfileResolver } from '../../../../src/book-2.0/agent-source/TeammateProfileResolver';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';

/**
 * Builds the agent URL path using the agent name, matching the local URL format used
 * by `ServerAgentReferenceResolver.buildLocalAgentUrl`.
 */
function buildAgentUrlVariants(agent: AgentBasicInformation, normalizedServerUrl: string): string[] {
    const variants: string[] = [`${normalizedServerUrl}/agents/${encodeURIComponent(agent.agentName)}`];

    if (agent.permanentId) {
        variants.push(`${normalizedServerUrl}/agents/${encodeURIComponent(agent.permanentId)}`);
    }

    return variants;
}

/**
 * Creates a `TeammateProfileResolver` backed by the local agent collection.
 *
 * The resolver maps teammate agent URLs to their human-readable names and profile
 * descriptions without making any network requests. Only agents hosted on the
 * current server can be resolved; remote agents will return `null`.
 *
 * @param collection - Agent collection for the current server instance.
 * @param localServerUrl - Base URL of the current server (e.g. `https://agents.example.com`).
 * @returns Resolver that enriches TEAM tool definitions with real agent profile data.
 */
export async function createServerTeammateProfileResolver(
    collection: AgentCollection,
    localServerUrl: string,
): Promise<TeammateProfileResolver> {
    const normalizedServerUrl = localServerUrl.replace(/\/+$/, '');
    const agents = await collection.listAgents();

    const urlToProfile = new Map<string, TeammateProfile>();

    for (const agent of agents) {
        const profile: TeammateProfile = {
            agentName: agent.agentName,
            personaDescription: agent.personaDescription,
        };

        for (const url of buildAgentUrlVariants(agent, normalizedServerUrl)) {
            if (!urlToProfile.has(url)) {
                urlToProfile.set(url, profile);
            }
        }
    }

    return {
        resolveTeammateProfile: async (url: string): Promise<TeammateProfile | null> => {
            return urlToProfile.get(url) ?? null;
        },
    };
}
