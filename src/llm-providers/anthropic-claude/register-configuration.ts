import { DEFAULT_REMOTE_URL, DEFAULT_REMOTE_URL_PATH } from '../../config';
import type { string_name } from '../../types/typeAliases';
import { Registration } from '../../utils/$Register';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';


/**
 * @@@ registration1 of default configuration for Anthropic Claude
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
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
