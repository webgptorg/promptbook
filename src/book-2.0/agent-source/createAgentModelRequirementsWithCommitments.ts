import { getCommitmentDefinition } from '../../commitments/index';
import { createBasicAgentModelRequirements } from '../../commitments/_base/createEmptyAgentModelRequirements';
import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_model_name } from '../../types/typeAliases';
import type { AgentModelRequirements } from './AgentModelRequirements';
import { extractMcpServers } from './createAgentModelRequirements';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
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
    tools?: ExecutionTools,
): Promise<AgentModelRequirements> {
    // Parse the agent source to extract commitments
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    // Apply DELETE filtering: remove prior commitments tagged by parameters targeted by DELETE/CANCEL/DISCARD/REMOVE
    const filteredCommitments: ParsedCommitment[] = [];
    for (const commitment of parseResult.commitments) {
        // Handle DELETE-like commitments by invalidating prior tagged commitments
        if (
            commitment.type === 'DELETE' ||
            commitment.type === 'CANCEL' ||
            commitment.type === 'DISCARD' ||
            commitment.type === 'REMOVE'
        ) {
            const targets = parseParameters(commitment.content)
                .map((parameter) => parameter.name.trim().toLowerCase())
                .filter(Boolean);

            if (targets.length === 0) {
                // Ignore DELETE with no targets; also don't pass the DELETE further
                continue;
            }

            // Drop prior kept commitments that contain any of the targeted tags
            for (let i = filteredCommitments.length - 1; i >= 0; i--) {
                const prev = filteredCommitments[i]!;
                const prevParams = parseParameters(prev.content).map((parameter) => parameter.name.trim().toLowerCase());
                const hasIntersection = prevParams.some((parameterName) => targets.includes(parameterName));
                if (hasIntersection) {
                    filteredCommitments.splice(i, 1);
                }
            }

            // Do not keep the DELETE commitment itself
            continue;
        }

        filteredCommitments.push(commitment);
    }

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
    for (let i = 0; i < filteredCommitments.length; i++) {
        const commitment = filteredCommitments[i]!;

        // CLOSED commitment should work only if its the last commitment in the book
        if (commitment.type === 'CLOSED' && i !== filteredCommitments.length - 1) {
            continue;
        }

        const definition = getCommitmentDefinition(commitment.type);
        if (definition) {
            try {
                requirements = await definition.applyToAgentModelRequirements(
                    requirements,
                    commitment.content,
                    tools || {},
                );
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
    // Note: Filtering out horizontal lines (---) as requested
    const nonCommitmentContent = parseResult.nonCommitmentLines
        .filter((line, index) => index > 0 || !parseResult.agentName) // Skip first line if it's the agent name
        .filter((line) => line.trim()) // Remove empty lines
        .filter((line) => !/^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/.test(line)) // Remove horizontal lines
        .join('\n')
        .trim();

    if (nonCommitmentContent) {
        requirements = {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + nonCommitmentContent,
        };
    }

    // Add example interactions to the system message
    const examples: string[] = [];

    // 1. Initial message as an example agent response
    const initialMessage = parseResult.commitments.find((c) => c.type === 'INITIAL MESSAGE')?.content;
    if (initialMessage) {
        examples.push(`Agent: ${initialMessage}`);
    }

    // 2. User and Agent message pairs
    if (requirements.samples && requirements.samples.length > 0) {
        for (const sample of requirements.samples) {
            examples.push(`User: ${sample.question}\nAgent: ${sample.answer}`);
        }
    }

    if (examples.length > 0) {
        const exampleInteractionsContent = `Example interaction:\n\n${examples.join('\n\n')}`;
        requirements = {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + exampleInteractionsContent,
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
