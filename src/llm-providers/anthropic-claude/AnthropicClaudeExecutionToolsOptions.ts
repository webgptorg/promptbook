import type { ClientOptions } from '@anthropic-ai/sdk';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
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
export type AnthropicClaudeExecutionToolsDirectOptions = CommonToolsOptions &
    ClientOptions & {
        isProxied?: false;
    };

/**
 * Options for proxied `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type AnthropicClaudeExecutionToolsProxiedOptions = CommonToolsOptions &
    ClientOptions & {
        isProxied: true;
    } & Pick<RemoteLlmExecutionToolsOptions<undefined>, 'remoteUrl' | 'path'>;

/**
 * TODO: [🧠][🤺] Detecting `user`
 */
