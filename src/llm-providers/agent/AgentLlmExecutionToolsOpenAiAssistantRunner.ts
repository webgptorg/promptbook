import { SHA256 as sha256 } from 'crypto-js';
import type { CallChatModelStreamOptions } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CommonPromptResult } from '../../execution/PromptResult';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_model_name } from '../../types/string_model_name';
import type { string_title } from '../../types/string_title';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
import type { AgentLlmExecutionToolsPromptPreparer } from './AgentLlmExecutionToolsPromptPreparer';
import { emitAgentLlmExecutionToolsAssistantPreparationProgress } from './emitAgentLlmExecutionToolsAssistantPreparationProgress';

/**
 * Computes one stable hash from a JSON-serializable value.
 */
function computeJsonHash(value: unknown): string {
    return sha256(JSON.stringify(value)).toString();
}

/**
 * Removes assistant-managed requirements before the prompt is executed via OpenAI Assistants.
 */
function createOpenAiAssistantPrompt(chatPrompt: ChatPrompt): ChatPrompt {
    return {
        ...chatPrompt,
        modelRequirements: {
            ...chatPrompt.modelRequirements,
            modelName: undefined,
            systemMessage: undefined,
            temperature: undefined,
        },
    };
}

/**
 * Handles deprecated OpenAI Assistant-backed executions for `AgentLlmExecutionTools`.
 *
 * @private internal utility of `AgentLlmExecutionTools`
 */
export class AgentLlmExecutionToolsOpenAiAssistantRunner {
    /**
     * Cache of OpenAI assistants to avoid creating duplicates.
     */
    private static assistantCache = new Map<
        string_title,
        {
            assistantId: string;
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
     * Runs one prepared prompt through the deprecated OpenAI Assistant backend.
     */
    public async callChatModelStream(options: {
        readonly llmTools: OpenAiAssistantExecutionTools;
        readonly originalPrompt: Prompt;
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        const assistant = await this.getOrPrepareOpenAiAssistant({
            llmTools: options.llmTools,
            originalPrompt: options.originalPrompt,
            preparedChatPrompt: options.preparedChatPrompt,
            onProgress: options.onProgress,
        });
        const promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools = createOpenAiAssistantPrompt(
            options.preparedChatPrompt.forwardedPrompt,
        );

        if (this.context.isVerbose) {
            console.info('[🤰]', 'Prepared OpenAI Assistant prompt', {
                agent: this.context.getTitle(),
                toolNames:
                    promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools.modelRequirements.tools?.map(
                        (tool) => tool.name,
                    ) ?? [],
                knowledgeSourcesCount:
                    promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools.modelRequirements.knowledgeSources
                        ?.length ?? 0,
            });
        }

        return assistant.callChatModelStream(
            promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools,
            options.onProgress,
            options.streamOptions,
        );
    }

    /**
     * Returns an assistant instance matching the current agent requirements, reusing caches when possible.
     */
    private async getOrPrepareOpenAiAssistant(options: {
        readonly llmTools: OpenAiAssistantExecutionTools;
        readonly originalPrompt: Prompt;
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
    }): Promise<OpenAiAssistantExecutionTools> {
        const requirementsHash = computeJsonHash(options.preparedChatPrompt.sanitizedRequirements);
        const cachedAssistant = AgentLlmExecutionToolsOpenAiAssistantRunner.assistantCache.get(this.context.getTitle());
        const assistantTools = options.preparedChatPrompt.sanitizedRequirements.tools
            ? [...options.preparedChatPrompt.sanitizedRequirements.tools]
            : undefined;

        if (this.context.assistantPreparationMode === 'external') {
            if (this.context.isVerbose) {
                console.info('[🤰]', 'Using externally managed OpenAI Assistant', {
                    agent: this.context.getTitle(),
                    assistantId: options.llmTools.assistantId,
                });
            }

            this.storeAssistantCache(options.llmTools.assistantId, requirementsHash);
            return options.llmTools;
        }

        if (cachedAssistant && cachedAssistant.requirementsHash === requirementsHash) {
            if (this.context.isVerbose) {
                console.info('[🤰]', 'Using cached OpenAI Assistant', {
                    agent: this.context.getTitle(),
                    assistantId: cachedAssistant.assistantId,
                });
            }

            return options.llmTools.getAssistant(cachedAssistant.assistantId);
        }

        if (cachedAssistant) {
            if (this.context.isVerbose) {
                console.info('[🤰]', 'Updating OpenAI Assistant', {
                    agent: this.context.getTitle(),
                    assistantId: cachedAssistant.assistantId,
                });
            }

            emitAgentLlmExecutionToolsAssistantPreparationProgress({
                onProgress: options.onProgress,
                prompt: options.originalPrompt,
                modelName: this.context.getModelName(),
                phase: 'Updating assistant',
            });

            const assistant = await options.llmTools.updateAssistant({
                assistantId: cachedAssistant.assistantId,
                name: this.context.getTitle(),
                instructions: options.preparedChatPrompt.sanitizedRequirements.systemMessage,
                knowledgeSources: options.preparedChatPrompt.sanitizedRequirements.knowledgeSources,
                tools: assistantTools,
            });

            this.storeAssistantCache(assistant.assistantId, requirementsHash);
            return assistant;
        }

        if (this.context.isVerbose) {
            console.info('[🤰]', 'Creating new OpenAI Assistant', {
                agent: this.context.getTitle(),
            });
        }

        // <- TODO: [🐱‍🚀] Check also `isCreatingNewAssistantsAllowed` and warn about it
        emitAgentLlmExecutionToolsAssistantPreparationProgress({
            onProgress: options.onProgress,
            prompt: options.originalPrompt,
            modelName: this.context.getModelName(),
            phase: 'Creating assistant',
        });

        const assistant = await options.llmTools.createNewAssistant({
            name: this.context.getTitle(),
            instructions: options.preparedChatPrompt.sanitizedRequirements.systemMessage,
            knowledgeSources: options.preparedChatPrompt.sanitizedRequirements.knowledgeSources,
            tools: assistantTools,
            /*
            !!!
            metadata: {
                agentModelName: this.modelName,
            }
            */
        });

        this.storeAssistantCache(assistant.assistantId, requirementsHash);
        return assistant;
    }

    /**
     * Stores one assistant id in the shared assistant cache for this agent title.
     */
    private storeAssistantCache(assistantId: string, requirementsHash: string): void {
        AgentLlmExecutionToolsOpenAiAssistantRunner.assistantCache.set(this.context.getTitle(), {
            assistantId,
            requirementsHash,
        });
    }
}
