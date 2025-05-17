import { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { createOpenAiExecutionTools } from '../openai/createOpenAiExecutionTools';
import { OpenAiExecutionToolsOptions } from '../openai/OpenAiExecutionToolsOptions';
import { DEFAULT_OLLAMA_BASE_URL, OllamaExecutionToolsOptions } from './OllamaExecutionToolsOptions';

/**
 * Execution Tools for calling Ollama API
 *
 * @public exported from `@promptbook/ollama`
 */
export const createOllamaExecutionTools = Object.assign(
    (ollamaOptions: OllamaExecutionToolsOptions): LlmExecutionTools => {
        const openAiCompatibleOptions = {
            baseURL: DEFAULT_OLLAMA_BASE_URL,
            ...ollamaOptions,
            userId: 'ollama',
        } satisfies OpenAiExecutionToolsOptions;

        // TODO: !!!! Listing the models - do it dynamically in OpenAiExecutionTools
        // TODO: !!!! Do not allow to create Assistant from OpenAi compatible tools

        return createOpenAiExecutionTools(openAiCompatibleOptions);
    },
    {
        packageName: '@promptbook/ollama',
        className: 'OllamaExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;
