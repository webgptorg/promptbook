import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import type { string_name } from '../../types/typeAliases';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { GoogleExecutionToolsOptions } from './GoogleExecutionToolsOptions';
import { GOOGLE_MODELS } from './google-models';

/**
 * Profile for Google Gemini provider
 */
const GOOGLE_PROVIDER_PROFILE: ChatParticipant = {
    name: 'GOOGLE' as string_name,
    fullname: 'Google Gemini',
    color: '#4285f4',
} as const;

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

        const baseTools = createExecutionToolsFromVercelProvider({
            title: 'Google',
            description: 'Implementation of Google models',
            vercelProvider: googleGeminiVercelProvider,
            availableModels: GOOGLE_MODELS,
            ...options,
        });

        return {
            ...baseTools,
            profile: GOOGLE_PROVIDER_PROFILE,
        };
    },
    {
        packageName: '@promptbook/google',
        className: 'GoogleExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
