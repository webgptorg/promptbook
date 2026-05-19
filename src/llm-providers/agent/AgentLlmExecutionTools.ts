import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import type { Promisable } from 'type-fest';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CommonPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text } from '../../types/string_markdown';
import type { string_model_name } from '../../types/string_model_name';
import type { string_title } from '../../types/string_title';
import { humanizeAiText } from '../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../utils/markdown/promptbookifyAiText';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import type { really_unknown } from '../../utils/organization/really_unknown';
import { OpenAiAgentKitExecutionTools } from '../openai/OpenAiAgentKitExecutionTools';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
import { AgentLlmExecutionToolsAgentKitRunner } from './AgentLlmExecutionToolsAgentKitRunner';
import { AgentLlmExecutionToolsOpenAiAssistantRunner } from './AgentLlmExecutionToolsOpenAiAssistantRunner';
import { AgentLlmExecutionToolsPromptPreparer } from './AgentLlmExecutionToolsPromptPreparer';
import type { CreateAgentLlmExecutionToolsOptions } from './CreateAgentLlmExecutionToolsOptions';

/**
 * Normalizes the final model content into the markdown shape expected from agents.
 */
function normalizeAgentResultContent(content: CommonPromptResult['content'] | really_unknown): string_markdown {
    let normalizedContent = content as string_markdown | really_unknown;

    if (typeof normalizedContent === 'string') {
        normalizedContent = humanizeAiText(normalizedContent);
        normalizedContent = promptbookifyAiText(normalizedContent as string_markdown);
    } else {
        // TODO: Maybe deep `humanizeAiText` + `promptbookifyAiText` inside of the object
        normalizedContent = JSON.stringify(normalizedContent);
    }

    return normalizedContent as string_markdown;
}

/**
 * Execution Tools for calling LLM models with a predefined agent "soul"
 * This wraps underlying LLM execution tools and applies agent-specific system prompts and requirements
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - (Deprecated) which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities
 * - `OpenAiAgentKitExecutionTools` - which is a specific implementation of `LlmExecutionTools` backed by OpenAI AgentKit
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @public exported from `@promptbook/core`
 */
export class AgentLlmExecutionTools implements LlmExecutionTools {
    /**
     * Cached model requirements to avoid re-parsing the agent source.
     */
    private _cachedModelRequirements: AgentModelRequirements | null = null;

    /**
     * Cached parsed agent information.
     */
    private _cachedAgentInfo: ReturnType<typeof parseAgentSource> | null = null;

    /**
     * Optional server-precomputed model requirements reused until the source changes.
     */
    private precomputedModelRequirements: AgentModelRequirements | null;

    /**
     * Dedicated prompt preparation facade used before backend dispatch.
     */
    private readonly promptPreparer: AgentLlmExecutionToolsPromptPreparer;

    /**
     * Dedicated OpenAI AgentKit runner used when the wrapped tools support AgentKit preparation.
     */
    private readonly agentKitRunner: AgentLlmExecutionToolsAgentKitRunner;

    /**
     * Dedicated OpenAI Assistant runner used when the wrapped tools use Assistants.
     */
    private readonly openAiAssistantRunner: AgentLlmExecutionToolsOpenAiAssistantRunner;

    /**
     * Creates new AgentLlmExecutionTools.
     *
     * @param options - The underlying LLM tools and agent source configuration.
     */
    public constructor(protected readonly options: CreateAgentLlmExecutionToolsOptions) {
        this.precomputedModelRequirements = options.precomputedModelRequirements ?? null;

        this.promptPreparer = new AgentLlmExecutionToolsPromptPreparer({
            getModelRequirements: () => this.getModelRequirements(),
            getTitle: () => this.title,
            isVerbose: options.isVerbose,
            hasPrecomputedModelRequirements: () => this.precomputedModelRequirements !== null,
        });
        this.agentKitRunner = new AgentLlmExecutionToolsAgentKitRunner({
            getTitle: () => this.title,
            getModelName: () => this.modelName,
            isVerbose: options.isVerbose,
            assistantPreparationMode: options.assistantPreparationMode,
        });
        this.openAiAssistantRunner = new AgentLlmExecutionToolsOpenAiAssistantRunner({
            getTitle: () => this.title,
            getModelName: () => this.modelName,
            isVerbose: options.isVerbose,
            assistantPreparationMode: options.assistantPreparationMode,
        });
    }

    /**
     * Updates the agent source and clears the cache.
     *
     * @param agentSource - The new agent source string.
     */
    protected updateAgentSource(agentSource: string_book): void {
        if (this.options.agentSource === agentSource) {
            return;
        }

        this.options.agentSource = agentSource;
        this._cachedAgentInfo = null;
        this._cachedModelRequirements = null;
        this.precomputedModelRequirements = null;
    }

    /**
     * Returns cached or parsed agent information.
     */
    private getAgentInfo() {
        if (this._cachedAgentInfo === null) {
            this._cachedAgentInfo = parseAgentSource(this.options.agentSource);
        }

        return this._cachedAgentInfo;
    }

