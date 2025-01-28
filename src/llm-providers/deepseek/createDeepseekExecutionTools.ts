import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { DeepseekExecutionToolsOptions } from './DeepseekExecutionToolsOptions';

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

        return createExecutionToolsFromVercelProvider({
            title: 'Deepseek',
            description: 'Implementation of Deepseek models',
            vercelProvider: deepseekVercelProvider,
            availableModels: [
                // TODO: [🕘] Maybe list models in same way as in other providers - in separate file with metadata
                'deepseek-chat',
                'deepseek-reasoner',
                // <- TODO: !!!!!! Picking of default model
            ].map((modelName) => ({ modelName, modelVariant: 'CHAT' })),
            ...options,
        });
    },
    {
        packageName: '@promptbook/deepseek',
        className: 'DeepseekExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
