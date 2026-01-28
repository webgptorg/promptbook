import colors from 'colors';
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
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

    public get title(): string_title & string_markdown_text {
        return 'OpenAI Agent';
    }

    public get description(): string_markdown {
        return 'Use OpenAI Responses API (Agentic)';
    }

    /**
     * Returns a new OpenAiAgentExecutionTools instance with the specified vector store ID.
     */
    public withVectorStoreId(vectorStoreId?: string): OpenAiAgentExecutionTools {
        return new OpenAiAgentExecutionTools({
            ...this.options,
            vectorStoreId,
        });
    }

    /**
     * Calls OpenAI API to use a chat model with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI Agent callChatModel call', { prompt });
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

        // Build input items
        let input: Array<TODO_any> = []; // TODO: Type properly when OpenAI types are updated

        // Add previous messages from thread (if any)
        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            const previousMessages = prompt.thread.map((msg) => ({
                role: msg.sender === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
            }));
            input.push(...previousMessages);
        }

        // Add current user message
        const userMessage: TODO_any = {
            role: 'user',
            content: rawPromptContent,
        };

        if ('files' in prompt && Array.isArray(prompt.files) && prompt.files.length > 0) {
            const filesContent = await Promise.all(
                prompt.files.map(async (file: File) => {
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    return {
                        type: 'input_image',
                        image_url: `data:${file.type};base64,${base64}`,
                    };
                }),
            );

            userMessage.content = [
                {
                    type: 'input_text',
                    text: rawPromptContent,
                },
                ...filesContent,
            ];
        }

        input.push(userMessage);

        // Prepare tools
        const toolsFromPrompt =
            'tools' in prompt && Array.isArray(prompt.tools) ? prompt.tools : modelRequirements.tools;
        const tools = toolsFromPrompt ? mapToolsToOpenAiResponses(toolsFromPrompt) : undefined;
        // Add file_search if vector store is present
        const agentTools: Array<TODO_any> = tools ? [...tools] : [];

        let toolResources: TODO_any = undefined;

        if (this.vectorStoreId) {
            agentTools.push({ type: 'file_search' });

            toolResources = {
                file_search: {
                    vector_store_ids: [this.vectorStoreId],
                },
            };
        }

        // Add file_search also if knowledgeSources are present in the prompt (passed via AgentLlmExecutionTools)
        if (
            modelRequirements.knowledgeSources &&
            modelRequirements.knowledgeSources.length > 0 &&
            !this.vectorStoreId
        ) {
            // Note: Vector store should have been created by AgentLlmExecutionTools and passed via options.
            // If we are here, it means we have knowledge sources but no vector store ID.
            // We can't easily create one here without persisting it.
            console.warn(
                'Knowledge sources provided but no vector store ID. Creating temporary vector store is not implemented in callChatModelStream.',
            );
        }

        const start: string_date_iso8601 = $getCurrentDate();

        // Construct the request
        const rawRequest: TODO_any = {
            // TODO: Type properly as OpenAI.Responses.CreateResponseParams
            model: modelRequirements.modelName || 'gpt-4o', // Responses API requires gpt-4o or newer
            input,
            instructions: modelRequirements.systemMessage,
            tools: agentTools.length > 0 ? agentTools : undefined,
            tool_resources: toolResources,
            store: false, // Stateless by default as we pass full history
        };

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest (Responses API)'), JSON.stringify(rawRequest, null, 4));
        }

        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
        let lastRawRequest: TODO_any = rawRequest;
        let response: TODO_any = await (client as TODO_any).responses.create(rawRequest);

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(response, null, 4));
        }

        let resultContent = '';

        let isLooping = true;

        while (isLooping) {
            const outputItems: Array<TODO_any> = Array.isArray(response.output) ? response.output : [];
            const functionCalls: Array<TODO_any> = outputItems.filter(
                (item: TODO_any) => item.type === 'function_call',
            );
            const { text: responseText, annotations } = this.extractResponseTextAndAnnotations(response);

            if (functionCalls.length === 0) {
                resultContent = responseText;
                resultContent = await this.replaceFileCitations(resultContent, annotations, client);
                isLooping = false;
                continue;
            }

            const toolCallStartedAt = new Map<string, string_date_iso8601>();
            const pendingToolCalls = functionCalls.map((toolCall: TODO_any) => {
                const calledAt = $getCurrentDate();
                const callId = toolCall.call_id || toolCall.id;
                const rawArgs = toolCall.arguments ?? toolCall.function?.arguments ?? '{}';
                const functionArgs = typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs);
                if (callId) {
                    toolCallStartedAt.set(callId, calledAt);
                }

                return {
                    name: toolCall.name || toolCall.function?.name || 'tool',
                    arguments: functionArgs,
                    result: '',
                    rawToolCall: toolCall,
                    createdAt: calledAt,
                };
            });

            onProgress({
                content: responseText || '',
                modelName: response.model || 'agent',
                timing: { start, complete: $getCurrentDate() },
                usage: UNCERTAIN_USAGE,
                rawPromptContent,
                rawRequest: lastRawRequest,
                rawResponse: response,
                toolCalls: pendingToolCalls,
            });

            const toolOutputs: Array<TODO_any> = [];

            for (const toolCall of functionCalls) {
                const functionName = toolCall.name || toolCall.function?.name;
                const rawArgs = toolCall.arguments ?? toolCall.function?.arguments ?? '{}';
                const functionArgs = typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs);
                const callId = toolCall.call_id || toolCall.id;
                const calledAt = callId ? toolCallStartedAt.get(callId) || $getCurrentDate() : $getCurrentDate();

                if (!functionName) {
                    throw new PipelineExecutionError('Tool call received without a function name');
                }

                if (!callId) {
                    throw new PipelineExecutionError(`Tool call "${functionName}" is missing call_id`);
                }

                const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

                if (!executionTools || !executionTools.script) {
                    throw new PipelineExecutionError(
                        `Model requested tool '${functionName}' but no executionTools.script were provided in OpenAiAgentExecutionTools options`,
                    );
                }

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
                            const args = ${functionArgs};
                            return await ${functionName}(args);
                        `,
                        parameters: prompt.parameters,
                    });
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
                    console.error(colors.bgRed(`Error executing tool ${functionName}:`));
                    console.error(error);
                }

                toolOutputs.push({
                    type: 'function_call_output',
                    call_id: callId,
                    output: functionResponse,
                });

                toolCalls.push({
                    name: functionName,
                    arguments: functionArgs,
                    result: functionResponse,
                    rawToolCall: toolCall,
                    createdAt: calledAt,
                    errors,
                });
            }

            input = input.concat(outputItems, toolOutputs);

            lastRawRequest = {
                ...rawRequest,
                input,
            };

            response = await (client as TODO_any).responses.create(lastRawRequest);

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(response, null, 4));
            }
        }

        const complete: string_date_iso8601 = $getCurrentDate();

        onProgress({
            content: resultContent,
            modelName: response.model || 'agent',
            timing: { start, complete },
            usage: UNCERTAIN_USAGE, // Responses API usage?
            rawPromptContent,
            rawRequest: lastRawRequest,
            rawResponse: response,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiAgentExecutionTools.callChatModelStream\``,
            order: [],
            value: {
                content: resultContent,
                modelName: response.model || 'agent',
                timing: { start, complete },
                usage: UNCERTAIN_USAGE,
                rawPromptContent,
                rawRequest: lastRawRequest,
                rawResponse: response,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            },
        });
    }

    /**
     * Extracts assistant text and annotations from a Responses API output payload.
     */
    private extractResponseTextAndAnnotations(response: TODO_any): {
        text: string;
        annotations: Array<TODO_any>;
    } {
        let text = '';
        const annotations: Array<TODO_any> = [];

        if (Array.isArray(response.output)) {
            for (const item of response.output) {
                if (item.type !== 'message' || item.role !== 'assistant' || !Array.isArray(item.content)) {
                    continue;
                }

                for (const contentPart of item.content) {
                    if (contentPart.type === 'output_text' && typeof contentPart.text === 'string') {
                        text += contentPart.text;
                    } else if (contentPart.type === 'text') {
                        text += contentPart.text?.value || contentPart.text || '';
                    }

                    if (Array.isArray(contentPart.annotations)) {
                        annotations.push(...contentPart.annotations);
                    }
                }
            }
        }

        if (!text && response.output_text) {
            text = response.output_text;
        }

        return { text, annotations };
    }

    /**
     * Replaces file citation markers with filenames when available.
     */
    private async replaceFileCitations(
        content: string,
        annotations: Array<TODO_any>,
        client: OpenAI,
    ): Promise<string> {
        if (!content || annotations.length === 0) {
            return content;
        }

        const fileIdToName = new Map<string, string>();
        let updatedContent = content;

        for (const annotation of annotations) {
            const fileId = annotation.file_citation?.file_id || annotation.file_id;
            const annotationText = annotation.text;

            if (!fileId || !annotationText) {
                continue;
            }

            let filename = fileIdToName.get(fileId);

            if (!filename) {
                try {
                    const file = await client.files.retrieve(fileId);
                    filename = file.filename;
                    fileIdToName.set(fileId, filename);
                } catch (error) {
                    console.error(`Failed to retrieve file info for ${fileId}`, error);
                    filename = 'Source';
                }
            }

            if (filename) {
                const newText = annotationText.replace(/†.*?】/, `†${filename}】`);
                updatedContent = updatedContent.replace(annotationText, newText);
            }
        }

        return updatedContent;
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
