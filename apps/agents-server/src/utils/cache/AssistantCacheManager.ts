import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';
import { string_book } from '@promptbook-local/types';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
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
     * @param includeDynamicContext - Whether to include dynamic CONTEXT in assistant instructions (default: false for better caching)
     * @returns Assistant cache result with tools and metadata
     */
    public async getOrCreateAssistant(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAssistantExecutionTools,
        options: { includeDynamicContext?: boolean } = {},
    ): Promise<AssistantCacheResult> {
        const { includeDynamicContext = true } = options; // Default to true for backward compatibility

        // Extract assistant configuration
        const configuration = extractAssistantConfiguration(agentSource, { includeDynamicContext });

        // Compute cache key based on configuration
        const cacheKey = computeAssistantCacheKey(configuration);

        if (this.isVerbose) {
            console.log(
                `[AssistantCacheManager] Looking up assistant for agent "${agentName}" (cache key: ${cacheKey})`,
            );
        }

        // Check cache
        const cachedAssistant = await this.getCachedAssistant(cacheKey);

        if (cachedAssistant) {
            if (this.isVerbose) {
                console.log(
                    `[AssistantCacheManager] ✓ Cache HIT for agent "${agentName}" - reusing assistant ${cachedAssistant}`,
                );
            }

            return {
                tools: baseTools.getAssistant(cachedAssistant),
                fromCache: true,
                cacheKey,
                configuration,
            };
        }

        // Cache miss - create new assistant
        if (this.isVerbose) {
            console.log(`[AssistantCacheManager] ✗ Cache MISS for agent "${agentName}" - creating new assistant`);
        }

        const newTools = await this.createAndCacheAssistant(configuration, agentName, cacheKey, baseTools);

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
     * @returns Assistant ID if found, null otherwise
     * @private
     */
    private async getCachedAssistant(cacheKey: string): Promise<string | null> {
        const supabase = $provideSupabaseForServer();

        const { data, error } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .select('assistantId')
            .eq('agentHash', cacheKey)
            .maybeSingle();

        if (error) {
            console.error('[AssistantCacheManager] Error querying cache:', error);
            return null;
        }

        return data?.assistantId || null;
    }

    /**
     * Creates a new OpenAI Assistant and stores it in the cache
     *
     * @param configuration - Assistant configuration (includes instructions with or without context)
     * @param agentName - Agent name for logging
     * @param cacheKey - Cache key for storage
     * @param baseTools - Base OpenAI Assistant execution tools
     * @returns New assistant execution tools
     * @private
     */
    private async createAndCacheAssistant(
        configuration: AssistantConfiguration,
        agentName: string,
        cacheKey: string,
        baseTools: OpenAiAssistantExecutionTools,
    ): Promise<OpenAiAssistantExecutionTools> {
        // Create the assistant with the configuration
        // Instructions already include any dynamic context if includeDynamicContext was true
        const newTools = await baseTools.createNewAssistant({
            name: configuration.name || agentName,
            instructions: configuration.instructions,
            // Future: Add knowledge sources, tools when supported
        });

        const newAssistantId = newTools.assistantId;

        if (!newAssistantId) {
            throw new Error('[AssistantCacheManager] Failed to create assistant - no ID returned');
        }

        // Store in cache
        await this.cacheAssistant(cacheKey, newAssistantId, configuration);

        if (this.isVerbose) {
            console.log(
                `[AssistantCacheManager] ✓ Created and cached new assistant ${newAssistantId} for agent "${agentName}"`,
            );
        }

        return newTools;
    }

    /**
     * Stores an assistant in the cache database
     *
     * @param cacheKey - Cache key
     * @param assistantId - OpenAI Assistant ID
     * @param configuration - Assistant configuration (for debugging/analytics)
     * @private
     */
    private async cacheAssistant(
        cacheKey: string,
        assistantId: string,
        _configuration: AssistantConfiguration,
    ): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase.from(await $getTableName('OpenAiAssistantCache')).insert({
            agentHash: cacheKey,
            assistantId,
            // Store configuration for debugging (optional, depends on schema)
        });

        if (error) {
            console.error('[AssistantCacheManager] Error storing assistant in cache:', error);
            throw error;
        }
    }

    /**
     * Invalidates cache for a specific cache key
     *
     * This can be used when an assistant needs to be recreated
     * (e.g., after configuration changes).
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
            console.error('[AssistantCacheManager] Error invalidating cache:', error);
            throw error;
        }

        if (this.isVerbose) {
            console.log(`[AssistantCacheManager] Invalidated cache for key: ${cacheKey}`);
        }
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
