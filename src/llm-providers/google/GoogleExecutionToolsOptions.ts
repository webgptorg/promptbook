import type { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { VercelExecutionToolsOptions } from '../vercel/VercelExecutionToolsOptions';

/**
 * Options for `GoogleExecutionTools`
 *
 * This combines options for Promptbook, Google and Vercel together
 * @public exported from `@promptbook/google`
 */
export type GoogleExecutionToolsOptions = Omit<
    VercelExecutionToolsOptions,
    'title' | 'description' | 'vercelProvider' | 'availableModels'
> &
    Parameters<typeof createGoogleGenerativeAI>[0];
