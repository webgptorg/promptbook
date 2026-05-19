import { SHA256 as sha256 } from 'crypto-js';
import type { CallChatModelStreamOptions } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CommonPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_model_name } from '../../types/string_model_name';
import type { string_title } from '../../types/string_title';
import {
    mapResponseFormatToAgentOutputType,
    OpenAiAgentKitExecutionTools,
} from '../openai/OpenAiAgentKitExecutionTools';
import type { AgentLlmExecutionToolsPromptPreparer } from './AgentLlmExecutionToolsPromptPreparer';
import { emitAgentLlmExecutionToolsAssistantPreparationProgress } from './emitAgentLlmExecutionToolsAssistantPreparationProgress';

/**
 * Prepared AgentKit agent shape reused while caching and dispatching AgentKit-backed runs.
 */
type PreparedAgentKitAgent = Awaited<ReturnType<OpenAiAgentKitExecutionTools['prepareAgentKitAgent']>>;

/**
 * Cache data used while resolving one AgentKit execution.
 */
type AgentKitCacheState = {
    readonly shouldUseCache: boolean;
    readonly preparedAgentKit: PreparedAgentKitAgent | null;
    readonly vectorStoreId?: string;
    readonly vectorStoreHash?: string;
    readonly requirementsHash?: string;
};

/**
 * Computes one stable hash from a JSON-serializable value.
 */
function computeJsonHash(value: unknown): string {
    return sha256(JSON.stringify(value)).toString();
}

/**
 * Handles OpenAI AgentKit-backed executions for `AgentLlmExecutionTools`.
 *
 * @private internal utility of `AgentLlmExecutionTools`
 */
export class AgentLlmExecutionToolsAgentKitRunner {
    /**
     * Cached AgentKit agents to avoid rebuilding identical instances.
     */
    private static agentKitAgentCache = new Map<
        string_title,
        {
            agent: Awaited<ReturnType<OpenAiAgentKitExecutionTools['prepareAgentKitAgent']>>['agent'];
            requirementsHash: string;
            vectorStoreId?: string;
        }
    >();

    /**
     * Cache of OpenAI vector stores to avoid creating duplicates.
     */
    private static vectorStoreCache = new Map<
        string_title,
        {
            vectorStoreId: string;
            requirementsHash: string;
        }
    >();

    public constructor(
        private readonly context: {
            readonly getTitle: () => string_title;
            readonly getModelName: () => string_model_name;
            readonly isVerbose?: boolean;
            readonly assistantPreparationMode?: 'internal' | 'external';
        },
    ) {}

