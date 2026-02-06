import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { AgentModelRequirements, string_agent_permanent_id, string_book, TODO_any } from '@promptbook-local/types';
import { OpenAiAgentKitExecutionTools } from '../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';

/**
 * Result of getting or creating an AgentKit-backed agent.
 */
export type AgentKitCacheResult = {
    /**
     * The OpenAI AgentKit execution tools instance.
     */
    readonly tools: OpenAiAgentKitExecutionTools;

    /**
     * Whether cached vector store metadata was reused.
     */
    readonly fromCache: boolean;

    /**
     * The cache key used for this agent.
     */
    readonly cacheKey: string;

    /**
     * The agent configuration used to compute the cache key.
     */
    readonly configuration: AssistantConfiguration;

    /**
     * Vector store ID attached to the AgentKit agent (if any).
     */
    readonly vectorStoreId?: string;
};

/**
 * Manages the lifecycle of OpenAI AgentKit agents with vector store caching.
 *
 * The caching strategy stores vector store identifiers in the Agent table so
 * knowledge uploads are reused across requests for the same agent configuration.
 */
export class AgentKitCacheManager {
    private readonly isVerbose: boolean;

    /**
     * Creates a new AgentKitCacheManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets an existing AgentKit vector store from cache or creates a new one.
     *
     * Dynamic CONTEXT lines are NOT included in the cache key by default, allowing
     * agents to reuse the same vector store across requests with different context.
     *
     * @param agentSource - The agent source (may include dynamic CONTEXT lines)
     * @param agentName - The agent name for logging and fallback
     * @param baseTools - Base OpenAI AgentKit execution tools instance
     * @param options - Cache options
     * @returns AgentKit cache result with tools and metadata
     */
    public async getOrCreateAgentKitAgent(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAgentKitExecutionTools,
        options: {
            /**
             * Whether to include dynamic CONTEXT in the cache key (default: true for backward compatibility).
             */
            includeDynamicContext?: boolean;

            /**
             * The agent permanent ID for persistent caching in Agent table.
             */
            agentId?: string_agent_permanent_id;

            /**
             * Optional callback invoked before creating a new vector store on cache miss.
             */
            onCacheMiss?: () => void | Promise<void>;
        } = {},
    ): Promise<AgentKitCacheResult> {
        const { includeDynamicContext = true, agentId, onCacheMiss } = options;

        const configuration = extractAssistantConfiguration(agentSource, { includeDynamicContext });
        const cacheKey = computeAssistantCacheKey(configuration);

        if (this.isVerbose) {
            console.info('[🤰]', 'Resolving AgentKit cache key', {
                agentName,
                cacheKey,
                includeDynamicContext,
                instructionsLength: configuration.instructions.length,
                baseSourceLength: configuration.baseAgentSource.length,
                agentId,
            });
        }

        const cachedVectorStoreId = await this.getCachedVectorStoreId(cacheKey, baseTools, agentId);

        if (cachedVectorStoreId && this.isVerbose) {
            console.info('[🤰]', 'AgentKit cache hit (vector store)', {
                agentName,
                cacheKey,
                vectorStoreId: cachedVectorStoreId,
            });
        }

        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
        );
        const knowledgeSources = modelRequirements.knowledgeSources
            ? [...modelRequirements.knowledgeSources]
            : undefined;
        const tools = modelRequirements.tools ? [...modelRequirements.tools] : undefined;
        const agentKitName = formatAssistantNameWithHash(configuration.name || agentName, cacheKey);

        if (!cachedVectorStoreId && knowledgeSources && knowledgeSources.length > 0 && onCacheMiss) {
            await onCacheMiss();
        }

        if (this.isVerbose) {
            console.info('[🤰]', 'Preparing AgentKit agent via cache manager', {
                agentName,
                agentKitName,
                instructionsLength: modelRequirements.systemMessage.length,
                knowledgeSourcesCount: knowledgeSources?.length ?? 0,
                toolsCount: tools?.length ?? 0,
            });
        }

        const preparedAgent = await baseTools.prepareAgentKitAgent({
            name: agentKitName,
            instructions: modelRequirements.systemMessage,
            knowledgeSources,
            tools,
            vectorStoreId: cachedVectorStoreId ?? undefined,
        });

        if (!cachedVectorStoreId && preparedAgent.vectorStoreId) {
            await this.cacheVectorStore(cacheKey, preparedAgent.vectorStoreId, agentId);
        }

