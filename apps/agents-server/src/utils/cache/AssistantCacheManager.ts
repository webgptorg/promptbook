import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';
import { AgentModelRequirements, string_agent_permanent_id, string_book } from '@promptbook-local/types';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';

/**
 * Result of getting or creating an assistant
 */
export type AssistantCacheResult = {
    /**
     * The OpenAI Assistant execution tools instance
     */
    readonly tools: OpenAiAssistantExecutionTools;

    /**
     * Whether this assistant was retrieved from cache (true) or newly created (false)
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
 * Manages the lifecycle of OpenAI Assistants with intelligent caching
 *
 * This class provides a centralized way to:
 * - Retrieve assistants from cache when possible
 * - Create new assistants when needed
 * - Store assistant metadata in the database
 * - Track cache hits and misses for monitoring
 *
 * The caching strategy ensures that agents with the same base configuration
 * (model, system prompt, temperature, etc.) share the same underlying OpenAI Assistant,
 * improving resource efficiency and reducing API calls.
 */
export class AssistantCacheManager {
    private readonly isVerbose: boolean;

    constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets an existing assistant from cache or creates a new one
     *
     * This method implements the core caching logic:
     * 1. Extracts base configuration from agent source (removes dynamic context)
     * 2. Computes cache key from configuration
     * 3. Checks database cache for existing assistant
     * 4. Returns cached assistant or creates new one
     *
     * Dynamic CONTEXT lines are NOT included in the cache key, allowing assistants
     * to be shared across requests with different context. The context should be
     * handled separately in the conversation thread.
     *
     * @param agentSource - The agent source (may include dynamic CONTEXT lines)
     * @param agentName - The agent name for logging and fallback
     * @param baseTools - Base OpenAI Assistant execution tools instance
     * @param options - Cache options
     * @returns Assistant cache result with tools and metadata
     */
    public async getOrCreateAssistant(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAssistantExecutionTools,
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

        console.info('[🤰]', 'Resolving assistant cache key', {
            agentName,
            cacheKey,
            includeDynamicContext,
            instructionsLength: configuration.instructions.length,
            baseSourceLength: configuration.baseAgentSource.length,
            agentId,
        });

        // Check cache
        const cachedAssistant = await this.getCachedAssistant(cacheKey, baseTools, agentId);

        if (cachedAssistant) {
            console.info('[🤰]', 'Assistant cache hit', {
                agentName,
                cacheKey,
                assistantId: cachedAssistant,
            });

            return {
                tools: baseTools.getAssistant(cachedAssistant),
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
            console.info('[🤰]', 'Assistant cache miss, creating assistant', {
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
     * Retrieves an assistant ID from the cache
     *
     * @param cacheKey - The cache key to look up
     * @param baseTools - Base OpenAI Assistant execution tools instance
     * @param agentId - Optional agent permanent ID to check in Agent table
     * @returns Assistant ID if found, null otherwise
     * @private
     */
    private async getCachedAssistant(
        cacheKey: string,
        baseTools: OpenAiAssistantExecutionTools,
        agentId?: string_agent_permanent_id,
    ): Promise<string | null> {
        const supabase = $provideSupabaseForServer();

        let assistantId: string | null = null;

        // 1. Check in Agent table first (preferred persistent cache)
        if (agentId) {
            const { data: agentData, error: agentError } = await supabase
                .from(await $getTableName('Agent'))
                .select('preparedExternals')
                .eq('permanentId', agentId)
                .maybeSingle();

            if (!agentError && agentData?.preparedExternals) {
                const preparedExternals = agentData.preparedExternals as {
                    openaiAssistantHash?: string;
                    openaiAssistantId?: string;
                };
                if (preparedExternals.openaiAssistantHash === cacheKey && preparedExternals.openaiAssistantId) {
                    assistantId = preparedExternals.openaiAssistantId;

                    if (this.isVerbose) {
                        console.info('[🤰]', 'Assistant cache hit (Agent table)', {
                            agentId,
                            cacheKey,
                            assistantId,
                        });
                    }
                }
            }
        }

        // 2. Check in OpenAiAssistantCache table (fallback/shared cache)
        if (!assistantId) {
            const { data, error } = await supabase
                .from(await $getTableName('OpenAiAssistantCache'))
                .select('assistantId')
                .eq('agentHash', cacheKey)
                .maybeSingle();

            if (error) {
                console.error('[AssistantCacheManager] Error querying cache:', error);
            } else {
                assistantId = data?.assistantId || null;
            }
        }

        if (!assistantId) {
            return null;
        }

        try {
            const client = await baseTools.getClient();
            await client.beta.assistants.retrieve(assistantId);
            return assistantId;
        } catch (error) {
            console.warn(
                `[AssistantCacheManager] Cached assistant ${assistantId} not found on OpenAI, invalidating cache.`,
            );
            await this.invalidateCache(cacheKey, agentId);
            return null;
        }
    }

    /**
     * Creates a new OpenAI Assistant and stores it in the cache
     *
     * @param configuration - Assistant configuration (includes instructions with or without context)
     * @param agentName - Agent name for logging
     * @param cacheKey - Cache key for storage
     * @param baseTools - Base OpenAI Assistant execution tools
     * @param agentId - Optional agent permanent ID to update in Agent table
     * @returns New assistant execution tools
     * @private
     */
    private async createAndCacheAssistant(
        configuration: AssistantConfiguration,
        agentName: string,
        cacheKey: string,
        baseTools: OpenAiAssistantExecutionTools,
        agentId?: string_agent_permanent_id,
    ): Promise<OpenAiAssistantExecutionTools> {
        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
        );
        const knowledgeSources = modelRequirements.knowledgeSources
            ? [...modelRequirements.knowledgeSources]
            : undefined;
        const tools = modelRequirements.tools ? [...modelRequirements.tools] : undefined;

        // Create the assistant with the configuration
        // Instructions already include any dynamic context if includeDynamicContext was true
        const creationStartedAtMs = Date.now();
        const assistantName = formatAssistantNameWithHash(configuration.name || agentName, cacheKey);

        if (this.isVerbose) {
            console.info('[🤰]', 'Creating assistant via cache manager', {
                agentName,
                assistantName,
                instructionsLength: modelRequirements.systemMessage.length,
                knowledgeSourcesCount: knowledgeSources?.length ?? 0,
                toolsCount: tools?.length ?? 0,
            });
        }
        const newTools = await baseTools.createNewAssistant({
            name: assistantName,
            instructions: modelRequirements.systemMessage,
            knowledgeSources,
            tools,
        });

        const newAssistantId = newTools.assistantId;

        if (!newAssistantId) {
            throw new Error('[AssistantCacheManager] Failed to create assistant - no ID returned');
        }

        // Store in cache
        await this.cacheAssistant(cacheKey, newAssistantId, agentId);

        if (this.isVerbose) {
            console.info('[🤰]', 'Assistant created and cached', {
                agentName,
                cacheKey,
                assistantId: newAssistantId,
                elapsedMs: Date.now() - creationStartedAtMs,
            });
        }

        return newTools;
    }

    /**
     * Stores an assistant in the cache database
     *
     * @param cacheKey - Cache key
     * @param assistantId - OpenAI Assistant ID
     * @param agentId - Optional agent permanent ID to update in Agent table
     * @private
     */
    private async cacheAssistant(
        cacheKey: string,
        assistantId: string,
        agentId?: string_agent_permanent_id,
    ): Promise<void> {
        const supabase = $provideSupabaseForServer();

        // 1. Store in shared cache
        const { error: cacheError } = await supabase.from(await $getTableName('OpenAiAssistantCache')).insert({
            agentHash: cacheKey,
            assistantId,
        });

        if (cacheError && cacheError.code !== '23505') {
            // Ignore unique constraint violation (already cached)
            console.error('[AssistantCacheManager] Error storing assistant in shared cache:', cacheError);
        }

        // 2. Store in Agent table (preferred persistent cache)
        if (agentId) {
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
                        openaiAssistantId?: string;
                        openaiAssistantHash?: string;
                    }) || {};
                preparedExternals.openaiAssistantId = assistantId;
                preparedExternals.openaiAssistantHash = cacheKey;

                const { error: updateError } = await supabase
                    .from(await $getTableName('Agent'))
                    .update({ preparedExternals })
                    .eq('permanentId', agentId);

                if (updateError) {
                    console.error('[AssistantCacheManager] Error updating Agent preparedExternals:', updateError);
                } else {
                    console.info('[🤰]', 'Assistant cached in Agent table', {
                        agentId,
                        assistantId,
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
                    openaiAssistantHash?: string;
                    openaiAssistantId?: string;
                };

                if (preparedExternals.openaiAssistantHash === cacheKey) {
                    delete preparedExternals.openaiAssistantHash;
                    delete preparedExternals.openaiAssistantId;

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

        console.info('[🤰]', 'Invalidated assistant cache', { cacheKey, agentId });
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
