import type { Prompt } from '../../types/Prompt';
import { PromptbookServer_Identification } from './subtypes/PromptbookServer_Identification';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
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
