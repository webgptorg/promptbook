import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { OpenAiAgentExecutionTools } from '@promptbook-local/openai';
import { string_book } from '@promptbook-local/types';
import {
    AgentVectorStoreConfiguration,
    computeAgentVectorStoreCacheKey,
    extractAgentVectorStoreConfiguration,
} from './computeAgentVectorStoreCacheKey';

/**
 * Result of getting or creating a vector store for OpenAI Responses API.
 */
export type AgentVectorStoreCacheResult = {
    /**
     * The OpenAI Responses execution tools instance.
     */
    readonly tools: OpenAiAgentExecutionTools;

    /**
     * The vector store ID, if any.
     */
    readonly vectorStoreId?: string;

    /**
     * Whether the vector store was retrieved from cache (true) or newly created (false).
     */
    readonly fromCache: boolean;

    /**
     * The cache key used for this vector store.
     */
    readonly cacheKey: string;

    /**
     * The vector store configuration.
     */
    readonly configuration: AgentVectorStoreConfiguration;
};

/**
 * Manages vector store caching for OpenAI Responses API.
 */
export class OpenAiAgentVectorStoreCacheManager {
    private readonly isVerbose: boolean;

    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets an existing vector store from cache or creates a new one.
     *
     * @param agentSource - The agent source (may include dynamic CONTEXT lines).
     * @param agentName - The agent name for logging.
     * @param baseTools - Base OpenAI Responses execution tools instance.
     * @param options - Additional options.
     * @param options.includeDynamicContext - Whether to include CONTEXT lines in cache key (default: true).
     * @returns Vector store cache result with tools and metadata.
     */
    public async getOrCreateVectorStore(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAgentExecutionTools,
        options: { includeDynamicContext?: boolean } = {},
    ): Promise<AgentVectorStoreCacheResult> {
        const { includeDynamicContext = true } = options;

        const configuration = extractAgentVectorStoreConfiguration(agentSource, { includeDynamicContext });
        const cacheKey = `responses:vector-store:${computeAgentVectorStoreCacheKey(configuration)}`;

        if (configuration.knowledgeSources.length === 0) {
            return {
                tools: baseTools.vectorStoreId ? baseTools.withVectorStoreId(undefined) : baseTools,
                vectorStoreId: undefined,
                fromCache: false,
                cacheKey,
                configuration,
            };
        }

        if (this.isVerbose) {
            console.log(
                `[OpenAiAgentVectorStoreCacheManager] Looking up vector store for agent "${agentName}" (cache key: ${cacheKey})`,
            );
        }

        const cachedVectorStore = await this.getCachedVectorStoreId(cacheKey);

        if (cachedVectorStore) {
            if (this.isVerbose) {
                console.log(
                    `[OpenAiAgentVectorStoreCacheManager] Cache HIT for agent "${agentName}" - reusing vector store ${cachedVectorStore}`,
                );
            }

            return {
                tools: baseTools.withVectorStoreId(cachedVectorStore),
                vectorStoreId: cachedVectorStore,
                fromCache: true,
                cacheKey,
                configuration,
            };
        }

        if (this.isVerbose) {
            console.log(
                `[OpenAiAgentVectorStoreCacheManager] Cache MISS for agent "${agentName}" - creating vector store`,
            );
        }

        const createdTools = await this.createAndCacheVectorStore(configuration, agentName, cacheKey, baseTools);

        return {
            tools: createdTools,
            vectorStoreId: createdTools.vectorStoreId,
            fromCache: false,
            cacheKey,
            configuration,
        };
    }

    /**
     * Retrieves a vector store ID from the cache.
     *
     * @param cacheKey - The cache key to look up.
     * @returns Vector store ID if found, null otherwise.
     * @private
     */
    private async getCachedVectorStoreId(cacheKey: string): Promise<string | null> {
        const supabase = $provideSupabaseForServer();

        // Note: Reuse the OpenAiAssistantCache table to avoid schema changes.
        const { data, error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .select('assistantId')
            .eq('agentHash', cacheKey)
            .maybeSingle();

        if (error) {
            console.error('[OpenAiAgentVectorStoreCacheManager] Error querying cache:', error);
            return null;
        }

        return data?.assistantId || null;
    }

    /**
     * Creates a new vector store and stores it in the cache.
     *
     * @param configuration - Vector store configuration.
     * @param agentName - Agent name for logging.
     * @param cacheKey - Cache key for storage.
     * @param baseTools - Base OpenAI Responses execution tools.
     * @returns New execution tools with vector store ID.
     * @private
     */
    private async createAndCacheVectorStore(
        configuration: AgentVectorStoreConfiguration,
        agentName: string,
        cacheKey: string,
        baseTools: OpenAiAgentExecutionTools,
    ): Promise<OpenAiAgentExecutionTools> {
        const client = await baseTools.getClient();
        const vectorStoreId = await OpenAiAgentExecutionTools.createVectorStore(
            client,
            configuration.name || agentName,
            configuration.knowledgeSources,
        );

        if (!vectorStoreId) {
            return baseTools;
        }

        await this.cacheVectorStore(cacheKey, vectorStoreId);

        if (this.isVerbose) {
            console.log(
                `[OpenAiAgentVectorStoreCacheManager] Created and cached vector store ${vectorStoreId} for agent "${agentName}"`,
            );
        }

        return baseTools.withVectorStoreId(vectorStoreId);
    }

    /**
     * Stores a vector store in the cache database.
     *
     * @param cacheKey - Cache key.
     * @param vectorStoreId - Vector store ID.
     * @private
     */
    private async cacheVectorStore(cacheKey: string, vectorStoreId: string): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase.from(await $getTableName('OpenAiAssistantCache')).insert({
            agentHash: cacheKey,
            assistantId: vectorStoreId,
        });

        if (error) {
            console.error('[OpenAiAgentVectorStoreCacheManager] Error storing vector store in cache:', error);
            throw error;
        }
    }

    /**
     * Invalidates cache for a specific cache key.
     *
     * @param cacheKey - Cache key to invalidate.
     */
    public async invalidateCache(cacheKey: string): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .eq('agentHash', cacheKey);

        if (error) {
            console.error('[OpenAiAgentVectorStoreCacheManager] Error invalidating cache:', error);
            throw error;
        }

        if (this.isVerbose) {
            console.log(`[OpenAiAgentVectorStoreCacheManager] Invalidated cache for key: ${cacheKey}`);
        }
    }

    /**
     * Clears all cached vector stores.
     */
    public async clearAllCache(): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .neq('id', 0);

        if (error) {
            console.error('[OpenAiAgentVectorStoreCacheManager] Error clearing cache:', error);
            throw error;
        }

        if (this.isVerbose) {
            console.log('[OpenAiAgentVectorStoreCacheManager] Cleared all cached vector stores');
        }
    }
}
