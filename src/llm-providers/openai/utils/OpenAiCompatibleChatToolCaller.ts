import type OpenAI from 'openai';
import { parseToolExecutionEnvelope } from '../../../commitments/_common/toolExecutionEnvelope';
import { registerToolCallProgressListener, TOOL_PROGRESS_TOKEN_PARAMETER, unregisterToolCallProgressListener } from '../../../commitments/_common/toolRuntimeContext';
import { assertsError } from '../../../errors/assertsError';
import { PipelineExecutionError } from '../../../errors/PipelineExecutionError';
import { serializeError } from '../../../errors/utils/serializeError';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import type { Usage } from '../../../execution/Usage';
import { forEachAsync } from '../../../execution/utils/forEachAsync';
import type { Prompt } from '../../../types/Prompt';
import type { string_date_iso8601 } from '../../../types/string_token';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from '../OpenAiCompatibleExecutionToolsOptions';
import { buildToolInvocationScript } from './buildToolInvocationScript';
import { OpenAiCompatibleChatProgressReporter } from './OpenAiCompatibleChatProgressReporter';

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
 * Dependencies required to execute tool calls requested by an OpenAI-compatible chat response.
 */
type OpenAiCompatibleChatToolCallerOptions = {
    readonly executionToolsOptions: OpenAiCompatibleExecutionToolsNonProxiedOptions;
    readonly progressReporter: OpenAiCompatibleChatProgressReporter;
};

/**
 * Executes chat-requested tools and keeps their progress snapshots in sync with streamed progress updates.
 *
 * @private helper of `callOpenAiCompatibleChatModel`
 */
export class OpenAiCompatibleChatToolCaller {
    public constructor(private readonly options: OpenAiCompatibleChatToolCallerOptions) {}

    /**
     * Executes all tool calls requested in one assistant response and appends their results to the conversation.
     */
    public async handleToolCalls(options: {
        readonly prompt: Prompt;
        readonly start: string_date_iso8601;
        readonly turnComplete: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
        readonly rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly rawResponse: OpenAI.Chat.Completions.ChatCompletion;
        readonly modelName: string;
        readonly usage: Usage;
        readonly toolCalls: Array<StreamedToolCall>;
        readonly messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        readonly onProgress: (chunk: ChatPromptResult) => void;
    }): Promise<void> {
        const requestedToolCalls = options.responseMessage.tool_calls || [];
        const toolCallStartedAt = new Map<string, string_date_iso8601>();
        const pendingToolCalls = requestedToolCalls.map((toolCall) => {
            const calledAt = $getCurrentDate();
            if (toolCall.id) {
                toolCallStartedAt.set(toolCall.id, calledAt);
            }

            return this.options.progressReporter.createPendingToolCall({
                toolCall,
                functionName: String((toolCall as TODO_any).function.name),
                functionArguments: (toolCall as TODO_any).function.arguments,
                calledAt,
            });
        });

        this.options.progressReporter.emitProgress({
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
            const completedToolCall = await this.executeToolCall({
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
     * Executes one tool call requested by the chat response and appends the tool message.
     */
    private async executeToolCall(options: {
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
    }): Promise<StreamedToolCall> {
        const functionName = String((options.toolCall as TODO_any).function.name);
        const functionArguments = (options.toolCall as TODO_any).function.arguments;
        const calledAt = options.toolCall.id
            ? options.toolCallStartedAt.get(options.toolCall.id) || $getCurrentDate()
            : $getCurrentDate();
        const pendingToolCall = this.options.progressReporter.createPendingToolCall({
            toolCall: options.toolCall,
            functionName,
            functionArguments,
            calledAt,
        });
        const executionResult = await this.executeFunctionTool({
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

        const completedToolCall = this.options.progressReporter.createCompletedToolCall({
            toolCall: options.toolCall,
            functionName,
            calledAt,
            currentToolCallSnapshot: executionResult.currentToolCallSnapshot,
            toolResult: executionResult.toolResult,
            errors: executionResult.errors,
        });

        this.options.progressReporter.emitProgress({
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
    private resolveScriptTools(functionName: string) {
        const executionTools = this.options.executionToolsOptions.executionTools;

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
    private async executeFunctionTool(options: {
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
    }): Promise<ChatFunctionToolExecutionResult> {
        const scriptTools = this.resolveScriptTools(options.functionName);
        let functionResponse: string;
        let assistantVisibleFunctionResponse: string;
        let toolResult: TODO_any;
        let errors: Array<ReturnType<typeof serializeError>> | undefined;
        let currentToolCallSnapshot = options.pendingToolCall;

        try {
            const scriptTool = scriptTools[0]!;
            const progressListenerToken = registerToolCallProgressListener((update) => {
                currentToolCallSnapshot = this.options.progressReporter.applyToolCallProgressUpdate(
                    currentToolCallSnapshot,
                    update,
                );

                this.options.progressReporter.emitProgress({
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
}
