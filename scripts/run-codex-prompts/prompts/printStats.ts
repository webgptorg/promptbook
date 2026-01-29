import colors from 'colors';
import type { PromptStats } from './types/PromptStats';

/**
 * Prints the summary stats line.
 */
export function printStats(stats: PromptStats): void {
    console.info(
        colors.cyan(`Done: ${stats.done} | For agent: ${stats.forAgent} | To be written: ${stats.toBeWritten}`),
    );
}
