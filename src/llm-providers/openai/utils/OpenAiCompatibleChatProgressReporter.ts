import type OpenAI from 'openai';
import type { ToolCallProgressUpdate } from '../../../commitments/_common/toolRuntimeContext';
import { PipelineExecutionError } from '../../../errors/PipelineExecutionError';
import type { serializeError } from '../../../errors/utils/serializeError';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import type { Usage } from '../../../execution/Usage';
import { uncertainNumber } from '../../../execution/utils/uncertainNumber';
import type { string_model_name } from '../../../types/string_model_name';
import type { string_date_iso8601 } from '../../../types/string_token';
import type { ToolCallLogEntry, ToolCallState } from '../../../types/ToolCall';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { exportJson } from '../../../utils/serialization/exportJson';

/**
 * Type describing streamed tool call.
 */
type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

/**
 * Builds incremental chat progress updates, tool-call snapshots, and the final prompt result.
 *
 * @private helper of `callOpenAiCompatibleChatModel`
 */
export class OpenAiCompatibleChatProgressReporter {
    /**
     * Creates an empty usage accumulator for multi-turn chat requests.
     */
    public createEmptyUsage(): Usage {
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
     * Creates the initial pending snapshot for one chat tool call.
     */
    public createPendingToolCall(options: {
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
                this.createToolCallLogEntry({
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
     * Appends one incremental progress update to the currently tracked tool-call snapshot.
     */
    public applyToolCallProgressUpdate(toolCall: StreamedToolCall, update: ToolCallProgressUpdate): StreamedToolCall {
        return {
            ...toolCall,
            state: update.state ?? 'PARTIAL',
            logs: update.log ? [...(toolCall.logs || []), update.log] : toolCall.logs,
        };
    }

    /**
     * Finalizes one chat tool-call snapshot after execution ends.
     */
    public createCompletedToolCall(options: {
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
            state: this.resolveFinalToolCallState({
                currentState: options.currentToolCallSnapshot.state,
                errors: options.errors,
            }),
            logs: [
                ...(options.currentToolCallSnapshot.logs || []),
                this.createToolCallLogEntry({
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
    public emitProgress(options: {
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
    public createChatPromptResult(options: {
        readonly title: string;
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
            throw new PipelineExecutionError(`No response message from ${options.title}`);
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
     * Creates one structured log entry for streamed tool-call updates.
     */
    private createToolCallLogEntry(options: {
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
     * Resolves the final lifecycle state for one tool call after execution ends.
     */
    private resolveFinalToolCallState(options: {
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
}
