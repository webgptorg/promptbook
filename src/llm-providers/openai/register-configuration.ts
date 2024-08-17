import { $llmToolsConfigurationBoilerplatesRegister } from '../_common/$llmToolsConfigurationBoilerplatesRegister';

/**
 * @@@ registration1 of default configuration for Anthropic Claude
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 */
export const _AnthropicClaudeExecutionToolsRegistration = $llmToolsConfigurationBoilerplatesRegister.register({
    title: 'Open AI',
    packageName: '@promptbook/openai',
    className: 'OpenAiExecutionTools',
    options: {
        apiKey: 'sk-',
    },
});
