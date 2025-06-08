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
export type OpenAiCompatibleExecutionToolsOptions = CommonToolsOptions & ClientOptions;
