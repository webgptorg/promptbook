import type { PromptResult } from '../../../execution/PromptResult';

/**
 * This is sent from server to client when the generated text is completed
 *
 * @private internal type of remote server
 */
export type PromptbookServer_Prompt_Response = {
    /**
     * The result of the prompt
     */
    readonly promptResult: PromptResult;
};
