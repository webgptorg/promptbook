import { parseAgentSource } from '@promptbook-local/core';
import { string_book } from '@promptbook-local/types';
import { computeHash } from '@promptbook-local/utils';

const ASSISTANT_NAME_HASH_LENGTH = 8;

/**
 * Configuration that uniquely identifies an OpenAI Assistant
 */
export type AssistantConfiguration = {
    /**
     * Base agent source without dynamic CONTEXT lines
     */
    readonly baseAgentSource: string_book;

    /**
     * Assistant name derived from agent source
     */
    readonly name: string;

    /**
     * Base instructions (PERSONA) without dynamic context
     */
    readonly instructions: string;

    /**
     * Model name (if specified)
     * Currently not used but included for future extensibility
     */
    readonly model?: string;

    /**
     * Temperature setting (if specified)
     * Currently not used but included for future extensibility
     */
    readonly temperature?: number;

    /**
     * Tools configuration (if specified)
     * Currently not used but included for future extensibility
     */
    readonly tools?: ReadonlyArray<unknown>;
};

/**
 * Extracts assistant configuration from agent source
 *
 * This function extracts the configuration that uniquely identifies an assistant.
 * You can choose to include or exclude dynamic CONTEXT lines from the configuration.
 *
 * @param agentSource - The full agent source (may include CONTEXT lines)
 * @param options - Configuration options
 * @param options.includeDynamicContext - Whether to include CONTEXT lines in configuration (default: true for backward compatibility)
 * @returns Assistant configuration for caching
 */
export function extractAssistantConfiguration(
    agentSource: string_book,
    options: { includeDynamicContext?: boolean } = {},
): AssistantConfiguration {
    const { includeDynamicContext = true } = options;

    // Separate base agent source from dynamic context if needed
    const lines = agentSource.split(/\r?\n/);
    const contextLines = lines.filter((line) => line.startsWith('CONTEXT '));
    const baseLines = lines.filter((line) => !line.startsWith('CONTEXT '));
    const baseAgentSource = baseLines.join('\n') as string_book;

    // Determine which source to use for configuration
    const configAgentSource = includeDynamicContext ? agentSource : baseAgentSource;

    // Parse agent source to get name and persona
    const parsed = parseAgentSource(configAgentSource);
    const name = parsed.agentName || 'assistant';
    const baseInstructions = parsed.personaDescription || 'You are a helpful assistant.';

    // If including dynamic context, append it to instructions
    const contextInstructions = contextLines.map((line) => line.replace(/^CONTEXT\s+/, '')).join('\n');
    const instructions =
        includeDynamicContext && contextInstructions
            ? `${baseInstructions}\n\n${contextInstructions}`
            : baseInstructions;

    return {
        baseAgentSource: configAgentSource,
        name,
        instructions,
        // Future: Add model, temperature, tools when supported
    };
}

/**
 * Computes a unique cache key for an OpenAI Assistant based on its configuration
 *
 * This key is used to determine if two agents can share the same OpenAI Assistant.
 * Agents with the same base configuration (but potentially different dynamic context)
 * will share the same assistant, improving resource efficiency.
 *
 * @param configuration - Assistant configuration
 * @returns Cache key (hash) for the assistant
 */
export function computeAssistantCacheKey(configuration: AssistantConfiguration): string {
    // Create a deterministic object for hashing
    const cacheObject = {
        name: configuration.name,
        instructions: configuration.instructions,
        // Include base agent source to capture all commitments and rules
        baseAgentSource: configuration.baseAgentSource,
        // Future: Include model, temperature, tools when they become configurable
        ...(configuration.model && { model: configuration.model }),
        ...(configuration.temperature !== undefined && { temperature: configuration.temperature }),
        ...(configuration.tools && { tools: configuration.tools }),
    };

    // TODO: !!!!! Is this doing what is it supposed to do?

    // Hash the configuration object
    return computeHash(JSON.stringify(cacheObject));
}

/**
 * Builds an assistant name by appending a short hash suffix to the base name.
 *
 * @param name - Base agent or assistant name
 * @param cacheKey - Full cache key hash
 * @returns Assistant name with hash suffix
 */
export function formatAssistantNameWithHash(name: string, cacheKey: string): string {
    const suffix = cacheKey.slice(0, ASSISTANT_NAME_HASH_LENGTH);
    return `${name} - ${suffix}`;
}

/**
 * Extracts dynamic context lines from agent source
 *
 * These context lines are provided per-request and don't affect assistant caching.
 *
 * @param agentSource - The full agent source (may include CONTEXT lines)
 * @returns Array of context strings
 */
export function extractDynamicContext(agentSource: string_book): string[] {
    const lines = agentSource.split(/\r?\n/);
    return lines.filter((line) => line.startsWith('CONTEXT ')).map((line) => line.replace(/^CONTEXT\s+/, ''));
}
