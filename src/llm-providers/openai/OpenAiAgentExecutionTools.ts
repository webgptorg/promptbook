import colors from 'colors';
import OpenAI from 'openai';
import { TODO_any } from '../../_packages/types.index';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601, string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import { mapToolsToOpenAiResponses } from './utils/mapToolsToOpenAiResponses';

/**
 * Options for OpenAiAgentExecutionTools
 */
export type OpenAiAgentExecutionToolsOptions = OpenAiCompatibleExecutionToolsNonProxiedOptions & {
    /**
     * ID of the vector store to use for file search
     */
    readonly vectorStoreId?: string;
};

/**
 * Execution Tools for calling OpenAI API using the Responses API (Agents)
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAgentExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {
    public readonly vectorStoreId?: string;

    public constructor(options: OpenAiAgentExecutionToolsOptions) {
        super(options);
        this.vectorStoreId = options.vectorStoreId;
    }

    /**
     * Creates a new OpenAI Agent execution tools instance with an updated vector store ID.
     *
     * @param vectorStoreId - Optional vector store ID to attach for file search.
     */
    public withVectorStoreId(vectorStoreId?: string): OpenAiAgentExecutionTools {
        return new OpenAiAgentExecutionTools({ ...this.options, vectorStoreId });
    }

    /**
     * Creates OpenAI Agent execution tools from an existing OpenAI tools instance.
     *
     * @param tools - Existing OpenAI tools instance to copy configuration from.
     * @param options - Overrides for the new agent tools instance.
     */
    public static fromOpenAiTools(
        tools: OpenAiExecutionTools,
        options: { vectorStoreId?: string } = {},
    ): OpenAiAgentExecutionTools {
        return new OpenAiAgentExecutionTools({
            ...tools.options,
            vectorStoreId: options.vectorStoreId,
        });
    }

    public get title(): string_title & string_markdown_text {
        return 'OpenAI Agent';
    }

    public get description(): string_markdown {
        return 'Use OpenAI Responses API (Agentic)';
    }

    /**
     * Calls OpenAI API to use a chat model with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('?? OpenAI Agent callChatModel call', { prompt });
        }

        const { content, parameters, modelRequirements } = prompt;
        const client = await this.getClient();

        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const rawPromptContent = templateParameters(content, {
            ...parameters,
            modelName: 'agent',
        });

        const input = await this.buildInputItems(prompt, rawPromptContent);

        const tools = 'tools' in prompt && Array.isArray(prompt.tools) ? prompt.tools : modelRequirements.tools;
        const agentTools: Array<TODO_any> = tools ? mapToolsToOpenAiResponses(tools) : [];

        let toolResources: TODO_any = undefined;

        if (this.vectorStoreId) {
            agentTools.push({ type: 'file_search' });

            toolResources = {
                file_search: {
                    vector_store_ids: [this.vectorStoreId],
                },
            };
        }

        if (
            modelRequirements.knowledgeSources &&
            modelRequirements.knowledgeSources.length > 0 &&
            !this.vectorStoreId
        ) {
            console.warn(
                'Knowledge sources provided but no vector store ID. Creating temporary vector store is not implemented in callChatModelStream.',
            );
        }

        const start: string_date_iso8601 = $getCurrentDate();
        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];

        let currentInput = [...input];
        let rawRequest: TODO_any = null;
        let rawResponse: TODO_any = null;
        let resultContent = '';
        let didFinish = false;

        const maxToolIterations = 8;

        for (let iteration = 0; iteration < maxToolIterations; iteration += 1) {
            rawRequest = {
                model: modelRequirements.modelName || 'gpt-4o',
                input: currentInput,
                instructions: modelRequirements.systemMessage,
                tools: agentTools.length > 0 ? agentTools : undefined,
                tool_resources: toolResources,
                store: false,
            };

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawRequest (Responses API)'), JSON.stringify(rawRequest, null, 4));
            }

            rawResponse = await (client as TODO_any).responses.create(rawRequest);

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            const { outputItems, messageText, functionCalls } = this.parseResponseOutput(rawResponse);
            resultContent = messageText;

            if (functionCalls.length === 0) {
                didFinish = true;
                break;
            }

            const toolCallStartedAt = new Map<string, string_date_iso8601>();
            const pendingToolCalls = functionCalls.map((call) => {
                const calledAt = $getCurrentDate();
                toolCallStartedAt.set(call.callId, calledAt);

                return {
                    name: call.name,
                    arguments: call.rawArguments,
                    result: '',
                    rawToolCall: call.rawItem,
                    createdAt: calledAt,
                };
            });

            onProgress({
                content: resultContent,
                modelName: rawResponse.model || rawRequest.model || 'agent',
                timing: { start, complete: $getCurrentDate() },
                usage: UNCERTAIN_USAGE,
                rawPromptContent,
                rawRequest,
                rawResponse,
                toolCalls: pendingToolCalls,
            });

            const toolOutputItems: Array<TODO_any> = [];

            for (const call of functionCalls) {
                const calledAt = toolCallStartedAt.get(call.callId) || $getCurrentDate();
                const executionResult = await this.executeFunctionTool(call.name, call.rawArguments, prompt);

                toolOutputItems.push({
                    type: 'function_call_output',
                    call_id: call.callId,
                    output: executionResult.output,
                });

                toolCalls.push({
                    name: call.name,
                    arguments: executionResult.rawArguments,
                    result: executionResult.output,
                    rawToolCall: call.rawItem,
                    createdAt: calledAt,
                    errors: executionResult.errors,
                });
            }

            currentInput = [...currentInput, ...outputItems, ...toolOutputItems];
            resultContent = '';
        }

        if (!didFinish) {
            throw new PipelineExecutionError(
                `Exceeded maximum tool call iterations (${maxToolIterations}) in OpenAiAgentExecutionTools`,
            );
        }

        const complete: string_date_iso8601 = $getCurrentDate();
        const finalChunk: ChatPromptResult = {
            content: resultContent,
            modelName: rawResponse?.model || rawRequest?.model || 'agent',
            timing: { start, complete },
            usage: UNCERTAIN_USAGE,
            rawPromptContent,
            rawRequest,
            rawResponse,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };

        onProgress(finalChunk);

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiAgentExecutionTools.callChatModelStream\``,
            order: [],
            value: finalChunk,
        });
    }

    /**
     * Builds input items for the Responses API from a prompt.
     */
    private async buildInputItems(prompt: Prompt, rawPromptContent: string): Promise<Array<TODO_any>> {
        const input: Array<TODO_any> = [];

        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            const previousMessages = prompt.thread.map((msg) => ({
                role: msg.sender === 'assistant' || msg.sender === 'agent' ? 'assistant' : 'user',
                content: msg.content,
            }));
            input.push(...previousMessages);
        }

        if ('files' in prompt && Array.isArray(prompt.files) && prompt.files.length > 0) {
            const filesContent = await Promise.all(
                prompt.files.map(async (file: File) => {
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    return {
                        type: 'image_url',
                        image_url: {
                            url: `data:${file.type};base64,${base64}`,
                        },
                    };
                }),
            );

            input.push({
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: rawPromptContent,
                    },
                    ...filesContent,
                ],
            });
        } else {
            input.push({
                role: 'user',
                content: rawPromptContent,
            });
        }

        return input;
    }

    /**
     * Parses a Responses API response into output items, text content, and function calls.
     */
    private parseResponseOutput(response: TODO_any): {
        outputItems: Array<TODO_any>;
        messageText: string;
        functionCalls: Array<{ callId: string; name: string; rawArguments: unknown; rawItem: TODO_any }>;
    } {
        const outputItems = Array.isArray(response?.output) ? response.output : [];
        let messageText = '';
        const functionCalls: Array<{ callId: string; name: string; rawArguments: unknown; rawItem: TODO_any }> = [];

        for (const item of outputItems) {
            if (item.type === 'message' && item.role === 'assistant') {
                for (const contentPart of item.content || []) {
                    if (contentPart.type === 'output_text') {
                        messageText += contentPart.text || '';
                    } else if (contentPart.type === 'text') {
                        messageText += contentPart.text?.value || contentPart.text || '';
                    }
                }
            }

            if (item.type === 'function_call' || item.type === 'tool_call') {
                const normalized = this.normalizeFunctionCallItem(item);
                if (normalized) {
                    functionCalls.push({ ...normalized, rawItem: item });
                }
            }
        }

        if (typeof response?.output_text === 'string' && response.output_text.length > 0) {
            messageText = response.output_text;
        }

        return { outputItems, messageText, functionCalls };
    }

    /**
     * Normalizes a function-call item from the Responses API.
     */
    private normalizeFunctionCallItem(
        item: TODO_any,
    ): { callId: string; name: string; rawArguments: unknown } | null {
        const callId = item.call_id || item.id;
        const name = item.name || item.function?.name;
        const rawArguments =
            item.arguments ?? item.function?.arguments ?? item.args ?? item.arguments_json ?? item.function?.args;

        if (!callId || !name) {
            return null;
        }

        return { callId, name, rawArguments };
    }

    /**
     * Executes a function tool using configured script tools.
     */
    private async executeFunctionTool(
        functionName: string,
        rawArguments: unknown,
        prompt: Prompt,
    ): Promise<{
        output: string;
        rawArguments: string | Record<string, TODO_any> | undefined;
        errors?: Array<ReturnType<typeof serializeError>>;
    }> {
        let parsedArguments: Record<string, TODO_any> = {};
        let normalizedArguments: string | Record<string, TODO_any> | undefined = undefined;

        if (typeof rawArguments === 'string') {
            normalizedArguments = rawArguments;
            try {
                parsedArguments = JSON.parse(rawArguments);
            } catch (error) {
                parsedArguments = { raw: rawArguments };
            }
        } else if (rawArguments && typeof rawArguments === 'object') {
            normalizedArguments = rawArguments as Record<string, TODO_any>;
            parsedArguments = rawArguments as Record<string, TODO_any>;
        }

        const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

        if (!executionTools || !executionTools.script) {
            throw new PipelineExecutionError(
                `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiAgentExecutionTools options`,
            );
        }

        const scriptTools = Array.isArray(executionTools.script) ? executionTools.script : [executionTools.script];

        let functionResponse: string;
        let errors: Array<ReturnType<typeof serializeError>> | undefined;

        try {
            const scriptTool = scriptTools[0]!;

            functionResponse = await scriptTool.execute({
                scriptLanguage: 'javascript',
                script: `
                    const args = ${JSON.stringify(parsedArguments)};
                    return await ${functionName}(args);
                `,
                parameters: prompt.parameters,
            });
        } catch (error) {
            assertsError(error);
            functionResponse = `Error: ${error.message}`;
            errors = [serializeError(error)];
        }

        return {
            output: functionResponse,
            rawArguments: normalizedArguments,
            errors,
        };
    }

    /**
     * Creates a vector store from knowledge sources
     */
    public static async createVectorStore(
        client: OpenAI,
        name: string,
        knowledgeSources: ReadonlyArray<string>,
    ): Promise<string> {
        // Create a vector store
        const vectorStore = await client.beta.vectorStores.create({
            name: `${name} Knowledge Base`,
        });
        const vectorStoreId = vectorStore.id;

        // Upload files from knowledge sources to the vector store
        const fileStreams = [];
        for (const source of knowledgeSources) {
            try {
                // Check if it's a URL
                if (source.startsWith('http://') || source.startsWith('https://')) {
                    // Download the file
                    const response = await fetch(source);
                    if (!response.ok) {
                        console.error(`Failed to download ${source}: ${response.statusText}`);
                        continue;
                    }
                    const buffer = await response.arrayBuffer();
                    const filename = source.split('/').pop() || 'downloaded-file';
                    const blob = new Blob([buffer]);
                    const file = new File([blob], filename);
                    fileStreams.push(file);
                } else {
                    // Local files not supported in browser env easily, same as before
                }
            } catch (error) {
                console.error(`Error processing knowledge source ${source}:`, error);
            }
        }

        // Batch upload files to the vector store
        if (fileStreams.length > 0) {
            try {
                await client.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
                    files: fileStreams,
                });
            } catch (error) {
                console.error('Error uploading files to vector store:', error);
            }
        }

        return vectorStoreId;
    }

    /**
     * Discriminant for type guards
     */
    protected get discriminant() {
        return 'OPEN_AI_AGENT';
    }

    /**
     * Type guard to check if given `LlmExecutionTools` are instanceof `OpenAiAgentExecutionTools`
     */
    public static isOpenAiAgentExecutionTools(
        llmExecutionTools: LlmExecutionTools,
    ): llmExecutionTools is OpenAiAgentExecutionTools {
        return (llmExecutionTools as OpenAiAgentExecutionTools).discriminant === 'OPEN_AI_AGENT';
    }
}
