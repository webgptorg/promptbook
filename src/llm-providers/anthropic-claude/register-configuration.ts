import { DEFAULT_REMOTE_URL } from '../../config';
import { DEFAULT_REMOTE_URL_PATH } from '../../config';
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
 * @public exported from `@promptbook/cli`
 */
export const _AnthropicClaudeMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Anthropic Claude',
    packageName: '@promptbook/anthropic-claude',
    className: 'AnthropicClaudeExecutionTools',

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Anthropic Claude (boilerplate)',
            packageName: '@promptbook/anthropic-claude',
            className: 'AnthropicClaudeExecutionTools',
            options: {
                apiKey: 'sk-ant-api03-',
                isProxied: true,
                remoteUrl: DEFAULT_REMOTE_URL,
                path: DEFAULT_REMOTE_URL_PATH,
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (typeof env.ANTHROPIC_CLAUDE_API_KEY === 'string') {
            return {
                title: 'Claude (from env)',
                packageName: '@promptbook/anthropic-claude',
                className: 'AnthropicClaudeExecutionTools',
                options: {
                    apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
                },
            };
        }

        return null;
    },
});
