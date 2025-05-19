import type { OpenAiExecutionToolsOptions } from '../openai/OpenAiExecutionToolsOptions';

/**
 * Default base URL for Ollama API
 *
 * @public exported from `@promptbook/ollama`
 */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

/**
 * Options for `createOllamaExecutionTools`
 *
 * This combines options for Promptbook, Google and Vercel together
 * @public exported from `@promptbook/ollama`
 */
export type OllamaExecutionToolsOptions = {
    /**
     * Base URL of Ollama API
     *
     * Note: Naming this `baseURL` not `baseUrl` to be consistent with OpenAI API
     *
     * @default `DEFAULT_OLLAMA_BASE_URL`
     */
    baseURL?: string;
} & Omit<OpenAiExecutionToolsOptions, 'baseURL' | 'userId'>;
