import type { Tool as AgentKitTool } from '@openai/agents';
import type {
    AgentModelRequirements,
    string_agent_permanent_id,
    string_book,
    string_knowledge_source_link,
} from '@promptbook-local/types';
import { OpenAiAgentKitExecutionTools } from '../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';
import { AgentKitKnowledgeSourceHasher } from './AgentKitCacheManager/AgentKitKnowledgeSourceHasher';
import {
    AgentKitLlamaIndexKnowledgeBase,
    createAgentKitLlamaIndexKnowledgeTool,
} from './AgentKitCacheManager/AgentKitLlamaIndexKnowledgeBase';
import { AgentKitLlamaIndexKnowledgeCache } from './AgentKitCacheManager/AgentKitLlamaIndexKnowledgeCache';
import {
    AgentKitPreparedCache,
    type AgentKitPreparedCacheEntry,
} from './AgentKitCacheManager/AgentKitPreparedCache';
import { resolveAgentKitModelRequirements } from './AgentKitCacheManager/resolveAgentKitModelRequirements';
import { withAgentKitSourceCitationPolicy } from './AgentKitCacheManager/withAgentKitSourceCitationPolicy';

/**
 * Result of getting or creating an AgentKit-backed agent.
 */
export type AgentKitCacheResult = {
    /**
     * The OpenAI AgentKit execution tools instance.
     */
    readonly tools: OpenAiAgentKitExecutionTools;

    /**
     * Whether any cached AgentKit preparation was reused.
     */
    readonly fromCache: boolean;

    /**
     * Cache key derived from the assistant configuration.
     */
    readonly assistantCacheKey: string;

    /**
     * Hash of the knowledge source file contents used for the LlamaIndex knowledge base.
     *
     * The field keeps the legacy vector-store name because chat telemetry already consumes it.
     */
    readonly vectorStoreHash: string | null;

    /**
     * The agent configuration used to compute the assistant cache key.
     */
    readonly configuration: AssistantConfiguration;

    /**
     * Vector store ID attached to the AgentKit agent (if any).
     *
     * Agents Server knowledge search now uses LlamaIndex, so this is normally undefined.
     */
    readonly vectorStoreId?: string;
};

/**
 * Manages the lifecycle of OpenAI AgentKit agents with LlamaIndex knowledge search caching.
 *
 * The caching strategy keeps LlamaIndex knowledge bases in memory and injects
 * a native AgentKit search tool instead of creating OpenAI hosted vector stores.
 */
export class AgentKitCacheManager {
    private readonly isVerbose: boolean;
    private readonly knowledgeSourceHasher: AgentKitKnowledgeSourceHasher;
    private readonly preparedCache: AgentKitPreparedCache;
    private readonly knowledgeCache: AgentKitLlamaIndexKnowledgeCache;

    /**
     * Creates a new AgentKitCacheManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
        this.knowledgeSourceHasher = new AgentKitKnowledgeSourceHasher(options);
        this.preparedCache = new AgentKitPreparedCache();
        this.knowledgeCache = new AgentKitLlamaIndexKnowledgeCache();
    }

    /**
     * Gets an existing prepared AgentKit agent from cache or creates a new one.
     *
     * Dynamic CONTEXT lines are included in the assistant cache key by default; set
     * includeDynamicContext to false to ignore them. Knowledge-base caching is based
     * solely on knowledge source file contents.
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
             * Whether to include dynamic CONTEXT in the assistant cache key (default: true for backward compatibility).
             */
            includeDynamicContext?: boolean;

            /**
             * The agent permanent ID for logging.
             */
            agentId?: string_agent_permanent_id;

            /**
             * Optional callback invoked before creating a new LlamaIndex knowledge base on cache miss.
             */
            onCacheMiss?: () => void | Promise<void>;

            /**
             * Optional resolver for compact agent references scoped to the current book.
             */
            agentReferenceResolver?: AgentReferenceResolver;

