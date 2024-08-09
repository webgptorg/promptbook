import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { CacheLlmToolsOptions } from './CacheLlmToolsOptions';
/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * Note: It can take extended `LlmExecutionTools` and cache the
 *
 * @param llmTools LLM tools to be intercepted with usage counting, it can contain extra methods like `totalUsage`
 * @returns LLM tools with same functionality with added total cost counting
 * @public exported from `@promptbook/core`
 */
export declare function cacheLlmTools<TLlmTools extends LlmExecutionTools>(llmTools: TLlmTools, options?: Partial<CacheLlmToolsOptions>): TLlmTools;
/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 *            @@@ write discussion about this and storages
 *            @@@ write how to combine multiple interceptors
 */
