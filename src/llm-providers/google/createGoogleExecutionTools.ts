import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { GoogleExecutionToolsOptions } from './GoogleExecutionToolsOptions';

/**
 * Execution Tools for calling Google Gemini API.
 *
 * @public exported from `@promptbook/google`
 */
export const createGoogleExecutionTools = Object.assign(
    (options: GoogleExecutionToolsOptions): LlmExecutionTools => {
        if ($isRunningInJest()) {
            // Note: [🔘]
            throw new Error('GoogleExecutionTools are not supported in Jest environment');
        }

        // Note: [🔘] There is a compatibility when using import from '@ai-sdk/google'
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createGoogleGenerativeAI } = require('@ai-sdk/google');

        const googleGeminiVercelProvider = createGoogleGenerativeAI({
            ...options,
            /// apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        return createExecutionToolsFromVercelProvider({
            title: 'Google',
            description: 'Implementation of Google models',
            vercelProvider: googleGeminiVercelProvider,
            availableModels: [
                // TODO: [🕘] Maybe list models in same way as in other providers - in separate file with metadata
                'gemini-2.5-pro-preview-03-25',
                'gemini-2.0-flash',
                'gemini-2.0-flash-lite',
                'gemini-2.0-flash-thinking-exp-01-21',
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
                // <- [🕕]
            ].map((modelName) => ({ modelName, modelVariant: 'CHAT' })),
            ...options,
        });
    },
    {
        packageName: '@promptbook/google',
        className: 'GoogleExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
