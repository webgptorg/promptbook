import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { PromptResultUsage } from '../../../../execution/PromptResultUsage';
/**
 * LLM tools with option to get total usage of the execution
 */
export type LlmExecutionToolsWithTotalUsage = LlmExecutionTools & {
    /**
     * Get total cost of the execution up to this point
     */
    getTotalUsage(): PromptResultUsage;
};
/**
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * Note: [🥫] Not using getter `get totalUsage` but `getTotalUsage` to allow this object to be proxied
 */