        return {
            tools: baseTools.getPreparedAgentTools(preparedAgent),
            fromCache: Boolean(cachedVectorStoreId),
            cacheKey,
            configuration,
            vectorStoreId: preparedAgent.vectorStoreId,
        };
    }

    /**
     * Retrieves a cached vector store ID for the given cache key.
     */
    private async getCachedVectorStoreId(
        cacheKey: string,
        baseTools: OpenAiAgentKitExecutionTools,
        agentId?: string_agent_permanent_id,
    ): Promise<string | null> {
        if (!agentId) {
            return null;
        }

        const supabase = $provideSupabaseForServer();
        const { data: agentData, error: agentError } = await supabase
            .from(await $getTableName('Agent'))
            .select('preparedExternals')
            .eq('permanentId', agentId)
            .maybeSingle();

        if (agentError || !agentData?.preparedExternals) {
            if (agentError && this.isVerbose) {
                console.error('[🤰]', 'AgentKit cache lookup failed', { agentId, cacheKey, error: agentError });
            }
            return null;
        }

        const preparedExternals = agentData.preparedExternals as {
            openaiAgentKitAgentHash?: string;
            openaiAgentKitAgentId?: string;
        };

        if (preparedExternals.openaiAgentKitAgentHash !== cacheKey || !preparedExternals.openaiAgentKitAgentId) {
            return null;
        }

        const vectorStoreId = preparedExternals.openaiAgentKitAgentId;

        try {
            const client = await baseTools.getClient();
            await (client.beta as TODO_any).vectorStores.retrieve(vectorStoreId);
            return vectorStoreId;
        } catch (error) {
            if (this.isVerbose) {
                console.warn('[🤰]', 'Cached vector store not found, invalidating cache', {
                    agentId,
                    cacheKey,
                    vectorStoreId,
                });
            }
            await this.invalidateCache(cacheKey, agentId);
            return null;
        }
    }

    /**
     * Stores vector store metadata in the Agent table cache.
     */
    private async cacheVectorStore(
        cacheKey: string,
        vectorStoreId: string,
        agentId?: string_agent_permanent_id,
    ): Promise<void> {
        if (!agentId) {
            return;
        }

        const supabase = $provideSupabaseForServer();
        const { data: agentData, error: fetchError } = await supabase
            .from(await $getTableName('Agent'))
            .select('preparedExternals')
            .eq('permanentId', agentId)
            .maybeSingle();

        if (fetchError) {
            console.error('[🤰]', 'AgentKit cache fetch failed', { agentId, cacheKey, error: fetchError });
            return;
        }

        const preparedExternals =
            (agentData?.preparedExternals as {
                openaiAgentKitAgentId?: string;
                openaiAgentKitAgentHash?: string;
            }) || {};

        preparedExternals.openaiAgentKitAgentId = vectorStoreId;
        preparedExternals.openaiAgentKitAgentHash = cacheKey;

        const { error: updateError } = await supabase
            .from(await $getTableName('Agent'))
            .update({ preparedExternals })
            .eq('permanentId', agentId);

        if (updateError) {
            console.error('[🤰]', 'AgentKit cache update failed', { agentId, cacheKey, error: updateError });
        } else if (this.isVerbose) {
            console.info('[🤰]', 'AgentKit vector store cached', { agentId, cacheKey, vectorStoreId });
        }
    }

    /**
     * Invalidates cache for a specific cache key in the Agent table.
     */
    public async invalidateCache(cacheKey: string, agentId?: string_agent_permanent_id): Promise<void> {
        if (!agentId) {
            return;
        }

        const supabase = $provideSupabaseForServer();
        const { data: agentData, error: fetchError } = await supabase
            .from(await $getTableName('Agent'))
            .select('preparedExternals')
            .eq('permanentId', agentId)
            .maybeSingle();

        if (fetchError || !agentData?.preparedExternals) {
            if (fetchError && this.isVerbose) {
                console.error('[🤰]', 'AgentKit cache invalidation lookup failed', {
                    agentId,
                    cacheKey,
                    error: fetchError,
                });
            }
            return;
        }

        const preparedExternals = agentData.preparedExternals as {
            openaiAgentKitAgentHash?: string;
            openaiAgentKitAgentId?: string;
        };

        if (preparedExternals.openaiAgentKitAgentHash !== cacheKey) {
            return;
        }

        delete preparedExternals.openaiAgentKitAgentHash;
        delete preparedExternals.openaiAgentKitAgentId;

        const { error: updateError } = await supabase
            .from(await $getTableName('Agent'))
            .update({ preparedExternals })
            .eq('permanentId', agentId);

        if (updateError) {
            console.error('[🤰]', 'AgentKit cache invalidation failed', { agentId, cacheKey, error: updateError });
        } else if (this.isVerbose) {
            console.info('[🤰]', 'AgentKit cache invalidated', { agentId, cacheKey });
        }
    }
}
