import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
import { TODO_any } from '../../_packages/types.index';
import { serializeError } from '../../_packages/utils.index';
import {
    registerToolCallProgressListener,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    type ToolCallProgressUpdate,
    unregisterToolCallProgressListener,
} from '../../commitments/_common/toolRuntimeContext';
import { parseToolExecutionEnvelope } from '../../commitments/_common/toolExecutionEnvelope';
import { assertsError } from '../../errors/assertsError';
import { NotAllowed } from '../../errors/NotAllowed';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
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

type StreamedToolCall = NonNullable<ChatPromptResult['toolCalls']>[number];

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

        if (this.options.isVerbose) {
            console.info('💬 OpenAI callChatModel call', { prompt });
        }

        const { content, parameters, modelRequirements /*, format*/ } = prompt;

        const client = await this.getClient();

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

        const rawPromptContent = templateParameters(content, {
            ...parameters,
            modelName: 'assistant',
            //          <- [🧠] What is the best value here
        });
        // Build thread messages: include previous thread messages + current user message
        const threadMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // TODO: [🈹] Maybe this should not be here but in other place, look at commit 39d705e75e5bcf7a818c3af36bc13e1c8475c30c
        // Add previous messages from thread (if any)
        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            const previousMessages = prompt.thread.map((msg) => ({
                role: (msg.sender === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
                content: msg.content,
            }));
            threadMessages.push(...previousMessages);
        }

        // Always add the current user message
        const currentUserMessage: OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message = {
            role: 'user',
            content: rawPromptContent,
        };

        if ('files' in prompt && Array.isArray(prompt.files) && prompt.files.length > 0) {
            const fileIds = await uploadFilesToOpenAi(client, prompt.files);
            currentUserMessage.attachments = fileIds.map((fileId) => ({
                file_id: fileId,
                tools: [{ type: 'file_search' }, { type: 'code_interpreter' }],
            }));
        }

        threadMessages.push(currentUserMessage as { role: 'user' | 'assistant'; content: string });

        // Check if tools are being used - if so, use non-streaming mode
        const hasTools = modelRequirements.tools !== undefined && modelRequirements.tools.length > 0;

        const start: string_date_iso8601 = $getCurrentDate();
        let complete: string_date_iso8601;

        // [🐱‍🚀] When tools are present, we need to use the non-streaming Runs API
        // because streaming doesn't support tool execution flow properly
        if (hasTools) {
            onProgress({
                content: '',
                modelName: 'assistant',
                timing: { start, complete: $getCurrentDate() },
                usage: UNCERTAIN_USAGE,
                rawPromptContent,
                rawRequest: null as chococake,
                rawResponse: null as chococake,
            });

            const rawRequest: OpenAI.Beta.ThreadCreateAndRunParams = {
                assistant_id: this.assistantId,
                thread: {
                    messages: threadMessages,
                },
                tools: mapToolsToOpenAi(modelRequirements.tools!),
            };

            if (this.options.isVerbose) {
                console.info(
                    colors.bgWhite('rawRequest (non-streaming with tools)'),
                    JSON.stringify(rawRequest, null, 4),
                );
            }

            // Create thread and run
            let run = (await client.beta.threads.createAndRun(rawRequest)) as OpenAI.Beta.Threads.Run;
            const completedToolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
            const toolCallStartedAt = new Map<string, string_date_iso8601>();

            // Poll until run completes or requires action
            while (run.status === 'queued' || run.status === 'in_progress' || run.status === 'requires_action') {
                if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
                    // Execute tools
                    const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
                    const toolOutputs: Array<{ tool_call_id: string; output: string }> = [];

                    for (const toolCall of toolCalls) {
                        if (toolCall.type === 'function') {
                            const functionName = toolCall.function.name;
                            const functionArgs = JSON.parse(toolCall.function.arguments);
                            const calledAt = $getCurrentDate();

                            if (toolCall.id) {
                                toolCallStartedAt.set(toolCall.id, calledAt);
                            }

                            onProgress({
                                content: '',
                                modelName: 'assistant',
                                timing: { start, complete: $getCurrentDate() },
                                usage: UNCERTAIN_USAGE,
                                rawPromptContent,
                                rawRequest: null as chococake,
                                rawResponse: null as chococake,
                                toolCalls: [
                                    {
                                        name: functionName,
                                        arguments: toolCall.function.arguments,
                                        result: '',
                                        rawToolCall: toolCall,
                                        createdAt: calledAt,
                                        state: 'PENDING',
                                        logs: [
                                            createToolCallLogEntry({
                                                kind: 'request',
                                                title: 'Request prepared',
                                                message: `Prepared ${functionName} request.`,
                                                payload: {
                                                    arguments: toolCall.function.arguments,
                                                },
                                            }),
                                        ],
                                    },
                                ],
                            });

                            if (this.options.isVerbose) {
                                console.info(`🔧 Executing tool: ${functionName}`, functionArgs);
                            }

                            // Get execution tools for script execution
                            const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions)
                                .executionTools;

                            if (!executionTools || !executionTools.script) {
                                throw new PipelineExecutionError(
                                    `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiAssistantExecutionTools options`,
                                );
                            }

                            // TODO: [DRY] Use some common tool caller (similar to OpenAiCompatibleExecutionTools)
                            const scriptTools = Array.isArray(executionTools.script)
                                ? executionTools.script
                                : [executionTools.script];

                            let functionResponse: string;
                            let assistantVisibleFunctionResponse: string;
                            let toolResult: TODO_any;
                            let errors: Array<ReturnType<typeof serializeError>> | undefined;
                            let currentToolCallSnapshot: StreamedToolCall = {
                                name: functionName,
                                arguments: toolCall.function.arguments,
                                result: '',
                                rawToolCall: toolCall,
                                createdAt: calledAt,
                                state: 'PENDING',
                                logs: [
                                    createToolCallLogEntry({
                                        kind: 'request',
                                        title: 'Request prepared',
                                        message: `Prepared ${functionName} request.`,
                                        payload: {
                                            arguments: toolCall.function.arguments,
                                        },
                                    }),
                                ],
                            };

                            try {
                                const scriptTool = scriptTools[0]!; // <- TODO: [🧠] Which script tool to use?
                                const progressListenerToken = registerToolCallProgressListener((update) => {
                                    currentToolCallSnapshot = applyToolCallProgressUpdate(
                                        currentToolCallSnapshot,
                                        update,
                                    );

                                    onProgress({
                                        content: '',
                                        modelName: 'assistant',
                                        timing: { start, complete: $getCurrentDate() },
                                        usage: UNCERTAIN_USAGE,
                                        rawPromptContent,
                                        rawRequest: null as chococake,
                                        rawResponse: null as chococake,
                                        toolCalls: [currentToolCallSnapshot],
                                    });
                                });

                                try {
                                    functionResponse = await scriptTool.execute({
                                        scriptLanguage: 'javascript', // <- TODO: [🧠] How to determine script language?
                                        script: buildToolInvocationScript({
                                            functionName,
                                            functionArgsExpression: JSON.stringify(functionArgs),
                                        }),
                                        parameters: {
                                            ...prompt.parameters,
                                            [TOOL_PROGRESS_TOKEN_PARAMETER]: progressListenerToken,
                                        },
                                    });
                                } finally {
                                    unregisterToolCallProgressListener(progressListenerToken);
                                }

                                const toolExecutionEnvelope = parseToolExecutionEnvelope(functionResponse);
                                assistantVisibleFunctionResponse =
                                    toolExecutionEnvelope?.assistantMessage || functionResponse;
                                toolResult =
                                    toolExecutionEnvelope !== null && toolExecutionEnvelope !== undefined
                                        ? toolExecutionEnvelope.toolResult
                                        : functionResponse;

                                if (this.options.isVerbose) {
                                    console.info(`✅ Tool ${functionName} executed:`, assistantVisibleFunctionResponse);
                                }
                            } catch (error) {
                                assertsError(error);

                                const serializedError = serializeError(error as Error);
                                errors = [serializedError];
                                functionResponse = spaceTrim(
                                    (block) => `
                                    
                                        The invoked tool \`${functionName}\` failed with error:
                                        
                                        \`\`\`json
                                        ${block(JSON.stringify(serializedError, null, 4))}
                                        \`\`\`

                                    `,
                                );
                                assistantVisibleFunctionResponse = functionResponse;
                                toolResult = functionResponse;
                                console.error(colors.bgRed(`❌ Error executing tool ${functionName}:`));
                                console.error(error);
                            }

                            toolOutputs.push({
                                tool_call_id: toolCall.id,
                                output: assistantVisibleFunctionResponse,
                            });

                            completedToolCalls.push({
                                ...currentToolCallSnapshot,
                                result: toolResult,
                                rawToolCall: toolCall,
                                createdAt: toolCall.id ? toolCallStartedAt.get(toolCall.id) || calledAt : calledAt,
                                errors,
                                state: resolveFinalToolCallState({
                                    currentState: currentToolCallSnapshot.state,
                                    errors,
                                }),
                                logs: [
                                    ...(currentToolCallSnapshot.logs || []),
                                    createToolCallLogEntry({
                                        kind: errors && errors.length > 0 ? 'error' : 'result',
                                        level: errors && errors.length > 0 ? 'error' : 'info',
                                        title: errors && errors.length > 0 ? 'Execution failed' : 'Execution finished',
                                        message:
                                            errors && errors.length > 0
                                                ? `${functionName} failed before returning a final result.`
                                                : `${functionName} returned a result.`,
                                    }),
                                ],
                            });

                            onProgress({
                                content: '',
                                modelName: 'assistant',
                                timing: { start, complete: $getCurrentDate() },
                                usage: UNCERTAIN_USAGE,
                                rawPromptContent,
                                rawRequest: null as chococake,
                                rawResponse: null as chococake,
                                toolCalls: [completedToolCalls[completedToolCalls.length - 1]!],
                            });
                        }
                    }

                    // Submit tool outputs
                    run = (await (client.beta.threads.runs as TODO_any).submitToolOutputs(run.thread_id, run.id, {
                        tool_outputs: toolOutputs,
                    })) as OpenAI.Beta.Threads.Run;
                } else {
                    // Wait a bit before polling again
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    run = (await (client.beta.threads.runs as TODO_any).retrieve(
                        run.thread_id,
                        run.id,
                    )) as OpenAI.Beta.Threads.Run;
                }
            }

            if (run.status !== 'completed') {
                throw new PipelineExecutionError(`Assistant run failed with status: ${run.status}`);
            }

            // Get messages from the thread
            const messages = await client.beta.threads.messages.list(run.thread_id);
            const assistantMessages = messages.data.filter((msg) => msg.role === 'assistant');

            if (assistantMessages.length === 0) {
                throw new PipelineExecutionError('No assistant messages found after run completion');
            }

            const lastMessage = assistantMessages[0]!;
            const textContent = lastMessage.content.find((c) => c.type === 'text');

            if (!textContent || textContent.type !== 'text') {
                throw new PipelineExecutionError('No text content in assistant response');
            }

            complete = $getCurrentDate();
            const duration = uncertainNumber((new Date(complete).getTime() - new Date(start).getTime()) / 1000);
            const resultContent = textContent.text.value;
            const usage: Usage = {
                ...UNCERTAIN_USAGE,
                duration,
            };

            // Progress callback with final result
            const finalChunk: ChatPromptResult = {
                content: resultContent,
                modelName: 'assistant',
                timing: { start, complete },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse: { run, messages: messages.data },
                toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
            };
            onProgress(finalChunk);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiAssistantExecutionTools.callChatModelStream\` (with tools)`,
                order: [],
                value: finalChunk,
            });
        }

        // Streaming mode (without tools)
        const rawRequest: OpenAI.Beta.ThreadCreateAndRunStreamParams = {
            // TODO: [👨‍👨‍👧‍👧] ...modelSettings,
            // TODO: [👨‍👨‍👧‍👧][🧠] What about system message for assistants, does it make sense - combination of OpenAI assistants with Promptbook Personas

            assistant_id: this.assistantId, // <- [🙎]
            thread: {
                messages: threadMessages,
            },

            tools: modelRequirements.tools === undefined ? undefined : mapToolsToOpenAi(modelRequirements.tools),

            // <- TODO: Add user identification here> user: this.options.user,
        };

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest (streaming)'), JSON.stringify(rawRequest, null, 4));
        }

        const stream = await client.beta.threads.createAndRunStream(rawRequest);

        stream.on('connect', () => {
            if (this.options.isVerbose) {
                console.info('connect', stream.currentEvent);
            }
        });

        stream.on('textDelta', (textDelta, snapshot) => {
            if (this.options.isVerbose && textDelta.value) {
                console.info('textDelta', textDelta.value);
            }

            const chunk: ChatPromptResult = {
                content: snapshot.value,
                modelName: 'assistant',
                timing: {
                    start,
                    complete: $getCurrentDate(),
                },
                usage: UNCERTAIN_USAGE,
                rawPromptContent,
                rawRequest,
                rawResponse: snapshot,
            };

            onProgress(chunk);
        });

        stream.on('messageCreated', (message) => {
            if (this.options.isVerbose) {
                console.info('messageCreated', message);
            }
        });

        stream.on('messageDone', (message) => {
            if (this.options.isVerbose) {
                console.info('messageDone', message);
            }
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

        let resultContent = rawResponse[0]!.content[0]?.text.value;

        // Process annotations to replace file IDs with filenames
        if (rawResponse[0]!.content[0]?.text.annotations) {
            const annotations = rawResponse[0]!.content[0]?.text.annotations;

            // Map to store file ID -> filename to avoid duplicate requests
            const fileIdToName = new Map<string, string>();

            for (const annotation of annotations) {
                if (annotation.type === 'file_citation') {
                    const fileId = annotation.file_citation.file_id;
                    let filename = fileIdToName.get(fileId);

                    if (!filename) {
                        try {
                            const file = await client.files.retrieve(fileId);
                            filename = file.filename;
                            fileIdToName.set(fileId, filename);
                        } catch (error) {
                            console.error(`Failed to retrieve file info for ${fileId}`, error);
                            // Fallback to "Source" or keep original if fetch fails
                            filename = 'Source';
                        }
                    }

                    if (filename && resultContent) {
                        // Replace the citation marker with filename
                        // Regex to match the second part of the citation: 【id†source】 -> 【id†filename】
                        // Note: annotation.text contains the exact marker like 【4:0†source】

                        const newText = annotation.text.replace(/†.*?】/, `†${filename}】`);
                        resultContent = resultContent.replace(annotation.text, newText);
                    }
                }
            }
        }

        // eslint-disable-next-line prefer-const
        complete = $getCurrentDate();
        const duration = uncertainNumber((new Date(complete).getTime() - new Date(start).getTime()) / 1000);
        const usage: Usage = {
            ...UNCERTAIN_USAGE,
            duration,
        };
        // <- TODO: [🥘] Compute real usage for assistant
        //       ?> const usage = computeOpenAiUsage(content, resultContent || '', rawResponse);

        if (resultContent === null) {
            throw new PipelineExecutionError('No response message from OpenAI');
        }

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiAssistantExecutionTools.callChatModelStream\``,
            order: [],
            value: {
                content: resultContent,
                modelName: 'assistant',
                // <- TODO: [🥘] Detect used model in assistant
                //       ?> model: rawResponse.model || modelName,
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

/**
 * TODO: !!!!! [✨🥚] Knowledge should work both with and without scrapers
 * TODO: [🙎] In `OpenAiAssistantExecutionTools` Allow to create abstract assistants with `isCreatingNewAssistantsAllowed`
 * TODO: [🧠][🧙‍♂️] Maybe there can be some wizard for those who want to use just OpenAI
 * TODO: Maybe make custom OpenAiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 */
