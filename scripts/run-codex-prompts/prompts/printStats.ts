import colors from 'colors';
import type { PromptStats } from './types/PromptStats';

/**
 * Prints the summary stats line.
 */
export function printStats(stats: PromptStats, minimumPriority = 0): void {
    const priorityStats =
        minimumPriority > 0 ? ` | Priority <${minimumPriority}: ${stats.belowMinimumPriority}` : '';

    console.info(
        colors.cyan(`Done: ${stats.done} | For agent: ${stats.forAgent}${priorityStats} | To be written: ${stats.toBeWritten}`),
    );
}
