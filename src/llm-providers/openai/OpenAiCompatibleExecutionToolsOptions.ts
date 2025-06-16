import type { ClientOptions } from 'openai';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';

/**
 * Options for `createOpenAiCompatibleExecutionTools` and `OpenAiCompatibleExecutionTools`
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * Rest is used by the `OpenAiCompatibleExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiCompatibleExecutionToolsOptions = CommonToolsOptions & ClientOptions & {
    /**
     * Base URL for the OpenAI-compatible API endpoint
     *
     * This allows connecting to any OpenAI-compatible LLM service by specifying their API endpoint.
     *
     * @example 'https://api.openai.com/v1' (OpenAI)
     * @example 'http://localhost:11434/v1' (Ollama)
     * @example 'https://api.deepseek.com/v1' (DeepSeek)
     */
    baseURL?: string;
};
