import type { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';

/**
 * Options for `GoogleExecutionTools`
 *
 * !!!!!! This extends Google's `ClientOptions` with are directly passed to the Google generative AI client.
 * @public exported from `@promptbook/google`
 */
export type GoogleExecutionToolsOptions = CommonToolsOptions &
    Parameters<typeof createGoogleGenerativeAI>[0] /* TODO: !!!!!! & ClientOptions*/;

/**
 * TODO: [🧠][🤺] Pass `userId`
 */
