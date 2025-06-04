import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import type { OpenAiExecutionToolsOptions } from '../openai/OpenAiExecutionToolsOptions';
import { PromptbookOpenAiExecutionTools } from './PromptbookOpenAiExecutionTools';

/**
 * Creates Execution Tools for using Promptbook books as OpenAI-compatible models
 *
 * This allows using Promptbook books as if they were OpenAI models by:
 * 1. Setting the baseURL to your Promptbook server URL
 * 2. Using the book URL as the model name
 *
 * @public exported from `@promptbook/promptbook`
 */
export const createPromptbookOpenAiExecutionTools = Object.assign(
    (options: OpenAiExecutionToolsOptions): PromptbookOpenAiExecutionTools => {
        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new PromptbookOpenAiExecutionTools(options);
    },
    {
        packageName: '@promptbook/promptbook',
        className: 'PromptbookOpenAiExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;
