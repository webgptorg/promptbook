import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { DeepseekExecutionToolsOptions } from './DeepseekExecutionToolsOptions';

/**
 * Execution Tools for calling Deepseek Gemini API.
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
        const { createDeepseekGenerativeAI } = require('@ai-sdk/deepseek');

        const deepseekGeminiVercelProvider = createDeepseekGenerativeAI({
            ...options,
            /// apiKey: process.env.DEEPSEEK_GENERATIVE_AI_API_KEY,
        });

        return createExecutionToolsFromVercelProvider({
            title: 'Deepseek',
            description: 'Implementation of Deepseek models',
            vercelProvider: deepseekGeminiVercelProvider,
            availableModels: [
                // TODO: [🕘] Maybe list models in same way as in other providers - in separate file with metadata
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash-001',
                'gemini-1.5-flash-002',
                'gemini-1.5-flash-exp-0827',
                'gemini-1.5-flash-8b',
                'gemini-1.5-flash-8b-latest',
                'gemini-1.5-flash-8b-exp-0924',
                'gemini-1.5-flash-8b-exp-0827',
                'gemini-1.5-pro-latest',
                'gemini-1.5-pro',
                'gemini-1.5-pro-001',
                'gemini-1.5-pro-002',
                'gemini-1.5-pro-exp-0827',
                'gemini-1.0-pro',
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