            /**
             * Optional prepared model requirements to reuse instead of recalculating them.
             */
            modelRequirements?: AgentModelRequirements;
        } = {},
    ): Promise<AgentKitCacheResult> {
        const { includeDynamicContext = true, agentId, onCacheMiss, agentReferenceResolver, modelRequirements } = options;
        const configuration = extractAssistantConfiguration(agentSource, { includeDynamicContext });
        const assistantCacheKey = computeAssistantCacheKey(configuration);

        if (this.isVerbose) {
            console.info('[🤰]', 'Resolving AgentKit cache key', {
                agentName,
                assistantCacheKey,
                includeDynamicContext,
                instructionsLength: configuration.instructions.length,
                baseSourceLength: configuration.baseAgentSource.length,
                agentId,
            });
        }

        const preparedAgentKitCacheEntry = await this.getOrCreatePreparedAgentKitCacheEntry({
            assistantCacheKey,
            configuration,
            agentName,
            baseTools,
            onCacheMiss,
            agentReferenceResolver,
            modelRequirements,
        });

        return {
            tools: baseTools.getPreparedAgentTools(preparedAgentKitCacheEntry.preparedAgent),
            fromCache: preparedAgentKitCacheEntry.fromCache,
            assistantCacheKey,
            vectorStoreHash: preparedAgentKitCacheEntry.vectorStoreHash,
            configuration,
            vectorStoreId: preparedAgentKitCacheEntry.preparedAgent.vectorStoreId,
        };
    }

    /**
     * Invalidates cache for a specific knowledge-base hash.
     */
    public async invalidateCache(knowledgeBaseHash: string): Promise<void> {
        this.knowledgeCache.invalidateCache(knowledgeBaseHash);
    }

    /**
     * Resolves or builds one short-lived prepared AgentKit cache entry.
     */
    private async getOrCreatePreparedAgentKitCacheEntry(options: {
        readonly assistantCacheKey: string;
        readonly configuration: AssistantConfiguration;
        readonly agentName: string;
        readonly baseTools: OpenAiAgentKitExecutionTools;
        readonly onCacheMiss?: () => void | Promise<void>;
        readonly agentReferenceResolver?: AgentReferenceResolver;
        readonly modelRequirements?: AgentModelRequirements;
    }): Promise<AgentKitPreparedCacheEntry> {
        const resolvedModelRequirements = await resolveAgentKitModelRequirements({
            baseAgentSource: options.configuration.baseAgentSource,
            agentReferenceResolver: options.agentReferenceResolver,
            modelRequirements: options.modelRequirements,
        });
        const preparedAgentKitCacheKey = this.preparedCache.createCacheKey(
            options.assistantCacheKey,
            resolvedModelRequirements,
        );

        return this.preparedCache.getOrCreate({
            cacheKey: preparedAgentKitCacheKey,
            onCacheHit: (cachedEntry) => {
                if (this.isVerbose) {
                    console.info('[🤰]', 'AgentKit cache hit (prepared agent)', {
                        agentName: options.agentName,
                        preparedAgentCacheKey: preparedAgentKitCacheKey,
                        knowledgeBaseHash: cachedEntry.vectorStoreHash,
                        vectorStoreId: cachedEntry.preparedAgent.vectorStoreId,
                    });
                }
            },
            createEntry: async () =>
                this.prepareAgentKitCacheEntry({
                    assistantCacheKey: options.assistantCacheKey,
                    configuration: options.configuration,
                    agentName: options.agentName,
                    baseTools: options.baseTools,
                    onCacheMiss: options.onCacheMiss,
                    modelRequirements: resolvedModelRequirements,
                }),
        });
    }

    /**
     * Prepares one AgentKit agent snapshot ready for short-lived reuse.
     */
    private async prepareAgentKitCacheEntry(options: {
        readonly assistantCacheKey: string;
        readonly configuration: AssistantConfiguration;
        readonly agentName: string;
        readonly baseTools: OpenAiAgentKitExecutionTools;
        readonly onCacheMiss?: () => void | Promise<void>;
        readonly modelRequirements: AgentModelRequirements;
    }): Promise<Omit<AgentKitPreparedCacheEntry, 'expiresAt'>> {
        const knowledgeSources: string_knowledge_source_link[] = options.modelRequirements.knowledgeSources
            ? [...options.modelRequirements.knowledgeSources]
            : [];
        const tools = options.modelRequirements.tools ? [...options.modelRequirements.tools] : undefined;
        const instructions = withAgentKitSourceCitationPolicy(options.modelRequirements.systemMessage, {
            knowledgeSources,
            tools,
        });
        const agentKitName = formatAssistantNameWithHash(
            options.configuration.name || options.agentName,
            options.assistantCacheKey,
        );
        const knowledgeBaseHash = await this.knowledgeSourceHasher.computeKnowledgeBaseHash({
            agentName: options.agentName,
            knowledgeSources,
        });
        const knowledgeToolResult =
            knowledgeBaseHash && knowledgeSources.length > 0
                ? await this.getOrCreateLlamaIndexKnowledgeTool({
                      knowledgeBaseHash,
                      knowledgeSources,
                      agentName: options.agentName,
                      assistantCacheKey: options.assistantCacheKey,
                      baseTools: options.baseTools,
                      onCacheMiss: options.onCacheMiss,
                  })
                : null;
        const nativeAgentKitTools = knowledgeToolResult?.nativeAgentKitTools;

        if (this.isVerbose) {
            console.info('[🤰]', 'Preparing AgentKit agent via cache manager', {
                agentName: options.agentName,
                agentKitName,
                instructionsLength: instructions.length,
                knowledgeSourcesCount: knowledgeSources.length,
                nativeAgentKitToolsCount: nativeAgentKitTools?.length ?? 0,
                toolsCount: tools?.length ?? 0,
            });
        }

        const preparedAgent = await options.baseTools.prepareAgentKitAgent({
            name: agentKitName,
            instructions,
            tools,
            nativeAgentKitTools,
        });

        return {
            preparedAgent,
            fromCache: knowledgeToolResult?.fromCache ?? false,
            vectorStoreHash: knowledgeBaseHash,
        };
    }

    /**
     * Gets or creates the native AgentKit LlamaIndex knowledge-search tool.
     */
    private async getOrCreateLlamaIndexKnowledgeTool(options: {
        readonly knowledgeBaseHash: string;
        readonly knowledgeSources: ReadonlyArray<string_knowledge_source_link>;
        readonly agentName: string;
        readonly assistantCacheKey: string;
        readonly baseTools: OpenAiAgentKitExecutionTools;
        readonly onCacheMiss?: () => void | Promise<void>;
    }): Promise<{
        readonly nativeAgentKitTools: ReadonlyArray<AgentKitTool>;
        readonly fromCache: boolean;
    }> {
        const knowledgeCacheResult = await this.knowledgeCache.getOrCreate({
            knowledgeBaseHash: options.knowledgeBaseHash,
            onCacheHit: () => {
                if (this.isVerbose) {
                    console.info('[🤰]', 'AgentKit cache hit (LlamaIndex knowledge base)', {
                        agentName: options.agentName,
                        assistantCacheKey: options.assistantCacheKey,
                        knowledgeBaseHash: options.knowledgeBaseHash,
                    });
                }
            },
            createKnowledgeBase: async () => {
                if (options.onCacheMiss) {
                    await options.onCacheMiss();
                }

                return AgentKitLlamaIndexKnowledgeBase.create({
                    client: await options.baseTools.getClient(),
                    knowledgeSources: options.knowledgeSources,
                    isVerbose: this.isVerbose,
                });
            },
        });

        return {
            nativeAgentKitTools: [createAgentKitLlamaIndexKnowledgeTool(knowledgeCacheResult.knowledgeBase)],
            fromCache: knowledgeCacheResult.fromCache,
        };
    }
}
