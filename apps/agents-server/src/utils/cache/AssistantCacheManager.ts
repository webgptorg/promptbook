import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { OpenAiAgentKitExecutionTools } from '@promptbook-local/openai';
import { AgentModelRequirements, string_agent_permanent_id, string_book, string_model_name } from '@promptbook-local/types';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';

/**
 * Result of getting or creating an AgentKit configuration
 */
export type AssistantCacheResult = {
    /**
     * The OpenAI AgentKit execution tools instance
     */
    readonly tools: OpenAiAgentKitExecutionTools;

    /**
     * Whether this configuration was retrieved from cache (true) or newly created (false)
     */
    readonly fromCache: boolean;

    /**
     * The cache key used for this assistant
     */
    readonly cacheKey: string;

    /**
     * The assistant configuration
     */
    readonly configuration: AssistantConfiguration;
};

/**
 * Manages the lifecycle of OpenAI AgentKit configurations with intelligent caching
 *
 * This class provides a centralized way to:
 * - Retrieve vector stores from cache when possible
 * - Create new AgentKit configurations when needed
 * - Store AgentKit metadata in the database
 * - Track cache hits and misses for monitoring
 *
 * The caching strategy ensures that agents with the same base configuration
 * (model, system prompt, temperature, etc.) share the same underlying vector store,
 * improving resource efficiency and reducing API calls.
 */
export class AssistantCacheManager {
    private readonly isVerbose: boolean;

    constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets an existing AgentKit configuration from cache or creates a new one
     *
     * This method implements the core caching logic:
     * 1. Extracts base configuration from agent source (removes dynamic context)
     * 2. Computes cache key from configuration
     * 3. Checks database cache for existing vector store
     * 4. Returns cached configuration or creates new one
     *
     * Dynamic CONTEXT lines are NOT included in the cache key, allowing assistants
     * to be shared across requests with different context. The context should be
     * handled separately in the conversation thread.
     *
     * @param agentSource - The agent source (may include dynamic CONTEXT lines)
     * @param agentName - The agent name for logging and fallback
     * @param baseTools - Base OpenAI AgentKit execution tools instance
     * @param options - Cache options
     * @returns Assistant cache result with tools and metadata
     */
    public async getOrCreateAssistant(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAgentKitExecutionTools,
        options: {
            /**
             * Whether to include dynamic CONTEXT in assistant instructions (default: true for better caching)
             */
            includeDynamicContext?: boolean;

            /**
             * The agent permanent ID for persistent caching in Agent table
             */
            agentId?: string_agent_permanent_id;

            /**
             * Optional callback invoked before creating a new assistant on cache miss.
             */
            onCacheMiss?: () => void | Promise<void>;
        } = {},
    ): Promise<AssistantCacheResult> {
        const { includeDynamicContext = true, agentId, onCacheMiss } = options; // Default to true for backward compatibility

        // Extract assistant configuration
        const configuration = extractAssistantConfiguration(agentSource, { includeDynamicContext });

        // Compute cache key based on configuration
        const cacheKey = computeAssistantCacheKey(configuration);

        console.info('[??]', 'Resolving assistant cache key', {
            agentName,
            cacheKey,
            includeDynamicContext,
            instructionsLength: configuration.instructions.length,
            baseSourceLength: configuration.baseAgentSource.length,
            agentId,
        });

        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
        );
        const knowledgeSources = modelRequirements.knowledgeSources
            ? [...modelRequirements.knowledgeSources]
            : undefined;
        const tools = modelRequirements.tools ? [...modelRequirements.tools] : undefined;
        const agentModelName = (modelRequirements.modelName ?? 'gpt-5.2') as string_model_name;

        // Check cache
        const cachedVectorStoreId = await this.getCachedAssistant(cacheKey, baseTools, agentId);

        if (cachedVectorStoreId) {
            console.info('[??]', 'AgentKit cache hit', {
                agentName,
                cacheKey,
                vectorStoreId: cachedVectorStoreId,
            });

            const cachedAgentTools = await baseTools.createNewAgent({
                name: formatAssistantNameWithHash(configuration.name || agentName, cacheKey),
                instructions: modelRequirements.systemMessage,
                knowledgeSources,
                tools,
                modelName: agentModelName,
                temperature: modelRequirements.temperature,
                maxTokens: modelRequirements.maxTokens,
                agentId: cacheKey,
                vectorStoreId: cachedVectorStoreId,
            });

            return {
                tools: cachedAgentTools,
                fromCache: true,
                cacheKey,
                configuration,
            };
        }

        if (onCacheMiss) {
            await onCacheMiss();
        }

        // Cache miss - create new assistant
        if (this.isVerbose) {
            console.info('[??]', 'AgentKit cache miss, creating configuration', {
                agentName,
                cacheKey,
                agentId,
            });
        }

