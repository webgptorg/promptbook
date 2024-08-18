import { string_name } from '../../types/typeAliases';
import { $llmToolsMetadataRegister } from '../_common/$llmToolsMetadataRegister';
import { LlmToolsConfiguration } from '../_common/LlmToolsConfiguration';

/**
 * @@@ registration1 of default configuration for Open AI
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 */
export const _OpenAiMetadataRegistration = $llmToolsMetadataRegister.register({
    title: 'Anthropic Claude',
    packageName: '@promptbook/anthropic-claude',
    className: 'AnthropicClaudeExecutionTools',

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Open AI (boilerplate)',
            packageName: '@promptbook/openai',
            className: 'OpenAiExecutionTools',
            options: {
                apiKey: 'sk-',
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (typeof env.OPENAI_API_KEY === 'string') {
            return {
                title: 'Open AI (from env)',
                packageName: '@promptbook/openai',
                className: 'OpenAiExecutionTools',
                options: {
                    apiKey: process.env.OPENAI_API_KEY!,
                },
            };
        }

        return null;
    },
});
