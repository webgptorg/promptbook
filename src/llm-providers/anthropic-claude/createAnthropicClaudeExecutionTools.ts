import { RemoteLlmExecutionTools } from '../remote/RemoteLlmExecutionTools';
import { ANTHROPIC_CLAUDE_MODELS } from './anthropic-claude-models';
import { AnthropicClaudeExecutionTools } from './AnthropicClaudeExecutionTools';
import type { AnthropicClaudeExecutionToolsOptions } from './AnthropicClaudeExecutionToolsOptions';

/**
 * Execution Tools for calling Anthropic Claude API.
 *
 * @public exported from `@promptbook/anthropic-claude`
 */
export function createAnthropicClaudeExecutionTools(
    options: AnthropicClaudeExecutionToolsOptions,
): AnthropicClaudeExecutionTools | RemoteLlmExecutionTools {
    if (options.isProxied) {
        return new RemoteLlmExecutionTools({
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
            models: ANTHROPIC_CLAUDE_MODELS,
        });
    }

    return new AnthropicClaudeExecutionTools(options);
}

/**
 * TODO: !!!!!! Make this with all LLM providers
 * TODO: !!!!!! Maybe change all `new AnthropicClaudeExecutionTools` -> `createAnthropicClaudeExecutionTools` in manual
 */