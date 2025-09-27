import type { string_model_name } from '../../types/typeAliases';
import { createBasicAgentModelRequirements } from '../commitments/_base/createEmptyAgentModelRequirements';
import { getCommitmentDefinition } from '../commitments/index';
import type { AgentModelRequirements } from './AgentModelRequirements';
import { extractMcpServers } from './createAgentModelRequirements';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { removeCommentsFromSystemMessage } from './removeCommentsFromSystemMessage';
import type { string_book } from './string_book';

/**
 * Creates agent model requirements using the new commitment system
 * This function uses a reduce-like pattern where each commitment applies its changes
 * to build the final requirements starting from a basic empty model
 *
 * @public exported from `@promptbook/core`
 */
export async function createAgentModelRequirementsWithCommitments(
    agentSource: string_book,
    modelName?: string_model_name,
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
