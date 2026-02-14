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
import type { ChatPrompt, Prompt } from '../../types/Prompt';
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
import { serializeError } from '../../_packages/utils.index';
import { exportJson } from '../../utils/serialization/exportJson';
import { addUsage } from '../../execution/utils/addUsage';
import { forEachAsync } from '../../execution/utils/forEachAsync';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';
import { buildToolInvocationScript } from './utils/buildToolInvocationScript';
import {
    isUnsupportedParameterError,
    parseUnsupportedParameterError,
    removeUnsupportedModelRequirement,
} from '../_common/utils/removeUnsupportedModelRequirements';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';

type StructuredCloneFunction = <T>(value: T) => T;

/**
 * Provides access to the structured clone implementation when available.
 */
function getStructuredCloneFunction(): StructuredCloneFunction | undefined {
    return (globalThis as typeof globalThis & { structuredClone?: StructuredCloneFunction }).structuredClone;
}

/**
 * Checks whether the prompt is a chat prompt that carries file attachments.
 */
function hasChatPromptFiles(prompt: Prompt): prompt is ChatPrompt & { files: Array<File> } {
    return 'files' in prompt && Array.isArray((prompt as ChatPrompt).files);
}

/**
 * Creates a deep copy of the prompt while keeping attached files intact when structured clone is not available.
 */