        const newTools = await this.createAndCacheAssistant(configuration, agentName, cacheKey, baseTools, agentId);

        return {
            tools: newTools,
            fromCache: false,
            cacheKey,
            configuration,
        };
    }

    /**
     * Retrieves a vector store ID from the cache.
     *
     * @param cacheKey - The cache key to look up
     * @param baseTools - Base OpenAI AgentKit execution tools instance
     * @param agentId - Optional agent permanent ID to check in Agent table
     * @returns Vector store ID if found, null otherwise
     * @private
     */
    private async getCachedAssistant(
        cacheKey: string,
        baseTools: OpenAiAgentKitExecutionTools,
        agentId?: string_agent_permanent_id,
    ): Promise<string | null> {
        const supabase = $provideSupabaseForServer();

        let vectorStoreId: string | null = null;

        // 1. Check in Agent table first (preferred persistent cache)
        if (agentId) {
            const { data: agentData, error: agentError } = await supabase
                .from(await $getTableName('Agent'))
                .select('preparedExternals')
                .eq('permanentId', agentId)
                .maybeSingle();

            if (!agentError && agentData?.preparedExternals) {
                const preparedExternals = agentData.preparedExternals as {
                    openaiAgentKitHash?: string;
                    openaiAgentKitVectorStoreId?: string;
                };
                if (preparedExternals.openaiAgentKitHash === cacheKey && preparedExternals.openaiAgentKitVectorStoreId) {
                    vectorStoreId = preparedExternals.openaiAgentKitVectorStoreId;

                    if (this.isVerbose) {
                        console.info('[??]', 'AgentKit cache hit (Agent table)', {
                            agentId,
                            cacheKey,
                            vectorStoreId,
                        });
                    }
                }
            }
        }

        // 2. Check in OpenAiAssistantCache table (fallback/shared cache)
        if (!vectorStoreId) {
            const { data, error } = await supabase
                .from(await $getTableName('OpenAiAssistantCache'))
                .select('assistantId')
                .eq('agentHash', cacheKey)
                .maybeSingle();

            if (error) {
                console.error('[AssistantCacheManager] Error querying cache:', error);
            } else {
                vectorStoreId = data?.assistantId || null;
            }
        }

        if (!vectorStoreId) {
            return null;
        }

        try {
            const client = await baseTools.getClient();
            await client.beta.vectorStores.retrieve(vectorStoreId);
            return vectorStoreId;
        } catch (error) {
            console.warn(
                '[AssistantCacheManager] Cached vector store ' + vectorStoreId + ' not found on OpenAI, invalidating cache.',
            );
            await this.invalidateCache(cacheKey, agentId);
            return null;
        }
    }

    /**
     * Creates a new OpenAI AgentKit configuration and stores it in the cache
     *
     * @param configuration - Assistant configuration (includes instructions with or without context)
     * @param agentName - Agent name for logging
     * @param cacheKey - Cache key for storage
     * @param baseTools - Base OpenAI AgentKit execution tools
     * @param agentId - Optional agent permanent ID to update in Agent table
     * @returns New AgentKit execution tools
     * @private
     */
    private async createAndCacheAssistant(
        configuration: AssistantConfiguration,
        agentName: string,
        cacheKey: string,
        baseTools: OpenAiAgentKitExecutionTools,
        agentId?: string_agent_permanent_id,
    ): Promise<OpenAiAgentKitExecutionTools> {
        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
        );
        const knowledgeSources = modelRequirements.knowledgeSources
            ? [...modelRequirements.knowledgeSources]
            : undefined;
        const tools = modelRequirements.tools ? [...modelRequirements.tools] : undefined;

        // Create the agent with the configuration
        const creationStartedAtMs = Date.now();
        const assistantName = formatAssistantNameWithHash(configuration.name || agentName, cacheKey);
        const agentModelName = (modelRequirements.modelName ?? 'gpt-5.2') as string_model_name;

        if (this.isVerbose) {
            console.info('[??]', 'Creating AgentKit configuration via cache manager', {
                agentName,
                assistantName,
                instructionsLength: modelRequirements.systemMessage.length,
                knowledgeSourcesCount: knowledgeSources?.length ?? 0,
                toolsCount: tools?.length ?? 0,
            });
        }

        const newTools = await baseTools.createNewAgent({
            name: assistantName,
            instructions: modelRequirements.systemMessage,
            knowledgeSources,
            tools,
            modelName: agentModelName,
            temperature: modelRequirements.temperature,
            maxTokens: modelRequirements.maxTokens,
            agentId: cacheKey,
        });

        const vectorStoreId = newTools.vectorStoreId;

        if (!vectorStoreId && this.isVerbose) {
            console.info('[??]', 'AgentKit created without vector store', {
                agentName,
                cacheKey,
            });
        }

        // Store in cache
        await this.cacheAssistant(cacheKey, vectorStoreId, agentId);

        if (this.isVerbose) {
            console.info('[??]', 'AgentKit configuration created and cached', {
                agentName,
                cacheKey,
                vectorStoreId: vectorStoreId || null,
                elapsedMs: Date.now() - creationStartedAtMs,
            });
        }

        return newTools;
    }

    /**
     * Stores a vector store in the cache database
     *
     * @param cacheKey - Cache key
     * @param vectorStoreId - OpenAI vector store ID
     * @param agentId - Optional agent permanent ID to update in Agent table
     * @private
     */
    private async cacheAssistant(
        cacheKey: string,
        vectorStoreId: string | null | undefined,
        agentId?: string_agent_permanent_id,
    ): Promise<void> {
        const supabase = $provideSupabaseForServer();

        // 1. Store in shared cache
        if (vectorStoreId) {
            const { error: cacheError } = await supabase.from(await $getTableName('OpenAiAssistantCache')).insert({
                agentHash: cacheKey,
                assistantId: vectorStoreId,
            });

            if (cacheError && cacheError.code !== '23505') {
                // Ignore unique constraint violation (already cached)
                console.error('[AssistantCacheManager] Error storing vector store in shared cache:', cacheError);
            }
        }

        // 2. Store in Agent table (preferred persistent cache)
        if (agentId && vectorStoreId) {
            const { data: agentData, error: fetchError } = await supabase
                .from(await $getTableName('Agent'))
                .select('preparedExternals')
                .eq('permanentId', agentId)
                .maybeSingle();

            if (fetchError) {
                console.error('[AssistantCacheManager] Error fetching agent for cache update:', fetchError);
            } else {
                const preparedExternals =
                    (agentData?.preparedExternals as {
                        openaiAgentKitVectorStoreId?: string;
                        openaiAgentKitHash?: string;
                    }) || {};
                preparedExternals.openaiAgentKitVectorStoreId = vectorStoreId;
                preparedExternals.openaiAgentKitHash = cacheKey;

                const { error: updateError } = await supabase
                    .from(await $getTableName('Agent'))
                    .update({ preparedExternals })
                    .eq('permanentId', agentId);

                if (updateError) {
                    console.error('[AssistantCacheManager] Error updating Agent preparedExternals:', updateError);
                } else {
                    console.info('[??]', 'AgentKit vector store cached in Agent table', {
                        agentId,
                        vectorStoreId,
                        cacheKey,
                    });
                }
            }
        }
    }

    /**
     * Invalidates cache for a specific cache key
     *
     * This can be used when an assistant needs to be recreated
     * (e.g., after configuration changes).
     *
     * @param cacheKey - Cache key to invalidate
     * @param agentId - Optional agent permanent ID to also invalidate in Agent table
     */
    public async invalidateCache(cacheKey: string, agentId?: string_agent_permanent_id): Promise<void> {
        const supabase = $provideSupabaseForServer();

        // 1. Invalidate in shared cache
        const { error: cacheError } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .eq('agentHash', cacheKey);

        if (cacheError) {
            console.error('[AssistantCacheManager] Error invalidating cache:', cacheError);
            throw cacheError;
        }

        // 2. Invalidate in Agent table
        if (agentId) {
            const { data: agentData, error: fetchError } = await supabase
                .from(await $getTableName('Agent'))
                .select('preparedExternals')
                .eq('permanentId', agentId)
                .maybeSingle();

            if (!fetchError && agentData?.preparedExternals) {
                const preparedExternals = agentData.preparedExternals as {
                    openaiAgentKitHash?: string;
                    openaiAgentKitVectorStoreId?: string;
                };

                if (preparedExternals.openaiAgentKitHash === cacheKey) {
                    delete preparedExternals.openaiAgentKitHash;
                    delete preparedExternals.openaiAgentKitVectorStoreId;

                    const { error: updateError } = await supabase
                        .from(await $getTableName('Agent'))
                        .update({ preparedExternals })
                        .eq('permanentId', agentId);

                    if (updateError) {
                        console.error('[AssistantCacheManager] Error invalidating Agent preparedExternals:', updateError);
                    }
                }
            }
        }

        console.info('[??]', 'Invalidated assistant cache', { cacheKey, agentId });
    }

    /**
     * Clears all cached assistants
     *
     * Use with caution - this will force recreation of all assistants.
     */
    public async clearAllCache(): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .neq('id', 0);

        if (error) {
            console.error('[AssistantCacheManager] Error clearing cache:', error);
            throw error;
        }

        if (this.isVerbose) {
            console.log('[AssistantCacheManager] Cleared all cached assistants');
        }
    }
}
