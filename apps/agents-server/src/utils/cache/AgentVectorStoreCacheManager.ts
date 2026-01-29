import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { parseAgentSource } from '@promptbook-local/core';
import { OpenAiAgentExecutionTools } from '@promptbook-local/openai';
import { string_book } from '@promptbook-local/types';
import {
    AgentCacheConfiguration,
    computeAgentCacheKey,
    extractAgentCacheConfiguration,
} from './computeAgentCacheKey';

/**
 * Result of getting or creating a vector store cache entry
 */
export type AgentVectorStoreCacheResult = {
    /**
     * Cached vector store ID to use for file search (or null when none is needed)
     */
    readonly vectorStoreId: string | null;

    /**
     * Whether this cache entry was retrieved from cache (true) or newly created (false)
     */
    readonly fromCache: boolean;

    /**
     * The cache key used for this entry
     */
    readonly cacheKey: string;

    /**
     * The agent configuration used to compute the cache key
     */
    readonly configuration: AgentCacheConfiguration;
};

/**
 * Manages cached vector stores for OpenAI Responses-based agents
 *
 * This class provides a centralized way to:
 * - Retrieve vector stores from cache when possible
 * - Create new vector stores when needed
 * - Store cache metadata in the database
 * - Track cache hits and misses for monitoring
 */
export class AgentVectorStoreCacheManager {
    private readonly isVerbose: boolean;

    /**
     * Creates a vector store cache manager.
     *
     * @param options - Optional configuration.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets an existing vector store from cache or creates a new one
     *
     * @param agentSource - The agent source (may include dynamic CONTEXT lines)
     * @param agentName - The agent name for logging and fallback
     * @param baseTools - Base OpenAI Agent execution tools instance
     * @param options - Cache options
     * @returns Vector store cache result with metadata
     */
    public async getOrCreateVectorStore(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAgentExecutionTools,
        options: { includeDynamicContext?: boolean } = {},
    ): Promise<AgentVectorStoreCacheResult> {
        const { includeDynamicContext = true } = options;

        const configuration = extractAgentCacheConfiguration(agentSource, { includeDynamicContext });
        const cacheKey = computeAgentCacheKey(configuration);

        if (this.isVerbose) {
            console.log(
                `[AgentVectorStoreCacheManager] Looking up vector store for agent "${agentName}" (cache key: ${cacheKey})`,
            );
        }

        const cachedVectorStore = await this.getCachedVectorStore(cacheKey);

        if (cachedVectorStore) {
            if (this.isVerbose) {
                console.log(
                    `[AgentVectorStoreCacheManager] Cache HIT for agent "${agentName}" - reusing vector store ${cachedVectorStore}`,
                );
            }

            return {
                vectorStoreId: cachedVectorStore,
                fromCache: true,
                cacheKey,
                configuration,
            };
        }

        const knowledgeSources = parseAgentSource(agentSource).knowledgeSources.map((source) => source.url);

        if (knowledgeSources.length === 0) {
            if (this.isVerbose) {
                console.log(
                    `[AgentVectorStoreCacheManager] No knowledge sources for agent "${agentName}" - skipping vector store creation`,
                );
            }

            return {
                vectorStoreId: null,
                fromCache: false,
                cacheKey,
                configuration,
            };
        }

        if (this.isVerbose) {
            console.log(
                `[AgentVectorStoreCacheManager] Cache MISS for agent "${agentName}" - creating new vector store`,
            );
        }

        const vectorStoreId = await OpenAiAgentExecutionTools.createVectorStore(
            await baseTools.getClient(),
            configuration.name || agentName,
            knowledgeSources,
        );

        await this.cacheVectorStore(cacheKey, vectorStoreId);

        if (this.isVerbose) {
            console.log(
                `[AgentVectorStoreCacheManager] Created and cached vector store ${vectorStoreId} for agent "${agentName}"`,
            );
        }

        return {
            vectorStoreId,
            fromCache: false,
            cacheKey,
            configuration,
        };
    }

    /**
     * Retrieves a vector store ID from the cache
     *
     * @param cacheKey - The cache key to look up
     * @returns Vector store ID if found, null otherwise
     */
    private async getCachedVectorStore(cacheKey: string): Promise<string | null> {
        const supabase = $provideSupabaseForServer();

        const { data, error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .select('assistantId')
            .eq('agentHash', cacheKey)
            .maybeSingle();

        if (error) {
            console.error('[AgentVectorStoreCacheManager] Error querying cache:', error);
            return null;
        }

        return data?.assistantId || null;
    }

    /**
     * Stores a vector store ID in the cache database
     *
     * @param cacheKey - Cache key
     * @param vectorStoreId - OpenAI vector store ID
     */
    private async cacheVectorStore(cacheKey: string, vectorStoreId: string): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase.from(await $getTableName('OpenAiAssistantCache')).insert({
            agentHash: cacheKey,
            assistantId: vectorStoreId,
        });

        if (error) {
            console.error('[AgentVectorStoreCacheManager] Error storing vector store in cache:', error);
            throw error;
        }
    }

    /**
     * Invalidates cache for a specific cache key
     *
     * @param cacheKey - Cache key to invalidate
     */
    public async invalidateCache(cacheKey: string): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .eq('agentHash', cacheKey);

        if (error) {
            console.error('[AgentVectorStoreCacheManager] Error invalidating cache:', error);
            throw error;
        }

        if (this.isVerbose) {
            console.log(`[AgentVectorStoreCacheManager] Invalidated cache for key: ${cacheKey}`);
        }
    }

    /**
     * Clears all cached vector stores
     */
    public async clearAllCache(): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .neq('id', 0);

        if (error) {
            console.error('[AgentVectorStoreCacheManager] Error clearing cache:', error);
            throw error;
        }

        if (this.isVerbose) {
            console.log('[AgentVectorStoreCacheManager] Cleared all cached vector stores');
        }
    }
}
