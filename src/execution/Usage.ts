import type { KebabCase } from 'type-fest';
import type { ExpectationUnit } from '../pipeline/PipelineJson/Expectations';
import type { UncertainNumber } from './UncertainNumber';

/**
 * Usage statistics for one or more prompt results
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type Usage = {
    /**
     * Cost of the execution in USD
     *
     * Note: If the cost is unknown, the value 0 and isUncertain is true
     */
    readonly price: UncertainNumber;

    /**
     * Time how long the agent was running in seconds
     */
    readonly duration: UncertainNumber;

    /**
     * Number of whatever used in the input aka. `prompt_tokens`
     */
    readonly input: UsageCounts;

    /**
     * Number of tokens used in the output aka. `completion_tokens`
     */
    readonly output: UsageCounts;
};

/**
 * Record of all possible measurable units
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type UsageCounts = Record<`${KebabCase<'TOKENS' | ExpectationUnit>}Count`, UncertainNumber>;

/**
 * TODO: [🍙] Make some standard order of json properties
 */
