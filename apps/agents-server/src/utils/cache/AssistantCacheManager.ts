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
import { $provideAgentReferenceResolver } from '../agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '../agentReferenceResolver/AgentReferenceResolutionIssue';

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

    /**
     * Creates a new AssistantCacheManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
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
     * Dynamic CONTEXT lines are included in the cache key by default; set
     * includeDynamicContext to false to ignore them. The context should be
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
             * Agent permanent ID reserved for future per-agent caching.
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
        const cachedAssistant = await this.getCachedAssistant(cacheKey, baseTools);

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
     * @param baseTools - Base OpenAI Assistant execution tools instance
     * @returns Assistant ID if found, null otherwise
     * @private
     */
    private async getCachedAssistant(
        cacheKey: string,
        baseTools: OpenAiAssistantExecutionTools,
    ): Promise<string | null> {
        const supabase = $provideSupabaseForServer();
        let assistantId: string | null = null;

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
            await this.invalidateCache(cacheKey);
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
     * @returns New assistant execution tools
     * @private
     */
    private async createAndCacheAssistant(
        configuration: AssistantConfiguration,
        agentName: string,
        cacheKey: string,
        baseTools: OpenAiAssistantExecutionTools,
    ): Promise<OpenAiAssistantExecutionTools> {
        const agentReferenceResolver = await $provideAgentReferenceResolver();
        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
            undefined,
            undefined,
            undefined,
            { agentReferenceResolver },
        );
        const unresolvedAgentReferences = consumeAgentReferenceResolutionIssues(agentReferenceResolver);
        if (unresolvedAgentReferences.length > 0) {
            console.warn('[AssistantCacheManager] Unresolved agent references detected:', unresolvedAgentReferences);
        }
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
        await this.cacheAssistant(cacheKey, newAssistantId);

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
     * @private
     */
    private async cacheAssistant(cacheKey: string, assistantId: string): Promise<void> {
        const supabase = $provideSupabaseForServer();

        const { error: cacheError } = await supabase.from(await $getTableName('OpenAiAssistantCache')).insert({
            agentHash: cacheKey,
            assistantId,
        });

        if (cacheError && cacheError.code !== '23505') {
            // Ignore unique constraint violation (already cached)
            console.error('[AssistantCacheManager] Error storing assistant in shared cache:', cacheError);
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

        const { error: cacheError } = await supabase
            .from(await $getTableName('OpenAiAssistantCache'))
            .delete()
            .eq('agentHash', cacheKey);

        if (cacheError) {
            console.error('[AssistantCacheManager] Error invalidating cache:', cacheError);
            throw cacheError;
        }

        console.info('[🤰]', 'Invalidated assistant cache', { cacheKey });
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
