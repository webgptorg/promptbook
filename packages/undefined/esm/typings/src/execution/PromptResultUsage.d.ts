import type { KebabCase } from 'type-fest';
import type { ExpectationUnit } from '../types/PipelineJson/Expectations';
import type { UncertainNumber } from './UncertainNumber';
/**
 * Usage statistics for one or many prompt results
 */
export type PromptResultUsage = {
    /**
     * Cost of the execution in USD
     *
     * Note: If the cost is unknown, the value 0 and isUncertain is true
     */
    readonly price: UncertainNumber;
    /**
     * Number of whatever used in the input aka. `prompt_tokens`
     */
    readonly input: PromptResultUsageCounts;
    /**
     * Number of tokens used in the output aka. `completion_tokens`
     */
    readonly output: PromptResultUsageCounts;
};
/**
 * Record of all possible measurable units
 */
export type PromptResultUsageCounts = Record<`${KebabCase<'TOKENS' | ExpectationUnit>}Count`, UncertainNumber>;
/**
 * TODO: [🍙] Make some standart order of json properties
 */
