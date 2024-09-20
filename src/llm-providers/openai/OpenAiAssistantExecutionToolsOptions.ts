import type { ClientOptions } from 'openai';
import type { string_token } from '../../types/typeAliases';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Options for `OpenAiAssistantExecutionTools`
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiAssistantExecutionToolsOptions = OpenAiExecutionToolsOptions &
    ClientOptions & {
        /**
         * Which assistant to use
         */
        assistantId?: string_token;
        // <- TODO: [🧠] This should be maybe more like model for each prompt?
    };
