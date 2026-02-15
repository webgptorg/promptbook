import type { PromptFile } from './types/PromptFile';
import type { PromptStats } from './types/PromptStats';
import { hasSufficientPriority } from './hasSufficientPriority';
import { isPromptToBeWritten } from './isPromptToBeWritten';

/**
 * Summarizes prompt stats for the runner output.
 */
export function summarizePrompts(files: PromptFile[], minimumPriority = 0): PromptStats {
    const stats: PromptStats = { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 };

    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'done') {
                stats.done += 1;
            } else if (section.status === 'todo') {
                const isAbovePriority = hasSufficientPriority(section, minimumPriority);

                if (isPromptToBeWritten(file, section)) {
                    if (!isAbovePriority) {
                        continue;
                    }
                    stats.toBeWritten += 1;
                } else if (isAbovePriority) {
                    stats.forAgent += 1;
                } else {
                    stats.belowMinimumPriority += 1;
                }
            }
        }
    }

    return stats;
}
