import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { AzureOpenAiExecutionTools } from './AzureOpenAiExecutionTools';
import type { AzureOpenAiExecutionToolsOptions } from './AzureOpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling Azure OpenAI API
 *
 * @public exported from `@promptbook/azure-openai`
 */
export const createAzureOpenAiExecutionTools = Object.assign(
    (options: AzureOpenAiExecutionToolsOptions): AzureOpenAiExecutionTools => {
        return new AzureOpenAiExecutionTools(options);
    },
    {
        packageName: '@promptbook/azure-openai',
        className: 'AzureOpenAiExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
