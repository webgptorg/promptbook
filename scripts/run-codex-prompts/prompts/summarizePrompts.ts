import type { PromptFile } from './types/PromptFile';
import type { PromptStats } from './types/PromptStats';
import { isPromptToBeWritten } from './isPromptToBeWritten';

/**
 * Summarizes prompt stats for the runner output.
 */
export function summarizePrompts(files: PromptFile[]): PromptStats {
    const stats: PromptStats = { done: 0, forAgent: 0, toBeWritten: 0 };

    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'done') {
                stats.done += 1;
            } else if (section.status === 'todo') {
                if (isPromptToBeWritten(file, section)) {
                    stats.toBeWritten += 1;
                } else {
                    stats.forAgent += 1;
                }
            }
        }
    }

    return stats;
}