    /**
     * Returns cached or compiled agent model requirements.
     *
     * Note: [🐤] This is named `getModelRequirements` *(not `getAgentModelRequirements`)* because in future these two will be united.
     */
    public async getModelRequirements(): Promise<AgentModelRequirements> {
        if (this.precomputedModelRequirements !== null) {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Using precomputed agent model requirements', {
                    agent: this.title,
                    toolCount: this.precomputedModelRequirements.tools?.length ?? 0,
                });
            }

            return this.precomputedModelRequirements;
        }

        if (this._cachedModelRequirements === null) {
            const preparationStartedAtMs = Date.now();

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Preparing agent model requirements', {
                    agent: this.title,
                });
            }

            const availableModelsStartedAtMs = Date.now();
            const availableModels = await this.options.llmTools.listModels();

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Available models resolved for agent', {
                    agent: this.title,
                    modelCount: availableModels.length,
                    elapsedMs: Date.now() - availableModelsStartedAtMs,
                });
            }

            const requirementsStartedAtMs = Date.now();
            this._cachedModelRequirements = await createAgentModelRequirements(
                this.options.agentSource,
                undefined,
                availableModels,
            );

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Agent model requirements ready', {
                    agent: this.title,
                    elapsedMs: Date.now() - requirementsStartedAtMs,
                    totalElapsedMs: Date.now() - preparationStartedAtMs,
                });
            }
        }

        return this._cachedModelRequirements;
    }

    public get title(): string_title & string_markdown_text {
        const agentInfo = this.getAgentInfo();
        return (agentInfo.meta.fullname || agentInfo.agentName || 'Agent') as string_title & string_markdown_text;
    }

    public get description(): string_markdown {
        const agentInfo = this.getAgentInfo();
        return agentInfo.personaDescription || 'AI Agent with predefined personality and behavior';
    }

    public get profile(): ChatParticipant | undefined {
        const agentInfo = this.getAgentInfo();

        if (!agentInfo.agentName) {
            return undefined;
        }

        return {
            name: agentInfo.agentName.toUpperCase().replace(/\s+/g, '_'),
            fullname: agentInfo.meta.fullname || agentInfo.agentName,
            color: agentInfo.meta.color || '#6366f1',
            avatarSrc: agentInfo.meta.image,
        };
    }

    public checkConfiguration(): Promisable<void> {
        return this.options.llmTools.checkConfiguration();
    }

    /**
     * Returns a virtual model name representing the agent behavior.
     */
    public get modelName(): string_model_name {
        const hash = sha256(hexEncoder.parse(this.options.agentSource)).toString(/* hex */);
        const agentId = hash.substring(0, 10);

        return (normalizeToKebabCase(this.title) + '-' + agentId) as string_model_name;
    }

    public listModels(): Promisable<ReadonlyArray<AvailableModel>> {
        return [
            {
                modelName: this.modelName,
                modelVariant: 'CHAT',
                modelTitle: `${this.title} (Agent Chat Default)`,
                modelDescription: `Chat model with agent behavior: ${this.description}`,
            },
        ];
    }

    /**
     * Calls the chat model with agent-specific system prompt and requirements.
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls the chat model with agent-specific system prompt and requirements with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        const preparedChatPrompt = await this.promptPreparer.prepareChatPrompt(prompt);
        const underlyingLlmResult = await this.callPreparedChatModelStream({
            originalPrompt: prompt,
            preparedChatPrompt,
            onProgress,
            streamOptions: options,
        });

        return this.finalizeAgentResult(underlyingLlmResult);
    }

    /**
     * Dispatches one prepared agent prompt to the correct underlying LLM backend.
     */
    private async callPreparedChatModelStream(options: {
        readonly originalPrompt: Prompt;
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        const llmTools = this.options.llmTools;

        if (OpenAiAgentKitExecutionTools.isOpenAiAgentKitExecutionTools(llmTools)) {
            return this.agentKitRunner.callChatModelStream({
                llmTools,
                originalPrompt: options.originalPrompt,
                preparedChatPrompt: options.preparedChatPrompt,
                onProgress: options.onProgress,
                streamOptions: options.streamOptions,
            });
        }

        if (OpenAiAssistantExecutionTools.isOpenAiAssistantExecutionTools(llmTools)) {
            return this.openAiAssistantRunner.callChatModelStream({
                llmTools,
                originalPrompt: options.originalPrompt,
                preparedChatPrompt: options.preparedChatPrompt,
                onProgress: options.onProgress,
                streamOptions: options.streamOptions,
            });
        }

        return this.callGenericChatModelStream({
            preparedChatPrompt: options.preparedChatPrompt,
            onProgress: options.onProgress,
            streamOptions: options.streamOptions,
        });
    }

    /**
     * Runs one prepared prompt through generic LLM tools that do not need special assistant preparation.
     */
    private async callGenericChatModelStream(options: {
        readonly preparedChatPrompt: Awaited<ReturnType<AgentLlmExecutionToolsPromptPreparer['prepareChatPrompt']>>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        if (this.options.isVerbose) {
            console.log(`2️⃣ Creating Assistant ${this.title} on generic LLM execution tools...`);
        }

        if (this.options.llmTools.callChatModelStream) {
            return this.options.llmTools.callChatModelStream(
                options.preparedChatPrompt.forwardedPrompt,
                options.onProgress,
                options.streamOptions,
            );
        }

        if (this.options.llmTools.callChatModel) {
            const underlyingLlmResult = await this.options.llmTools.callChatModel(
                options.preparedChatPrompt.forwardedPrompt,
            );
            options.onProgress(underlyingLlmResult as ChatPromptResult);
            return underlyingLlmResult;
        }

        throw new Error('Underlying LLM execution tools do not support chat model calls');
    }

    /**
     * Applies the final agent-level content normalization to the underlying LLM result.
     */
    private finalizeAgentResult(underlyingLlmResult: CommonPromptResult): ChatPromptResult {
        return {
            ...underlyingLlmResult,
            content: normalizeAgentResultContent(underlyingLlmResult.content as string_markdown | really_unknown),
            modelName: this.modelName,
        };
    }

    // Note: We intentionally do NOT implement callCompletionModel and callEmbeddingModel
    // as specified in the requirements - this agent wrapper only supports chat interactions
}

// TODO: [🍚] Implement Destroyable pattern to free resources
// TODO: [🧠] Adding parameter substitution support (here or should be responsibility of the underlying LLM Tools)
