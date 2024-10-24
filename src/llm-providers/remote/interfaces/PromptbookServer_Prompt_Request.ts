import type { Prompt } from '../../../types/Prompt';
import type { string_user_id } from '../../../types/typeAliases';
import type { LlmToolsConfiguration } from '../../_common/register/LlmToolsConfiguration';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
 */
export type PromptbookServer_Prompt_Request =
    | PromptbookServer_Prompt_CollectionRequest
    | PromptbookServer_Prompt_AnonymousRequest;

export type PromptbookServer_Prompt_CollectionRequest = {
    /**
     * Collection mode
     */
    readonly isAnonymous: false;

    /**
     * Identifier of the end user
     *
     * Note: this is passed to the certain model providers to identify misuse
     * Note: In anonymous mode it is not required to identify
     */
    readonly userId: string_user_id;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};

export type PromptbookServer_Prompt_AnonymousRequest = {
    /**
     * Anonymous mode
     */
    readonly isAnonymous: true;

    /**
     * Identifier of the end user
     *
     * Note: this is passed to the certain model providers to identify misuse
     * Note: In anonymous mode it is not required to identify
     */
    readonly userId?: string_user_id;

    /**
     * Configuration for the LLM tools
     */
    readonly llmToolsConfiguration: LlmToolsConfiguration;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};

/**
 * TODO: [👡] DRY `PromptbookServer_Prompt_Request` and `PromptbookServer_ListModels_Request`
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 */
