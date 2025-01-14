import type { Prompt } from '../../../types/Prompt';
import type { PromptbookServer_Identification } from '../_subtypes/PromptbookServer_Identification';

/**
 * This is a request from client to server to execute a prompt
 *
 * @private internal type of remote server
 */
export type PromptbookServer_Prompt_Request<TCustomOptions> = {
    /**
     * Identifier of the end user or application
     */
    readonly identification: PromptbookServer_Identification<TCustomOptions>;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};
