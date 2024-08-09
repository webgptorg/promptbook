import type { LlmExecutionToolsWithTotalUsage } from './utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
type GetLlmToolsForCliOptions = {
    /**
     * @@@
     *
     * @default false
     */
    isCacheReloaded?: boolean;
};
/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export declare function getLlmToolsForCli(options?: GetLlmToolsForCliOptions): LlmExecutionToolsWithTotalUsage;
export {};
/**
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
