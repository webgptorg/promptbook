import type { Observable } from 'rxjs';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { Usage } from '../../../../execution/Usage';

/**
 * LLM tools with option to get total usage of the execution
 */
export type LlmExecutionToolsWithTotalUsage = LlmExecutionTools & {
    /**
     * Get total cost of the execution up to this point
     */
    getTotalUsage(): Usage;

    /**
     * Observable of total cost of the execution up to this point
     *
     * Note: This does report the cost of the last prompt, not the total cost of the execution up to this point
     */
    spending(): Observable<Usage>;
};

/**
 * TODO: [👷‍♂️] Write a comprehensive manual about the construction of LLM tools
 * Note: [🥫] Not using getter `get totalUsage` but `getTotalUsage` to allow this object to be proxied
 */
