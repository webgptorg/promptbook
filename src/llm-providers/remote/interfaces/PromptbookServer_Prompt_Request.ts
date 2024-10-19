import type { Prompt } from '../../../types/Prompt';
import type { string_user_id } from '../../../types/typeAliases';
import type { LlmToolsConfiguration } from '../../_common/register/LlmToolsConfiguration';
import { CollectionRemoteServerClientOptions } from './RemoteServerOptions';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
 */
export type PromptbookServer_Prompt_Request<TCustomOptions> =
    | PromptbookServer_Prompt_CollectionRequest<TCustomOptions>
    | PromptbookServer_Prompt_AnonymousRequest;

export type PromptbookServer_Prompt_CollectionRequest<TCustomOptions> =
    CollectionRemoteServerClientOptions<TCustomOptions> & {
        /**
         * Collection mode
         */
        readonly isAnonymous: false;

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
     * Note: In anonymous mode, there is no need to identify yourself, nor does it change the actual configuration of LLM Tools (unlike in collection mode)
     */
    readonly userId: string_user_id | null;

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
