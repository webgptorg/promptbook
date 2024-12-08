import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { createGoogleGenerativeAI } from '@ai-sdk/google';


/**
 * Options for `GoogleExecutionTools`
 *
 * !!!!!! This extends Google's `ClientOptions` with are directly passed to the Google generative AI client.
 * @public exported from `@promptbook/gemini`
 */
export type GoogleExecutionToolsOptions = CommonToolsOptions & Parameters<typeof createGoogleGenerativeAI>[0]/* TODO: !!!!!! & ClientOptions*/;

/**
 * TODO: [🧠][🤺] Pass `userId`
 */
