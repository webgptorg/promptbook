import { $llmToolsConfigurationBoilerplatesRegister } from '../_common/$llmToolsConfigurationBoilerplatesRegister';

/**
 * @@@ registration1 of default configuration for Open AI
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 */
export const _OpenAiConfigurationRegistration = $llmToolsConfigurationBoilerplatesRegister.register({
    title: 'Open AI',
    packageName: '@promptbook/openai',
    className: 'OpenAiExecutionTools',
    options: {
        apiKey: 'sk-',
    },
});
