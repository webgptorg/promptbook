import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import { spaceTrim } from 'spacetrim';
import { TODO_any } from '../../_packages/types.index';
import { serializeError } from '../../_packages/utils.index';
import { parseToolExecutionEnvelope } from '../../commitments/_common/toolExecutionEnvelope';
import {
    registerToolCallProgressListener,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    type ToolCallProgressUpdate,
    unregisterToolCallProgressListener,
} from '../../commitments/_common/toolRuntimeContext';
import { assertsError } from '../../errors/assertsError';
import { NotAllowed } from '../../errors/NotAllowed';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import type { Usage } from '../../execution/Usage';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { ToolCallLogEntry, ToolCallState } from '../../types/ToolCall';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_title,
    string_token,
} from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiVectorStoreHandler } from './OpenAiVectorStoreHandler';
import { buildToolInvocationScript } from './utils/buildToolInvocationScript';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';
import { uploadFilesToOpenAi } from './utils/uploadFilesToOpenAi';

/**
 * Type describing streamed tool call.
 */
type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

/**
 * Type describing one assistant thread message sent to the Assistants API.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
type AssistantThreadMessage = OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message;

/**
 * Type describing a page of thread messages returned after an assistant run finishes.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
type AssistantMessagesPage = OpenAI.Beta.Threads.MessagesPage;

/**
 * Type describing one function tool call requested by the Assistants Runs API.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
type AssistantRequiredActionFunctionToolCall = OpenAI.Beta.Threads.RequiredActionFunctionToolCall;

/**
 * Shared context for one assistant chat call after prompt preparation finishes.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
type AssistantChatCallContext = {
    readonly client: OpenAI;
    readonly prompt: Prompt;
    readonly rawPromptContent: string;
    readonly threadMessages: ReadonlyArray<AssistantThreadMessage>;
    readonly start: string_date_iso8601;
    readonly onProgress: (chunk: ChatPromptResult) => void;
};

/**
 * Shared context for one assistant tools run after the OpenAI request payload is built.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
type AssistantToolRunContext = AssistantChatCallContext & {
    readonly rawRequest: OpenAI.Beta.ThreadCreateAndRunParams;
};

/**
 * Result of executing one assistant-requested function tool.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
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
 * @private helper of `OpenAiAssistantExecutionTools`
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
 * @private helper of `OpenAiAssistantExecutionTools`
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
 * @private helper of `OpenAiAssistantExecutionTools`
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
 * @private helper of `OpenAiAssistantExecutionTools`
 */
function isAssistantRunActive(status: OpenAI.Beta.Threads.RunStatus): boolean {
    return status === 'queued' || status === 'in_progress' || status === 'requires_action';
}

