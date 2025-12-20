import Bottleneck from 'bottleneck';
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import type { ClientOptions } from 'openai';
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
import { API_REQUEST_TIMEOUT, CONNECTION_RETRIES_LIMIT, DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    ImagePromptResult,
} from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { Prompt } from '../../types/Prompt';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_title,
} from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import {
    isUnsupportedParameterError,
    parseUnsupportedParameterError,
    removeUnsupportedModelRequirement,
} from '../_common/utils/removeUnsupportedModelRequirements';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API or other OpenAI compatible provider
 *
 * @public exported from `@promptbook/openai`
 */
export abstract class OpenAiCompatibleExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    /**
     * OpenAI API client.
     */
    private client: OpenAI | null = null;

    /**
     * Rate limiter instance
     */
    private limiter: Bottleneck;

    // Removed retriedUnsupportedParameters and attemptHistory instance fields

    /**
     * Creates OpenAI compatible Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI compatible client
     */
    public constructor(protected readonly options: OpenAiCompatibleExecutionToolsNonProxiedOptions) {
        // TODO: Allow configuring rate limits via options
        this.limiter = new Bottleneck({
            minTime: 60_000 / (this.options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE),
        });
    }

    public abstract get title(): string_title & string_markdown_text;

    public abstract get description(): string_markdown;

    public async getClient(): Promise<OpenAI> {
        if (this.client === null) {
            // Note: Passing only OpenAI relevant options to OpenAI constructor
            const openAiOptions: chococake = { ...this.options };
            delete openAiOptions.isVerbose;
            delete openAiOptions.userId;

            // Enhanced configuration for better ECONNRESET handling
            const enhancedOptions = {
                ...openAiOptions,
                timeout: API_REQUEST_TIMEOUT,
                maxRetries: CONNECTION_RETRIES_LIMIT,
                defaultHeaders: {
                    Connection: 'keep-alive',
                    'Keep-Alive': 'timeout=30, max=100',
                    ...openAiOptions.defaultHeaders,
                },
            };

            this.client = new OpenAI(enhancedOptions as ClientOptions);
        }

        return this.client;
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
        const client = await this.getClient();
        const rawModelsList = await client.models.list();

        const availableModels = rawModelsList.data
            .sort((a, b) => (a.created > b.created ? 1 : -1))
            .map((modelFromApi) => {
                const modelFromList = this.HARDCODED_MODELS.find(
                    ({ modelName }) =>
                        modelName === modelFromApi.id ||
                        modelName.startsWith(modelFromApi.id) ||
                        modelFromApi.id.startsWith(modelName),
                );

                if (modelFromList !== undefined) {
                    return modelFromList;
                }

                return {
                    modelVariant: 'CHAT', // <- TODO: Is it correct to assume that listed models are chat models?
                    modelTitle: modelFromApi.id,
                    modelName: modelFromApi.id,
                    modelDescription: '',
                } satisfies AvailableModel;
            });

        return availableModels;
    }

    /**
     * Calls OpenAI compatible API to use a chat model.
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        // Deep clone prompt and modelRequirements to avoid mutation across calls
        const clonedPrompt: Prompt = JSON.parse(JSON.stringify(prompt));
        // Use local Set for retried parameters to ensure independence and thread safety
        const retriedUnsupportedParameters = new Set<string>();
        return this.callChatModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            [],
            retriedUnsupportedParameters,
        );
    }

    /**
     * Internal method that handles parameter retry for chat model calls
     */
    private async callChatModelWithRetry(
        prompt: Prompt,
        currentModelRequirements: typeof prompt.modelRequirements,
        attemptStack: Array<{
            modelName: string;
            unsupportedParameter?: string;
            errorMessage: string;
            stripped: boolean;
        }> = [],
        retriedUnsupportedParameters: Set<string> = new Set(),
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 ${this.title} callChatModel call`, { prompt, currentModelRequirements });
        }

        const { content, parameters, format } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (currentModelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const modelName = currentModelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: modelName,
            max_tokens: currentModelRequirements.maxTokens,
            temperature: currentModelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        } as OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming; // <- TODO: [💩] Guard here types better

        if (format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });

        // Convert thread to OpenAI format if present
        let threadMessages: OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming['messages'] = [];
        if ('thread' in prompt && Array.isArray((prompt as TODO_any).thread)) {
            threadMessages = prompt.thread!.map((msg) => ({
                role: msg.sender === 'assistant' ? 'assistant' : 'user', // <- TODO: [👥] Standardize to `role: 'USER' | 'ASSISTANT'
                content: msg.content,
            }));
        }

        const rawRequest: OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            messages: [
                ...(currentModelRequirements.systemMessage === undefined
                    ? []
                    : ([
                          {
                              role: 'system',
                              content: currentModelRequirements.systemMessage,
                          },
                      ] as const)),
                ...threadMessages,
                {
                    role: 'user',
                    content: rawPromptContent,
                },
            ],
            user: this.options.userId?.toString(),
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.chat.completions.create(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }
            const complete: string_date_iso8601 = $getCurrentDate();

            if (!rawResponse.choices[0]) {
                throw new PipelineExecutionError(`No choises from ${this.title}`);
            }

            if (rawResponse.choices.length > 1) {
                // TODO: This should be maybe only warning
                throw new PipelineExecutionError(`More than one choise from ${this.title}`);
            }

            const resultContent = rawResponse.choices[0].message.content;
            const usage = this.computeUsage(content || '', resultContent || '', rawResponse);

            if (resultContent === null) {
                throw new PipelineExecutionError(`No response message from ${this.title}`);
            }

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callChatModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                    // <- [🗯]
                },
            });
        } catch (error) {
            assertsError(error);

            // Check if this is an unsupported parameter error
            if (!isUnsupportedParameterError(error)) {
                // If we have attemptStack, include it in the error message
                if (attemptStack.length > 0) {
                    throw new PipelineExecutionError(
                        `All attempts failed. Attempt history:\n` +
                            attemptStack
                                .map(
                                    (a, i) =>
                                        `  ${i + 1}. Model: ${a.modelName}` +
                                        (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                        `, Error: ${a.errorMessage}` +
                                        (a.stripped ? ' (stripped and retried)' : ''),
                                )
                                .join('\n') +
                            `\nFinal error: ${error.message}`,
                    );
                }
                throw error;
            }

            // Parse which parameter is unsupported
            const unsupportedParameter = parseUnsupportedParameterError(error.message);

            if (!unsupportedParameter) {
                if (this.options.isVerbose) {
                    console.warn(
                        colors.bgYellow('Warning'),
                        'Could not parse unsupported parameter from error:',
                        error.message,
                    );
                }
                throw error;
            }

            // Create a unique key for this model + parameter combination to prevent infinite loops
            const retryKey = `${modelName}-${unsupportedParameter}`;

            if (retriedUnsupportedParameters.has(retryKey)) {
                // Already retried this parameter, throw the error with attemptStack
                attemptStack.push({
                    modelName,
                    unsupportedParameter,
                    errorMessage: error.message,
                    stripped: true,
                });
                throw new PipelineExecutionError(
                    `All attempts failed. Attempt history:\n` +
                        attemptStack
                            .map(
                                (a, i) =>
                                    `  ${i + 1}. Model: ${a.modelName}` +
                                    (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                    `, Error: ${a.errorMessage}` +
                                    (a.stripped ? ' (stripped and retried)' : ''),
                            )
                            .join('\n') +
                        `\nFinal error: ${error.message}`,
                );
            }

            // Mark this parameter as retried
            retriedUnsupportedParameters.add(retryKey);

            // Log warning in verbose mode
            if (this.options.isVerbose) {
                console.warn(
                    colors.bgYellow('Warning'),
                    `Removing unsupported parameter '${unsupportedParameter}' for model '${modelName}' and retrying request`,
                );
            }

            // Add to attemptStack
            attemptStack.push({
                modelName,
                unsupportedParameter,
                errorMessage: error.message,
                stripped: true,
            });

            // Remove the unsupported parameter and retry
            const modifiedModelRequirements = removeUnsupportedModelRequirement(
                currentModelRequirements,
                unsupportedParameter,
            );

            return this.callChatModelWithRetry(
                prompt,
                modifiedModelRequirements,
                attemptStack,
                retriedUnsupportedParameters,
            );
        }
    }

    /**
     * Calls OpenAI API to use a complete model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        // Deep clone prompt and modelRequirements to avoid mutation across calls
        const clonedPrompt = JSON.parse(JSON.stringify(prompt));
        const retriedUnsupportedParameters = new Set<string>();
        return this.callCompletionModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            [],
            retriedUnsupportedParameters,
        );
    }

    /**
     * Internal method that handles parameter retry for completion model calls
     */
    private async callCompletionModelWithRetry(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        currentModelRequirements: typeof prompt.modelRequirements,
        attemptStack: Array<{
            modelName: string;
            unsupportedParameter?: string;
            errorMessage: string;
            stripped: boolean;
        }> = [],
        retriedUnsupportedParameters: Set<string> = new Set(),
    ): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 ${this.title} callCompletionModel call`, { prompt, currentModelRequirements });
        }

        const { content, parameters } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (currentModelRequirements.modelVariant !== 'COMPLETION') {
            throw new PipelineExecutionError('Use callCompletionModel only for COMPLETION variant');
        }

        const modelName = currentModelRequirements.modelName || this.getDefaultCompletionModel().modelName;
        const modelSettings = {
            model: modelName,
            max_tokens: currentModelRequirements.maxTokens,
            temperature: currentModelRequirements.temperature,
        };

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: rawPromptContent,
            user: this.options.userId?.toString(),
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.completions.create(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }
            const complete: string_date_iso8601 = $getCurrentDate();

            if (!rawResponse.choices[0]) {
                throw new PipelineExecutionError(`No choises from ${this.title}`);
            }

            if (rawResponse.choices.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${this.title}`);
            }

            const resultContent = rawResponse.choices[0].text;
            const usage = this.computeUsage(content || '', resultContent || '', rawResponse);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callCompletionModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            if (!isUnsupportedParameterError(error)) {
                if (attemptStack.length > 0) {
                    throw new PipelineExecutionError(
                        `All attempts failed. Attempt history:\n` +
                            attemptStack
                                .map(
                                    (a, i) =>
                                        `  ${i + 1}. Model: ${a.modelName}` +
                                        (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                        `, Error: ${a.errorMessage}` +
                                        (a.stripped ? ' (stripped and retried)' : ''),
                                )
                                .join('\n') +
                            `\nFinal error: ${error.message}`,
                    );
                }
                throw error;
            }

            const unsupportedParameter = parseUnsupportedParameterError(error.message);

            if (!unsupportedParameter) {
                if (this.options.isVerbose) {
                    console.warn(
                        colors.bgYellow('Warning'),
                        'Could not parse unsupported parameter from error:',
                        error.message,
                    );
                }
                throw error;
            }

            const retryKey = `${modelName}-${unsupportedParameter}`;

            if (retriedUnsupportedParameters.has(retryKey)) {
                attemptStack.push({
                    modelName,
                    unsupportedParameter,
                    errorMessage: error.message,
                    stripped: true,
                });
                throw new PipelineExecutionError(
                    `All attempts failed. Attempt history:\n` +
                        attemptStack
                            .map(
                                (a, i) =>
                                    `  ${i + 1}. Model: ${a.modelName}` +
                                    (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                    `, Error: ${a.errorMessage}` +
                                    (a.stripped ? ' (stripped and retried)' : ''),
                            )
                            .join('\n') +
                        `\nFinal error: ${error.message}`,
                );
            }

            retriedUnsupportedParameters.add(retryKey);

            if (this.options.isVerbose) {
                console.warn(
                    colors.bgYellow('Warning'),
                    `Removing unsupported parameter '${unsupportedParameter}' for model '${modelName}' and retrying request`,
                );
            }

            attemptStack.push({
                modelName,
                unsupportedParameter,
                errorMessage: error.message,
                stripped: true,
            });

            const modifiedModelRequirements = removeUnsupportedModelRequirement(
                currentModelRequirements,
                unsupportedParameter,
            );

            return this.callCompletionModelWithRetry(
                prompt,
                modifiedModelRequirements,
                attemptStack,
                retriedUnsupportedParameters,
            );
        }
    }

    /**
     * Calls OpenAI compatible API to use a embedding model
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<EmbeddingPromptResult> {
        // Deep clone prompt and modelRequirements to avoid mutation across calls
        const clonedPrompt = JSON.parse(JSON.stringify(prompt));
        const retriedUnsupportedParameters = new Set<string>();
        return this.callEmbeddingModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            [],
            retriedUnsupportedParameters,
        );
    }

    /**
     * Internal method that handles parameter retry for embedding model calls
     */
    private async callEmbeddingModelWithRetry(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        currentModelRequirements: typeof prompt.modelRequirements,
        attemptStack: Array<{
            modelName: string;
            unsupportedParameter?: string;
            errorMessage: string;
            stripped: boolean;
        }> = [],
        retriedUnsupportedParameters: Set<string> = new Set(),
    ): Promise<EmbeddingPromptResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 ${this.title} embedding call`, { prompt, currentModelRequirements });
        }

        const { content, parameters } = prompt;

        const client = await this.getClient();

        if (currentModelRequirements.modelVariant !== 'EMBEDDING') {
            throw new PipelineExecutionError('Use embed only for EMBEDDING variant');
        }

        const modelName = currentModelRequirements.modelName || this.getDefaultEmbeddingModel().modelName;

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Embeddings.EmbeddingCreateParams = {
            input: rawPromptContent,
            model: modelName,
        };

        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.embeddings.create(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }
            const complete: string_date_iso8601 = $getCurrentDate();

            if (rawResponse.data.length !== 1) {
                throw new PipelineExecutionError(
                    `Expected exactly 1 data item in response, got ${rawResponse.data.length}`,
                );
            }

            const resultContent = rawResponse.data[0]!.embedding;

            const usage = this.computeUsage(content || '', '', rawResponse);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callEmbeddingModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            if (!isUnsupportedParameterError(error)) {
                if (attemptStack.length > 0) {
                    throw new PipelineExecutionError(
                        `All attempts failed. Attempt history:\n` +
                            attemptStack
                                .map(
                                    (a, i) =>
                                        `  ${i + 1}. Model: ${a.modelName}` +
                                        (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                        `, Error: ${a.errorMessage}` +
                                        (a.stripped ? ' (stripped and retried)' : ''),
                                )
                                .join('\n') +
                            `\nFinal error: ${error.message}`,
                    );
                }
                throw error;
            }

            const unsupportedParameter = parseUnsupportedParameterError(error.message);

            if (!unsupportedParameter) {
                if (this.options.isVerbose) {
                    console.warn(
                        colors.bgYellow('Warning'),
                        'Could not parse unsupported parameter from error:',
                        error.message,
                    );
                }
                throw error;
            }

            const retryKey = `${modelName}-${unsupportedParameter}`;

            if (retriedUnsupportedParameters.has(retryKey)) {
                attemptStack.push({
                    modelName,
                    unsupportedParameter,
                    errorMessage: error.message,
                    stripped: true,
                });
                throw new PipelineExecutionError(
                    `All attempts failed. Attempt history:\n` +
                        attemptStack
                            .map(
                                (a, i) =>
                                    `  ${i + 1}. Model: ${a.modelName}` +
                                    (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                    `, Error: ${a.errorMessage}` +
                                    (a.stripped ? ' (stripped and retried)' : ''),
                            )
                            .join('\n') +
                        `\nFinal error: ${error.message}`,
                );
            }

            retriedUnsupportedParameters.add(retryKey);

            if (this.options.isVerbose) {
                console.warn(
                    colors.bgYellow('Warning'),
                    `Removing unsupported parameter '${unsupportedParameter}' for model '${modelName}' and retrying request`,
                );
            }

            attemptStack.push({
                modelName,
                unsupportedParameter,
                errorMessage: error.message,
                stripped: true,
            });

            const modifiedModelRequirements = removeUnsupportedModelRequirement(
                currentModelRequirements,
                unsupportedParameter,
            );

            return this.callEmbeddingModelWithRetry(
                prompt,
                modifiedModelRequirements,
                attemptStack,
                retriedUnsupportedParameters,
            );
        }
    }

    /**
     * Calls OpenAI compatible API to use a image generation model
     */
    public async callImageGenerationModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<ImagePromptResult> {
        // Deep clone prompt and modelRequirements to avoid mutation across calls
        const clonedPrompt = JSON.parse(JSON.stringify(prompt));
        const retriedUnsupportedParameters = new Set<string>();
        return this.callImageGenerationModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            [],
            retriedUnsupportedParameters,
        );
    }

    /**
     * Internal method that handles parameter retry for image generation model calls
     */
    private async callImageGenerationModelWithRetry(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        currentModelRequirements: typeof prompt.modelRequirements,
        attemptStack: Array<{
            modelName: string;
            unsupportedParameter?: string;
            errorMessage: string;
            stripped: boolean;
        }> = [],
        retriedUnsupportedParameters: Set<string> = new Set(),
    ): Promise<ImagePromptResult> {
        if (this.options.isVerbose) {
            console.info(`🎨 ${this.title} callImageGenerationModel call`, { prompt, currentModelRequirements });
        }

        const { content, parameters } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (currentModelRequirements.modelVariant !== 'IMAGE_GENERATION') {
            throw new PipelineExecutionError('Use callImageGenerationModel only for IMAGE_GENERATION variant');
        }

        const modelName = currentModelRequirements.modelName || this.getDefaultImageGenerationModel().modelName;
        const modelSettings = {
            model: modelName,
            size: currentModelRequirements.size,
            quality: currentModelRequirements.quality,
            style: currentModelRequirements.style,
        };

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Images.ImageGenerateParams = {
            ...modelSettings,
            size: (modelSettings.size as OpenAI.Images.ImageGenerateParams['size']) || '1024x1024',
            prompt: rawPromptContent,
            user: this.options.userId?.toString(),
            response_format: 'url', // TODO: [🧠] Maybe allow b64_json
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.images.generate(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }
            const complete: string_date_iso8601 = $getCurrentDate();

            if (!rawResponse.data[0]) {
                throw new PipelineExecutionError(`No choises from ${this.title}`);
            }

            if (rawResponse.data.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${this.title}`);
            }

            const resultContent = rawResponse.data[0].url!;

            const modelInfo = this.HARDCODED_MODELS.find((model) => model.modelName === modelName);
            const price = modelInfo?.pricing?.output ? uncertainNumber(modelInfo.pricing.output) : uncertainNumber();

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callImageGenerationModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: modelName,
                    timing: {
                        start,
                        complete,
                    },
                    usage: {
                        price,
                        input: {
                            tokensCount: uncertainNumber(0),
                            ...computeUsageCounts(rawPromptContent),
                        },
                        output: {
                            tokensCount: uncertainNumber(0),
                            ...computeUsageCounts(''),
                        },
                    },
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            if (!isUnsupportedParameterError(error)) {
                if (attemptStack.length > 0) {
                    throw new PipelineExecutionError(
                        `All attempts failed. Attempt history:\n` +
                            attemptStack
                                .map(
                                    (a, i) =>
                                        `  ${i + 1}. Model: ${a.modelName}` +
                                        (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                        `, Error: ${a.errorMessage}` +
                                        (a.stripped ? ' (stripped and retried)' : ''),
                                )
                                .join('\n') +
                            `\nFinal error: ${error.message}`,
                    );
                }
                throw error;
            }

            const unsupportedParameter = parseUnsupportedParameterError(error.message);

            if (!unsupportedParameter) {
                if (this.options.isVerbose) {
                    console.warn(
                        colors.bgYellow('Warning'),
                        'Could not parse unsupported parameter from error:',
                        error.message,
                    );
                }
                throw error;
            }

            const retryKey = `${modelName}-${unsupportedParameter}`;

            if (retriedUnsupportedParameters.has(retryKey)) {
                attemptStack.push({
                    modelName,
                    unsupportedParameter,
                    errorMessage: error.message,
                    stripped: true,
                });
                throw new PipelineExecutionError(
                    `All attempts failed. Attempt history:\n` +
                        attemptStack
                            .map(
                                (a, i) =>
                                    `  ${i + 1}. Model: ${a.modelName}` +
                                    (a.unsupportedParameter ? `, Stripped: ${a.unsupportedParameter}` : '') +
                                    `, Error: ${a.errorMessage}` +
                                    (a.stripped ? ' (stripped and retried)' : ''),
                            )
                            .join('\n') +
                        `\nFinal error: ${error.message}`,
                );
            }

            retriedUnsupportedParameters.add(retryKey);

            if (this.options.isVerbose) {
                console.warn(
                    colors.bgYellow('Warning'),
                    `Removing unsupported parameter '${unsupportedParameter}' for model '${modelName}' and retrying request`,
                );
            }

            attemptStack.push({
                modelName,
                unsupportedParameter,
                errorMessage: error.message,
                stripped: true,
            });

            const modifiedModelRequirements = removeUnsupportedModelRequirement(
                currentModelRequirements,
                unsupportedParameter,
            );

            return this.callImageGenerationModelWithRetry(
                prompt,
                modifiedModelRequirements,
                attemptStack,
                retriedUnsupportedParameters,
            );
        }
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Get the model that should be used as default
     */
    protected getDefaultModel(defaultModelName: string_model_name): AvailableModel {
        // Note: Match exact or prefix for model families
        const model = this.HARDCODED_MODELS.find(
            ({ modelName }) => modelName === defaultModelName || modelName.startsWith(defaultModelName),
        );

        if (model === undefined) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) =>
                        `
                            Cannot find model in ${
                                this.title
                            } models with name "${defaultModelName}" which should be used as default.

                            Available models:
                            ${block(this.HARDCODED_MODELS.map(({ modelName }) => `- "${modelName}"`).join('\n'))}

                            Model "${defaultModelName}" is probably not available anymore, not installed, inaccessible or misconfigured.

                        `,
                ),
            );
        }
        return model;
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

    /**
     * Makes a request with retry logic for network errors like ECONNRESET
     */
    private async makeRequestWithNetworkRetry<T>(requestFn: () => Promise<T>): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= CONNECTION_RETRIES_LIMIT; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                assertsError(error);
                lastError = error;

                // Check if this is a retryable network error
                const isRetryableError = this.isRetryableNetworkError(error);

                if (!isRetryableError || attempt === CONNECTION_RETRIES_LIMIT) {
                    if (this.options.isVerbose && this.isRetryableNetworkError(error)) {
                        console.info(
                            colors.bgRed('Final network error after retries'),
                            `Attempt ${attempt}/${CONNECTION_RETRIES_LIMIT}:`,
                            error,
                        );
                    }
                    throw error;
                }

                // Calculate exponential backoff delay
                const baseDelay = 1000; // 1 second
                const backoffDelay = baseDelay * Math.pow(2, attempt - 1);
                const jitterDelay = Math.random() * 500; // Add some randomness
                const totalDelay = backoffDelay + jitterDelay;

                if (this.options.isVerbose) {
                    console.info(
                        colors.bgYellow('Retrying network request'),
                        `Attempt ${attempt}/${CONNECTION_RETRIES_LIMIT}, waiting ${Math.round(totalDelay)}ms:`,
                        error.message,
                    );
                }

                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, totalDelay));
            }
        }

        throw lastError!;
    }

    /**
     * Determines if an error is retryable (network-related errors)
     */
    private isRetryableNetworkError(error: Error): boolean {
        const errorMessage = error.message.toLowerCase();
        const errorCode = (error as Error & { code?: string }).code;

        // Network connection errors that should be retried
        const retryableErrors = [
            'econnreset',
            'enotfound',
            'econnrefused',
            'etimedout',
            'socket hang up',
            'network error',
            'fetch failed',
            'connection reset',
            'connection refused',
            'timeout',
        ];

        // Check error message
        if (retryableErrors.some((retryableError) => errorMessage.includes(retryableError))) {
            return true;
        }

        // Check error code
        if (errorCode && retryableErrors.includes(errorCode.toLowerCase())) {
            return true;
        }

        // Check for specific HTTP status codes that are retryable
        const errorWithStatus = error as Error & { status?: number; statusCode?: number };
        const httpStatus = errorWithStatus.status || errorWithStatus.statusCode;
        if (httpStatus && [429, 500, 502, 503, 504].includes(httpStatus)) {
            return true;
        }

        return false;
    }
}

/**
 * TODO: [🛄] Some way how to re-wrap the errors from `OpenAiCompatibleExecutionTools`
 * TODO: [🛄] Maybe make custom `OpenAiCompatibleError`
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 * TODO: [🧠][🦢] Make reverse adapter from LlmExecutionTools to OpenAI-compatible:
 */
