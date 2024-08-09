import type { CreateLlmToolsFromEnvOptions } from './createLlmToolsFromEnv';
import type { LlmExecutionToolsWithTotalUsage } from './utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
type GetLlmToolsForTestingAndScriptsAndPlaygroundOptions = CreateLlmToolsFromEnvOptions & {
    /**
     * @@@
     *
     * @default false
     */
    isCacheReloaded?: boolean;
};
/**
 * Returns LLM tools for testing purposes
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export declare function getLlmToolsForTestingAndScriptsAndPlayground(options?: GetLlmToolsForTestingAndScriptsAndPlaygroundOptions): LlmExecutionToolsWithTotalUsage;
export {};
/**
 * Note: [⚪] This should never be in any released package
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
