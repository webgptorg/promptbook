import { string_token } from '../../../.././types/typeAliases';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';

/**
 * Options for OpenAiExecutionTools
 */
export type OpenAiExecutionToolsOptions = CommonExecutionToolsOptions & {
    /**
     * OpenAI API key
     */
    openAiApiKey: string_token;

    /**
     * A unique identifier representing your end-user, which can help OpenAI to monitor
     * and detect abuse. [Learn more](/docs/guides/safety-best-practices/end-user-ids).
     */
    user?: string_token;
};
