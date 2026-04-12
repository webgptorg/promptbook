import colors from 'colors';
import OpenAI from 'openai';
import { serializeError } from '../../../_packages/utils.index';
import { parseToolExecutionEnvelope } from '../../../commitments/_common/toolExecutionEnvelope';
import {
    registerToolCallProgressListener,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    type ToolCallProgressUpdate,
    unregisterToolCallProgressListener,
} from '../../../commitments/_common/toolRuntimeContext';
import { assertsError } from '../../../errors/assertsError';
import { PipelineExecutionError } from '../../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../../execution/AvailableModel';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import type { Usage } from '../../../execution/Usage';
import { addUsage } from '../../../execution/utils/addUsage';
import { forEachAsync } from '../../../execution/utils/forEachAsync';
import { uncertainNumber } from '../../../execution/utils/uncertainNumber';
import type { ChatModelRequirements } from '../../../types/ModelRequirements';
import type { ChatPrompt, Prompt } from '../../../types/Prompt';
import type { ToolCallLogEntry, ToolCallState } from '../../../types/ToolCall';
import type {
    string_date_iso8601,
    string_markdown_text,
    string_model_name,
    string_title,
} from '../../../types/typeAliases';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { chococake } from '../../../utils/organization/really_any';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { templateParameters } from '../../../utils/parameters/templateParameters';
import { exportJson } from '../../../utils/serialization/exportJson';
import type { computeOpenAiUsage } from '../computeOpenAiUsage';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from '../OpenAiCompatibleExecutionToolsOptions';
import { buildToolInvocationScript } from './buildToolInvocationScript';
import { mapToolsToOpenAi } from './mapToolsToOpenAi';
import { OpenAiCompatibleUnsupportedParameterRetrier } from './OpenAiCompatibleUnsupportedParameterRetrier';

/**
 * Type describing structured clone function.
 */
type StructuredCloneFunction = <T>(value: T) => T;

/**
 * Type describing streamed tool call.
 */
type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

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
 * Type describing dependencies needed by `callOpenAiCompatibleChatModel`.
 */
