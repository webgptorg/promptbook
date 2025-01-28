import type { createDeepseekGenerativeAI } from '@ai-sdk/deepseek';
import type { VercelExecutionToolsOptions } from '../vercel/VercelExecutionToolsOptions';

/**
 * Options for `DeepseekExecutionTools`
 *
 * This combines options for Promptbook, Deepseek and Vercel together
 * @public exported from `@promptbook/deepseek`
 */
export type DeepseekExecutionToolsOptions = Omit<
    VercelExecutionToolsOptions,
    'title' | 'description' | 'vercelProvider' | 'availableModels'
> &
    Parameters<typeof createDeepseekGenerativeAI>[0];
