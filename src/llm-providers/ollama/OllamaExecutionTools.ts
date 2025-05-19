import { ZERO_VALUE } from '../../_packages/core.index';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { Usage } from '../../execution/Usage';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import { computeOpenAiUsage } from '../openai/computeOpenAiUsage';
import { OpenAiCompatibleExecutionTools } from '../openai/OpenAiCompatibleExecutionTools';
import { OpenAiExecutionToolsOptions } from '../openai/OpenAiExecutionToolsOptions';
import { OLLAMA_MODELS } from './ollama-models';
import { DEFAULT_OLLAMA_BASE_URL, OllamaExecutionToolsOptions } from './OllamaExecutionToolsOptions';

/**
 * Execution Tools for calling Ollama API
 *
 * @public exported from `@promptbook/ollama`
 */
export class OllamaExecutionTools extends OpenAiCompatibleExecutionTools implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */

    public constructor(ollamaOptions: OllamaExecutionToolsOptions) {
        const openAiCompatibleOptions = {
            baseURL: DEFAULT_OLLAMA_BASE_URL,
            ...ollamaOptions,
            userId: 'ollama',
        } satisfies OpenAiExecutionToolsOptions;

        super(openAiCompatibleOptions);
    }

    public get title(): string_title & string_markdown_text {
        return 'Ollama';
    }

    public get description(): string_markdown {
        return 'Use all models provided by Ollama';
    }

    /**
     * List all available models (non dynamically)
     *
     * Note: Purpose of this is to provide more information about models than standard listing from API
     */
    protected get HARDCODED_MODELS(): ReadonlyArray<AvailableModel> {
        return OLLAMA_MODELS;
    }

    /**
     * Computes the usage of the Ollama API based on the response from Ollama
     */
    protected computeUsage(...args: Parameters<typeof computeOpenAiUsage>): Usage {
        return {
            ...computeOpenAiUsage(...args),
            price: ZERO_VALUE, // <- Note: Running on local model, so no price, maybe in the future we can add a way to calculate price based on electricity usage
        };
    }

    /**
     * Default model for chat variant.
     */
    protected getDefaultChatModel(): AvailableModel {
        return this.getDefaultModel('llama2'); // <- TODO: [🧠] Pick the best default model
          // <- TODO: [🛄] When 'llama2' not installed, maybe better error message
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultCompletionModel(): AvailableModel {
        return this.getDefaultModel('llama2'); // <- TODO: [🧠] Pick the best default model
        // <- TODO: [🛄] When 'llama2' not installed, maybe better error message
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultEmbeddingModel(): AvailableModel {
        return this.getDefaultModel('text-embedding-3-large'); // <- TODO: [🧠] Pick the best default model
    // <- TODO: [🛄]
      }

    // <- Note: [🤖] getDefaultXxxModel
}


/**
 * TODO: [🛄] Some way how to re-wrap the errors from `OpenAiCompatibleExecutionTools`
 */