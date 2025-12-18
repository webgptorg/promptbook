import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { preparePersona } from '../../personas/preparePersona';
import type { string_model_name } from '../../types/typeAliases';
import type { AgentModelRequirements } from './AgentModelRequirements';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { parseAgentSource } from './parseAgentSource';
import type { string_book } from './string_book';

/**
 * Creates model requirements for an agent based on its source
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronous.
 *
 * @public exported from `@promptbook/core`
 */
export async function createAgentModelRequirements(
    agentSource: string_book,
    modelName?: string_model_name,
    availableModels?: readonly AvailableModel[],
    llmTools?: LlmExecutionTools,
): Promise<AgentModelRequirements> {
    // If availableModels are provided and no specific modelName is given,
    // use preparePersona to select the best model
    if (availableModels && !modelName && llmTools) {
        const selectedModelName = await selectBestModelUsingPersona(agentSource, llmTools);
        return createAgentModelRequirementsWithCommitments(agentSource, selectedModelName);
    }

    // Use the new commitment-based system with provided or default model
    return createAgentModelRequirementsWithCommitments(agentSource, modelName);
}

/**
 * Selects the best model using the preparePersona function
 * This directly uses preparePersona to ensure DRY principle
 *
 * @param agentSource The agent source to derive persona description from
 * @param llmTools LLM tools for preparing persona
 * @returns The name of the best selected model
 * @private function of `createAgentModelRequirements`
 */
async function selectBestModelUsingPersona(
    agentSource: string_book,
    llmTools: LlmExecutionTools,
): Promise<string_model_name> {
    // Parse agent source to get persona description
    const { agentName, personaDescription } = parseAgentSource(agentSource);

    // Use agent name as fallback if no persona description is available
    const description = personaDescription || agentName || 'AI Agent';

    try {
        // Use preparePersona directly
        const { modelsRequirements } = await preparePersona(description, { llm: llmTools }, { isVerbose: false });

        // Extract the first model name from the requirements
        if (modelsRequirements.length > 0 && modelsRequirements[0]?.modelName) {
            return modelsRequirements[0].modelName;
        }

        // Fallback: get available models and return the first CHAT model
        const availableModels = await llmTools.listModels();
        const chatModels = availableModels.filter(({ modelVariant }) => modelVariant === 'CHAT');

        if (chatModels.length === 0) {
            throw new Error('No CHAT models available for agent model selection');
        }

        return chatModels[0]!.modelName;
    } catch (error) {
        console.warn('Failed to use preparePersona for model selection, falling back to first available model:', error);

        // Fallback: get available models and return the first CHAT model
        const availableModels = await llmTools.listModels();
        const chatModels = availableModels.filter(({ modelVariant }) => modelVariant === 'CHAT');

        if (chatModels.length === 0) {
            throw new Error('No CHAT models available for agent model selection');
        }

        return chatModels[0]!.modelName;
    }
}

/**
 * Extracts MCP servers from agent source
 *
 * @param agentSource The agent source string that may contain MCP lines
 * @returns Array of MCP server identifiers
 *
 * @private TODO: [🧠] Maybe should be public
 */
export function extractMcpServers(agentSource: string_book): string[] {
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
 * @private
 */
export async function createAgentSystemMessage(agentSource: string_book): Promise<string> {
    const modelRequirements = await createAgentModelRequirements(agentSource);
    return modelRequirements.systemMessage;
}

/**
 * Extracts the agent name from the first line of the agent source
 * @deprecated Use parseAgentSource instead
 * @private
 */
export function extractAgentName(agentSource: string_book): string {
    const { agentName } = parseAgentSource(agentSource);

    if (!agentName) {
        throw new Error('Agent source must have at least one line to derive the name');
    }

    return agentName;
}

/**
 * Extracts the profile image URL from agent source or returns default avatar fallback
 * @param agentSource The agent source string that may contain META IMAGE line
 * @returns Profile image URL (from source or default avatar fallback)
 * @deprecated Use parseAgentSource instead
 * @private
 */
export function extractAgentProfileImage(agentSource: string_book): string {
    const { meta } = parseAgentSource(agentSource);
    return meta.image!;
}
