import type { PromptResult } from '../../../execution/PromptResult';

/**
 * Socket.io error for remote text generation
 *
 * This is sent from server to client when the generated text is completed
 */
export interface PromptbookServer_Prompt_Response {
    /**
     * The result of the prompt
     */
    promptResult: PromptResult;
}
