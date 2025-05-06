import { DEFAULT_REMOTE_SERVER_URL } from '../../config';
import { MODEL_ORDERS } from '../../constants';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';

/**
 * Registration of LLM provider metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizzard`
 * @public exported from `@promptbook/cli`
 */
export const _AnthropicClaudeMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Anthropic Claude',
    packageName: '@promptbook/anthropic-claude',
    className: 'AnthropicClaudeExecutionTools',
    envVariables: ['ANTHROPIC_CLAUDE_API_KEY'],
    trustLevel: 'CLOSED',
    order: MODEL_ORDERS.TOP_TIER,

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Anthropic Claude',
            packageName: '@promptbook/anthropic-claude',
            className: 'AnthropicClaudeExecutionTools',
            options: {
                apiKey: 'sk-ant-api03-',
                isProxied: true,
                remoteServerUrl: DEFAULT_REMOTE_SERVER_URL,
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        // Note: Note using `process.env` BUT `env` to pass in the environment variables dynamically
        if (typeof env.ANTHROPIC_CLAUDE_API_KEY === 'string') {
            return {
                title: 'Claude (from env)',
                packageName: '@promptbook/anthropic-claude',
                className: 'AnthropicClaudeExecutionTools',
                options: {
                    apiKey: env.ANTHROPIC_CLAUDE_API_KEY!,
                },
            };
        }

        return null;
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
