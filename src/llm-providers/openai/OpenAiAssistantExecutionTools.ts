import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import { NotAllowed } from '../../errors/NotAllowed';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_title,
    string_token,
} from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';
import { uploadFilesToOpenAi } from './utils/uploadFilesToOpenAi';

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
 * @public exported from `@promptbook/openai`
 * @deprecated Use `OpenAiAgentExecutionTools` instead which uses the new OpenAI Responses API
 */
export class OpenAiAssistantExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {
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
    ): Promise<ChatPromptResult> {
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
            const threadAndRun = await client.beta.threads.createAndRun(rawRequest);
            let run = threadAndRun;
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
                            let errors: Array<ReturnType<typeof serializeError>> | undefined;

                            try {
                                const scriptTool = scriptTools[0]!; // <- TODO: [🧠] Which script tool to use?

                                functionResponse = await scriptTool.execute({
                                    scriptLanguage: 'javascript', // <- TODO: [🧠] How to determine script language?
                                    script: `
                                        const args = ${JSON.stringify(functionArgs)};
                                        return await ${functionName}(args);
                                    `,
                                    parameters: prompt.parameters,
                                });

                                if (this.options.isVerbose) {
                                    console.info(`✅ Tool ${functionName} executed:`, functionResponse);
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
                                console.error(colors.bgRed(`❌ Error executing tool ${functionName}:`));
                                console.error(error);
                            }

                            toolOutputs.push({
                                tool_call_id: toolCall.id,
                                output: functionResponse,
                            });

                            completedToolCalls.push({
                                name: functionName,
                                arguments: toolCall.function.arguments,
                                result: functionResponse,
                                rawToolCall: toolCall,
                                createdAt: toolCall.id ? toolCallStartedAt.get(toolCall.id) || calledAt : calledAt,
                                errors,
                            });
                        }
                    }

                    // Submit tool outputs
                    run = await client.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
                        tool_outputs: toolOutputs,
                    });
                } else {
                    // Wait a bit before polling again
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    run = await client.beta.threads.runs.retrieve(run.thread_id, run.id);
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
            const resultContent = textContent.text.value;
            const usage = UNCERTAIN_USAGE;

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
        const usage = UNCERTAIN_USAGE;
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

    /**
     * Returns the per-knowledge-source download timeout in milliseconds.
     */
    private getKnowledgeSourceDownloadTimeoutMs(): number {
        return this.assistantOptions.knowledgeSourceDownloadTimeoutMs ?? 30000;
    }

    /**
     * Returns the max concurrency for knowledge source uploads.
     */
    private getKnowledgeSourceUploadMaxConcurrency(): number {
        return this.assistantOptions.knowledgeSourceUploadMaxConcurrency ?? 5;
    }

    /**
     * Returns the polling interval in milliseconds for vector store uploads.
     */
    private getKnowledgeSourceUploadPollIntervalMs(): number {
        return this.assistantOptions.knowledgeSourceUploadPollIntervalMs ?? 5000;
    }

    /**
     * Returns the overall upload timeout in milliseconds for vector store uploads.
     */
    private getKnowledgeSourceUploadTimeoutMs(): number {
        return this.assistantOptions.knowledgeSourceUploadTimeoutMs ?? 900000;
    }

    /**
     * Returns assistant-specific options with extended settings.
     */
    private get assistantOptions(): OpenAiAssistantExecutionToolsOptions {
        return this.options as OpenAiAssistantExecutionToolsOptions;
    }

    /**
     * Downloads a knowledge source URL into a Buffer-like object for vector store upload.
     *
     * Note: [🤰] Using Buffer-wrapped responses for better compatibility with OpenAI SDK in Node.js environments.
     */
    private async downloadKnowledgeSourceFile(options: {
        readonly source: string;
        readonly timeoutMs: number;
        readonly logLabel: string;
    }): Promise<{
        readonly file: OpenAI.FileCreateParams['file'];
        readonly sizeBytes: number;
        readonly filename: string;
        readonly elapsedMs: number;
    } | null> {
        const { source, timeoutMs, logLabel } = options;
        const startedAtMs = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Downloading knowledge source', {
                source,
                timeoutMs,
                logLabel,
            });
        }

        try {
            const response = await fetch(source, { signal: controller.signal });

            if (!response.ok) {
                console.error('[🤰]', 'Failed to download knowledge source', {
                    source,
                    status: response.status,
                    statusText: response.statusText,
                    elapsedMs: Date.now() - startedAtMs,
                    logLabel,
                });
                return null;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            let filename = source.split('/').pop() || 'downloaded-file';
            try {
                const url = new URL(source);
                filename = url.pathname.split('/').pop() || filename;
            } catch (error) {
                // Keep default filename
            }

            // [🤰] Using OpenAI.toFile to ensure the SDK correctly handles the buffer as a file with a name
            const file = await OpenAI.toFile(buffer, filename);
            const elapsedMs = Date.now() - startedAtMs;
            const sizeBytes = buffer.byteLength;

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Downloaded knowledge source', {
                    source,
                    filename,
                    sizeBytes,
                    elapsedMs,
                    logLabel,
                });
            }

            return { file, sizeBytes, filename, elapsedMs };
        } catch (error) {
            assertsError(error);
            console.error('[🤰]', 'Error downloading knowledge source', {
                source,
                elapsedMs: Date.now() - startedAtMs,
                logLabel,
                error: serializeError(error),
            });
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Uploads knowledge source files to the vector store and polls until processing completes.
     */
    private async uploadKnowledgeSourceFilesToVectorStore(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly files: ReadonlyArray<OpenAI.FileCreateParams['file']>;
        readonly totalBytes: number;
        readonly logLabel: string;
    }): Promise<OpenAI.Beta.VectorStores.FileBatches.VectorStoreFileBatch | null> {
        const { client, vectorStoreId, files, totalBytes, logLabel } = options;
        const uploadStartedAtMs = Date.now();
        const maxConcurrency = Math.max(1, this.getKnowledgeSourceUploadMaxConcurrency());
        const pollIntervalMs = Math.max(1000, this.getKnowledgeSourceUploadPollIntervalMs());
        const uploadTimeoutMs = Math.max(1000, this.getKnowledgeSourceUploadTimeoutMs());
        const chunkSize = 20; // [🤰] Chunk files to avoid OpenAI processing bottlenecks for large batches

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Uploading knowledge source files to OpenAI', {
                vectorStoreId,
                fileCount: files.length,
                totalBytes,
                maxConcurrency,
                pollIntervalMs,
                uploadTimeoutMs,
                chunkSize,
                logLabel,
            });
        }

        const fileEntries = files.map((file, index) => ({ file, index }));
        const fileIterator = fileEntries.values();
        const allFileIds: string[] = [];
        const failedUploads: Array<{ index: number; filename: string; error: ReturnType<typeof serializeError> }> = [];
        let uploadedCount = 0;

        const processFiles = async (
            iterator: IterableIterator<{ file: OpenAI.FileCreateParams['file']; index: number }>,
        ): Promise<void> => {
            for (const { file, index } of iterator) {
                const uploadIndex = index + 1;
                // [🤰] Get filename from the uploadable object if possible
                const filename = (file as any).name || (file as any).filename || `knowledge-source-${uploadIndex}`;
                const sizeBytes = (file as any).size;
                const fileUploadStartedAtMs = Date.now();

                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Uploading knowledge source file', {
                        index: uploadIndex,
                        total: files.length,
                        filename,
                        sizeBytes,
                        logLabel,
                    });
                }

                try {
                    const uploaded = await client.files.create({ file, purpose: 'assistants' });
                    allFileIds.push(uploaded.id);
                    uploadedCount += 1;

                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Uploaded knowledge source file', {
                            index: uploadIndex,
                            total: files.length,
                            filename,
                            sizeBytes,
                            fileId: uploaded.id,
                            status: uploaded.status, // [🤰] Log status to ensure it's not 'failed'
                            elapsedMs: Date.now() - fileUploadStartedAtMs,
                            logLabel,
                        });
                    }
                } catch (error) {
                    assertsError(error);
                    const serializedError = serializeError(error);
                    failedUploads.push({ index: uploadIndex, filename, error: serializedError });
                    console.error('[🤰]', 'Failed to upload knowledge source file', {
                        index: uploadIndex,
                        total: files.length,
                        filename,
                        sizeBytes,
                        elapsedMs: Date.now() - fileUploadStartedAtMs,
                        logLabel,
                        error: serializedError,
                    });
                }
            }
        };

        const workerCount = Math.min(maxConcurrency, files.length);
        const workers = Array.from({ length: workerCount }, () => processFiles(fileIterator));
        await Promise.all(workers);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Finished uploading knowledge source files', {
                vectorStoreId,
                fileCount: files.length,
                uploadedCount,
                failedCount: failedUploads.length,
                elapsedMs: Date.now() - uploadStartedAtMs,
                failedSamples: failedUploads.slice(0, 3),
                logLabel,
            });
        }

        if (allFileIds.length === 0) {
            console.error('[🤰]', 'No knowledge source files were uploaded', {
                vectorStoreId,
                fileCount: files.length,
                failedCount: failedUploads.length,
                logLabel,
            });
            return null;
        }

        // [🤰] Create batches in chunks
        const chunks: string[][] = [];
        for (let i = 0; i < allFileIds.length; i += chunkSize) {
            chunks.push(allFileIds.slice(i, i + chunkSize));
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Creating vector store file batches in chunks', {
                vectorStoreId,
                totalFiles: allFileIds.length,
                chunkCount: chunks.length,
                chunkSize,
                logLabel,
            });
        }

        let lastBatch: OpenAI.Beta.VectorStores.FileBatches.VectorStoreFileBatch | null = null;

        for (const [chunkIndex, fileIds] of chunks.entries()) {
            // [🤰] Small delay between batch creations to avoid OpenAI concurrency/rate issues
            if (chunkIndex > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            const batch = await client.beta.vectorStores.fileBatches.create(vectorStoreId, {
                file_ids: fileIds,
            });
            const expectedBatchId = batch.id;
            lastBatch = batch;

            if (this.options.isVerbose) {
                console.info('[🤰]', `Created vector store file batch ${chunkIndex + 1}/${chunks.length}`, {
                    vectorStoreId,
                    batchId: expectedBatchId,
                    fileCount: fileIds.length,
                    logLabel,
                });
            }

            const pollStartedAtMs = Date.now();
            const progressLogIntervalMs = Math.max(15000, pollIntervalMs);
            let lastStatus: string | undefined;
            let lastCountsKey = '';
            let lastLogAtMs = 0;
            let latestBatch = batch;

            while (true) {
                // [🤰] Always re-check the batch ID and ensure it is not overwritten or confused
                latestBatch = await client.beta.vectorStores.fileBatches.retrieve(vectorStoreId, expectedBatchId);
                const counts = latestBatch.file_counts;
                const countsKey = `${counts.completed}/${counts.failed}/${counts.in_progress}/${counts.cancelled}/${counts.total}`;
                const nowMs = Date.now();

                const shouldLog =
                    this.options.isVerbose &&
                    (latestBatch.status !== lastStatus ||
                        countsKey !== lastCountsKey ||
                        nowMs - lastLogAtMs >= progressLogIntervalMs);

                if (shouldLog) {
                    console.info('[🤰]', `Vector store file batch status ${chunkIndex + 1}/${chunks.length}`, {
                        vectorStoreId,
                        batchId: expectedBatchId,
                        status: latestBatch.status,
                        fileCounts: counts,
                        elapsedMs: nowMs - pollStartedAtMs,
                        logLabel,
                    });
                    lastStatus = latestBatch.status;
                    lastCountsKey = countsKey;
                    lastLogAtMs = nowMs;
                }

                if (latestBatch.status === 'completed') {
                    if (this.options.isVerbose) {
                        console.info('[🤰]', `Vector store file batch ${chunkIndex + 1}/${chunks.length} completed`, {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            fileCounts: latestBatch.file_counts,
                            elapsedMs: Date.now() - pollStartedAtMs,
                            logLabel,
                        });
                    }
                    break;
                }

                if (latestBatch.status === 'failed' || latestBatch.status === 'cancelled') {
                    console.error(
                        '[🤰]',
                        `Vector store file batch ${chunkIndex + 1}/${chunks.length} did not complete`,
                        {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            status: latestBatch.status,
                            fileCounts: latestBatch.file_counts,
                            elapsedMs: Date.now() - pollStartedAtMs,
                            logLabel,
                        },
                    );
                    break;
                }

                if (nowMs - pollStartedAtMs >= uploadTimeoutMs) {
                    console.error(
                        '[🤰]',
                        `Timed out waiting for vector store file batch ${chunkIndex + 1}/${chunks.length}`,
                        {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            fileCounts: latestBatch.file_counts,
                            elapsedMs: nowMs - pollStartedAtMs,
                            uploadTimeoutMs,
                            logLabel,
                        },
                    );

                    try {
                        // [🤰] Double check the ID being used for cancellation
                        if (!expectedBatchId.startsWith('vsfb_')) {
                            throw new Error(`Invalid batchId for cancellation: ${expectedBatchId}`);
                        }
                        await client.beta.vectorStores.fileBatches.cancel(vectorStoreId, expectedBatchId);
                        if (this.options.isVerbose) {
                            console.info(
                                '[🤰]',
                                `Cancelled vector store file batch ${chunkIndex + 1}/${chunks.length} after timeout`,
                                {
                                    vectorStoreId,
                                    batchId: expectedBatchId,
                                    logLabel,
                                },
                            );
                        }
                    } catch (error) {
                        assertsError(error);
                        console.error(
                            '[🤰]',
                            `Failed to cancel vector store file batch ${chunkIndex + 1}/${chunks.length} after timeout`,
                            {
                                vectorStoreId,
                                batchId: expectedBatchId,
                                logLabel,
                                error: serializeError(error),
                            },
                        );
                    }
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            }
        }

        return lastBatch;
    }

    /**
     * Creates a vector store and uploads knowledge sources, returning its ID.
     */
    private async createVectorStoreWithKnowledgeSources(options: {
        readonly client: OpenAI;
        readonly name: string_title;
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly logLabel: string;
    }): Promise<{
        readonly vectorStoreId: string;
        readonly uploadedFileCount: number;
        readonly skippedCount: number;
        readonly totalBytes: number;
    }> {
        const { client, name, knowledgeSources, logLabel } = options;
        const knowledgeSourcesCount = knowledgeSources.length;
        const downloadTimeoutMs = this.getKnowledgeSourceDownloadTimeoutMs();

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Creating vector store with knowledge sources', {
                name,
                knowledgeSourcesCount,
                downloadTimeoutMs,
                logLabel,
            });
        }

        const vectorStore = await client.beta.vectorStores.create({
            name: `${name} Knowledge Base`,
        });
        const vectorStoreId = vectorStore.id;

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Vector store created', {
                vectorStoreId,
                logLabel,
            });
        }

        const fileStreams: Array<OpenAI.FileCreateParams['file']> = [];
        const skippedSources: Array<{ source: string; reason: string }> = [];
        let totalBytes = 0;
        const processingStartedAtMs = Date.now();

        for (const [index, source] of knowledgeSources.entries()) {
            try {
                const sourceType = source.startsWith('http') || source.startsWith('https') ? 'url' : 'file';

                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Processing knowledge source', {
                        index: index + 1,
                        total: knowledgeSourcesCount,
                        source,
                        sourceType,
                        logLabel,
                    });
                }

                // Check if it's a URL
                if (source.startsWith('http://') || source.startsWith('https://')) {
                    const downloadResult = await this.downloadKnowledgeSourceFile({
                        source,
                        timeoutMs: downloadTimeoutMs,
                        logLabel,
                    });

                    if (downloadResult) {
                        fileStreams.push(downloadResult.file);
                        totalBytes += downloadResult.sizeBytes;
                    } else {
                        skippedSources.push({ source, reason: 'download_failed' });
                    }
                } else {
                    skippedSources.push({ source, reason: 'unsupported_source_type' });

                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Skipping knowledge source (unsupported type)', {
                            source,
                            sourceType,
                            logLabel,
                        });
                    }
                    /*
                    TODO: [?????] Resolve problem with browser environment
                    // Assume it's a local file path
                    // Note: This will work in Node.js environment
                    // For browser environments, this would need different handling
                    const fs = await import('fs');
                    const fileStream = fs.createReadStream(source);
                    fileStreams.push(fileStream);
                    */
                }
            } catch (error) {
                assertsError(error);
                skippedSources.push({ source, reason: 'processing_error' });
                console.error('[🤰]', 'Error processing knowledge source', {
                    source,
                    logLabel,
                    error: serializeError(error),
                });
            }
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Finished processing knowledge sources', {
                total: knowledgeSourcesCount,
                downloadedCount: fileStreams.length,
                skippedCount: skippedSources.length,
                totalBytes,
                elapsedMs: Date.now() - processingStartedAtMs,
                skippedSamples: skippedSources.slice(0, 3),
                logLabel,
            });
        }

        if (fileStreams.length > 0) {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Uploading files to vector store', {
                    vectorStoreId,
                    fileCount: fileStreams.length,
                    totalBytes,
                    maxConcurrency: this.getKnowledgeSourceUploadMaxConcurrency(),
                    pollIntervalMs: this.getKnowledgeSourceUploadPollIntervalMs(),
                    uploadTimeoutMs: this.getKnowledgeSourceUploadTimeoutMs(),
                    logLabel,
                });
            }

            try {
                await this.uploadKnowledgeSourceFilesToVectorStore({
                    client,
                    vectorStoreId,
                    files: fileStreams,
                    totalBytes,
                    logLabel,
                });
            } catch (error) {
                assertsError(error);
                console.error('[🤰]', 'Error uploading files to vector store', {
                    vectorStoreId,
                    logLabel,
                    error: serializeError(error),
                });
            }
        } else if (this.options.isVerbose) {
            console.info('[🤰]', 'No knowledge source files to upload', {
                vectorStoreId,
                skippedCount: skippedSources.length,
                logLabel,
            });
        }

        return {
            vectorStoreId,
            uploadedFileCount: fileStreams.length,
            skippedCount: skippedSources.length,
            totalBytes,
        };
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
