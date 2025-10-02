import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import type { string_name } from '../../types/typeAliases';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { DeepseekExecutionToolsOptions } from './DeepseekExecutionToolsOptions';
import { DEEPSEEK_MODELS } from './deepseek-models';

/**
 * Profile for Deepseek provider
 */
const DEEPSEEK_PROVIDER_PROFILE: ChatParticipant = {
    name: 'DEEPSEEK' as string_name,
    fullname: 'DeepSeek',
    color: '#7c3aed',
} as const;

/**
 * Execution Tools for calling Deepseek API.
 *
 * @public exported from `@promptbook/deepseek`
 */
export const createDeepseekExecutionTools = Object.assign(
    (options: DeepseekExecutionToolsOptions): LlmExecutionTools => {
        if ($isRunningInJest()) {
            // Note: [🔘]
            throw new Error('DeepseekExecutionTools are not supported in Jest environment');
        }

        // Note: [🔘] Maybe there is same compatibility problem as in '@ai-sdk/deepseek'
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createDeepSeek } = require('@ai-sdk/deepseek');

        const deepseekVercelProvider = createDeepSeek({
            ...options,
            // apiKey: process.env.DEEPSEEK_GENERATIVE_AI_API_KEY,
        });

        const baseTools = createExecutionToolsFromVercelProvider({
            title: 'Deepseek',
            description: 'Implementation of Deepseek models',
            vercelProvider: deepseekVercelProvider,
            availableModels: DEEPSEEK_MODELS,
            ...options,
        });

        return {
            ...baseTools,
            profile: DEEPSEEK_PROVIDER_PROFILE,
        };
    },
    {
        packageName: '@promptbook/deepseek',
        className: 'DeepseekExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
