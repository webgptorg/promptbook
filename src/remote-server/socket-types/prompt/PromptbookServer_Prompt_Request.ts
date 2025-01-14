import type { Prompt } from '../../../types/Prompt';
import { PromptbookServer_Identification } from '../_subtypes/PromptbookServer_Identification';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
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
