import type { ClientOptions } from '@anthropic-ai/sdk';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';

/**
 * Options for `AnthropicClaudeExecutionTools`
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 */
export type AnthropicClaudeExecutionToolsOptions = CommonExecutionToolsOptions & ClientOptions;


/**
 * TODO: [🍜] Auto add WebGPT / Promptbook.studio anonymous server in browser
 */