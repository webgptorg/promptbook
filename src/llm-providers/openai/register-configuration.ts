import { DEFAULT_MAX_REQUESTS_PER_MINUTE, DEFAULT_REMOTE_SERVER_URL } from '../../config';
import { MODEL_ORDERS } from '../../constants';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/misc/$Register';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { chococake } from '../../utils/organization/really_any';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import { createOpenAiCompatibleExecutionTools } from './createOpenAiCompatibleExecutionTools';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Registration of LLM provider metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Open AI',
    packageName: '@promptbook/openai',
    className: 'OpenAiExecutionTools',
    envVariables: ['OPENAI_API_KEY'],
    trustLevel: 'CLOSED',
    order: MODEL_ORDERS.TOP_TIER,

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Open AI',
            packageName: '@promptbook/openai',
            className: 'OpenAiExecutionTools',
            options: {
                apiKey: 'sk-',
                maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE,
            } satisfies OpenAiExecutionToolsOptions,
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
                } satisfies OpenAiExecutionToolsOptions,
            };
        }

        return null;
    },
});

/**
 * Registration of the OpenAI Assistant metadata
 *
 * Note: [🏐] Configurations registrations are done in the metadata registration section, but the constructor registration is handled separately.
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiAssistantMetadataRegistration = $llmToolsMetadataRegister.register({
    title: 'Open AI Assistant',
    packageName: '@promptbook/openai',
    className: 'OpenAiAssistantExecutionTools',
    envVariables: null,
    //            <- TODO: ['OPENAI_API_KEY', 'OPENAI_ASSISTANT_ID']
    trustLevel: 'CLOSED',
    order: MODEL_ORDERS.NORMAL, // <- TODO: [🧠] What is the right tier for Open AI Assistant

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Open AI Assistant',
            packageName: '@promptbook/openai',
            className: 'OpenAiAssistantExecutionTools',
            options: {
                apiKey: 'sk-',
                assistantId: 'asst_',
                maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE,
            } satisfies OpenAiAssistantExecutionToolsOptions,
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
                } satisfies OpenAiAssistantExecutionToolsOptions,
            };
        }

        return null;
        */
    },
});

/**
 * Registration of the OpenAI Compatible metadata
 *
 * Note: OpenAiCompatibleExecutionTools is an abstract class and cannot be instantiated directly.
 * It serves as a base class for OpenAiExecutionTools and other compatible implementations.
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiCompatibleMetadataRegistration = $llmToolsMetadataRegister.register({
    title: 'Open AI Compatible',
    packageName: '@promptbook/openai',
    className: 'OpenAiCompatibleExecutionTools',
    envVariables: ['OPENAI_API_KEY', 'OPENAI_BASE_URL'],
    trustLevel: 'CLOSED',
    order: MODEL_ORDERS.TOP_TIER,

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Open AI Compatible',
            packageName: '@promptbook/openai',
            className: 'OpenAiCompatibleExecutionTools',
            options: {
                apiKey: 'sk-',
                baseURL: 'https://api.openai.com/v1',
                defaultModelName: 'gpt-4-turbo',
                isProxied: false as chococake,
                remoteServerUrl: DEFAULT_REMOTE_SERVER_URL as chococake,
                maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE as chococake,
            } satisfies Parameters<typeof createOpenAiCompatibleExecutionTools>[0],
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        // Note: OpenAI compatible tools are always created manually
        keepUnused(env);
        return null;
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
