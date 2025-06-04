import { DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { MODEL_ORDERS } from '../../constants';
import type { string_name } from '../../types/typeAliases';
import type { Registration } from '../../utils/$Register';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import type { OpenAiExecutionToolsOptions } from '../openai/OpenAiExecutionToolsOptions';

/**
 * Registration of Promptbook OpenAI compatible provider metadata
 *
 * @public exported from `@promptbook/promptbook`
 */
export const _PromptbookOpenAiMetadataRegistration: Registration = $llmToolsMetadataRegister.register({
    title: 'Promptbook OpenAI Compatible',
    packageName: '@promptbook/promptbook',
    className: 'PromptbookOpenAiExecutionTools',
    envVariables: ['PROMPTBOOK_SERVER_URL'],
    trustLevel: 'OPEN',
    order: MODEL_ORDERS.NORMAL,

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            title: 'Promptbook OpenAI Compatible',
            packageName: '@promptbook/promptbook',
            className: 'PromptbookOpenAiExecutionTools',
            options: {
                baseURL: 'http://localhost:3000',
                maxRequestsPerMinute: DEFAULT_MAX_REQUESTS_PER_MINUTE,
            } satisfies OpenAiExecutionToolsOptions,
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null {
        if (typeof env.PROMPTBOOK_SERVER_URL === 'string') {
            return {
                title: 'Promptbook OpenAI Compatible (from env)',
                packageName: '@promptbook/promptbook',
                className: 'PromptbookOpenAiExecutionTools',
                options: {
                    baseURL: env.PROMPTBOOK_SERVER_URL,
                } satisfies OpenAiExecutionToolsOptions,
            };
        }

        return null;
    },
});
