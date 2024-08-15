import type { ClientOptions } from '@anthropic-ai/sdk';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { RemoteLlmExecutionToolsOptions } from '../remote/interfaces/RemoteLlmExecutionToolsOptions';

/**
 * Options for `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type AnthropicClaudeExecutionToolsOptions =
    | AnthropicClaudeExecutionToolsDirectOptions
    | AnthropicClaudeExecutionToolsProxiedOptions;

/**
 * Options for directly used `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type AnthropicClaudeExecutionToolsDirectOptions = CommonExecutionToolsOptions &
    ClientOptions & {
        isProxied?: false;
    };

/**
 * Options for proxied `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type AnthropicClaudeExecutionToolsProxiedOptions = CommonExecutionToolsOptions &
    ClientOptions & {
        isProxied: true;
    } & Pick<RemoteLlmExecutionToolsOptions, 'remoteUrl' | 'path'>;

/**
 * TODO: [🧠][🤺] Detecting `user`
 */
