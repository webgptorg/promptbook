import { parseAgentSource } from '@promptbook-local/core';
import { string_book } from '@promptbook-local/types';
import { computeHash } from '@promptbook-local/utils';

/**
 * Configuration that uniquely identifies a vector store for OpenAI Responses API.
 */
export type AgentVectorStoreConfiguration = {
    /**
     * Base agent source without dynamic CONTEXT lines.
     */
    readonly baseAgentSource: string_book;

    /**
     * Agent name derived from agent source.
     */
    readonly name: string;

    /**
     * Knowledge source URLs derived from the agent source.
     */
    readonly knowledgeSources: ReadonlyArray<string>;
};

/**
 * Extracts vector store configuration from agent source.
 *
 * @param agentSource - The full agent source (may include CONTEXT lines).
 * @param options - Configuration options.
 * @param options.includeDynamicContext - Whether to include CONTEXT lines in configuration (default: true).
 * @returns Vector store configuration for caching.
 */
export function extractAgentVectorStoreConfiguration(
    agentSource: string_book,
    options: { includeDynamicContext?: boolean } = {},
): AgentVectorStoreConfiguration {
    const { includeDynamicContext = true } = options;

    const lines = agentSource.split(/\r?\n/);
    const baseLines = lines.filter((line) => !line.startsWith('CONTEXT '));
    const baseAgentSource = baseLines.join('\n') as string_book;
    const configAgentSource = includeDynamicContext ? agentSource : baseAgentSource;

    const parsed = parseAgentSource(configAgentSource);
    const name = parsed.agentName || 'agent';
    const knowledgeSources = Array.from(
        new Set(parsed.knowledgeSources.map((source) => source.url).filter((url) => url.length > 0)),
    );

    return {
        baseAgentSource: configAgentSource,
        name,
        knowledgeSources,
    };
}

/**
 * Computes a unique cache key for a vector store based on its configuration.
 *
 * @param configuration - Vector store configuration.
 * @returns Cache key (hash) for the vector store.
 */
export function computeAgentVectorStoreCacheKey(configuration: AgentVectorStoreConfiguration): string {
    const cacheObject = {
        name: configuration.name,
        baseAgentSource: configuration.baseAgentSource,
        knowledgeSources: configuration.knowledgeSources,
    };

    return computeHash(JSON.stringify(cacheObject));
}
