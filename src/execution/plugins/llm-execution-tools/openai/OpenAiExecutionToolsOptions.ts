import type { ClientOptions } from 'openai';
import type { string_token } from './../../../../types/typeAliases';
import type { CommonExecutionToolsOptions } from './../../../CommonExecutionToolsOptions';

/**
 * Options for OpenAiExecutionTools
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * Rest is used by the `OpenAiExecutionTools`.
 */
export type OpenAiExecutionToolsOptions = CommonExecutionToolsOptions &
    ClientOptions & {
        /**
         * A unique identifier representing your end-user, which can help OpenAI to monitor
         * and detect abuse.
         *
         * @see https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids
         */
        user?: string_token;
    };
