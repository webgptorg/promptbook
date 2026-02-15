/**
 * Aggregated prompt counts for the runner summary.
 */
export type PromptStats = {
    done: number;
    forAgent: number;
    belowMinimumPriority: number;
    toBeWritten: number;
};
