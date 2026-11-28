import type { PromptFile } from './types/PromptFile';
import type { PromptStats } from './types/PromptStats';
import { isPromptInPriorityFilter } from './isPromptInPriorityFilter';
import { isPromptToBeWritten } from './isPromptToBeWritten';
import type { PriorityFilter } from './priorityFilter';

/**
 * Summarizes prompt stats for the runner output.
 */
export function summarizePrompts(files: PromptFile[], priorityFilter: PriorityFilter = {}): PromptStats {
    const stats: PromptStats = { done: 0, forAgent: 0, outsidePriorityRange: 0, toBeWritten: 0 };

    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'done') {
                stats.done += 1;
            } else if (section.status === 'todo') {
                const isInsidePriorityRange = isPromptInPriorityFilter(section, priorityFilter);

                if (isPromptToBeWritten(file, section)) {
                    if (!isInsidePriorityRange) {
                        continue;
                    }
                    stats.toBeWritten += 1;
                } else if (isInsidePriorityRange) {
                    stats.forAgent += 1;
                } else {
                    stats.outsidePriorityRange += 1;
                }
            }
        }
    }

    return stats;
}
