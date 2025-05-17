import type { ClientOptions } from 'openai';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';

/**
 * Options for `createOpenAiExecutionTools` and `OpenAiExecutionTools`
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * Rest is used by the `OpenAiExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiExecutionToolsOptions = CommonToolsOptions & ClientOptions;
