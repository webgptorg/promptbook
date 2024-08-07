import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { PromptResultUsage } from '../../../../execution/PromptResultUsage';

/**
 * LLM tools with option to get total usage of the execution
 */
export type LlmExecutionToolsWithTotalUsage = LlmExecutionTools & {
    /**
     * Total cost of the execution
     */
    totalUsage: PromptResultUsage;
};

/**
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
