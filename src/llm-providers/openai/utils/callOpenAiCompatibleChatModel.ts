import colors from 'colors';
import OpenAI from 'openai';
import { assertsError } from '../../../errors/assertsError';
import { PipelineExecutionError } from '../../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../../execution/AvailableModel';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import type { Usage } from '../../../execution/Usage';
import { addUsage } from '../../../execution/utils/addUsage';
import { uncertainNumber } from '../../../execution/utils/uncertainNumber';
import type { ModelRequirements } from '../../../types/ModelRequirements';
import type { Prompt } from '../../../types/Prompt';
import type { string_markdown_text } from '../../../types/string_markdown';
import type { string_model_name } from '../../../types/string_model_name';
import type { string_title } from '../../../types/string_title';
import type { string_date_iso8601 } from '../../../types/string_token';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import { templateParameters } from '../../../utils/parameters/templateParameters';
import type { computeOpenAiUsage } from '../computeOpenAiUsage';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from '../OpenAiCompatibleExecutionToolsOptions';
import { OpenAiCompatibleChatProgressReporter } from './OpenAiCompatibleChatProgressReporter';
import { OpenAiCompatibleChatPromptBuilder } from './OpenAiCompatibleChatPromptBuilder';
import { OpenAiCompatibleChatToolCaller } from './OpenAiCompatibleChatToolCaller';
import { OpenAiCompatibleUnsupportedParameterRetrier } from './OpenAiCompatibleUnsupportedParameterRetrier';

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
 * Type describing streamed tool call.
 */
type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

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
 * Calls the OpenAI-compatible chat model flow, including tool execution and unsupported-parameter retries.
 *
 * @private function of `OpenAiCompatibleExecutionTools`
 */
export async function callOpenAiCompatibleChatModel(
    options: CallOpenAiCompatibleChatModelOptions,
): Promise<ChatPromptResult> {
    const chatPromptBuilder = new OpenAiCompatibleChatPromptBuilder();
    const chatProgressReporter = new OpenAiCompatibleChatProgressReporter();
    const chatToolCaller = new OpenAiCompatibleChatToolCaller({
        executionToolsOptions: options.executionToolsOptions,
        progressReporter: chatProgressReporter,
    });
    const clonedPrompt = chatPromptBuilder.clonePromptPreservingFiles(options.prompt);
    const unsupportedParameterRetrier = new OpenAiCompatibleUnsupportedParameterRetrier(
        options.executionToolsOptions.isVerbose,
    );

    return callChatModelWithRetry({
        options,
        prompt: clonedPrompt,
        currentModelRequirements: clonedPrompt.modelRequirements,
        unsupportedParameterRetrier,
        chatPromptBuilder,
        chatProgressReporter,
        chatToolCaller,
    });
}

/**
 * Retries the chat flow when OpenAI-compatible providers reject unsupported parameters.
 */
async function callChatModelWithRetry(options: {
    readonly options: CallOpenAiCompatibleChatModelOptions;
    readonly prompt: Prompt;
    readonly currentModelRequirements: ModelRequirements;
    readonly unsupportedParameterRetrier: OpenAiCompatibleUnsupportedParameterRetrier;
    readonly chatPromptBuilder: OpenAiCompatibleChatPromptBuilder;
    readonly chatProgressReporter: OpenAiCompatibleChatProgressReporter;
    readonly chatToolCaller: OpenAiCompatibleChatToolCaller;
}): Promise<ChatPromptResult> {
    if (options.options.executionToolsOptions.isVerbose) {
        console.info(`💬 ${options.options.title} callChatModel call`, {
            prompt: options.prompt,
            currentModelRequirements: options.currentModelRequirements,
        });
    }

    const { content, parameters, format } = options.prompt;

    if (options.currentModelRequirements.modelVariant !== 'CHAT') {
        throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
    }

    const modelName: string_model_name =
        options.currentModelRequirements.modelName || options.options.getDefaultChatModel().modelName;
    const rawPromptContent = templateParameters(content, { ...parameters, modelName });
    const modelSettings = options.chatPromptBuilder.createModelSettings({
        currentModelRequirements: options.currentModelRequirements,
        format,
        modelName,
    });
    const messages = await options.chatPromptBuilder.createMessages({
        prompt: options.prompt,
        currentModelRequirements: options.currentModelRequirements,
        rawPromptContent,
    });
    const client = await options.options.getClient();
    let totalUsage = options.chatProgressReporter.createEmptyUsage();
    const toolCalls: Array<StreamedToolCall> = [];
    const start: string_date_iso8601 = $getCurrentDate();
    const tools =
        'tools' in options.prompt && Array.isArray(options.prompt.tools)
            ? options.prompt.tools
            : options.currentModelRequirements.tools;
    let isToolCallingLoopActive = true;

    while (isToolCallingLoopActive) {
        const rawRequest = options.chatPromptBuilder.createRawRequest({
            modelSettings,
            messages,
            tools,
            userId: options.options.executionToolsOptions.userId,
        });

        try {
            const turnResult = await executeChatTurn(options.options, {
                client,
                rawRequest,
                promptContent: content || '',
            });
            messages.push(turnResult.responseMessage);
            totalUsage = addUsage(totalUsage, turnResult.usage);

            if (turnResult.responseMessage.tool_calls && turnResult.responseMessage.tool_calls.length > 0) {
                await options.chatToolCaller.handleToolCalls({
                    prompt: options.prompt,
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
                    onProgress: options.options.onProgress,
                });
                continue;
            }

            isToolCallingLoopActive = false;
            return options.chatProgressReporter.createChatPromptResult({
                title: options.options.title,
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

            return callChatModelWithRetry({
                ...options,
                currentModelRequirements: options.unsupportedParameterRetrier.resolveRetryOrThrow({
                    error,
                    modelName,
                    currentModelRequirements: options.currentModelRequirements,
                }),
            });
        }
    }

    throw new PipelineExecutionError(`Tool calling loop did not return a result from ${options.options.title}`);
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
