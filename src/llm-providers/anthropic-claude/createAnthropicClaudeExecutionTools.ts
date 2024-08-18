import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { RemoteLlmExecutionTools } from '../remote/RemoteLlmExecutionTools';
import { AnthropicClaudeExecutionTools } from './AnthropicClaudeExecutionTools';
import type { AnthropicClaudeExecutionToolsOptions } from './AnthropicClaudeExecutionToolsOptions';

/**
 * Execution Tools for calling Anthropic Claude API.
 *
 * @public exported from `@promptbook/anthropic-claude`
 */
export const createAnthropicClaudeExecutionTools = Object.assign(
    (options: AnthropicClaudeExecutionToolsOptions): AnthropicClaudeExecutionTools | RemoteLlmExecutionTools => {
        if (options.isProxied) {
            return new RemoteLlmExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    ...options,
                    isAnonymous: true,
                    llmToolsConfiguration: [
                        {
                            title: 'Anthropic Claude (proxied)',
                            packageName: '@promptbook/anthropic-claude',
                            className: 'AnthropicClaudeExecutionTools',
                            options: {
                                ...options,
                                isProxied: false,
                            },
                        },
                    ],
                },
            );
        }

        return new AnthropicClaudeExecutionTools(options);
    },
    {
        packageName: '@promptbook/anthropic-claude',
        className: 'AnthropicClaudeExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🧠] !!!! Make anonymous this with all LLM providers
 * TODO: [🧠][🧱] !!!! Maybe change all `new AnthropicClaudeExecutionTools` -> `createAnthropicClaudeExecutionTools` in manual
 * TODO: [🧠] Maybe auto-detect usage in browser and determine default value of `isProxied`
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
