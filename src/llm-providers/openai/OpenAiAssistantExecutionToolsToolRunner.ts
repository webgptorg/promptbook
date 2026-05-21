import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import { spaceTrim } from 'spacetrim';
import { parseToolExecutionEnvelope } from '../../commitments/_common/toolExecutionEnvelope';
import type { ToolCallProgressUpdate } from '../../commitments/_common/toolRuntimeContext';
import {
    registerToolCallProgressListener,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    unregisterToolCallProgressListener,
} from '../../commitments/_common/toolRuntimeContext';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { serializeError } from '../../errors/utils/serializeError';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601, string_token } from '../../types/string_token';
import type { ToolCallLogEntry, ToolCallState } from '../../types/ToolCall';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { buildToolInvocationScript } from './utils/buildToolInvocationScript';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';
import { OpenAiAssistantExecutionToolsProgressReporter } from './OpenAiAssistantExecutionToolsProgressReporter';

/**
 * Type describing streamed tool call.
 */
type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

/**
 * Shared context for one assistant chat call after prompt preparation finishes.
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
 */
type AssistantChatCallContext = {
    readonly client: OpenAI;
    readonly prompt: Prompt;
    readonly rawPromptContent: string;
    readonly threadMessages: ReadonlyArray<OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message>;
    readonly start: string_date_iso8601;
    readonly onProgress: (chunk: ChatPromptResult) => void;
};

/**
 * Shared context for one assistant tools run after the OpenAI request payload is built.
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
 */
type AssistantToolRunContext = AssistantChatCallContext & {
    readonly rawRequest: OpenAI.Beta.ThreadCreateAndRunParams;
};

/**
 * Result of executing one assistant-requested function tool.
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
 */
type AssistantFunctionToolExecutionResult = {
    readonly assistantVisibleFunctionResponse: string;
    readonly currentToolCallSnapshot: StreamedToolCall;
    readonly errors: Array<ReturnType<typeof serializeError>> | undefined;
    readonly toolResult: TODO_any;
};

/**
 * Creates one structured log entry for streamed tool-call updates.
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
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
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
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
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
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
 * Returns true when the assistant run still needs polling.
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
 */
function isAssistantRunActive(status: OpenAI.Beta.Threads.RunStatus): boolean {
    return status === 'queued' || status === 'in_progress' || status === 'requires_action';
}

/**
 * Returns true when the assistant run is waiting for tool outputs.
 *
 * @private helper of `OpenAiAssistantExecutionToolsToolRunner`
 */
function isAssistantRunRequiringToolOutputs(run: OpenAI.Beta.Threads.Run): boolean {
    return run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs';
}

