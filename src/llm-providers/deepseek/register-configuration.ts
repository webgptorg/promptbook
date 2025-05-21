import { MODEL_ORDERS } from '../../constants';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import type { DeepseekExecutionToolsOptions } from './DeepseekExecutionToolsOptions';

/**
 * Registration of LLM provider metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _DeepseekMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Deepseek',
    packageName: '@promptbook/deepseek',
    className: 'DeepseekExecutionTools',
    envVariables: ['DEEPSEEK_GENERATIVE_AI_API_KEY'],
    trustLevel: 'UNTRUSTED',
    order: MODEL_ORDERS.NORMAL, // <- TODO: [🧠] Maybe `TOP_TIER`?

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Deepseek',
            packageName: '@promptbook/deepseek',
            className: 'DeepseekExecutionTools',
            options: {
                apiKey: 'AI',
            } satisfies DeepseekExecutionToolsOptions,
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (
            $isRunningInJest()
            // <- TODO: Maybe check `env.JEST_WORKER_ID` directly here or pass `env` into `$isRunningInJest`
        ) {
            // Note: [🔘] Maybe same problem as Gemini
            return null;
        }

        // Note: Note using `process.env` BUT `env` to pass in the environment variables dynamically
        if (typeof env.DEEPSEEK_GENERATIVE_AI_API_KEY === 'string') {
            return {
                title: 'Deepseek (from env)',
                packageName: '@promptbook/deepseek',
                className: 'DeepseekExecutionTools',
                options: {
                    apiKey: env.DEEPSEEK_GENERATIVE_AI_API_KEY!,
                } satisfies DeepseekExecutionToolsOptions,
            };
        }

        return null;
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
