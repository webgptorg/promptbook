import { parseAgentSource } from '../../agent-source/parseAgentSource';
import type { string_agent_source } from '../../agent-source/string_agent_source';
import { DEFAULT_MODEL_ID } from '../../../constants/models';
import type { AgentModelRequirements } from './AgentModelRequirements';
import { clearAgentModelRequirementsWithCommitmentsCache } from './createAgentModelRequirementsWithCommitments';
import { createAgentModelRequirementsWithCommitmentsCached } from './createAgentModelRequirementsWithCommitments';
import { getAgentModelRequirementsWithCommitmentsCacheSize } from './createAgentModelRequirementsWithCommitments';
import { invalidateAgentModelRequirementsWithCommitmentsCache } from './createAgentModelRequirementsWithCommitments';

// Cache for expensive createAgentModelRequirements calls
const modelRequirementsCache = new Map<string, AgentModelRequirements>();
const CACHE_SIZE_LIMIT = 100; // Prevent memory leaks by limiting cache size

/**
 * Creates model requirements for an agent based on its source
 * Results are cached to improve performance for repeated calls with the same agentSource and modelName
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
 */
export async function createAgentModelRequirements(
    agentSource: string_agent_source,
    modelName: string = DEFAULT_MODEL_ID,
): Promise<AgentModelRequirements> {
    // Use the new commitment-based system
    return createAgentModelRequirementsWithCommitmentsCached(agentSource, modelName);
}

/**
 * Clears the cache for createAgentModelRequirements
 * Useful when agent sources are updated and cached results should be invalidated
 */
export function clearAgentModelRequirementsCache(): void {
    modelRequirementsCache.clear();
    clearAgentModelRequirementsWithCommitmentsCache();
}

/**
 * Removes cache entries for a specific agent source (all model variants)
 * @param agentSource The agent source to remove from cache
 */
export function invalidateAgentModelRequirementsCache(agentSource: string_agent_source): void {
    // Remove all cache entries that start with this agent source
    const keysToDelete: string[] = [];
    for (const key of modelRequirementsCache.keys()) {
        if (key.startsWith(`${agentSource}|`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((key) => modelRequirementsCache.delete(key));

    // Also clear the new commitment-based cache
    invalidateAgentModelRequirementsWithCommitmentsCache(agentSource);
}

/**
 * Gets the current cache size (for debugging/monitoring)
 */
export function getAgentModelRequirementsCacheSize(): number {
    return modelRequirementsCache.size + getAgentModelRequirementsWithCommitmentsCacheSize();
}

/**
 * Extracts MCP servers from agent source
 *
 * @param agentSource The agent source string that may contain MCP lines
 * @returns Array of MCP server identifiers
 */
export function extractMcpServers(agentSource: string_agent_source): string[] {
    if (!agentSource) {
        return [];
    }

    const lines = agentSource.split('\n');
    const mcpRegex = /^\s*MCP\s+(.+)$/i;
    const mcpServers: string[] = [];

    // Look for MCP lines
    for (const line of lines) {
        const match = line.match(mcpRegex);
        if (match && match[1]) {
            mcpServers.push(match[1].trim());
        }
    }

    return mcpServers;
}

/**
 * Creates a system message for an agent based on its source
 * @deprecated Use createAgentModelRequirements instead
 */
export async function createAgentSystemMessage(agentSource: string_agent_source): Promise<string> {
    const modelRequirements = await createAgentModelRequirements(agentSource);
    return modelRequirements.systemMessage;
}

/**
 * Extracts the agent name from the first line of the agent source
 * @deprecated Use parseAgentSource instead
 */
export function extractAgentName(agentSource: string_agent_source): string {
    const { agentName } = parseAgentSource(agentSource);

    if (!agentName) {
        throw new Error('Agent source must have at least one line to derive the name');
    }

    return agentName;
}

/**
 * Extracts the profile image URL from agent source or returns gravatar fallback
 * @param agentSource The agent source string that may contain META IMAGE line
 * @returns Profile image URL (from source or gravatar fallback)
 * @deprecated Use parseAgentSource instead
 */
export function extractAgentProfileImage(agentSource: string_agent_source): string {
    const { profileImageUrl } = parseAgentSource(agentSource);
    return profileImageUrl;
}