/**
 * Returns true when the assistant run is waiting for tool outputs.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
function isAssistantRunRequiringToolOutputs(run: OpenAI.Beta.Threads.Run): boolean {
    return run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs';
}

/**
 * Execution Tools for calling OpenAI API Assistants
 *
 * This is useful for calling OpenAI API with a single assistant, for more wide usage use `OpenAiExecutionTools`.
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @deprecated Use `OpenAiAgentKitExecutionTools` instead.
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAssistantExecutionTools extends OpenAiVectorStoreHandler implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */
    public readonly assistantId: string_token;
    private readonly isCreatingNewAssistantsAllowed: boolean = false;

    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(options: OpenAiAssistantExecutionToolsOptions) {
        if (options.isProxied) {
            throw new NotYetImplementedError(`Proxy mode is not yet implemented for OpenAI assistants`);
        }

        super(options);
        this.assistantId = options.assistantId;
        this.isCreatingNewAssistantsAllowed = options.isCreatingNewAssistantsAllowed ?? false;

        if (this.assistantId === null && !this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Assistant ID is null and creating new assistants is not allowed - this configuration does not make sense`,
            );
        }

        // <- TODO: !!! `OpenAiAssistantExecutionToolsOptions` - Allow `assistantId: null` together with `isCreatingNewAssistantsAllowed: true`
        // TODO: [👱] Make limiter same as in `OpenAiExecutionTools`
    }

    public get title(): string_title & string_markdown_text {
        return 'OpenAI Assistant';
    }

    public get description(): string_markdown {
        return 'Use single assistant provided by OpenAI';
    }

    /**
     * Calls OpenAI API to use a chat model.
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls OpenAI API to use a chat model with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        TODO_USE(options);

        this.logAssistantChatCall(prompt);

        const { modelRequirements /*, format*/ } = prompt;
        const client = await this.getClient();

        this.assertSupportedAssistantModelRequirements(modelRequirements);

        const rawPromptContent = this.createAssistantRawPromptContent(prompt);
        const threadMessages = await this.createAssistantThreadMessages({
            client,
            prompt,
            rawPromptContent,
        });
        const assistantChatCallContext: AssistantChatCallContext = {
            client,
            prompt,
            rawPromptContent,
            threadMessages,
            start: $getCurrentDate(),
            onProgress,
        };

        if (this.hasAssistantTools(modelRequirements)) {
            return this.callChatModelStreamWithTools(assistantChatCallContext);
        }

        return this.callChatModelStreamWithoutTools(assistantChatCallContext);
    }

    /**
     * Logs one assistant chat call when verbose output is enabled.
     */
    private logAssistantChatCall(prompt: Prompt): void {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI callChatModel call', { prompt });
        }
    }

    /**
     * Validates the subset of model requirements supported by OpenAI Assistants.
     */
    private assertSupportedAssistantModelRequirements(modelRequirements: ModelRequirements): void {
        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        // TODO: [👨‍👨‍👧‍👧] Remove:
        for (const key of ['maxTokens', 'modelName', 'seed', 'temperature'] as Array<keyof ModelRequirements>) {
            if (modelRequirements[key] !== undefined) {
                throw new NotYetImplementedError(`In \`OpenAiAssistantExecutionTools\` you cannot specify \`${key}\``);
            }
        }

        /*
        TODO: [👨‍👨‍👧‍👧] Implement all of this for Assistants
        const modelName = modelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: modelName,

            temperature: modelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        } as OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming; // <- TODO: Guard here types better

        if (format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }
        */

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.
    }

    /**
     * Returns true when the prompt exposes callable tools that require the Runs API flow.
     */
    private hasAssistantTools(modelRequirements: ModelRequirements): boolean {
        return modelRequirements.tools !== undefined && modelRequirements.tools.length > 0;
    }

    /**
     * Resolves the raw user-visible prompt content sent to the assistant.
     */
    private createAssistantRawPromptContent(prompt: Prompt): string {
        return templateParameters(prompt.content, {
            ...prompt.parameters,
            modelName: 'assistant',
            //          <- [🧠] What is the best value here
        });
    }

    /**
     * Builds the thread history plus the current user message for one assistant call.
     */
    private async createAssistantThreadMessages(options: {
        readonly client: OpenAI;
        readonly prompt: Prompt;
        readonly rawPromptContent: string;
    }): Promise<Array<AssistantThreadMessage>> {
        return [
            ...this.createAssistantThreadHistoryMessages(options.prompt),
            await this.createAssistantCurrentUserMessage(options),
        ];
    }

    /**
     * Converts the existing prompt thread into OpenAI assistant thread messages.
     */
    private createAssistantThreadHistoryMessages(prompt: Prompt): Array<AssistantThreadMessage> {
        if (!('thread' in prompt) || !Array.isArray(prompt.thread)) {
            return [];
        }

        // TODO: [🈹] Maybe this should not be here but in other place, look at commit 39d705e75e5bcf7a818c3af36bc13e1c8475c30c
        return prompt.thread.map((message) => ({
            role: message.sender === 'assistant' ? 'assistant' : 'user',
            content: message.content,
        }));
    }

    /**
     * Creates the current user message, including uploaded file attachments when present.
     */
    private async createAssistantCurrentUserMessage(options: {
        readonly client: OpenAI;
        readonly prompt: Prompt;
        readonly rawPromptContent: string;
    }): Promise<AssistantThreadMessage> {
        const currentUserMessage: AssistantThreadMessage = {
            role: 'user',
            content: options.rawPromptContent,
        };

        if ('files' in options.prompt && Array.isArray(options.prompt.files) && options.prompt.files.length > 0) {
            const fileIds = await uploadFilesToOpenAi(options.client, options.prompt.files);
            currentUserMessage.attachments = fileIds.map((fileId) => ({
                file_id: fileId,
                tools: [{ type: 'file_search' }, { type: 'code_interpreter' }],
            }));
        }

        return currentUserMessage;
    }

    /**
     * Runs assistant calls with tools through the non-streaming Runs API.
     */
    private async callChatModelStreamWithTools(context: AssistantChatCallContext): Promise<ChatPromptResult> {
        this.emitAssistantProgress({
            start: context.start,
            rawPromptContent: context.rawPromptContent,
            onProgress: context.onProgress,
        });

        const rawRequest = this.createAssistantToolRunRequest(context);
        this.logVerboseAssistantRequest('rawRequest (non-streaming with tools)', rawRequest);

        const { run, messages, completedToolCalls } = await this.executeAssistantToolRun({
            ...context,
            rawRequest,
        });
        const complete = $getCurrentDate();
        const finalChunk = this.createAssistantPromptResult({
            content: this.extractCompletedAssistantTextContent(messages.data),
            start: context.start,
            complete,
            rawPromptContent: context.rawPromptContent,
            rawRequest,
            rawResponse: { run, messages: messages.data },
            toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
        });

        context.onProgress(finalChunk);

        return this.exportAssistantPromptResult({
            result: finalChunk,
            isWithTools: true,
        });
    }

    /**
     * Builds the non-streaming assistant request payload used when tool calls are enabled.
     */
    private createAssistantToolRunRequest(context: AssistantChatCallContext): OpenAI.Beta.ThreadCreateAndRunParams {
        return {
            assistant_id: this.assistantId,
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
        readonly messages: AssistantMessagesPage;
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
    private async waitForAssistantToolRun(options: AssistantToolRunContext & {
        readonly run: OpenAI.Beta.Threads.Run;
        readonly completedToolCalls: Array<StreamedToolCall>;
        readonly toolCallStartedAt: Map<string, string_date_iso8601>;
    }): Promise<OpenAI.Beta.Threads.Run> {
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
    private async submitAssistantRequiredToolOutputs(options: AssistantToolRunContext & {
        readonly run: OpenAI.Beta.Threads.Run;
        readonly completedToolCalls: Array<StreamedToolCall>;
        readonly toolCallStartedAt: Map<string, string_date_iso8601>;
    }): Promise<OpenAI.Beta.Threads.Run> {
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
    private async executeAssistantRequiredToolCalls(options: AssistantToolRunContext & {
        readonly toolCalls: ReadonlyArray<AssistantRequiredActionFunctionToolCall>;
        readonly completedToolCalls: Array<StreamedToolCall>;
        readonly toolCallStartedAt: Map<string, string_date_iso8601>;
    }): Promise<Array<{ tool_call_id: string; output: string }>> {
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
    private async executeAssistantRequiredToolCall(options: AssistantToolRunContext & {
        readonly toolCall: AssistantRequiredActionFunctionToolCall;
        readonly toolCallStartedAt: Map<string, string_date_iso8601>;
    }): Promise<{
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
        this.emitAssistantProgress({
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

        this.emitAssistantProgress({
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
        readonly toolCall: AssistantRequiredActionFunctionToolCall;
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
        const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

        if (!executionTools || !executionTools.script) {
            throw new PipelineExecutionError(
                `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiAssistantExecutionTools options`,
            );
        }

        return Array.isArray(executionTools.script) ? executionTools.script : [executionTools.script];
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

                this.emitAssistantProgress({
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
        readonly toolCall: AssistantRequiredActionFunctionToolCall;
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

    /**
     * Runs assistant calls without tools through the streaming Assistants API.
     */
    private async callChatModelStreamWithoutTools(context: AssistantChatCallContext): Promise<ChatPromptResult> {
        const rawRequest = this.createAssistantStreamingRequest(context);
        this.logVerboseAssistantRequest('rawRequest (streaming)', rawRequest);

        const stream = await context.client.beta.threads.createAndRunStream(rawRequest);
        this.attachAssistantStreamListeners({
            stream,
            start: context.start,
            rawPromptContent: context.rawPromptContent,
            rawRequest,
            onProgress: context.onProgress,
        });

        // TODO: [🐱‍🚀] Handle tool calls in assistants
        // Note: OpenAI Assistant streaming with tool calls requires special handling.
        // The stream will pause when a tool call is needed, and we need to:
        // 1. Wait for the run to reach 'requires_action' status
        // 2. Execute the tool calls
        // 3. Submit tool outputs via a separate API call (not on the stream)
        // 4. Continue the run
        // This requires switching to non-streaming mode or using the Runs API directly.
        // For now, tools with assistants should use the non-streaming chat completions API instead.

        const rawResponse = await stream.finalMessages();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        const resultContent = await this.resolveAssistantStreamingResultContent({
            client: context.client,
            rawResponse,
        });
        const complete = $getCurrentDate();

        if (resultContent === null) {
            throw new PipelineExecutionError('No response message from OpenAI');
        }

        return this.exportAssistantPromptResult({
            result: this.createAssistantPromptResult({
                content: resultContent,
                start: context.start,
                complete,
                rawPromptContent: context.rawPromptContent,
                rawRequest,
                rawResponse,
            }),
            isWithTools: false,
        });
    }

    /**
     * Builds the streaming assistant request payload used when no tool execution flow is needed.
     */
    private createAssistantStreamingRequest(context: AssistantChatCallContext): OpenAI.Beta.ThreadCreateAndRunStreamParams {
        return {
            // TODO: [👨‍👨‍👧‍👧] ...modelSettings,
            // TODO: [👨‍👨‍👧‍👧][🧠] What about system message for assistants, does it make sense - combination of OpenAI assistants with Promptbook Personas

            assistant_id: this.assistantId, // <- [🙎]
            thread: {
                messages: [...context.threadMessages],
            },
            tools:
                context.prompt.modelRequirements.tools === undefined
                    ? undefined
                    : mapToolsToOpenAi(context.prompt.modelRequirements.tools),

            // <- TODO: Add user identification here> user: this.options.user,
        };
    }

    /**
     * Registers verbose stream diagnostics plus incremental text progress forwarding.
     */
    private attachAssistantStreamListeners(options: {
        readonly stream: OpenAI.Beta.Threads.AssistantStream;
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly rawRequest: OpenAI.Beta.ThreadCreateAndRunStreamParams;
        readonly onProgress: (chunk: ChatPromptResult) => void;
    }): void {
        options.stream.on('connect', () => {
            if (this.options.isVerbose) {
                console.info('connect', options.stream.currentEvent);
            }
        });

        options.stream.on('textDelta', (textDelta, snapshot) => {
            if (this.options.isVerbose && textDelta.value) {
                console.info('textDelta', textDelta.value);
            }

            this.emitAssistantProgress({
                content: snapshot.value,
                start: options.start,
                rawPromptContent: options.rawPromptContent,
                rawRequest: options.rawRequest,
                rawResponse: snapshot as chococake,
                onProgress: options.onProgress,
            });
        });

        options.stream.on('messageCreated', (message) => {
            if (this.options.isVerbose) {
                console.info('messageCreated', message);
            }
        });

        options.stream.on('messageDone', (message) => {
            if (this.options.isVerbose) {
                console.info('messageDone', message);
            }
        });
    }

    /**
     * Resolves the final visible assistant text from a streaming response.
     */
    private async resolveAssistantStreamingResultContent(options: {
        readonly client: OpenAI;
        readonly rawResponse: Array<OpenAI.Beta.Threads.Message>;
    }): Promise<string | null> {
        const textContent = this.extractSingleAssistantTextContentBlock(options.rawResponse);

        return this.replaceAssistantFileCitationMarkers({
            client: options.client,
            textContent,
            resultContent: textContent.text.value,
        });
    }

    /**
     * Extracts the single text content block returned by the assistant stream.
     */
    private extractSingleAssistantTextContentBlock(
        rawResponse: Array<OpenAI.Beta.Threads.Message>,
    ): OpenAI.Beta.Threads.TextContentBlock {
        if (rawResponse.length !== 1) {
            throw new PipelineExecutionError(`There is NOT 1 BUT ${rawResponse.length} finalMessages from OpenAI`);
        }

        if (rawResponse[0]!.content.length !== 1) {
            throw new PipelineExecutionError(
                `There is NOT 1 BUT ${rawResponse[0]!.content.length} finalMessages content from OpenAI`,
            );
        }

        if (rawResponse[0]!.content[0]?.type !== 'text') {
            throw new PipelineExecutionError(
                `There is NOT 'text' BUT ${rawResponse[0]!.content[0]?.type} finalMessages content type from OpenAI`,
            );
        }

        return rawResponse[0]!.content[0];
    }

    /**
     * Rewrites file citation markers to use retrieved filenames instead of generic source labels.
     */
    private async replaceAssistantFileCitationMarkers(options: {
        readonly client: OpenAI;
        readonly textContent: OpenAI.Beta.Threads.TextContentBlock;
        readonly resultContent: string | null;
    }): Promise<string | null> {
        let resultContent = options.resultContent;
        const annotations = options.textContent.text.annotations;

        if (!annotations) {
            return resultContent;
        }

        const fileIdToName = new Map<string, string>();

        for (const annotation of annotations) {
            if (annotation.type !== 'file_citation') {
                continue;
            }

            const filename = await this.retrieveAssistantCitationFilename({
                client: options.client,
                fileId: annotation.file_citation.file_id,
                fileIdToName,
            });

            if (filename && resultContent) {
                const newText = annotation.text.replace(/†.*?】/, `†${filename}】`);
                resultContent = resultContent.replace(annotation.text, newText);
            }
        }

        return resultContent;
    }

    /**
     * Returns one citation filename, caching OpenAI file lookups across annotations.
     */
    private async retrieveAssistantCitationFilename(options: {
        readonly client: OpenAI;
        readonly fileId: string;
        readonly fileIdToName: Map<string, string>;
    }): Promise<string> {
        const cachedFilename = options.fileIdToName.get(options.fileId);

        if (cachedFilename) {
            return cachedFilename;
        }

        try {
            const file = await options.client.files.retrieve(options.fileId);
            options.fileIdToName.set(options.fileId, file.filename);
            return file.filename;
        } catch (error) {
            console.error(`Failed to retrieve file info for ${options.fileId}`, error);
            return 'Source';
        }
    }

    /**
     * Emits one assistant progress chunk with shared timing and prompt metadata.
     */
    private emitAssistantProgress(options: {
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly content?: string;
        readonly rawRequest?: chococake;
        readonly rawResponse?: chococake;
        readonly toolCalls?: ChatPromptResult['toolCalls'];
    }): void {
        options.onProgress({
            content: options.content || '',
            modelName: 'assistant',
            timing: {
                start: options.start,
                complete: $getCurrentDate(),
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: options.rawPromptContent,
            rawRequest: options.rawRequest ?? (null as chococake),
            rawResponse: options.rawResponse ?? (null as chococake),
            toolCalls: options.toolCalls,
        });
    }

    /**
     * Creates the final assistant prompt result with uncertain usage plus measured duration.
     */
    private createAssistantPromptResult(options: {
        readonly content: string_markdown;
        readonly start: string_date_iso8601;
        readonly complete: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly rawRequest: chococake;
        readonly rawResponse: chococake;
        readonly toolCalls?: ChatPromptResult['toolCalls'];
    }): ChatPromptResult {
        return {
            content: options.content,
            modelName: 'assistant',
            timing: {
                start: options.start,
                complete: options.complete,
            },
            usage: this.createAssistantUsage({
                start: options.start,
                complete: options.complete,
            }),
            rawPromptContent: options.rawPromptContent,
            rawRequest: options.rawRequest,
            rawResponse: options.rawResponse,
            toolCalls: options.toolCalls,
        };
    }

    /**
     * Computes the usage payload for assistant responses.
     */
    private createAssistantUsage(options: {
        readonly start: string_date_iso8601;
        readonly complete: string_date_iso8601;
    }): Usage {
        return {
            ...UNCERTAIN_USAGE,
            duration: uncertainNumber((new Date(options.complete).getTime() - new Date(options.start).getTime()) / 1000),
        };
    }

    /**
     * Wraps the final assistant prompt result in the standard exported JSON envelope.
     */
    private exportAssistantPromptResult(options: {
        readonly result: ChatPromptResult;
        readonly isWithTools: boolean;
    }): ChatPromptResult {
        return exportJson({
            name: 'promptResult',
            message: options.isWithTools
                ? `Result of \`OpenAiAssistantExecutionTools.callChatModelStream\` (with tools)`
                : `Result of \`OpenAiAssistantExecutionTools.callChatModelStream\``,
            order: [],
            value: options.result,
        });
    }

    /**
     * Logs one assistant request payload when verbose output is enabled.
     */
    private logVerboseAssistantRequest(label: string, rawRequest: unknown): void {
        if (this.options.isVerbose) {
            console.info(colors.bgWhite(label), JSON.stringify(rawRequest, null, 4));
        }
    }

    /*
    public async playground() {
        const client = await this.getClient();

        // List all assistants
        const assistants = await client.beta.assistants.list();
     
        // Get details of a specific assistant
        const assistantId = 'asst_MO8fhZf4dGloCfXSHeLcIik0';
        const assistant = await client.beta.assistants.retrieve(assistantId);

        // Update an assistant
        const updatedAssistant = await client.beta.assistants.update(assistantId, {
            name: assistant.name + '(M)',
            description: 'Updated description via Promptbook',
            metadata: {
                [Math.random().toString(36).substring(2, 15)]: new Date().toISOString(),
            },
        });
  
        await forEver();
    }
    */

    /**
     * Get an existing assistant tool wrapper
     */
    public getAssistant(assistantId: string_token): OpenAiAssistantExecutionTools {
        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: this.isCreatingNewAssistantsAllowed,
            assistantId,
        });
    }

    public async createNewAssistant(options: {
        /**
         * Name of the new assistant
         */
        readonly name: string_title;

        /**
         * Instructions for the new assistant
         */
        readonly instructions: string_markdown;

        /**
         * Optional list of knowledge source links (URLs or file paths) to attach to the assistant via vector store
         */
        readonly knowledgeSources?: ReadonlyArray<string>;

        /**
         * Optional list of tools to attach to the assistant
         */
        readonly tools?: ModelRequirements['tools'];

        // <- TODO: [🧠] [🐱‍🚀] Add also other assistant creation parameters like name, description, model, ...
    }): Promise<OpenAiAssistantExecutionTools> {
        if (!this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Creating new assistants is not allowed. Set \`isCreatingNewAssistantsAllowed: true\` in options to enable this feature.`,
            );
        }

        // await this.playground();
        const { name, instructions, knowledgeSources, tools } = options;
        const preparationStartedAtMs = Date.now();
        const knowledgeSourcesCount = knowledgeSources?.length ?? 0;
        const toolsCount = tools?.length ?? 0;

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Starting OpenAI assistant creation', {
                name,
                knowledgeSourcesCount,
                toolsCount,
                instructionsLength: instructions.length,
            });
        }
        const client = await this.getClient();

        let vectorStoreId: string | undefined;

        // If knowledge sources are provided, create a vector store with them
        if (knowledgeSources && knowledgeSources.length > 0) {
            const vectorStoreResult = await this.createVectorStoreWithKnowledgeSources({
                client,
                name,
                knowledgeSources,
                logLabel: 'assistant creation',
            });
            vectorStoreId = vectorStoreResult.vectorStoreId;
        }

        // Create assistant with vector store attached
        const assistantConfig: OpenAI.Beta.AssistantCreateParams = {
            name,
            description: 'Assistant created via Promptbook',
            model: 'gpt-4o',
            instructions,
            tools: [
                /* TODO: [🧠] Maybe add { type: 'code_interpreter' }, */
                { type: 'file_search' },
                ...(tools === undefined ? [] : mapToolsToOpenAi(tools)),
            ],
        };

        // Attach vector store if created
        if (vectorStoreId) {
            assistantConfig.tool_resources = {
                file_search: {
                    vector_store_ids: [vectorStoreId],
                },
            };
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Creating OpenAI assistant', {
                name,
                model: assistantConfig.model,
                toolCount: assistantConfig?.tools?.length,
                hasVectorStore: Boolean(vectorStoreId),
            });
        }

        const assistant = await client.beta.assistants.create(assistantConfig);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'OpenAI assistant created', {
                assistantId: assistant.id,
                elapsedMs: Date.now() - preparationStartedAtMs,
            });
        }

        // TODO: [🐱‍🚀] Try listing existing assistants
        // TODO: [🐱‍🚀] Try marking existing assistants by DISCRIMINANT
        // TODO: [🐱‍🚀] Allow to update and reconnect to existing assistants

        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: false,
            assistantId: assistant.id,
        });
    }

    public async updateAssistant(options: {
        /**
         * ID of the assistant to update
         */
        readonly assistantId: string_token;

        /**
         * Name of the assistant
         */
        readonly name?: string_title;

        /**
         * Instructions for the assistant
         */
        readonly instructions?: string_markdown;

        /**
         * Optional list of knowledge source links (URLs or file paths) to attach to the assistant via vector store
         */
        readonly knowledgeSources?: ReadonlyArray<string>;

        /**
         * Optional list of tools to attach to the assistant
         */
        readonly tools?: ModelRequirements['tools'];
    }): Promise<OpenAiAssistantExecutionTools> {
        if (!this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Updating assistants is not allowed. Set \`isCreatingNewAssistantsAllowed: true\` in options to enable this feature.`,
            );
        }

        const { assistantId, name, instructions, knowledgeSources, tools } = options;
        const preparationStartedAtMs = Date.now();
        const knowledgeSourcesCount = knowledgeSources?.length ?? 0;
        const toolsCount = tools?.length ?? 0;

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Starting OpenAI assistant update', {
                assistantId,
                name,
                knowledgeSourcesCount,
                toolsCount,
                instructionsLength: instructions?.length ?? 0,
            });
        }
        const client = await this.getClient();

        let vectorStoreId: string | undefined;

        // If knowledge sources are provided, create a vector store with them
        if (knowledgeSources && knowledgeSources.length > 0) {
            const vectorStoreResult = await this.createVectorStoreWithKnowledgeSources({
                client,
                name: name ?? assistantId,
                knowledgeSources,
                logLabel: 'assistant update',
            });
            vectorStoreId = vectorStoreResult.vectorStoreId;
        }

        const assistantUpdate: OpenAI.Beta.AssistantUpdateParams = {
            name,
            instructions,
            tools: [
                /* TODO: [🧠] Maybe add { type: 'code_interpreter' }, */
                { type: 'file_search' },
                ...(tools === undefined ? [] : mapToolsToOpenAi(tools)),
            ],
        };

        if (vectorStoreId) {
            assistantUpdate.tool_resources = {
                file_search: {
                    vector_store_ids: [vectorStoreId],
                },
            };
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Updating OpenAI assistant', {
                assistantId,
                name,
                toolCount: assistantUpdate?.tools?.length,
                hasVectorStore: Boolean(vectorStoreId),
            });
        }

        const assistant = await client.beta.assistants.update(assistantId, assistantUpdate);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'OpenAI assistant updated', {
                assistantId: assistant.id,
                elapsedMs: Date.now() - preparationStartedAtMs,
            });
        }

        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: false,
            assistantId: assistant.id,
        });
    }

    /**
     * Discriminant for type guards
     */
    protected get discriminant() {
        return DISCRIMINANT;
    }

    /**
     * Type guard to check if given `LlmExecutionTools` are instanceof `OpenAiAssistantExecutionTools`
     *
     * Note: This is useful when you can possibly have multiple versions of `@promptbook/openai` installed
     */
    public static isOpenAiAssistantExecutionTools(
        llmExecutionTools: LlmExecutionTools,
    ): llmExecutionTools is OpenAiAssistantExecutionTools {
        return (llmExecutionTools as OpenAiAssistantExecutionTools).discriminant === DISCRIMINANT;
    }
}

/**
 * Discriminant for type guards
 *
 * @private const of `OpenAiAssistantExecutionTools`
 */
const DISCRIMINANT = 'OPEN_AI_ASSISTANT_V1';

// TODO: !!!!! [✨🥚] Knowledge should work both with and without scrapers
// TODO: [🙎] In `OpenAiAssistantExecutionTools` Allow to create abstract assistants with `isCreatingNewAssistantsAllowed`
// TODO: [🧠][🧙‍♂️] Maybe there can be some wizard for those who want to use just OpenAI
// TODO: Maybe make custom OpenAiError
// TODO: [🧠][🈁] Maybe use `isDeterministic` from options
// TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
