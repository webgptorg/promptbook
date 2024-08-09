import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { LlmExecutionToolsWithTotalUsage } from './LlmExecutionToolsWithTotalUsage';
/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * @param llmTools LLM tools to be intercepted with usage counting
 * @returns LLM tools with same functionality with added total cost counting
 * @public exported from `@promptbook/core`
 */
export declare function countTotalUsage(llmTools: LlmExecutionTools): LlmExecutionToolsWithTotalUsage;
/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
 *     > const [llmToolsWithUsage,getUsage] = countTotalUsage(llmTools);
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
