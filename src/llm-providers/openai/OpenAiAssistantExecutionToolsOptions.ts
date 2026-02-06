import type { string_token } from '../../types/typeAliases';
import type { OpenAiVectorStoreHandlerOptions } from './OpenAiVectorStoreHandler';

/**
 * Options for `createOpenAiAssistantExecutionTools` and `OpenAiAssistantExecutionTools`
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiAssistantExecutionToolsOptions = OpenAiVectorStoreHandlerOptions & {
    /**
     * Whether creating new assistants is allowed
     *
     * @default false
     */
    readonly isCreatingNewAssistantsAllowed: boolean;

    /**
     * Which assistant to use
     */
    readonly assistantId: string_token;
    // <- TODO: [🧠] This should be maybe more like model for each prompt?
};
