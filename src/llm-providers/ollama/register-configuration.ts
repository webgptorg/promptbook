import { DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { MODEL_ORDERS } from '../../constants';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';

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
                baseUrl: 'http://localhost:11434',
                model: 'llama2',
                maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE,
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (typeof env.OLLAMA_BASE_URL === 'string') {
            return {
                title: 'Ollama (from env)',
                packageName: '@promptbook/ollama',
                className: 'OllamaExecutionTools',
                options: {
                    baseUrl: env.OLLAMA_BASE_URL,
                    model: env.OLLAMA_MODEL || 'llama2',
                    maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE,
                },
            };
        }
        return null;
    },
});
