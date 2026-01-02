import type { ClientOptions } from 'openai';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { RemoteClientOptions } from '../../remote-server/types/RemoteClientOptions';

/**
 * Options for `createOpenAiCompatibleExecutionTools` and `OpenAiCompatibleExecutionTools`
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * Rest is used by the `OpenAiCompatibleExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiCompatibleExecutionToolsOptions =
    | OpenAiCompatibleExecutionToolsNonProxiedOptions
    | OpenAiCompatibleExecutionToolsProxiedOptions;

/**
 * Options for directly used `OpenAiCompatibleExecutionTools`
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * @public exported from `@promptbook/openai`
 */
export type OpenAiCompatibleExecutionToolsNonProxiedOptions = CommonToolsOptions &
    ClientOptions & {
        /**
         * Base URL for the OpenAI-compatible API endpoint
         *
         * This allows connecting to any OpenAI-compatible LLM service by specifying their API endpoint.
         *
         * @example 'https://https://promptbook.s5.ptbk.io/' (Promptbook)
         * @example 'https://api.openai.com/v1' (OpenAI)
         * @example 'http://localhost:11434/v1' (Ollama)
         * @example 'https://api.deepseek.com/v1' (DeepSeek)
         */
        baseURL?: string;

        /**
         * Tools for executing the scripts
         */
        readonly executionTools?: Pick<ExecutionTools, 'script'>;

        isProxied?: false;
    };

/**
 * Options for proxied `OpenAiCompatibleExecutionTools`
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * @public exported from `@promptbook/openai`
 */
export type OpenAiCompatibleExecutionToolsProxiedOptions = CommonToolsOptions &
    ClientOptions & {
        /**
         * Base URL for the OpenAI-compatible API endpoint
         *
         * This allows connecting to any OpenAI-compatible LLM service by specifying their API endpoint.
         *
         * @example 'https://https://promptbook.s5.ptbk.io/' (Promptbook)
         * @example 'https://api.openai.com/v1' (OpenAI)
         * @example 'http://localhost:11434/v1' (Ollama)
         * @example 'https://api.deepseek.com/v1' (DeepSeek)
         */
        baseURL?: string;

        isProxied: true;
    } & Pick<RemoteClientOptions<undefined>, 'remoteServerUrl'>;
