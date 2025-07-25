import type { ClientOptions } from '@anthropic-ai/sdk';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { RemoteClientOptions } from '../../remote-server/types/RemoteClientOptions';

/**
 * Options for `createAnthropicClaudeExecutionTools` and `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type AnthropicClaudeExecutionToolsOptions =
    | AnthropicClaudeExecutionToolsNonProxiedOptions
    | AnthropicClaudeExecutionToolsProxiedOptions;

/**
 * Options for directly used `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type AnthropicClaudeExecutionToolsNonProxiedOptions = CommonToolsOptions &
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
    } & Pick<RemoteClientOptions<undefined>, 'remoteServerUrl'>;

/**
 * TODO: [🧠][🤺] Pass `userId`
 */
