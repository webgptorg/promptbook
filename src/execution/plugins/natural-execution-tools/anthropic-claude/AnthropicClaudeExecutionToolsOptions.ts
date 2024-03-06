import { string_token } from '../../../../types/typeAliases';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';

/**
 * Options for AnthropicClaudeExecutionTools
 */
export interface AnthropicClaudeExecutionToolsOptions extends CommonExecutionToolsOptions {
    /**
     * AnthropicClaude API key
     */
    anthropicClaudeApiKey: string_token;

    // TODO: !!!! Put here claude BOT OpenAI
    /**
     * A unique identifier representing your end-user, which can help AnthropicClaude to monitor
     * and detect abuse. [Learn more](/docs/guides/safety-best-practices/end-user-ids).
     */
    user?: string_token;
}
