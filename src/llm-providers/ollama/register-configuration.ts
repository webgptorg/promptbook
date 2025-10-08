import { DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { MODEL_ORDERS } from '../../constants';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/misc/$Register';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import type { OllamaExecutionToolsOptions } from './OllamaExecutionToolsOptions';
import { DEFAULT_OLLAMA_BASE_URL } from './OllamaExecutionToolsOptions';

/**
 * Registration of LLM provider metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OllamaMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Ollama',
    packageName: '@promptbook/ollama',
    className: 'OllamaExecutionTools',
    envVariables: ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'],
    trustLevel: 'CLOSED_LOCAL',
    order: MODEL_ORDERS.NORMAL,

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Ollama',
            packageName: '@promptbook/ollama',
            className: 'OllamaExecutionTools',
            options: {
                baseURL: DEFAULT_OLLAMA_BASE_URL,
                maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE,
            } satisfies OllamaExecutionToolsOptions,
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (typeof env.OLLAMA_BASE_URL === 'string') {
            return {
                title: 'Ollama (from env)',
                packageName: '@promptbook/ollama',
                className: 'OllamaExecutionTools',
                options: {
                    baseURL: env.OLLAMA_BASE_URL,
                } satisfies OllamaExecutionToolsOptions,
            };
        }
        return null;
    },
});

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
