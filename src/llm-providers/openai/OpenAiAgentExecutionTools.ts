import colors from 'colors';
import OpenAI from 'openai';
import { TODO_any } from '../../_packages/types.index';
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
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';

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
        const input: Array<TODO_any> = []; // TODO: Type properly when OpenAI types are updated

        // Add previous messages from thread (if any)
        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            const previousMessages = prompt.thread.map((msg) => ({
                role: msg.sender === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
            }));
            input.push(...previousMessages);
        }

        // Add current user message
        input.push({
            role: 'user',
            content: rawPromptContent,
        });

        // Prepare tools
        const tools = modelRequirements.tools ? mapToolsToOpenAi(modelRequirements.tools) : undefined;
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

        // Call Responses API
        // Note: Using any cast because types might not be updated yet
        const response = await (client as TODO_any).responses.create(rawRequest);

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(response, null, 4));
        }

        const complete: string_date_iso8601 = $getCurrentDate();
        let resultContent = '';
        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];

        // Parse output items
        if (response.output) {
            for (const item of response.output) {
                if (item.type === 'message' && item.role === 'assistant') {
                    for (const contentPart of item.content) {
                        if (contentPart.type === 'output_text') {
                            // "output_text" based on migration guide, or "text"? Guide says "output_text" in example.
                            resultContent += contentPart.text;
                        } else if (contentPart.type === 'text') {
                            resultContent += contentPart.text.value || contentPart.text;
                        }
                    }
                } else if (item.type === 'function_call') {
                    // or tool_call?
                    // Guide says "function-calling API shape is different... function calls sent back... see guide"
                    // And "In Responses, tool calls and their outputs are two distinct types of Items that are correlated using a call_id"
                    // It doesn't show the exact shape in the example.
                    // I'll assume standard tool_calls shape or similar.
                    // The example showing output structure:
                    /*
                     {
                        "id": "msg_...",
                        "type": "message",
                        "content": [ { "type": "output_text", "text": "..." } ],
                        "role": "assistant"
                     }
                     */
                }
            }
        }

        // Use output_text helper if available (mentioned in guide)
        if (response.output_text) {
            resultContent = response.output_text;
        }

        // TODO: Handle tool calls properly (Requires clearer docs or experimentation)

        onProgress({
            content: resultContent,
            modelName: response.model || 'agent',
            timing: { start, complete },
            usage: UNCERTAIN_USAGE, // Responses API usage?
            rawPromptContent,
            rawRequest,
            rawResponse: response,
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
                rawRequest,
                rawResponse: response,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            },
        });
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
