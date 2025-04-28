import { DEFAULT_RPM } from '../../config';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { keepUnused } from '../../utils/organization/keepUnused';
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
export const _OpenAiMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Open AI',
    packageName: '@promptbook/openai',
    className: 'OpenAiExecutionTools',
    envVariables: ['OPENAI_API_KEY'],
    trustLevel: 'CLOSED',
    order: MODEL_ORDER.TOP_TIER,

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Open AI',
            packageName: '@promptbook/openai',
            className: 'OpenAiExecutionTools',
            options: {
                apiKey: 'sk-',
                maxRequestsPerMinute: DEFAULT_RPM,
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        // Note: Note using `process.env` BUT `env` to pass in the environment variables dynamically
        if (typeof env.OPENAI_API_KEY === 'string') {
            return {
                title: 'Open AI (from env)',
                packageName: '@promptbook/openai',
                className: 'OpenAiExecutionTools',
                options: {
                    apiKey: env.OPENAI_API_KEY!,
                },
            };
        }

        return null;
    },
});

/**
 * @@@ registration1 of default configuration for Open AI
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizzard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiAssistantMetadataRegistration = $llmToolsMetadataRegister.register({
    title: 'Open AI Assistant',
    packageName: '@promptbook/openai',
    className: 'OpenAiAssistantExecutionTools',
    envVariables: null,
    //            <- TODO: ['OPENAI_API_KEY', 'OPENAI_ASSISTANT_ID']
    trustLevel: 'CLOSED',
    order: MODEL_ORDER.NORMAL, // <- TODO: [🧠] What is the right tier for Open AI Assistant

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Open AI Assistant',
            packageName: '@promptbook/openai',
            className: 'OpenAiAssistantExecutionTools',
            options: {
                apiKey: 'sk-',
                assistantId: 'asst_',
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        // TODO: Maybe auto-configure (multiple) assistants from env variables
        keepUnused(env);
        return null;
        /*
        if (typeof env.OPENAI_API_KEY === 'string' || typeof env.OPENAI_XXX === 'string') {
            return {
                title: 'Open AI Assistant (from env)',
                packageName: '@promptbook/openai',
                className: 'OpenAiAssistantExecutionTools',
                options: {
                    apiKey: env.OPENAI_API_KEY!,
                    assistantId: env.OPENAI_XXX!
                },
            };
        }

        return null;
        */
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
