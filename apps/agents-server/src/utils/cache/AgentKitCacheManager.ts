import type { AgentModelRequirements, string_agent_permanent_id, string_book } from '@promptbook-local/types';
import { OpenAiAgentKitExecutionTools } from '../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';
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
     * The agent configuration used to compute the assistant cache key.
     */
    readonly configuration: AssistantConfiguration;
};

/**
 * Manages the lifecycle of short-lived OpenAI AgentKit agents.
 */
export class AgentKitCacheManager {
    private readonly isVerbose: boolean;
    private readonly preparedCache: AgentKitPreparedCache;

    /**
     * Creates a new AgentKitCacheManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
        this.preparedCache = new AgentKitPreparedCache();
    }

    /**
     * Gets an existing prepared AgentKit agent from memory or creates a new one.
     *
     * Dynamic CONTEXT lines are included in the assistant cache key by default; set
     * includeDynamicContext to false to ignore them.
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
             * Optional callback invoked before preparing a new AgentKit agent.
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
            configuration,
        };
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
            onCacheHit: () => {
                if (this.isVerbose) {
                    console.info('[🤰]', 'AgentKit cache hit (prepared agent)', {
                        agentName: options.agentName,
                        preparedAgentCacheKey: preparedAgentKitCacheKey,
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

        if (options.onCacheMiss) {
            await options.onCacheMiss();
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
            knowledgeSources: [],
            tools,
        });

        return {
            preparedAgent,
            fromCache: false,
        };
    }
}