/**
 * Runs assistant requests that require OpenAI Runs API tool execution.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
export class OpenAiAssistantExecutionToolsToolRunner {
    /**
     * Creates one tool runner instance.
     */
    public constructor(
        private readonly options: {
            readonly assistantId: string_token;
            readonly isVerbose: boolean;
            readonly scriptExecutionTools?: ScriptExecutionTools | ReadonlyArray<ScriptExecutionTools>;
            readonly progressReporter: OpenAiAssistantExecutionToolsProgressReporter;
        },
    ) {}

    /**
     * Runs assistant calls with tools through the non-streaming Runs API.
     */
    public async callChatModelStreamWithTools(context: AssistantChatCallContext): Promise<ChatPromptResult> {
        this.options.progressReporter.emitAssistantProgress({
            start: context.start,
            rawPromptContent: context.rawPromptContent,
            onProgress: context.onProgress,
        });

        const rawRequest = this.createAssistantToolRunRequest(context);
        this.options.progressReporter.logVerboseAssistantRequest('rawRequest (non-streaming with tools)', rawRequest);

        const { run, messages, completedToolCalls } = await this.executeAssistantToolRun({
            ...context,
            rawRequest,
        });
        const complete = $getCurrentDate();
        const finalChunk = this.options.progressReporter.createAssistantPromptResult({
            content: this.extractCompletedAssistantTextContent(messages.data),
            start: context.start,
            complete,
            rawPromptContent: context.rawPromptContent,
            rawRequest,
            rawResponse: { run, messages: messages.data } as TODO_any,
            toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
        });

        context.onProgress(finalChunk);

        return this.options.progressReporter.exportAssistantPromptResult({
            result: finalChunk,
            isWithTools: true,
        });
    }

    /**
     * Builds the non-streaming assistant request payload used when tool calls are enabled.
     */
    private createAssistantToolRunRequest(context: AssistantChatCallContext): OpenAI.Beta.ThreadCreateAndRunParams {
        return {
            assistant_id: this.options.assistantId,
            thread: {
                messages: [...context.threadMessages],
            },
            tools: mapToolsToOpenAi(context.prompt.modelRequirements.tools!),
        };
    }

    /**
     * Starts the assistant run and keeps polling until the run completes or fails.
     */
    private async executeAssistantToolRun(options: AssistantToolRunContext): Promise<{
        readonly run: OpenAI.Beta.Threads.Run;
        readonly messages: OpenAI.Beta.Threads.MessagesPage;
        readonly completedToolCalls: Array<StreamedToolCall>;
    }> {
        const completedToolCalls: Array<StreamedToolCall> = [];
        const toolCallStartedAt = new Map<string, string_date_iso8601>();
        let run = (await options.client.beta.threads.createAndRun(options.rawRequest)) as OpenAI.Beta.Threads.Run;

        run = await this.waitForAssistantToolRun({
            ...options,
            run,
            completedToolCalls,
            toolCallStartedAt,
        });

        if (run.status !== 'completed') {
            throw new PipelineExecutionError(`Assistant run failed with status: ${run.status}`);
        }

        return {
            run,
            messages: await options.client.beta.threads.messages.list(run.thread_id),
            completedToolCalls,
        };
    }

    /**
     * Polls one assistant run, executing and submitting tool outputs when OpenAI requests them.
     */
    private async waitForAssistantToolRun(
        options: AssistantToolRunContext & {
            readonly run: OpenAI.Beta.Threads.Run;
            readonly completedToolCalls: Array<StreamedToolCall>;
            readonly toolCallStartedAt: Map<string, string_date_iso8601>;
        },
    ): Promise<OpenAI.Beta.Threads.Run> {
        let run = options.run;

        while (isAssistantRunActive(run.status)) {
            if (isAssistantRunRequiringToolOutputs(run)) {
                run = await this.submitAssistantRequiredToolOutputs({
                    ...options,
                    run,
                });
                continue;
            }

            run = await this.retrieveAssistantRunAfterDelay({
                client: options.client,
                run,
            });
        }

        return run;
    }

    /**
     * Executes all required assistant tool calls and submits their outputs back to OpenAI.
     */
    private async submitAssistantRequiredToolOutputs(
        options: AssistantToolRunContext & {
            readonly run: OpenAI.Beta.Threads.Run;
            readonly completedToolCalls: Array<StreamedToolCall>;
            readonly toolCallStartedAt: Map<string, string_date_iso8601>;
        },
    ): Promise<OpenAI.Beta.Threads.Run> {
        const toolOutputs = await this.executeAssistantRequiredToolCalls({
            ...options,
            toolCalls: options.run.required_action!.submit_tool_outputs.tool_calls,
        });

        return (await (options.client.beta.threads.runs as TODO_any).submitToolOutputs(
            options.run.thread_id,
            options.run.id,
            {
                tool_outputs: toolOutputs,
            },
        )) as OpenAI.Beta.Threads.Run;
    }

    /**
     * Waits a bit and then fetches the latest assistant run status.
     */
    private async retrieveAssistantRunAfterDelay(options: {
        readonly client: OpenAI;
        readonly run: OpenAI.Beta.Threads.Run;
    }): Promise<OpenAI.Beta.Threads.Run> {
        await new Promise((resolve) => setTimeout(resolve, 500));

        return (await (options.client.beta.threads.runs as TODO_any).retrieve(
            options.run.thread_id,
            options.run.id,
        )) as OpenAI.Beta.Threads.Run;
    }

    /**
     * Executes each function tool requested by the assistant and records progress snapshots.
     */
    private async executeAssistantRequiredToolCalls(
        options: AssistantToolRunContext & {
            readonly toolCalls: ReadonlyArray<OpenAI.Beta.Threads.RequiredActionFunctionToolCall>;
            readonly completedToolCalls: Array<StreamedToolCall>;
            readonly toolCallStartedAt: Map<string, string_date_iso8601>;
        },
    ): Promise<Array<{ tool_call_id: string; output: string }>> {
        const toolOutputs: Array<{ tool_call_id: string; output: string }> = [];

        for (const toolCall of options.toolCalls) {
            const { completedToolCall, toolOutput } = await this.executeAssistantRequiredToolCall({
                ...options,
                toolCall,
            });
            options.completedToolCalls.push(completedToolCall);
            toolOutputs.push(toolOutput);
        }

        return toolOutputs;
    }

    /**
     * Executes one function tool requested by the assistant.
     */
    private async executeAssistantRequiredToolCall(
        options: AssistantToolRunContext & {
            readonly toolCall: OpenAI.Beta.Threads.RequiredActionFunctionToolCall;
            readonly toolCallStartedAt: Map<string, string_date_iso8601>;
        },
    ): Promise<{
        readonly completedToolCall: StreamedToolCall;
        readonly toolOutput: { tool_call_id: string; output: string };
    }> {
        const functionName = options.toolCall.function.name;
        const functionArguments = options.toolCall.function.arguments;
        const functionArgs = JSON.parse(functionArguments);
        const calledAt = $getCurrentDate();
        const pendingToolCall = this.createPendingAssistantToolCall({
            toolCall: options.toolCall,
            functionName,
            functionArguments,
            calledAt,
        });

        options.toolCallStartedAt.set(options.toolCall.id, calledAt);
        this.options.progressReporter.emitAssistantProgress({
            start: options.start,
            rawPromptContent: options.rawPromptContent,
            onProgress: options.onProgress,
            toolCalls: [pendingToolCall],
        });

        if (this.options.isVerbose) {
            console.info(`🔧 Executing tool: ${functionName}`, functionArgs);
        }

        const executionResult = await this.executeAssistantFunctionTool({
            prompt: options.prompt,
            start: options.start,
            rawPromptContent: options.rawPromptContent,
            onProgress: options.onProgress,
            functionName,
            functionArgs,
            pendingToolCall,
        });
        const completedToolCall = this.createCompletedAssistantToolCall({
            toolCall: options.toolCall,
            functionName,
            calledAt,
            toolCallStartedAt: options.toolCallStartedAt,
            currentToolCallSnapshot: executionResult.currentToolCallSnapshot,
            toolResult: executionResult.toolResult,
            errors: executionResult.errors,
        });

        this.options.progressReporter.emitAssistantProgress({
            start: options.start,
            rawPromptContent: options.rawPromptContent,
            onProgress: options.onProgress,
            toolCalls: [completedToolCall],
        });

        return {
            completedToolCall,
            toolOutput: {
                tool_call_id: options.toolCall.id,
                output: executionResult.assistantVisibleFunctionResponse,
            },
        };
    }

    /**
     * Creates the initial pending snapshot for one assistant tool call.
     */
    private createPendingAssistantToolCall(options: {
        readonly toolCall: OpenAI.Beta.Threads.RequiredActionFunctionToolCall;
        readonly functionName: string;
        readonly functionArguments: string;
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
     * Resolves the configured script tools for assistant tool execution.
     */
    private resolveAssistantScriptTools(functionName: string): Array<ScriptExecutionTools> {
        if (!this.options.scriptExecutionTools) {
            throw new PipelineExecutionError(
                `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiAssistantExecutionTools options`,
            );
        }

        return Array.isArray(this.options.scriptExecutionTools)
            ? this.options.scriptExecutionTools
            : [this.options.scriptExecutionTools];
    }

    /**
     * Executes the configured script tool for one assistant-requested function call.
     */
    private async executeAssistantFunctionTool(options: {
        readonly prompt: Prompt;
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly functionName: string;
        readonly functionArgs: TODO_any;
        readonly pendingToolCall: StreamedToolCall;
    }): Promise<AssistantFunctionToolExecutionResult> {
        const scriptTools = this.resolveAssistantScriptTools(options.functionName);
        let functionResponse: string;
        let assistantVisibleFunctionResponse: string;
        let toolResult: TODO_any;
        let errors: Array<ReturnType<typeof serializeError>> | undefined;
        let currentToolCallSnapshot = options.pendingToolCall;

        try {
            const scriptTool = scriptTools[0]!; // <- TODO: [🧠] Which script tool to use?
            const progressListenerToken = registerToolCallProgressListener((update) => {
                currentToolCallSnapshot = applyToolCallProgressUpdate(currentToolCallSnapshot, update);

                this.options.progressReporter.emitAssistantProgress({
                    start: options.start,
                    rawPromptContent: options.rawPromptContent,
                    onProgress: options.onProgress,
                    toolCalls: [currentToolCallSnapshot],
                });
            });

            try {
                functionResponse = await scriptTool.execute({
                    scriptLanguage: 'javascript', // <- TODO: [🧠] How to determine script language?
                    script: buildToolInvocationScript({
                        functionName: options.functionName,
                        functionArgsExpression: JSON.stringify(options.functionArgs),
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

            if (this.options.isVerbose) {
                console.info(`✅ Tool ${options.functionName} executed:`, assistantVisibleFunctionResponse);
            }
        } catch (error) {
            assertsError(error);

            const serializedError = serializeError(error as Error);
            errors = [serializedError];
            functionResponse = spaceTrim(
                (block) => `
                
                    The invoked tool \`${options.functionName}\` failed with error:
                    
                    \`\`\`json
                    ${block(JSON.stringify(serializedError, null, 4))}
                    \`\`\`

                `,
            );
            assistantVisibleFunctionResponse = functionResponse;
            toolResult = functionResponse;
            console.error(colors.bgRed(`❌ Error executing tool ${options.functionName}:`));
            console.error(error);
        }

        return {
            assistantVisibleFunctionResponse,
            currentToolCallSnapshot,
            errors,
            toolResult,
        };
    }

    /**
     * Finalizes one assistant tool-call snapshot after execution ends.
     */
    private createCompletedAssistantToolCall(options: {
        readonly toolCall: OpenAI.Beta.Threads.RequiredActionFunctionToolCall;
        readonly functionName: string;
        readonly calledAt: string_date_iso8601;
        readonly toolCallStartedAt: Map<string, string_date_iso8601>;
        readonly currentToolCallSnapshot: StreamedToolCall;
        readonly toolResult: TODO_any;
        readonly errors: Array<ReturnType<typeof serializeError>> | undefined;
    }): StreamedToolCall {
        const hasErrors = options.errors !== undefined && options.errors.length > 0;

        return {
            ...options.currentToolCallSnapshot,
            result: options.toolResult,
            rawToolCall: options.toolCall,
            createdAt: options.toolCallStartedAt.get(options.toolCall.id) || options.calledAt,
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
     * Extracts the latest assistant text response from a completed thread.
     */
    private extractCompletedAssistantTextContent(messages: ReadonlyArray<OpenAI.Beta.Threads.Message>): string {
        const assistantMessages = messages.filter((message) => message.role === 'assistant');

        if (assistantMessages.length === 0) {
            throw new PipelineExecutionError('No assistant messages found after run completion');
        }

        const textContent = assistantMessages[0]!.content.find((contentItem) => contentItem.type === 'text');

        if (!textContent || textContent.type !== 'text') {
            throw new PipelineExecutionError('No text content in assistant response');
        }

        return textContent.text.value;
    }
}