function clonePromptPreservingFiles(prompt: Prompt): Prompt {
    const structuredCloneFn = getStructuredCloneFunction();

    if (typeof structuredCloneFn === 'function') {
        return structuredCloneFn(prompt);
    }

    const clonedPrompt: Prompt = JSON.parse(JSON.stringify(prompt));

    if (hasChatPromptFiles(prompt)) {
        (clonedPrompt as ChatPrompt).files = prompt.files;
    }

    return clonedPrompt;
}

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

            // Enhanced configuration with retries and timeouts.
            const enhancedOptions: ClientOptions = {
                ...openAiOptions,
                timeout: API_REQUEST_TIMEOUT,
                maxRetries: CONNECTION_RETRIES_LIMIT,
            } as ClientOptions;

            this.client = new OpenAI(enhancedOptions);
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
        const client: OpenAI = await this.getClient();
        const rawModelsList: chococake = await client.models.list();

        const availableModels: ReadonlyArray<AvailableModel> = (rawModelsList.data as Array<chococake>)
            .sort((a: chococake, b: chococake) => (a.created > b.created ? 1 : -1))
            .map((modelFromApi: chococake) => {
                const modelFromList: undefined | AvailableModel = this.HARDCODED_MODELS.find(
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
    ): Promise<ChatPromptResult> {
        // Deep clone prompt and modelRequirements to avoid mutation across calls
        const clonedPrompt: Prompt = clonePromptPreservingFiles(prompt);
        // Use local Set for retried parameters to ensure independence and thread safety
        const retriedUnsupportedParameters = new Set<string>();
        return this.callChatModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            [],
            retriedUnsupportedParameters,
            onProgress,
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
        onProgress?: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 ${this.title} callChatModel call`, { prompt, currentModelRequirements });
        }

        const { content, parameters, format } = prompt;

        const client: OpenAI = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (currentModelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const modelName: string_model_name = currentModelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: modelName,
            max_tokens: currentModelRequirements.maxTokens,
            temperature: currentModelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming; // <- TODO: [💩] Guard here types better

        if (currentModelRequirements.responseFormat !== undefined) {
            modelSettings.response_format = currentModelRequirements.responseFormat;
        } else if (format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.

        const rawPromptContent: string = templateParameters(content, { ...parameters, modelName });

        // Convert thread to OpenAI format if present
        let threadMessages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [];
        if ('thread' in prompt && Array.isArray((prompt as TODO_any).thread)) {
            threadMessages = (prompt as chococake).thread!.map(
                (msg: chococake): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
                    role: msg.sender === 'assistant' ? 'assistant' : 'user', // <- TODO: [👥] Standardize to `role: 'USER' | 'ASSISTANT'
                    content: msg.content,
                }),
            );
        }

        const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
            ...(currentModelRequirements.systemMessage === undefined
                ? []
                : ([
                      {
                          role: 'system',
                          content: currentModelRequirements.systemMessage,
                      },
                  ] as const)),
            ...threadMessages,
        ];

        if ('files' in prompt && Array.isArray(prompt.files) && prompt.files.length > 0) {
            const filesContent = await Promise.all(
                prompt.files.map(async (file: File) => {
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    return {
                        type: 'image_url', // <- TODO: [🧠] Only images are supported for now, handle other file types
                        image_url: {
                            url: `data:${file.type};base64,${base64}`,
                        },
                    } as const;
                }),
            );

            messages.push({
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: rawPromptContent,
                    },
                    ...filesContent,
                ],
            } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam);
        } else {
            messages.push({
                role: 'user',
                content: rawPromptContent,
            });
        }

        let totalUsage: Usage = {
            price: uncertainNumber(0),
            input: {
                tokensCount: uncertainNumber(0),
                charactersCount: uncertainNumber(0),
                wordsCount: uncertainNumber(0),
                sentencesCount: uncertainNumber(0),
                linesCount: uncertainNumber(0),
                paragraphsCount: uncertainNumber(0),
                pagesCount: uncertainNumber(0),
            },
            output: {
                tokensCount: uncertainNumber(0),
                charactersCount: uncertainNumber(0),
                wordsCount: uncertainNumber(0),
                sentencesCount: uncertainNumber(0),
                linesCount: uncertainNumber(0),
                paragraphsCount: uncertainNumber(0),
                pagesCount: uncertainNumber(0),
            },
        };

        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];

        const start: string_date_iso8601 = $getCurrentDate();

        const tools = 'tools' in prompt && Array.isArray(prompt.tools) ? prompt.tools : currentModelRequirements.tools;

        let isLooping = true;
        while (isLooping) {
            const rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
                ...modelSettings,
                messages,
                user: this.options.userId?.toString(),
                tools: tools === undefined ? undefined : (mapToolsToOpenAi(tools) as TODO_any),
            };

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
            }

            try {
                const rawResponse: OpenAI.Chat.Completions.ChatCompletion = await this.limiter
                    .schedule(() => this.makeRequestWithNetworkRetry(() => client.chat.completions.create(rawRequest)))
                    .catch((error: Error) => {
                        assertsError(error);
                        if (this.options.isVerbose) {
                            console.info(colors.bgRed('error'), error);
                        }
                        throw error;
                    });

                if (this.options.isVerbose) {
                    console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
                }

                if (!rawResponse.choices[0]) {
                    throw new PipelineExecutionError(`No choises from ${this.title}`);
                }

                const responseMessage = rawResponse.choices[0].message;
                messages.push(responseMessage);

                const usage: Usage = this.computeUsage(content || '', responseMessage.content || '', rawResponse);
                totalUsage = addUsage(totalUsage, usage);

                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    const toolCallStartedAt = new Map<string, string_date_iso8601>();
                    if (onProgress) {
                        onProgress({
                            content: responseMessage.content || '',
                            modelName: rawResponse.model || modelName,
                            timing: { start, complete: $getCurrentDate() },
                            usage: totalUsage,
                            toolCalls: responseMessage.tool_calls.map((toolCall) => {
                                const calledAt = $getCurrentDate();
                                if (toolCall.id) {
                                    toolCallStartedAt.set(toolCall.id, calledAt);
                                }

                                return {
                                    name: (toolCall as TODO_any).function.name,
                                    arguments: (toolCall as TODO_any).function.arguments,
                                    result: '',
                                    rawToolCall: toolCall,
                                    createdAt: calledAt,
                                };
                            }),
                            rawPromptContent,
                            rawRequest,
                            rawResponse,
                        });
                    }

                    await forEachAsync(responseMessage.tool_calls, {}, async (toolCall) => {
                        const functionName = (toolCall as TODO_any).function.name;
                        const functionArgs = (toolCall as TODO_any).function.arguments;
                        const calledAt = toolCall.id
                            ? toolCallStartedAt.get(toolCall.id) || $getCurrentDate()
                            : $getCurrentDate();

                        const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions)
                            .executionTools;

                        if (!executionTools || !executionTools.script) {
                            throw new PipelineExecutionError(
                                `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiCompatibleExecutionTools options`,
                            );
                        }

                        // TODO: [DRY] Use some common tool caller
                        const scriptTools = Array.isArray(executionTools.script)
                            ? executionTools.script
                            : [executionTools.script];

                        let functionResponse: string;
                        let errors: Array<TODO_any> | undefined;

                        try {
                            const scriptTool = scriptTools[0]!; // <- TODO: [🧠] Which script tool to use?

                            functionResponse = await scriptTool.execute({
                                scriptLanguage: 'javascript', // <- TODO: [🧠] How to determine script language?
                                script: buildToolInvocationScript({
                                    functionName,
                                    functionArgsExpression: functionArgs,
                                }),
                                parameters: prompt.parameters,
                            });
                        } catch (error) {
                            assertsError(error);
                            functionResponse = `Error: ${error.message}`;
                            errors = [serializeError(error)];
                        }

                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: functionResponse,
                        });

                        toolCalls.push({
                            name: functionName,
                            arguments: functionArgs,
                            result: functionResponse,
                            rawToolCall: toolCall,
                            createdAt: calledAt,
                            errors,
                        });
                    });

                    continue;
                }

                const complete: string_date_iso8601 = $getCurrentDate();
                const resultContent: string | null = responseMessage.content;

                if (resultContent === null) {
                    throw new PipelineExecutionError(`No response message from ${this.title}`);
                }

                isLooping = false;
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
                        usage: totalUsage,
                        toolCalls,
                        rawPromptContent,
                        rawRequest,
                        rawResponse,
                    },
                });
            } catch (error) {
                isLooping = false;
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
                const retryKey: string = `${modelName}-${unsupportedParameter}`;

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
                    onProgress,
                );
            }
        }

        throw new PipelineExecutionError(`Tool calling loop did not return a result from ${this.title}`);
    }

    /**
     * Calls OpenAI API to use a complete model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        // Deep clone prompt and modelRequirements to avoid mutation across calls
        const clonedPrompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'> = JSON.parse(
            JSON.stringify(prompt),
        );
        const retriedUnsupportedParameters: Set<string> = new Set<string>();
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
        const modelSettings: Partial<OpenAI.Completions.CompletionCreateParamsNonStreaming> = {
            model: modelName,
            max_tokens: currentModelRequirements.maxTokens,
            temperature: currentModelRequirements.temperature,
        };

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            model: modelName,
            prompt: rawPromptContent,
            user: this.options.userId?.toString(),
        } as OpenAI.Completions.CompletionCreateParamsNonStreaming;
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
    public async callImageGenerationModel(prompt: Prompt): Promise<ImagePromptResult> {
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
        prompt: Prompt,
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
        const modelSettings: Partial<OpenAI.Images.ImageGenerateParams> = {
            model: modelName,
            size: currentModelRequirements.size as OpenAI.Images.ImageGenerateParams['size'],
            quality: currentModelRequirements.quality as OpenAI.Images.ImageGenerateParams['quality'],
            style: currentModelRequirements.style as OpenAI.Images.ImageGenerateParams['style'],
        };

        let rawPromptContent = templateParameters(content, { ...parameters, modelName });

        if ('attachments' in prompt && Array.isArray(prompt.attachments) && prompt.attachments.length > 0) {
            rawPromptContent +=
                '\n\n' +
                prompt.attachments.map((attachment: TODO_any) => `Image attachment: ${attachment.url}`).join('\n');
        }

        const rawRequest: OpenAI.Images.ImageGenerateParams = {
            ...modelSettings,
            prompt: rawPromptContent,
            size: (modelSettings.size as OpenAI.Images.ImageGenerateParams['size']) || '1024x1024',
            user: this.options.userId?.toString(),
            response_format: 'url', // TODO: [🧠] Maybe allow b64_json
        } as OpenAI.Images.ImageGenerateParams;
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

            if (!(rawResponse as TODO_any).data[0]) {
                throw new PipelineExecutionError(`No choises from ${this.title}`);
            }

            if ((rawResponse as TODO_any).data.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${this.title}`);
            }

            const resultContent = (rawResponse as TODO_any).data[0].url!;

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
