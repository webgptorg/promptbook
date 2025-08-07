import type { string_agent_source } from '../../agent-source/string_agent_source';
import { getCommitmentDefinition } from '../index';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import type { AgentModelRequirements } from './AgentModelRequirements';
import { extractMcpServers } from './createAgentModelRequirements';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { removeCommentsFromSystemMessage } from './removeCommentsFromSystemMessage';

/**
 * Creates agent model requirements using the new commitment system
 * This function uses a reduce-like pattern where each commitment applies its changes
 * to build the final requirements starting from a basic empty model
 */
export async function createAgentModelRequirementsWithCommitments(
    agentSource: string_agent_source,
    modelName?: string,
): Promise<AgentModelRequirements> {
    // Parse the agent source to extract commitments
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    // Start with basic agent model requirements
    let requirements = createBasicAgentModelRequirements(parseResult.agentName);

    // Store the agent name in metadata so commitments can access it
    requirements = {
        ...requirements,
        metadata: {
            ...requirements.metadata,
            agentName: parseResult.agentName,
        },
    };

    // Override model name if provided
    if (modelName) {
        requirements = {
            ...requirements,
            modelName,
        };
    }

    // Apply each commitment in order using reduce-like pattern
    for (const commitment of parseResult.commitments) {
        const definition = getCommitmentDefinition(commitment.type);
        if (definition) {
            try {
                requirements = definition.applyToAgentModelRequirements(requirements, commitment.content);
            } catch (error) {
                console.warn(`Failed to apply commitment ${commitment.type}:`, error);
                // Continue with other commitments even if one fails
            }
        }
    }

    // Handle MCP servers (extract from original agent source)
    const mcpServers = extractMcpServers(agentSource);
    if (mcpServers.length > 0) {
        requirements = {
            ...requirements,
            mcpServers,
        };
    }

    // Add non-commitment lines to system message if they exist
    const nonCommitmentContent = parseResult.nonCommitmentLines
        .filter((line, index) => index > 0 || !parseResult.agentName) // Skip first line if it's the agent name
        .filter((line) => line.trim()) // Remove empty lines
        .join('\n')
        .trim();

    if (nonCommitmentContent) {
        requirements = {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + nonCommitmentContent,
        };
    }

    // Remove comment lines (lines starting with #) from the final system message
    // while preserving the original content with comments in metadata
    const cleanedSystemMessage = removeCommentsFromSystemMessage(requirements.systemMessage);

    return {
        ...requirements,
        systemMessage: cleanedSystemMessage,
    };
}

/**
 * Cache for expensive createAgentModelRequirementsWithCommitments calls
 */
const modelRequirementsCache = new Map<string, AgentModelRequirements>();
const CACHE_SIZE_LIMIT = 100;

/**
 * Cached version of createAgentModelRequirementsWithCommitments
 * This maintains the same caching behavior as the original function
 */
export async function createAgentModelRequirementsWithCommitmentsCached(
    agentSource: string_agent_source,
    modelName?: string,
): Promise<AgentModelRequirements> {
    // Create cache key
    const cacheKey = `${agentSource}|${modelName || 'default'}`;

    // Check cache first
    if (modelRequirementsCache.has(cacheKey)) {
        return modelRequirementsCache.get(cacheKey)!;
    }

    // Limit cache size to prevent memory leaks
    if (modelRequirementsCache.size >= CACHE_SIZE_LIMIT) {
        const firstKey = modelRequirementsCache.keys().next().value;
        if (firstKey) {
            modelRequirementsCache.delete(firstKey);
        }
    }

    // Create requirements
    const requirements = await createAgentModelRequirementsWithCommitments(agentSource, modelName);

    // Cache the result
    modelRequirementsCache.set(cacheKey, requirements);

    return requirements;
}

/**
 * Clears the cache for createAgentModelRequirementsWithCommitments
 */
export function clearAgentModelRequirementsWithCommitmentsCache(): void {
    modelRequirementsCache.clear();
}

/**
 * Removes cache entries for a specific agent source
 */
export function invalidateAgentModelRequirementsWithCommitmentsCache(agentSource: string_agent_source): void {
    const keysToDelete: string[] = [];
    for (const key of modelRequirementsCache.keys()) {
        if (key.startsWith(`${agentSource}|`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((key) => modelRequirementsCache.delete(key));
}

/**
 * Gets the current cache size
 */
export function getAgentModelRequirementsWithCommitmentsCacheSize(): number {
    return modelRequirementsCache.size;
}