    /**
     * Runs one prepared prompt through the OpenAI AgentKit backend.
     */
    public async callChatModelStream(options: {
        readonly llmTools: OpenAiAgentKitExecutionTools;
        readonly originalPrompt: Prompt;
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        const agentKitCacheState = this.resolveAgentKitCacheState({
            llmTools: options.llmTools,
            preparedChatPrompt: options.preparedChatPrompt,
        });
        const preparedAgentKit = await this.getOrPrepareAgentKitAgent({
            llmTools: options.llmTools,
            originalPrompt: options.originalPrompt,
            preparedChatPrompt: options.preparedChatPrompt,
            onProgress: options.onProgress,
            agentKitCacheState,
        });

        this.storeAgentKitCache({
            preparedAgentKit,
            agentKitCacheState,
        });

        const responseFormatOutputType = mapResponseFormatToAgentOutputType(
            options.preparedChatPrompt.forwardedPrompt.modelRequirements.responseFormat,
        );

        return options.llmTools.callChatModelStreamWithPreparedAgent({
            openAiAgentKitAgent: preparedAgentKit.agent,
            prompt: options.preparedChatPrompt.forwardedPrompt,
            onProgress: options.onProgress,
            responseFormatOutputType,
            signal: options.streamOptions?.signal,
        });
    }

    /**
     * Resolves the AgentKit cache state for the current prompt, including external and in-memory caches.
     */
    private resolveAgentKitCacheState(options: {
        readonly llmTools: OpenAiAgentKitExecutionTools;
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
    }): AgentKitCacheState {
        const shouldUseCache =
            !options.preparedChatPrompt.hasAttachmentSources && !options.preparedChatPrompt.hasRuntimePromptTools;
        let preparedAgentKit =
            shouldUseCache && this.context.assistantPreparationMode === 'external'
                ? options.llmTools.getPreparedAgentKitAgent()
                : null;
        let vectorStoreId: string | undefined;
        let vectorStoreHash: string | undefined;
        let requirementsHash: string | undefined;

        if (shouldUseCache) {
            requirementsHash = computeJsonHash({
                ...options.preparedChatPrompt.sanitizedRequirements,
                knowledgeSources: options.preparedChatPrompt.knowledgeSourcesForAgent,
                tools: options.preparedChatPrompt.mergedTools,
            });
            vectorStoreHash = computeJsonHash(options.preparedChatPrompt.knowledgeSourcesForAgent ?? []);

            const cachedVectorStore = AgentLlmExecutionToolsAgentKitRunner.vectorStoreCache.get(
                this.context.getTitle(),
            );
            const cachedAgentKit = AgentLlmExecutionToolsAgentKitRunner.agentKitAgentCache.get(this.context.getTitle());

            vectorStoreId =
                preparedAgentKit?.vectorStoreId ||
                (cachedVectorStore && cachedVectorStore.requirementsHash === vectorStoreHash
                    ? cachedVectorStore.vectorStoreId
                    : undefined);

            if (!preparedAgentKit && cachedAgentKit && cachedAgentKit.requirementsHash === requirementsHash) {
                if (this.context.isVerbose) {
                    console.info('[🤰]', 'Using cached OpenAI AgentKit agent', {
                        agent: this.context.getTitle(),
                    });
                }

                preparedAgentKit = {
                    agent: cachedAgentKit.agent,
                    vectorStoreId: cachedAgentKit.vectorStoreId,
                };
            }
        }

        return {
            shouldUseCache,
            preparedAgentKit,
            vectorStoreId,
            vectorStoreHash,
            requirementsHash,
        };
    }

    /**
     * Returns a prepared AgentKit agent, creating one only when the cache could not satisfy the request.
     */
    private async getOrPrepareAgentKitAgent(options: {
        readonly llmTools: OpenAiAgentKitExecutionTools;
        readonly originalPrompt: Prompt;
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly agentKitCacheState: AgentKitCacheState;
    }): Promise<PreparedAgentKitAgent> {
        if (options.agentKitCacheState.preparedAgentKit) {
            return options.agentKitCacheState.preparedAgentKit;
        }

        if (this.context.isVerbose) {
            console.info('[🤰]', 'Preparing OpenAI AgentKit agent', {
                agent: this.context.getTitle(),
            });
        }

        if (!options.agentKitCacheState.vectorStoreId && options.preparedChatPrompt.knowledgeSourcesForAgent?.length) {
            emitAgentLlmExecutionToolsAssistantPreparationProgress({
                onProgress: options.onProgress,
                prompt: options.originalPrompt,
                modelName: this.context.getModelName(),
                phase: 'Creating knowledge base',
            });
        }

        emitAgentLlmExecutionToolsAssistantPreparationProgress({
            onProgress: options.onProgress,
            prompt: options.originalPrompt,
            modelName: this.context.getModelName(),
            phase: 'Preparing AgentKit agent',
        });

        return options.llmTools.prepareAgentKitAgent({
            name: this.context.getTitle(),
            instructions: options.preparedChatPrompt.sanitizedRequirements.systemMessage || '',
            knowledgeSources: options.preparedChatPrompt.knowledgeSourcesForAgent,
            tools:
                options.preparedChatPrompt.mergedTools.length > 0 ? options.preparedChatPrompt.mergedTools : undefined,
            vectorStoreId: options.agentKitCacheState.shouldUseCache
                ? options.agentKitCacheState.vectorStoreId
                : undefined,
        });
    }

    /**
     * Stores freshly prepared AgentKit resources back into the in-memory caches when caching is allowed.
     */
    private storeAgentKitCache(options: {
        readonly preparedAgentKit: PreparedAgentKitAgent;
        readonly agentKitCacheState: AgentKitCacheState;
    }): void {
        if (!options.agentKitCacheState.shouldUseCache) {
            return;
        }

        if (options.agentKitCacheState.vectorStoreHash && options.preparedAgentKit.vectorStoreId) {
            AgentLlmExecutionToolsAgentKitRunner.vectorStoreCache.set(this.context.getTitle(), {
                vectorStoreId: options.preparedAgentKit.vectorStoreId,
                requirementsHash: options.agentKitCacheState.vectorStoreHash,
            });
        }

        if (options.agentKitCacheState.requirementsHash) {
            AgentLlmExecutionToolsAgentKitRunner.agentKitAgentCache.set(this.context.getTitle(), {
                agent: options.preparedAgentKit.agent,
                requirementsHash: options.agentKitCacheState.requirementsHash,
                vectorStoreId: options.preparedAgentKit.vectorStoreId,
            });
        }
    }
}
