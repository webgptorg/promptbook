import type { ClientOptions } from 'openai';
import type { string_token } from '../../types/typeAliases';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';

/**
 * Options for `createOpenAiAssistantExecutionTools` and `OpenAiAssistantExecutionTools`
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiAssistantExecutionToolsOptions = OpenAiCompatibleExecutionToolsOptions &
    ClientOptions & {
        /**
         * Which assistant to use
         */
        assistantId: string_token;
        // <- TODO: [🧠] This should be maybe more like model for each prompt?
    };
