import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import { OPENAI_MODELS } from './openai-models';
import { OpenAiCompatibleExecutionTools } from './OpenAiCompatibleExecutionTools';

/**
 * Execution Tools for calling OpenAI API
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiExecutionTools extends OpenAiCompatibleExecutionTools implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */
    public get title(): string_title & string_markdown_text {
        return 'OpenAI';
    }

    public get description(): string_markdown {
        return 'Use all models provided by OpenAI';
    }

    /*
    Note: Commenting this out to avoid circular dependency
    /**
     * Create (sub)tools for calling OpenAI API Assistants
     *
     * @param assistantId Which assistant to use
     * @returns Tools for calling OpenAI API Assistants with same token
     * /
    public createAssistantSubtools(assistantId: string_token): OpenAiAssistantExecutionTools {
        return new OpenAiAssistantExecutionTools({ ...this.options, assistantId });
    }
    */

    /**
     * List all available models (non dynamically)
     *
     * Note: Purpose of this is to provide more information about models than standard listing from API
     */
    protected get HARDCODED_MODELS(): ReadonlyArray<AvailableModel> {
        return OPENAI_MODELS;
    }

    /**
     * Computes the usage of the OpenAI API based on the response from OpenAI
     */
    protected computeUsage = computeOpenAiUsage;

    /**
     * Default model for chat variant.
     */
    protected getDefaultChatModel(): AvailableModel {
        return this.getDefaultModel('gpt-4-turbo');
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultCompletionModel(): AvailableModel {
        return this.getDefaultModel('gpt-3.5-turbo-instruct');
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultEmbeddingModel(): AvailableModel {
        return this.getDefaultModel('text-embedding-3-large');
    }

    // <- Note: [🤖] getDefaultXxxModel
}
