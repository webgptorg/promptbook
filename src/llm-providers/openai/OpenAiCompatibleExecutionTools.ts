import type OpenAI from 'openai';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    ImagePromptResult,
} from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text } from '../../types/string_markdown';
import type { string_model_name } from '../../types/string_model_name';
import type { string_title } from '../../types/string_title';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import { OpenAiCompatibleModelCatalog } from './OpenAiCompatibleModelCatalog';
import { OpenAiCompatibleNonChatPromptCaller } from './OpenAiCompatibleNonChatPromptCaller';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiCompatibleRequestManager } from './OpenAiCompatibleRequestManager';
import { callOpenAiCompatibleChatModel } from './utils/callOpenAiCompatibleChatModel';

/**
 * Execution Tools for calling OpenAI API or other OpenAI compatible provider
 *
 * @public exported from `@promptbook/openai`
 */
export abstract class OpenAiCompatibleExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    /**
     * OpenAI client lifecycle and shared request execution behavior.
     */
    private readonly requestManager: OpenAiCompatibleRequestManager;

    /**
     * Live/hardcoded model lookup shared by all provider variants.
     */
    private readonly modelCatalog: OpenAiCompatibleModelCatalog;

    /**
     * Completion, embedding, and image-generation prompt execution.
     */
    private readonly nonChatPromptCaller: OpenAiCompatibleNonChatPromptCaller;

    /**
     * Creates OpenAI compatible Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI compatible client
     */
    public constructor(protected readonly options: OpenAiCompatibleExecutionToolsNonProxiedOptions) {
        this.requestManager = new OpenAiCompatibleRequestManager(this.options);
        this.modelCatalog = new OpenAiCompatibleModelCatalog({
            getTitle: () => this.title,
            getClient: () => this.getClient(),
            getHardcodedModels: () => this.HARDCODED_MODELS,
        });
        this.nonChatPromptCaller = new OpenAiCompatibleNonChatPromptCaller({
            getTitle: () => this.title,
            isVerbose: this.options.isVerbose,
            userId: this.options.userId,
            getClient: () => this.getClient(),
            executeRateLimitedRequest: (requestFn) => this.executeRateLimitedRequest(requestFn),
            computeUsage: (...usageArguments) => this.computeUsage(...usageArguments),
            getDefaultCompletionModel: () => this.getDefaultCompletionModel(),
            getDefaultEmbeddingModel: () => this.getDefaultEmbeddingModel(),
            getDefaultImageGenerationModel: () => this.getDefaultImageGenerationModel(),
            getHardcodedModels: () => this.HARDCODED_MODELS,
        });
    }

    public abstract get title(): string_title & string_markdown_text;

    public abstract get description(): string_markdown;

    public async getClient(): Promise<OpenAI> {
        return this.requestManager.getClient();
    }

    /**
     * Check the `options` passed to `constructor`
     */
    public async checkConfiguration(): Promise<void> {
        await this.getClient();
        // TODO: [🎍] Do here a real check that API is online, working and API key is correct
    }

    /**
     * List all available OpenAI compatible models that can be used
     */
    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        return this.modelCatalog.listModels();
    }

    /**
     * Calls OpenAI compatible API to use a chat model.
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls OpenAI compatible API to use a chat model with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
        _options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        TODO_USE(_options);

        return callOpenAiCompatibleChatModel({
            prompt,
            onProgress,
            title: this.title,
            executionToolsOptions: this.options,
            getClient: () => this.getClient(),
            executeRateLimitedRequest: (requestFn) => this.executeRateLimitedRequest(requestFn),
            computeUsage: (...usageArguments) => this.computeUsage(...usageArguments),
            getDefaultChatModel: () => this.getDefaultChatModel(),
        });
    }

    /**
     * Executes one OpenAI request under the shared rate limiter and network retry policy.
     */
    private async executeRateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
        return this.requestManager.executeRateLimitedRequest(requestFn);
    }

    /**
     * Calls OpenAI API to use a complete model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        return this.nonChatPromptCaller.callCompletionModel(prompt);
    }

    /**
     * Calls OpenAI compatible API to use a embedding model
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<EmbeddingPromptResult> {
        return this.nonChatPromptCaller.callEmbeddingModel(prompt);
    }

    /**
     * Calls OpenAI compatible API to use a image generation model
     */
    public async callImageGenerationModel(prompt: Prompt): Promise<ImagePromptResult> {
        return this.nonChatPromptCaller.callImageGenerationModel(prompt);
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Get the model that should be used as default
     */
    protected getDefaultModel(defaultModelName: string_model_name): AvailableModel {
        return this.modelCatalog.getDefaultModel(defaultModelName);
    }

    /**
     * List all available models (non dynamically)
     *
     * Note: Purpose of this is to provide more information about models than standard listing from API
     */
    protected abstract get HARDCODED_MODELS(): ReadonlyArray<AvailableModel>;

    /**
     * Computes the usage of the OpenAI API based on the response from OpenAI Compatible API
     */
    protected abstract computeUsage(...args: Parameters<typeof computeOpenAiUsage>): Usage;

    /**
     * Default model for chat variant.
     */
    protected abstract getDefaultChatModel(): AvailableModel;

    /**
     * Default model for completion variant.
     */
    protected abstract getDefaultCompletionModel(): AvailableModel;

    /**
     * Default model for completion variant.
     */
    protected abstract getDefaultEmbeddingModel(): AvailableModel;

    /**
     * Default model for image generation variant.
     */
    protected abstract getDefaultImageGenerationModel(): AvailableModel;
    // <- Note: [🤖] getDefaultXxxModel
}

// TODO: [🛄] Some way how to re-wrap the errors from `OpenAiCompatibleExecutionTools`
// TODO: [🛄] Maybe make custom `OpenAiCompatibleError`
// TODO: [🧠][🈁] Maybe use `isDeterministic` from options
// TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
// TODO: [🧠][🦢] Make reverse adapter from LlmExecutionTools to OpenAI-compatible:
