import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { PromptResultUsage } from '../../../execution/PromptResult';

/**
 * LLM tools with option to get total cost of the execution
 */
export type LlmExecutionToolsWithTotalCost = LlmExecutionTools & {
    /**
     * Total cost of the execution
     */
    totalUsage: PromptResultUsage;
};
