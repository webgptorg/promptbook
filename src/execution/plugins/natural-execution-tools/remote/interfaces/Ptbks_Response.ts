import { PromptResult } from '../../../../../execution/PromptResult';

/**
 * Socket.io error for remote text generation
 *
 * This is sent from server to client when the generated text is completed
 */
export interface Ptbks_Response {
    /**
     * The result of the prompt
     */
    promptResult: PromptResult;
}
