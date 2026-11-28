import colors from 'colors';
import { formatExcludedPriorityFilter, type PriorityFilter } from './priorityFilter';
import type { PromptStats } from './types/PromptStats';

/**
 * Prints the summary stats line.
 */
export function printStats(stats: PromptStats, priorityFilter: PriorityFilter = {}): void {
    const priorityExclusionLabel = formatExcludedPriorityFilter(priorityFilter);
    const priorityStats =
        priorityExclusionLabel !== undefined
            ? ` | ${priorityExclusionLabel}: ${stats.outsidePriorityRange}`
            : '';

    console.info(
        colors.cyan(`Done: ${stats.done} | For agent: ${stats.forAgent}${priorityStats} | To be written: ${stats.toBeWritten}`),
    );
}
