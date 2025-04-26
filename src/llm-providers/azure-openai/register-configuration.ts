import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import { MODEL_ORDER } from '../_common/register/LlmToolsMetadata';

/**
 * Registration of LLM provider metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizzard`
 * @public exported from `@promptbook/cli`
 */
export const _AzureOpenAiMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Azure Open AI',
    packageName: '@promptbook/azure-openai',
    className: 'AzureOpenAiExecutionTools',
    envVariables: ['AZUREOPENAI_RESOURCE_NAME', 'AZUREOPENAI_DEPLOYMENT_NAME', 'AZUREOPENAI_API_KEY'],
    trustLevel: 'CLOSED_BUSINESS',
    order: MODEL_ORDER.NORMAL, // <- TODO: [🧠] What is the right tier for Azure Open AI

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Azure Open AI',
            packageName: '@promptbook/azure-openai',
            className: 'AzureOpenAiExecutionTools',
            options: {
                apiKey: 'sk-',
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        // Note: Note using `process.env` BUT `env` to pass in the environment variables dynamically
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
            return null;
            /*
            Note: [🗨] Partial configuration is handled more gracefully elsewhere
            > throw new Error(
            >     spaceTrim(`
            >         You must provide all of the following environment variables:
            >
            >         - AZUREOPENAI_RESOURCE_NAME (${
            >             typeof env.AZUREOPENAI_RESOURCE_NAME === 'string' ? 'defined' : 'not defined'
            >         })
            >         - AZUREOPENAI_DEPLOYMENT_NAME (${
            >             typeof env.AZUREOPENAI_DEPLOYMENT_NAME === 'string' ? 'defined' : 'not defined'
            >         })
            >         - AZUREOPENAI_API_KEY (${typeof env.AZUREOPENAI_API_KEY === 'string' ? 'defined' : 'not defined'})
            >     `),
            > );
            */
        }

        return null;
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