type CallOpenAiCompatibleChatModelOptions = {
    readonly prompt: Prompt;
    readonly onProgress: (chunk: ChatPromptResult) => void;
    readonly title: string_title & string_markdown_text;
    readonly executionToolsOptions: OpenAiCompatibleExecutionToolsNonProxiedOptions;
    readonly getClient: () => Promise<OpenAI>;
    readonly executeRateLimitedRequest: <T>(requestFn: () => Promise<T>) => Promise<T>;
    readonly computeUsage: (...args: Parameters<typeof computeOpenAiUsage>) => Usage;
    readonly getDefaultChatModel: () => AvailableModel;
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
 * Calls the OpenAI-compatible chat model flow, including tool execution and unsupported-parameter retries.
 *
 * @private function of `OpenAiCompatibleExecutionTools`
 */
export async function callOpenAiCompatibleChatModel(
    options: CallOpenAiCompatibleChatModelOptions,
): Promise<ChatPromptResult> {
    const clonedPrompt = clonePromptPreservingFiles(options.prompt);
    const unsupportedParameterRetrier = new OpenAiCompatibleUnsupportedParameterRetrier(
        options.executionToolsOptions.isVerbose,
    );

    return callChatModelWithRetry(options, clonedPrompt, clonedPrompt.modelRequirements, unsupportedParameterRetrier);
}

/**
 * Retries the chat flow when OpenAI-compatible providers reject unsupported parameters.
 */
async function callChatModelWithRetry(
    options: CallOpenAiCompatibleChatModelOptions,
    prompt: Prompt,
    currentModelRequirements: typeof prompt.modelRequirements,
    unsupportedParameterRetrier: OpenAiCompatibleUnsupportedParameterRetrier,
): Promise<ChatPromptResult> {
    if (options.executionToolsOptions.isVerbose) {
        console.info(`💬 ${options.title} callChatModel call`, { prompt, currentModelRequirements });
    }

    const { content, parameters, format } = prompt;

    if (currentModelRequirements.modelVariant !== 'CHAT') {
        throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
    }

    const modelName: string_model_name = currentModelRequirements.modelName || options.getDefaultChatModel().modelName;
    const rawPromptContent = templateParameters(content, { ...parameters, modelName });
    const modelSettings = createChatModelSettings({
        currentModelRequirements,
        format,
        modelName,
    });
    const messages = await createChatMessages({
        prompt,
        currentModelRequirements,
        rawPromptContent,
    });
    const client = await options.getClient();
    let totalUsage = createEmptyUsage();
    const toolCalls: Array<StreamedToolCall> = [];
    const start: string_date_iso8601 = $getCurrentDate();
    const tools = 'tools' in prompt && Array.isArray(prompt.tools) ? prompt.tools : currentModelRequirements.tools;
    let isToolCallingLoopActive = true;

    while (isToolCallingLoopActive) {
        const rawRequest = createChatRawRequest(options, {
            modelSettings,
            messages,
            tools,
        });

        try {
            const turnResult = await executeChatTurn(options, {
                client,
                rawRequest,
                promptContent: content || '',
            });
            messages.push(turnResult.responseMessage);
            totalUsage = addUsage(totalUsage, turnResult.usage);

            if (turnResult.responseMessage.tool_calls && turnResult.responseMessage.tool_calls.length > 0) {
                await handleChatToolCalls(options, {
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
                    onProgress: options.onProgress,
                });
                continue;
            }

            isToolCallingLoopActive = false;
            return createChatPromptResult(options, {
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

            return callChatModelWithRetry(
                options,
                prompt,
                unsupportedParameterRetrier.resolveRetryOrThrow({
                    error,
                    modelName,
                    currentModelRequirements,
                }),
                unsupportedParameterRetrier,
            );
        }
    }

    throw new PipelineExecutionError(`Tool calling loop did not return a result from ${options.title}`);
}

/**
 * Resolves OpenAI chat creation settings from model requirements and prompt format.
 */
function createChatModelSettings(options: {
    readonly currentModelRequirements: ChatModelRequirements;
    readonly format?: Prompt['format'];
    readonly modelName: string_model_name;
}): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
    const modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: options.modelName,
        max_tokens: options.currentModelRequirements.maxTokens,
        temperature: options.currentModelRequirements.temperature,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

    if (options.currentModelRequirements.responseFormat !== undefined) {
        modelSettings.response_format = options.currentModelRequirements.responseFormat;
    } else if (options.format === 'JSON') {
        modelSettings.response_format = {
            type: 'json_object',
        };
    }

    return modelSettings;
}

/**
 * Creates the full OpenAI chat message list, including system, thread, and user content.
 */
async function createChatMessages(options: {
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
        ...createChatThreadMessages(options.prompt),
        await createChatPromptUserMessage({
            prompt: options.prompt,
            rawPromptContent: options.rawPromptContent,
        }),
    ];
}

/**
 * Converts the existing prompt thread into OpenAI chat messages.
 */
function createChatThreadMessages(prompt: Prompt): Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> {
    if (!('thread' in prompt) || !Array.isArray((prompt as TODO_any).thread)) {
        return [];
    }

    return (prompt as chococake).thread!.map(
        (message: chococake): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
            role: message.sender === 'assistant' ? 'assistant' : 'user',
            content: message.content,
        }),
    );
}

/**
 * Builds the final user message, including inline image attachments when present.
 */
