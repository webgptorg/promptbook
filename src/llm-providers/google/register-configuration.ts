import { DEFAULT_REMOTE_URL } from '../../config';
import { DEFAULT_REMOTE_URL_PATH } from '../../config';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
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
export const _GoogleMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Google Gemini',
    packageName: '@promptbook/google',
    className: 'GoogleExecutionTools',
    envVariables: ['GOOGLE_GENERATIVE_AI_API_KEY'],

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Google Gemini (boilerplate)',
            packageName: '@promptbook/google',
            className: 'GoogleExecutionTools',
            options: {
                apiKey: 'sk-ant-api03-',
                isProxied: true,
                remoteUrl: DEFAULT_REMOTE_URL,
                path: DEFAULT_REMOTE_URL_PATH,
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (
            $isRunningInJest()
            // <- TODO: Maybe check `env.JEST_WORKER_ID` directly here or pass `env` into `$isRunningInJest`
        ) {
            // Note: [🔘] Gemini makes problems in Jest environment
            return null;
        }

        // Note: Note using `process.env` BUT `env` to pass in the environment variables dynamically
        if (typeof env.GOOGLE_GENERATIVE_AI_API_KEY === 'string') {
            return {
                title: 'Google Gemini (from env)',
                packageName: '@promptbook/google',
                className: 'GoogleExecutionTools',
                options: {
                    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY!,
                },
            };
        }

        return null;
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
