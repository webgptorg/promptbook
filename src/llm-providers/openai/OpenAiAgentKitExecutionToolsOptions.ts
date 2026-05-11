import type { string_model_name } from '../../types/typeAliases';
import type { OpenAiVectorStoreHandlerOptions } from './OpenAiVectorStoreHandler';

/**
 * Options for `OpenAiAgentKitExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiAgentKitExecutionToolsOptions = OpenAiVectorStoreHandlerOptions & {
    /**
     * Base model name used for AgentKit agents.
     *
     * @default gpt-5.2
     */
    readonly agentKitModelName?: string_model_name;
};
