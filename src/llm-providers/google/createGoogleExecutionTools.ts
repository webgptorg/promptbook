import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { GoogleExecutionToolsOptions } from './GoogleExecutionToolsOptions';

/**
 * Execution Tools for calling Google Gemini API.
 *
 * @public exported from `@promptbook/gemini`
 */
export const createGoogleExecutionTools = Object.assign(
    (options: GoogleExecutionToolsOptions): LlmExecutionTools => {
        const googleGeminiVercelProvider = createGoogleGenerativeAI({
            ...options,
            /// apiKey: process.env.GOOGLE_GEMINI_API_KEY,
        });

        return createExecutionToolsFromVercelProvider(googleGeminiVercelProvider, options);
    },
    {
        packageName: '@promptbook/gemini',
        className: 'GoogleExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🧠][main] !!!! Make anonymous this with all LLM providers
 * TODO: [🧠][🧱][main] !!!! Maybe change all `new GoogleExecutionTools` -> `createGoogleExecutionTools` in manual
 * TODO: [🧠] Maybe auto-detect usage in browser and determine default value of `isProxied`
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
