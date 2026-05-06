import type { AgentModelRequirements, string_agent_permanent_id, string_book } from '@promptbook-local/types';
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
    AgentKitPreparedCache,
    type AgentKitPreparedCacheEntry,
} from './AgentKitCacheManager/AgentKitPreparedCache';
import { AgentKitVectorStoreCache } from './AgentKitCacheManager/AgentKitVectorStoreCache';
import { resolveAgentKitModelRequirements } from './AgentKitCacheManager/resolveAgentKitModelRequirements';
import { withAgentKitSourceCitationPolicy } from './AgentKitCacheManager/withAgentKitSourceCitationPolicy';
import { KnowledgeSearchIndexManager } from '../knowledge/KnowledgeSearchIndexManager';

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
     * Hash of the knowledge source file contents used for the vector store.
     */
    readonly vectorStoreHash: string | null;

    /**
     * The agent configuration used to compute the assistant cache key.
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
 * The caching strategy stores vector store identifiers in AgentExternals so
 * knowledge uploads are reused across agents that share the same files.
 */
export class AgentKitCacheManager {
    private readonly isVerbose: boolean;
    private readonly knowledgeSourceHasher: AgentKitKnowledgeSourceHasher;
    private readonly preparedCache: AgentKitPreparedCache;
    private readonly vectorStoreCache: AgentKitVectorStoreCache;
    private readonly knowledgeSearchIndexManager: KnowledgeSearchIndexManager;

    /**
     * Creates a new AgentKitCacheManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
        this.knowledgeSourceHasher = new AgentKitKnowledgeSourceHasher(options);
        this.preparedCache = new AgentKitPreparedCache();
        this.vectorStoreCache = new AgentKitVectorStoreCache(options);
        this.knowledgeSearchIndexManager = new KnowledgeSearchIndexManager(options);
    }

    /**
     * Gets an existing AgentKit vector store from cache or creates a new one.
     *
     * Dynamic CONTEXT lines are included in the assistant cache key by default; set
     * includeDynamicContext to false to ignore them. Vector store caching is based
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
             * Optional callback invoked before creating a new vector store on cache miss.
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
            agentId,
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
     * Invalidates cache for a specific vector store hash.
     */
    public async invalidateCache(vectorStoreHash: string): Promise<void> {
        await this.vectorStoreCache.invalidateCache(vectorStoreHash);
    }

    /**
     * Resolves or builds one short-lived prepared AgentKit cache entry.
     */
    private async getOrCreatePreparedAgentKitCacheEntry(options: {
        readonly assistantCacheKey: string;
        readonly configuration: AssistantConfiguration;
        readonly agentName: string;
        readonly agentId?: string_agent_permanent_id;
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
                        vectorStoreHash: cachedEntry.vectorStoreHash,
                        vectorStoreId: cachedEntry.preparedAgent.vectorStoreId,
                    });
                }
            },
            createEntry: async () =>
                this.prepareAgentKitCacheEntry({
                    assistantCacheKey: options.assistantCacheKey,
                    configuration: options.configuration,
                    agentName: options.agentName,
                    agentId: options.agentId,
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
        readonly agentId?: string_agent_permanent_id;
        readonly baseTools: OpenAiAgentKitExecutionTools;
        readonly onCacheMiss?: () => void | Promise<void>;
        readonly modelRequirements: AgentModelRequirements;
    }): Promise<Omit<AgentKitPreparedCacheEntry, 'expiresAt'>> {
        const knowledgeSources = options.modelRequirements.knowledgeSources
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
        const vectorStoreHash = await this.knowledgeSourceHasher.computeVectorStoreHash({
            agentName: options.agentName,
            knowledgeSources,
        });
        if (knowledgeSources.length > 0 && options.onCacheMiss) {
            await options.onCacheMiss();
        }

        if (knowledgeSources.length > 0 && options.agentId) {
            await this.knowledgeSearchIndexManager.ensureKnowledgeIndexSnapshot({
                agentPermanentId: options.agentId,
                agentName: options.agentName,
                knowledgeSources,
            });
        }

        if (this.isVerbose) {
            console.info('[🤰]', 'Preparing AgentKit agent via cache manager', {
                agentName: options.agentName,
                agentKitName,
                instructionsLength: instructions.length,
                knowledgeSourcesCount: knowledgeSources.length,
                toolsCount: tools?.length ?? 0,
            });
        }

        const preparedAgent = await options.baseTools.prepareAgentKitAgent({
            name: agentKitName,
            instructions,
            tools,
        });

        return {
            preparedAgent,
            fromCache: false,
            vectorStoreHash,
        };
    }
}
