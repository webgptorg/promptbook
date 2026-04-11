import Bottleneck from 'bottleneck';
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import type { ClientOptions } from 'openai';
import OpenAI from 'openai';
import { spaceTrim } from 'spacetrim';
import { serializeError } from '../../_packages/utils.index';
import { parseToolExecutionEnvelope } from '../../commitments/_common/toolExecutionEnvelope';
import {
    registerToolCallProgressListener,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    type ToolCallProgressUpdate,
    unregisterToolCallProgressListener,
} from '../../commitments/_common/toolRuntimeContext';
import { API_REQUEST_TIMEOUT, CONNECTION_RETRIES_LIMIT, DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    ImagePromptResult,
} from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import { addUsage } from '../../execution/utils/addUsage';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { forEachAsync } from '../../execution/utils/forEachAsync';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { ChatModelRequirements, ModelRequirements } from '../../types/ModelRequirements';
import type { ToolCallLogEntry, ToolCallState } from '../../types/ToolCall';
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
import { buildToolInvocationScript } from './utils/buildToolInvocationScript';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';

/**
 * Type describing structured clone function.
 */
type StructuredCloneFunction = <T>(value: T) => T;
/**
 * Type describing streamed tool call.
 */
type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

/**
 * Tracks one failed request attempt while stripping unsupported model parameters.
 */
type UnsupportedParameterAttempt = {
    modelName: string;
    unsupportedParameter?: string;
    errorMessage: string;
    stripped: boolean;
};

/**
 * Captures the outcome of executing one chat-requested function tool.
 */
type ChatFunctionToolExecutionResult = {
    assistantVisibleFunctionResponse: string;
    currentToolCallSnapshot: StreamedToolCall;
    errors: Array<ReturnType<typeof serializeError>> | undefined;
    toolResult: TODO_any;
};

/**
 * Captures one completed chat API turn before the caller decides whether to continue with tools.
 */
type ChatTurnResult = {
    rawResponse: OpenAI.Chat.Completions.ChatCompletion;
    responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
    turnComplete: string_date_iso8601;
    usage: Usage;
};

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
 * Creates one structured log entry for streamed tool-call updates.
 */
function createToolCallLogEntry(options: {
    readonly kind: string;
    readonly title: string;
    readonly message: string;
    readonly level?: ToolCallLogEntry['level'];
    readonly payload?: unknown;
}): ToolCallLogEntry {
    return {
        createdAt: $getCurrentDate(),
        kind: options.kind,
        level: options.level,
        title: options.title,
        message: options.message,
        payload: options.payload,
    };
}

/**
 * Appends one incremental progress update to the currently tracked tool-call snapshot.
 */
function applyToolCallProgressUpdate(toolCall: StreamedToolCall, update: ToolCallProgressUpdate): StreamedToolCall {
    return {
        ...toolCall,
        state: update.state ?? 'PARTIAL',
        logs: update.log ? [...(toolCall.logs || []), update.log] : toolCall.logs,
    };
}

/**
 * Resolves the final lifecycle state for one tool call after execution ends.
 */
function resolveFinalToolCallState(options: {
    readonly currentState: ToolCallState | undefined;
    readonly errors: ReadonlyArray<unknown> | undefined;
}): ToolCallState {
    if (options.errors && options.errors.length > 0) {
        return 'ERROR';
    }

    if (options.currentState === 'ERROR') {
        return 'ERROR';
    }

    return 'COMPLETE';
}

/**
 * Creates an empty usage accumulator for multi-turn chat requests.
 */
