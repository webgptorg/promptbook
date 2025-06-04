import { createPipelineExecutor } from '@promptbook/core';
import { createCollectionFromDirectory } from '@promptbook/node';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import { OpenAiCompatibleExecutionTools } from '../openai/OpenAiCompatibleExecutionTools';
import type { OpenAiExecutionToolsOptions } from '../openai/OpenAiExecutionToolsOptions';
import type { ChatCompletionCreateParams, ChatCompletionMessage } from 'openai/resources/chat/completions';

/**
 * Execution Tools for using Promptbook books as OpenAI-compatible models
 *
 * This allows using Promptbook books as if they were OpenAI models by:
 * 1. Setting the baseURL to your Promptbook server URL
 * 2. Using the book URL as the model name
 *
 * @public exported from `@promptbook/promptbook`
 */
export class PromptbookOpenAiExecutionTools extends OpenAiCompatibleExecutionTools implements LlmExecutionTools {
    public get title(): string_title & string_markdown_text {
        return 'Promptbook OpenAI Compatible';
    }

    public get description(): string_markdown {
        return 'Use Promptbook books as OpenAI-compatible models';
    }

    /**
     * Creates Promptbook OpenAI Compatible Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(options: OpenAiExecutionToolsOptions) {
        // Ensure baseURL is set to Promptbook server
        if (!options.baseURL) {
            throw new Error('baseURL must be set to your Promptbook server URL');
        }

        super(options);
    }

    /**
     * Override the model name to use the book URL
     */
    protected override async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'format'>,
    ): Promise<ChatPromptResult> {
        const { modelRequirements } = prompt;

        // Use the model name as the book URL
        const bookUrl = modelRequirements.modelName;
        if (!bookUrl) {
            throw new Error('modelName must be set to a Promptbook book URL');
        }

        // Create pipeline executor for the book
        const collection = await createCollectionFromDirectory('./books', this.tools);
        const pipeline = await collection.getPipelineByUrl(bookUrl);
        const pipelineExecutor = createPipelineExecutor({ pipeline, tools: this.tools });

        // Execute the pipeline with the prompt content as input
        const result = await pipelineExecutor({ prompt: prompt.content }).asPromise({ isCrashedOnError: true });

        if (!result.isSuccessful) {
            throw new Error(`Failed to execute book: ${result.errors.join(', ')}`);
        }

        // Return the result in OpenAI-compatible format
        return {
            content: result.outputParameters.response,
            usage: {
                promptTokens: 0, // TODO: Implement token counting
                completionTokens: 0,
                totalTokens: 0,
            },
            model: bookUrl,
        };
    }

    /**
     * Create a chat completion
     */
    public async createChatCompletion(params: ChatCompletionCreateParams) {
        const { model, messages } = params;

        // Convert messages to a single prompt
        const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

        // Create pipeline executor for the book
        const collection = await createCollectionFromDirectory('./books', this.tools);
        const pipeline = await collection.getPipelineByUrl(model);
        const pipelineExecutor = createPipelineExecutor({ pipeline, tools: this.tools });

        // Execute the pipeline with the prompt content as input
        const result = await pipelineExecutor({ prompt }).asPromise({ isCrashedOnError: true });

        if (!result.isSuccessful) {
            throw new Error(`Failed to execute book: ${result.errors.join(', ')}`);
        }

        // Return the result in OpenAI-compatible format
        return {
            id: 'chatcmpl-' + Math.random().toString(36).substring(2),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: result.outputParameters.response,
                    },
                    finish_reason: 'stop',
                },
            ],
            usage: {
                prompt_tokens: 0, // TODO: Implement token counting
                completion_tokens: 0,
                total_tokens: 0,
            },
        };
    }
}
