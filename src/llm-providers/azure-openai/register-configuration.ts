import spaceTrim from 'spacetrim';
import type { string_name } from '../../types/typeAliases';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import { Registration } from '../../utils/$Register';

/**
 * @@@ registration1 of default configuration for Azure Open AI
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/cli`
 */
export const _AzureOpenAiMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Azure Open AI',
    packageName: '@promptbook/azure-openai',
    className: 'AzureOpenAiExecutionTools',

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Azure Open AI (boilerplate)',
            packageName: '@promptbook/azure-openai',
            className: 'AzureOpenAiExecutionTools',
            options: {
                apiKey: 'sk-',
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (
            typeof env.AZUREOPENAI_RESOURCE_NAME === 'string' &&
            typeof env.AZUREOPENAI_DEPLOYMENT_NAME === 'string' &&
            typeof env.AZUREOPENAI_API_KEY === 'string'
        ) {
            return {
                title: 'Azure Open AI (from env)',
                packageName: '@promptbook/azure-openai',
                className: 'AzureOpenAiExecutionTools',
                options: {
                    resourceName: env.AZUREOPENAI_RESOURCE_NAME,
                    deploymentName: env.AZUREOPENAI_DEPLOYMENT_NAME,
                    apiKey: env.AZUREOPENAI_API_KEY,
                },
            };
        } else if (
            typeof env.AZUREOPENAI_RESOURCE_NAME === 'string' ||
            typeof env.AZUREOPENAI_DEPLOYMENT_NAME === 'string' ||
            typeof env.AZUREOPENAI_API_KEY === 'string'
        ) {
            throw new Error(
                spaceTrim(`
                    You must provide all of the following environment variables:

                    - AZUREOPENAI_RESOURCE_NAME (${
                        typeof env.AZUREOPENAI_RESOURCE_NAME === 'string' ? 'defined' : 'not defined'
                    })
                    - AZUREOPENAI_DEPLOYMENT_NAME (${
                        typeof env.AZUREOPENAI_DEPLOYMENT_NAME === 'string' ? 'defined' : 'not defined'
                    })
                    - AZUREOPENAI_API_KEY (${typeof env.AZUREOPENAI_API_KEY === 'string' ? 'defined' : 'not defined'})
                `),
            );
        }

        return null;
    },
});