function createEmptyUsage(): Usage {
    return {
        price: uncertainNumber(0),
        duration: uncertainNumber(0),
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
}

/**
 * Creates one unsupported-parameter retry record.
 */
function createUnsupportedParameterAttempt(options: {
    readonly modelName: string;
    readonly unsupportedParameter?: string;
    readonly errorMessage: string;
    readonly stripped: boolean;
}): UnsupportedParameterAttempt {
    return {
        modelName: options.modelName,
        unsupportedParameter: options.unsupportedParameter,
        errorMessage: options.errorMessage,
        stripped: options.stripped,
    };
}

/**
 * Formats the retry history exactly as it is reported in thrown errors.
 */
function formatUnsupportedParameterAttemptHistory(
    attemptStack: ReadonlyArray<UnsupportedParameterAttempt>,
): string {
    return attemptStack
        .map(
            (attempt, index) =>
                `  ${index + 1}. Model: ${attempt.modelName}` +
                (attempt.unsupportedParameter ? `, Stripped: ${attempt.unsupportedParameter}` : '') +
                `, Error: ${attempt.errorMessage}` +
                (attempt.stripped ? ' (stripped and retried)' : ''),
        )
        .join('\n');
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
        options?: CallChatModelStreamOptions,
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
            options,
        );
    }

    /**
     * Internal method that handles parameter retry for chat model calls
     */
    private async callChatModelWithRetry(
        prompt: Prompt,
        currentModelRequirements: typeof prompt.modelRequirements,
        attemptStack: Array<UnsupportedParameterAttempt> = [],
        retriedUnsupportedParameters: Set<string> = new Set(),
        onProgress?: (chunk: ChatPromptResult) => void,
        options?: CallChatModelStreamOptions,
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
        const rawPromptContent: string = templateParameters(content, { ...parameters, modelName });
        const modelSettings = this.createChatModelSettings({
            currentModelRequirements,
            format,
            modelName,
        });
        const messages = await this.createChatMessages({
            prompt,
            currentModelRequirements,
            rawPromptContent,
        });
        let totalUsage = createEmptyUsage();
        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
        const start: string_date_iso8601 = $getCurrentDate();
        const tools = 'tools' in prompt && Array.isArray(prompt.tools) ? prompt.tools : currentModelRequirements.tools;
        let isToolCallingLoopActive = true;

        while (isToolCallingLoopActive) {
            const rawRequest = this.createChatRawRequest({
                modelSettings,
                messages,
                tools,
            });

            try {
                const turnResult = await this.executeChatTurn({
                    client,
                    rawRequest,
                    promptContent: content || '',
                });
                messages.push(turnResult.responseMessage);
                totalUsage = addUsage(totalUsage, turnResult.usage);

                if (turnResult.responseMessage.tool_calls && turnResult.responseMessage.tool_calls.length > 0) {
                    await this.handleChatToolCalls({
                        prompt,
                        start,
                        turnComplete: turnResult.turnComplete,
                        rawPromptContent,
                        responseMessage: turnResult.responseMessage,
                        rawRequest,
                        rawResponse: turnResult.rawResponse,
                        modelName,
                        usage: totalUsage,
                        toolCalls,
                        messages,
                        onProgress,
                    });
                    continue;
                }

                isToolCallingLoopActive = false;
                return this.createChatPromptResult({
                    responseMessage: turnResult.responseMessage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse: turnResult.rawResponse,
                    modelName,
                    start,
                    complete: $getCurrentDate(),
                    usage: totalUsage,
                    toolCalls,
                });
            } catch (error) {
                isToolCallingLoopActive = false;
                assertsError(error);

                const modifiedModelRequirements = this.resolveUnsupportedParameterRetry({
                    error,
                    attemptStack,
                    modelName,
                    currentModelRequirements,
                    retriedUnsupportedParameters,
                });

                return this.callChatModelWithRetry(
                    prompt,
                    modifiedModelRequirements,
                    attemptStack,
                    retriedUnsupportedParameters,
                    onProgress,
                    options,
                );
            }
        }

        throw new PipelineExecutionError(`Tool calling loop did not return a result from ${this.title}`);
    }

    /**
     * Resolves OpenAI chat creation settings from model requirements and prompt format.
     */
    private createChatModelSettings(options: {
        readonly currentModelRequirements: ChatModelRequirements;
        readonly format?: Prompt['format'];
        readonly modelName: string_model_name;
    }): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
        const modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: options.modelName,
            max_tokens: options.currentModelRequirements.maxTokens,
            temperature: options.currentModelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming; // <- TODO: [💩] Guard here types better

        if (options.currentModelRequirements.responseFormat !== undefined) {
            modelSettings.response_format = options.currentModelRequirements.responseFormat;
        } else if (options.format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.

        return modelSettings;
    }

    /**
     * Creates the full OpenAI chat message list, including system, thread, and user content.
     */
    private async createChatMessages(options: {
        readonly prompt: Prompt;
        readonly currentModelRequirements: ChatModelRequirements;
        readonly rawPromptContent: string;
    }): Promise<Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>> {
        return [
            ...(options.currentModelRequirements.systemMessage === undefined
                ? []
                : ([
                      {
                          role: 'system',
                          content: options.currentModelRequirements.systemMessage,
                      },
                  ] as const)),
            ...this.createChatThreadMessages(options.prompt),
            await this.createChatPromptUserMessage({
                prompt: options.prompt,
                rawPromptContent: options.rawPromptContent,
            }),
        ];
    }

    /**
     * Converts the existing prompt thread into OpenAI chat messages.
     */
    private createChatThreadMessages(prompt: Prompt): Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> {
        if (!('thread' in prompt) || !Array.isArray((prompt as TODO_any).thread)) {
            return [];
        }

        return (prompt as chococake).thread!.map(
            (message: chococake): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
                role: message.sender === 'assistant' ? 'assistant' : 'user', // <- TODO: [👥] Standardize to `role: 'USER' | 'ASSISTANT'
                content: message.content,
            }),
        );
    }

    /**
     * Builds the final user message, including inline image attachments when present.
     */
    private async createChatPromptUserMessage(options: {
        readonly prompt: Prompt;
        readonly rawPromptContent: string;
    }): Promise<OpenAI.Chat.Completions.ChatCompletionUserMessageParam> {
        if (!('files' in options.prompt) || !Array.isArray(options.prompt.files) || options.prompt.files.length === 0) {
            return {
                role: 'user',
                content: options.rawPromptContent,
            };
        }

        const filesContent = await Promise.all(
            options.prompt.files.map(async (file: File) => {
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

        return {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: options.rawPromptContent,
                },
                ...filesContent,
            ],
        } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam;
    }

    /**
     * Creates one raw OpenAI chat request from the current conversation state.
     */
    private createChatRawRequest(options: {
        readonly modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        readonly tools: ReadonlyArray<TODO_any> | undefined;
    }): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
        return {
            ...options.modelSettings,
            messages: options.messages,
            user: this.options.userId?.toString(),
            tools: options.tools === undefined ? undefined : (mapToolsToOpenAi(options.tools) as TODO_any),
        };
    }

    /**
     * Executes one chat completion turn and returns the parsed response plus measured usage.
     */
    private async executeChatTurn(options: {
        readonly client: OpenAI;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly promptContent: string;
    }): Promise<ChatTurnResult> {
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(options.rawRequest, null, 4));
        }

        const turnStart: string_date_iso8601 = $getCurrentDate();
        const rawResponse: OpenAI.Chat.Completions.ChatCompletion = await this.limiter
            .schedule(() => this.makeRequestWithNetworkRetry(() => options.client.chat.completions.create(options.rawRequest)))
            .catch((error: Error) => {
                assertsError(error);
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });
        const turnComplete: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PipelineExecutionError(`No choises from ${this.title}`);
        }

        const responseMessage = rawResponse.choices[0].message;
        const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);
        const usage = this.computeUsage(options.promptContent, responseMessage.content || '', rawResponse, duration);

        return {
            rawResponse,
            responseMessage,
            turnComplete,
            usage,
        };
    }

    /**
     * Executes all tool calls requested in one assistant response and appends their results to the conversation.
     */
    private async handleChatToolCalls(options: {
        readonly prompt: Prompt;
        readonly start: string_date_iso8601;
        readonly turnComplete: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string_model_name;
        readonly usage: Usage;
        readonly toolCalls: Array<StreamedToolCall>;
        readonly messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        readonly onProgress?: (chunk: ChatPromptResult) => void;
    }): Promise<void> {
        const requestedToolCalls = options.responseMessage.tool_calls || [];
        const toolCallStartedAt = new Map<string, string_date_iso8601>();
        const pendingToolCalls = requestedToolCalls.map((toolCall) => {
            const calledAt = $getCurrentDate();
            if (toolCall.id) {
                toolCallStartedAt.set(toolCall.id, calledAt);
            }

            return this.createPendingChatToolCall({
                toolCall,
                functionName: String((toolCall as TODO_any).function.name),
                functionArguments: (toolCall as TODO_any).function.arguments,
                calledAt,
            });
        });

        this.emitChatProgress({
            start: options.start,
            complete: options.turnComplete,
            rawPromptContent: options.rawPromptContent,
            onProgress: options.onProgress,
            content: options.responseMessage.content || '',
            modelName: options.rawResponse.model || options.modelName,
            usage: options.usage,
            rawRequest: options.rawRequest,
            rawResponse: options.rawResponse,
            toolCalls: pendingToolCalls,
        });

        await forEachAsync(requestedToolCalls, {}, async (toolCall) => {
            const completedToolCall = await this.executeChatToolCall({
                prompt: options.prompt,
                toolCall,
                toolCallStartedAt,
                responseContent: options.responseMessage.content || '',
                start: options.start,
                rawPromptContent: options.rawPromptContent,
                rawRequest: options.rawRequest,
                rawResponse: options.rawResponse,
                modelName: options.rawResponse.model || options.modelName,
                usage: options.usage,
                messages: options.messages,
                onProgress: options.onProgress,
            });
            options.toolCalls.push(completedToolCall);
        });
    }

    /**
     * Creates the initial pending snapshot for one chat tool call.
     */
    private createPendingChatToolCall(options: {
        readonly toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall;
        readonly functionName: string;
        readonly functionArguments: TODO_any;
        readonly calledAt: string_date_iso8601;
    }): StreamedToolCall {
        return {
            name: options.functionName,
            arguments: options.functionArguments,
            result: '',
            rawToolCall: options.toolCall,
            createdAt: options.calledAt,
            state: 'PENDING',
            logs: [
                createToolCallLogEntry({
                    kind: 'request',
                    title: 'Request prepared',
                    message: `Prepared ${options.functionName} request.`,
                    payload: {
                        arguments: options.functionArguments,
                    },
                }),
            ],
        };
    }

    /**
     * Executes one tool call requested by the chat response and appends the tool message.
     */
    private async executeChatToolCall(options: {
        readonly prompt: Prompt;
        readonly toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall;
        readonly toolCallStartedAt: Map<string, string_date_iso8601>;
        readonly responseContent: string;
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string;
        readonly usage: Usage;
        readonly messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        readonly onProgress?: (chunk: ChatPromptResult) => void;
    }): Promise<StreamedToolCall> {
        const functionName = String((options.toolCall as TODO_any).function.name);
        const functionArguments = (options.toolCall as TODO_any).function.arguments;
        const calledAt = options.toolCall.id
            ? options.toolCallStartedAt.get(options.toolCall.id) || $getCurrentDate()
            : $getCurrentDate();
        const pendingToolCall = this.createPendingChatToolCall({
            toolCall: options.toolCall,
            functionName,
            functionArguments,
            calledAt,
        });
        const executionResult = await this.executeChatFunctionTool({
            prompt: options.prompt,
            start: options.start,
            rawPromptContent: options.rawPromptContent,
            onProgress: options.onProgress,
            content: options.responseContent,
            rawRequest: options.rawRequest,
            rawResponse: options.rawResponse,
            modelName: options.modelName,
            usage: options.usage,
            functionName,
            functionArguments,
            pendingToolCall,
        });

        options.messages.push({
            role: 'tool',
            tool_call_id: options.toolCall.id,
            content: executionResult.assistantVisibleFunctionResponse,
        });

        const completedToolCall = this.createCompletedChatToolCall({
            toolCall: options.toolCall,
            functionName,
            calledAt,
            currentToolCallSnapshot: executionResult.currentToolCallSnapshot,
            toolResult: executionResult.toolResult,
            errors: executionResult.errors,
        });

        this.emitChatProgress({
            start: options.start,
            rawPromptContent: options.rawPromptContent,
            onProgress: options.onProgress,
            content: options.responseContent,
            modelName: options.modelName,
            usage: options.usage,
            rawRequest: options.rawRequest,
            rawResponse: options.rawResponse,
            toolCalls: [completedToolCall],
        });

        return completedToolCall;
    }

    /**
     * Resolves the configured script tools for chat tool execution.
     */
    private resolveChatScriptTools(functionName: string) {
        const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

        if (!executionTools || !executionTools.script) {
            throw new PipelineExecutionError(
                `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiCompatibleExecutionTools options`,
            );
        }

        return Array.isArray(executionTools.script) ? executionTools.script : [executionTools.script];
    }

    /**
     * Executes the configured script tool for one chat-requested function call.
     */
    private async executeChatFunctionTool(options: {
        readonly prompt: Prompt;
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly onProgress?: (chunk: ChatPromptResult) => void;
        readonly content: string;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string;
        readonly usage: Usage;
        readonly functionName: string;
        readonly functionArguments: string;
        readonly pendingToolCall: StreamedToolCall;
    }): Promise<ChatFunctionToolExecutionResult> {
        const scriptTools = this.resolveChatScriptTools(options.functionName);
        let functionResponse: string;
        let assistantVisibleFunctionResponse: string;
        let toolResult: TODO_any;
        let errors: Array<ReturnType<typeof serializeError>> | undefined;
        let currentToolCallSnapshot = options.pendingToolCall;

        try {
            const scriptTool = scriptTools[0]!; // <- TODO: [🧠] Which script tool to use?
            const progressListenerToken = registerToolCallProgressListener((update) => {
                currentToolCallSnapshot = applyToolCallProgressUpdate(currentToolCallSnapshot, update);

                this.emitChatProgress({
                    start: options.start,
                    rawPromptContent: options.rawPromptContent,
                    onProgress: options.onProgress,
                    content: options.content,
                    modelName: options.modelName,
                    usage: options.usage,
                    rawRequest: options.rawRequest,
                    rawResponse: options.rawResponse,
                    toolCalls: [currentToolCallSnapshot],
                });
            });

            try {
                functionResponse = await scriptTool.execute({
                    scriptLanguage: 'javascript', // <- TODO: [🧠] How to determine script language?
                    script: buildToolInvocationScript({
                        functionName: options.functionName,
                        functionArgsExpression: options.functionArguments,
                    }),
                    parameters: {
                        ...options.prompt.parameters,
                        [TOOL_PROGRESS_TOKEN_PARAMETER]: progressListenerToken,
                    },
                });
            } finally {
                unregisterToolCallProgressListener(progressListenerToken);
            }

            const toolExecutionEnvelope = parseToolExecutionEnvelope(functionResponse);
            assistantVisibleFunctionResponse = toolExecutionEnvelope?.assistantMessage || functionResponse;
            toolResult =
                toolExecutionEnvelope !== null && toolExecutionEnvelope !== undefined
                    ? toolExecutionEnvelope.toolResult
                    : functionResponse;
        } catch (error) {
            assertsError(error);
            functionResponse = `Error: ${error.message}`;
            assistantVisibleFunctionResponse = functionResponse;
            toolResult = functionResponse;
            errors = [serializeError(error)];
        }

        return {
            assistantVisibleFunctionResponse,
            currentToolCallSnapshot,
            errors,
            toolResult,
        };
    }

    /**
     * Finalizes one chat tool-call snapshot after execution ends.
     */
    private createCompletedChatToolCall(options: {
        readonly toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall;
        readonly functionName: string;
        readonly calledAt: string_date_iso8601;
        readonly currentToolCallSnapshot: StreamedToolCall;
        readonly toolResult: TODO_any;
        readonly errors: Array<ReturnType<typeof serializeError>> | undefined;
    }): StreamedToolCall {
        const hasErrors = options.errors !== undefined && options.errors.length > 0;

        return {
            ...options.currentToolCallSnapshot,
            result: options.toolResult,
            rawToolCall: options.toolCall,
            createdAt: options.calledAt,
            errors: options.errors,
            state: resolveFinalToolCallState({
                currentState: options.currentToolCallSnapshot.state,
                errors: options.errors,
            }),
            logs: [
                ...(options.currentToolCallSnapshot.logs || []),
                createToolCallLogEntry({
                    kind: hasErrors ? 'error' : 'result',
                    level: hasErrors ? 'error' : 'info',
                    title: hasErrors ? 'Execution failed' : 'Execution finished',
                    message: hasErrors
                        ? `${options.functionName} failed before returning a final result.`
                        : `${options.functionName} returned a result.`,
                }),
            ],
        };
    }

    /**
     * Emits one chat progress chunk with shared timing, request metadata, and tool-call snapshots.
     */
    private emitChatProgress(options: {
        readonly start: string_date_iso8601;
        readonly complete?: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly onProgress?: (chunk: ChatPromptResult) => void;
        readonly content: string;
        readonly modelName: string;
        readonly usage: Usage;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly toolCalls?: ChatPromptResult['toolCalls'];
    }): void {
        if (!options.onProgress) {
            return;
        }

        options.onProgress({
            content: options.content,
            modelName: options.modelName,
            timing: {
                start: options.start,
                complete: options.complete || $getCurrentDate(),
            },
            usage: options.usage,
            toolCalls: options.toolCalls,
            rawPromptContent: options.rawPromptContent,
            rawRequest: options.rawRequest,
            rawResponse: options.rawResponse,
        });
    }

    /**
     * Creates the final chat prompt result after the tool loop has finished.
     */
    private createChatPromptResult(options: {
        readonly responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
        readonly rawPromptContent: string;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string_model_name;
        readonly start: string_date_iso8601;
        readonly complete: string_date_iso8601;
        readonly usage: Usage;
        readonly toolCalls: Array<StreamedToolCall>;
    }): ChatPromptResult {
        const resultContent = options.responseMessage.content;

        if (resultContent === null) {
            throw new PipelineExecutionError(`No response message from ${this.title}`);
        }

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiCompatibleExecutionTools.callChatModel\``,
            order: [],
            value: {
                content: resultContent,
                modelName: options.rawResponse.model || options.modelName,
                timing: {
                    start: options.start,
                    complete: options.complete,
                },
                usage: options.usage,
                toolCalls: options.toolCalls,
                rawPromptContent: options.rawPromptContent,
                rawRequest: options.rawRequest,
                rawResponse: options.rawResponse,
            },
        });
    }

    /**
     * Resolves the next retry attempt after an unsupported-parameter failure or rethrows the final error.
     */
    private resolveUnsupportedParameterRetry(options: {
        readonly error: Error;
        readonly attemptStack: Array<UnsupportedParameterAttempt>;
        readonly modelName: string;
        readonly currentModelRequirements: ModelRequirements;
        readonly retriedUnsupportedParameters: Set<string>;
    }): ModelRequirements {
        if (!isUnsupportedParameterError(options.error)) {
            this.throwWithAttemptHistory(options.error, options.attemptStack);
        }

        const unsupportedParameter = parseUnsupportedParameterError(options.error.message);

        if (!unsupportedParameter) {
            if (this.options.isVerbose) {
                console.warn(
                    colors.bgYellow('Warning'),
                    'Could not parse unsupported parameter from error:',
                    options.error.message,
                );
            }
            throw options.error;
        }

        const retryKey = `${options.modelName}-${unsupportedParameter}`;
        const attempt = createUnsupportedParameterAttempt({
            modelName: options.modelName,
            unsupportedParameter,
            errorMessage: options.error.message,
            stripped: true,
        });

        if (options.retriedUnsupportedParameters.has(retryKey)) {
            options.attemptStack.push(attempt);
            throw this.createAttemptHistoryError(options.attemptStack, options.error.message);
        }

        options.retriedUnsupportedParameters.add(retryKey);

        if (this.options.isVerbose) {
            console.warn(
                colors.bgYellow('Warning'),
                `Removing unsupported parameter '${unsupportedParameter}' for model '${options.modelName}' and retrying request`,
            );
        }

        options.attemptStack.push(attempt);

        return removeUnsupportedModelRequirement(options.currentModelRequirements, unsupportedParameter);
    }

    /**
     * Rethrows the original error or wraps it with the collected retry history.
     */
    private throwWithAttemptHistory(
        error: Error,
        attemptStack: ReadonlyArray<UnsupportedParameterAttempt>,
    ): never {
        if (attemptStack.length > 0) {
            throw this.createAttemptHistoryError(attemptStack, error.message);
        }

        throw error;
    }

    /**
     * Creates the retry-history error message shared by all OpenAI-compatible model variants.
     */
    private createAttemptHistoryError(
        attemptStack: ReadonlyArray<UnsupportedParameterAttempt>,
        finalErrorMessage: string,
    ): PipelineExecutionError {
        return new PipelineExecutionError(
            `All attempts failed. Attempt history:\n` +
                formatUnsupportedParameterAttemptHistory(attemptStack) +
                `\nFinal error: ${finalErrorMessage}`,
        );
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
        attemptStack: Array<UnsupportedParameterAttempt> = [],
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
            const turnStart: string_date_iso8601 = $getCurrentDate();
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.completions.create(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });
            const turnComplete: string_date_iso8601 = $getCurrentDate();

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (!rawResponse.choices[0]) {
                throw new PipelineExecutionError(`No choises from ${this.title}`);
            }

            if (rawResponse.choices.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${this.title}`);
            }

            const resultContent = rawResponse.choices[0].text;
            const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);
            const usage = this.computeUsage(content || '', resultContent || '', rawResponse, duration);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callCompletionModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete: turnComplete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            const modifiedModelRequirements = this.resolveUnsupportedParameterRetry({
                error,
                attemptStack,
                modelName,
                currentModelRequirements,
                retriedUnsupportedParameters,
            });

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
        attemptStack: Array<UnsupportedParameterAttempt> = [],
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
            const turnStart: string_date_iso8601 = $getCurrentDate();
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.embeddings.create(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });
            const turnComplete: string_date_iso8601 = $getCurrentDate();

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }
            if (rawResponse.data.length !== 1) {
                throw new PipelineExecutionError(
                    `Expected exactly 1 data item in response, got ${rawResponse.data.length}`,
                );
            }

            const resultContent = rawResponse.data[0]!.embedding;

            const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);
            const usage = this.computeUsage(content || '', '', rawResponse, duration);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callEmbeddingModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete: turnComplete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            const modifiedModelRequirements = this.resolveUnsupportedParameterRetry({
                error,
                attemptStack,
                modelName,
                currentModelRequirements,
                retriedUnsupportedParameters,
            });

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
        attemptStack: Array<UnsupportedParameterAttempt> = [],
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
            const turnStart: string_date_iso8601 = $getCurrentDate();
            const rawResponse = await this.limiter
                .schedule(() => this.makeRequestWithNetworkRetry(() => client.images.generate(rawRequest)))
                .catch((error) => {
                    assertsError(error);
                    if (this.options.isVerbose) {
                        console.info(colors.bgRed('error'), error);
                    }
                    throw error;
                });
            const turnComplete: string_date_iso8601 = $getCurrentDate();

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (!(rawResponse as TODO_any).data[0]) {
                throw new PipelineExecutionError(`No choises from ${this.title}`);
            }

            if ((rawResponse as TODO_any).data.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${this.title}`);
            }

            const resultContent = (rawResponse as TODO_any).data[0].url!;

            const modelInfo = this.HARDCODED_MODELS.find((model) => model.modelName === modelName);
            const price = modelInfo?.pricing?.output ? uncertainNumber(modelInfo.pricing.output) : uncertainNumber();

            const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callImageGenerationModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: modelName,
                    timing: {
                        start,
                        complete: turnComplete,
                    },
                    usage: {
                        price,
                        duration,
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

            const modifiedModelRequirements = this.resolveUnsupportedParameterRetry({
                error,
                attemptStack,
                modelName,
                currentModelRequirements,
                retriedUnsupportedParameters,
            });

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

// TODO: [🛄] Some way how to re-wrap the errors from `OpenAiCompatibleExecutionTools`
// TODO: [🛄] Maybe make custom `OpenAiCompatibleError`
// TODO: [🧠][🈁] Maybe use `isDeterministic` from options
// TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
// TODO: [🧠][🦢] Make reverse adapter from LlmExecutionTools to OpenAI-compatible:
