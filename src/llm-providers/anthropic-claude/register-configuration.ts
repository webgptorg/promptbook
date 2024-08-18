import { DEFAULT_REMOTE_URL } from '../../config';
import { DEFAULT_REMOTE_URL_PATH } from '../../config';
import type { string_name } from '../../types/typeAliases';
import { $llmToolsMetadataRegister } from '../_common/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/LlmToolsConfiguration';

/**
 * @@@ registration1 of default configuration for Anthropic Claude
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 */
export const _AnthropicClaudeMetadataRegistration = $llmToolsMetadataRegister.register({
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
                packageName: '@promptbook/antrhopic-claude',
                className: 'AnthropicClaudeExecutionTools',
                options: {
                    apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
                },
            };
        }

        return null;
    },
});
