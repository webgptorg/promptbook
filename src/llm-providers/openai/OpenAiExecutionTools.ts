import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_markdown, string_markdown_text, string_name, string_title } from '../../types/typeAliases';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import { OPENAI_MODELS } from './openai-models';
import { OpenAiCompatibleExecutionTools } from './OpenAiCompatibleExecutionTools';

/**
 * Profile for OpenAI provider
 */
const OPENAI_PROVIDER_PROFILE: ChatParticipant = {
    name: 'OPENAI' as string_name,
    fullname: 'OpenAI GPT',
    color: '#10a37f',
} as const;

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

    public get profile() {
        return OPENAI_PROVIDER_PROFILE;
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
        return this.getDefaultModel('gpt-5');
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

    /**
     * Default model for image generation variant.
     */
    protected getDefaultImageGenerationModel(): AvailableModel {
        return this.getDefaultModel('dall-e-3');
    }

    // <- Note: [🤖] getDefaultXxxModel
}