async function createChatPromptUserMessage(options: {
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
                type: 'image_url',
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
function createChatRawRequest(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    options: {
        readonly modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        readonly tools: ReadonlyArray<TODO_any> | undefined;
    },
): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
    return {
        ...options.modelSettings,
        messages: options.messages,
        user: openAiOptions.executionToolsOptions.userId?.toString(),
        tools: options.tools === undefined ? undefined : (mapToolsToOpenAi(options.tools) as TODO_any),
    };
}

/**
 * Executes one chat completion turn and returns the parsed response plus measured usage.
 */
async function executeChatTurn(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    options: {
        readonly client: OpenAI;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly promptContent: string;
    },
): Promise<ChatTurnResult> {
    if (openAiOptions.executionToolsOptions.isVerbose) {
        console.info(colors.bgWhite('rawRequest'), JSON.stringify(options.rawRequest, null, 4));
    }

    const turnStart: string_date_iso8601 = $getCurrentDate();
    const rawResponse = await openAiOptions.executeRateLimitedRequest(() =>
        options.client.chat.completions.create(options.rawRequest),
    );
    const turnComplete: string_date_iso8601 = $getCurrentDate();

    if (openAiOptions.executionToolsOptions.isVerbose) {
        console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
    }

    if (!rawResponse.choices[0]) {
        throw new PipelineExecutionError(`No choises from ${openAiOptions.title}`);
    }

    const responseMessage = rawResponse.choices[0].message;
    const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);
    const usage = openAiOptions.computeUsage(options.promptContent, responseMessage.content || '', rawResponse, duration);

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
async function handleChatToolCalls(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    options: {
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
        readonly onProgress: (chunk: ChatPromptResult) => void;
    },
): Promise<void> {
    const requestedToolCalls = options.responseMessage.tool_calls || [];
    const toolCallStartedAt = new Map<string, string_date_iso8601>();
    const pendingToolCalls = requestedToolCalls.map((toolCall) => {
        const calledAt = $getCurrentDate();
        if (toolCall.id) {
            toolCallStartedAt.set(toolCall.id, calledAt);
        }

        return createPendingChatToolCall({
            toolCall,
            functionName: String((toolCall as TODO_any).function.name),
            functionArguments: (toolCall as TODO_any).function.arguments,
            calledAt,
        });
    });

    emitChatProgress({
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
        const completedToolCall = await executeChatToolCall(openAiOptions, {
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
function createPendingChatToolCall(options: {
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
async function executeChatToolCall(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    options: {
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
        readonly onProgress: (chunk: ChatPromptResult) => void;
    },
): Promise<StreamedToolCall> {
    const functionName = String((options.toolCall as TODO_any).function.name);
    const functionArguments = (options.toolCall as TODO_any).function.arguments;
    const calledAt = options.toolCall.id
        ? options.toolCallStartedAt.get(options.toolCall.id) || $getCurrentDate()
        : $getCurrentDate();
    const pendingToolCall = createPendingChatToolCall({
        toolCall: options.toolCall,
        functionName,
        functionArguments,
        calledAt,
    });
    const executionResult = await executeChatFunctionTool(openAiOptions, {
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

    const completedToolCall = createCompletedChatToolCall({
        toolCall: options.toolCall,
        functionName,
        calledAt,
        currentToolCallSnapshot: executionResult.currentToolCallSnapshot,
        toolResult: executionResult.toolResult,
        errors: executionResult.errors,
    });

    emitChatProgress({
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
function resolveChatScriptTools(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    functionName: string,
) {
    const executionTools = openAiOptions.executionToolsOptions.executionTools;

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
async function executeChatFunctionTool(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    options: {
        readonly prompt: Prompt;
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly content: string;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string;
        readonly usage: Usage;
        readonly functionName: string;
        readonly functionArguments: string;
        readonly pendingToolCall: StreamedToolCall;
    },
): Promise<ChatFunctionToolExecutionResult> {
    const scriptTools = resolveChatScriptTools(openAiOptions, options.functionName);
    let functionResponse: string;
    let assistantVisibleFunctionResponse: string;
    let toolResult: TODO_any;
    let errors: Array<ReturnType<typeof serializeError>> | undefined;
    let currentToolCallSnapshot = options.pendingToolCall;

    try {
        const scriptTool = scriptTools[0]!;
        const progressListenerToken = registerToolCallProgressListener((update) => {
            currentToolCallSnapshot = applyToolCallProgressUpdate(currentToolCallSnapshot, update);

            emitChatProgress({
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
                scriptLanguage: 'javascript',
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
function createCompletedChatToolCall(options: {
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
function emitChatProgress(options: {
    readonly start: string_date_iso8601;
    readonly complete?: string_date_iso8601;
    readonly rawPromptContent: string;
    readonly onProgress: (chunk: ChatPromptResult) => void;
    readonly content: string;
    readonly modelName: string;
    readonly usage: Usage;
    readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
    readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
    readonly toolCalls?: ChatPromptResult['toolCalls'];
}): void {
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
function createChatPromptResult(
    openAiOptions: CallOpenAiCompatibleChatModelOptions,
    options: {
        readonly responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
        readonly rawPromptContent: string;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string_model_name;
        readonly start: string_date_iso8601;
        readonly complete: string_date_iso8601;
        readonly usage: Usage;
        readonly toolCalls: Array<StreamedToolCall>;
    },
): ChatPromptResult {
    const resultContent = options.responseMessage.content;

    if (resultContent === null) {
        throw new PipelineExecutionError(`No response message from ${openAiOptions.title}`);
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
