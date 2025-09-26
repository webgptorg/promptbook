import PipelineCollection from '../../../books/index.json';
import { createCollectionFromJson } from '../../collection/constructors/createCollectionFromJson';
import type { AvailableModel } from '../../execution/AvailableModel';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { jsonParse } from '../../formats/json/utils/jsonParse';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_model_name, string_persona_description } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { AgentModelRequirements } from './AgentModelRequirements';
import {
    clearAgentModelRequirementsWithCommitmentsCache,
    createAgentModelRequirementsWithCommitmentsCached,
    getAgentModelRequirementsWithCommitmentsCacheSize,
    invalidateAgentModelRequirementsWithCommitmentsCache,
} from './createAgentModelRequirementsWithCommitments';
import { parseAgentSource } from './parseAgentSource';
import type { string_book } from './string_book';

/**
 *  Cache for expensive createAgentModelRequirements calls
 *
 *  TODO: !!!! Remove caching
 *  @private
 */
const modelRequirementsCache = new Map<string, AgentModelRequirements>();

// TODO: Remove or use:
//const CACHE_SIZE_LIMIT = 100; // Prevent memory leaks by limiting cache size

/**
 * Creates model requirements for an agent based on its source
 * Results are cached to improve performance for repeated calls with the same agentSource and modelName
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
 *
 * @public exported from `@promptbook/core`
 */
export async function createAgentModelRequirements(
    agentSource: string_book,
    modelName?: string_model_name,
    availableModels?: readonly AvailableModel[],
): Promise<AgentModelRequirements> {
    // If availableModels are provided and no specific modelName is given,
    // use preparePersona to select the best model
    if (availableModels && !modelName) {
        const selectedModelName = await selectBestModelFromAvailable(agentSource, availableModels);
        return createAgentModelRequirementsWithCommitmentsCached(agentSource, selectedModelName);
    }

    // Use the new commitment-based system with provided or default model
    return createAgentModelRequirementsWithCommitmentsCached(agentSource, modelName);
}

/**
 * Selects the best model from available models using the preparePersona mechanism
 * This reuses the existing logic from preparePersona to ensure DRY principle
 *
 * @param agentSource The agent source to derive persona description from
 * @param availableModels List of available models to choose from
 * @returns The name of the best selected model
 * @private
 */
async function selectBestModelFromAvailable(
    agentSource: string_book,
    availableModels: readonly AvailableModel[]
): Promise<string_model_name> {
    // Parse agent source to get persona description
    const { agentName, personaDescription } = parseAgentSource(agentSource);

    // Use agent name as fallback if no persona description is available
    const description = personaDescription || agentName || 'AI Agent';

    // Transform availableModels to the format expected by preparePersona
    const modelsForPersona = availableModels
        .filter(({ modelVariant }) => modelVariant === 'CHAT')
        .map(({ modelName, modelDescription }) => ({
            modelName,
            modelDescription,
        }));

    if (modelsForPersona.length === 0) {
        throw new Error('No CHAT models available for agent model selection');
    }

    try {
        // TODO: [🌼] In future use `ptbk make` and made getPipelineCollection
        const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as ReadonlyArray<PipelineJson>));

        // Create a minimal execution tools object with mock LLM tools
        // Since we're only using this for model selection, we don't need full LLM functionality
        const mockLlmTools = {
            listModels: () => Promise.resolve(availableModels),
            // We don't need other methods for model selection
        } as TODO_any;

        const tools: Pick<ExecutionTools, 'llm'> = {
            llm: mockLlmTools,
        };

        const preparePersonaExecutor = createPipelineExecutor({
            pipeline: await collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-persona.book'),
            tools,
        });

        const result = await preparePersonaExecutor({
            availableModels: modelsForPersona, /* <- Note: Passing as JSON */
            personaDescription: description as string_persona_description,
        }).asPromise({ isCrashedOnError: true });

        const { outputParameters } = result;
        const { modelsRequirements: modelsRequirementsJson } = outputParameters;

        let modelsRequirementsUnchecked: Array<TODO_any> = jsonParse(modelsRequirementsJson!);

        if (!Array.isArray(modelsRequirementsUnchecked)) {
            modelsRequirementsUnchecked = [modelsRequirementsUnchecked];
        }

        // Extract the first model name from the requirements
        if (modelsRequirementsUnchecked.length > 0 && modelsRequirementsUnchecked[0]?.modelName) {
            return modelsRequirementsUnchecked[0].modelName;
        }

        // Fallback to the first available model if preparePersona doesn't return a selection
        return modelsForPersona[0]!.modelName;

    } catch (error) {
        console.warn('Failed to use preparePersona for model selection, falling back to first available model:', error);
        // Fallback to the first available CHAT model
        return modelsForPersona[0]!.modelName;
    }
}

/**
 * Clears the cache for createAgentModelRequirements
 * Useful when agent sources are updated and cached results should be invalidated
 *
 * @private
 */
export function clearAgentModelRequirementsCache(): void {
    modelRequirementsCache.clear();
    clearAgentModelRequirementsWithCommitmentsCache();
}

/**
 * Removes cache entries for a specific agent source (all model variants)
 * @param agentSource The agent source to remove from cache
 * @private
 */
export function invalidateAgentModelRequirementsCache(agentSource: string_book): void {
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
 *
 * @private
 */
export function getAgentModelRequirementsCacheSize(): number {
    return modelRequirementsCache.size + getAgentModelRequirementsWithCommitmentsCacheSize();
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
 * Extracts the profile image URL from agent source or returns gravatar fallback
 * @param agentSource The agent source string that may contain META IMAGE line
 * @returns Profile image URL (from source or gravatar fallback)
 * @deprecated Use parseAgentSource instead
 * @private
 */
export function extractAgentProfileImage(agentSource: string_book): string {
    const { meta } = parseAgentSource(agentSource);
    return meta.image!;
}



/**
 * TODO: [😩] DRY `preparePersona` and `selectBestModelFromAvailable`
 */
