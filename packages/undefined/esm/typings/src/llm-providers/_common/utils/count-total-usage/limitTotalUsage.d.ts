import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { PromptResultUsage } from '../../../../execution/PromptResultUsage';
import type { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import type { TODO_any } from '../../../../utils/organization/TODO_any';
import type { LlmExecutionToolsWithTotalUsage } from './LlmExecutionToolsWithTotalUsage';
/**
 * Options for `limitTotalUsage`
 */
type LimitTotalUsageOptions = {
    /**
     * @@@
     *
     * @default ZERO_USAGE
     */
    maxTotalUsage: PromptResultUsage;
    /**
     * @@@
     *
     * @default MemoryStorage
     */
    storage: PromptbookStorage<TODO_any>;
};
/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export declare function limitTotalUsage(llmTools: LlmExecutionTools, options?: Partial<LimitTotalUsageOptions>): LlmExecutionToolsWithTotalUsage;
export {};
/**
 * TODO: Maybe internally use `countTotalUsage`
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
