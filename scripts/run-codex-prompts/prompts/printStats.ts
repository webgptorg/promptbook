import colors from 'colors';
import { coderRunInfo } from '../ui/CoderRunSessionContext';
import type { PromptStats } from './types/PromptStats';

/**
 * Prints the summary stats line.
 */
export function printStats(stats: PromptStats, minimumPriority = 0): void {
    const priorityStats =
        minimumPriority > 0 ? ` | Priority <${minimumPriority}: ${stats.belowMinimumPriority}` : '';

    coderRunInfo(
        colors.cyan(`Done: ${stats.done} | For agent: ${stats.forAgent}${priorityStats} | To be written: ${stats.toBeWritten}`),
    );
}
