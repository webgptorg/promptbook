import type { PromptFile } from './types/PromptFile';
import type { UpcomingTask } from './types/UpcomingTask';
import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import { listRunnablePrompts } from './listRunnablePrompts';
import type { PriorityFilter } from './priorityFilter';
import type { RunnerFilter } from './runnerFilter';

/**
 * Lists upcoming tasks that are ready to run (no authoring placeholders) for the current runner.
 */
export function listUpcomingTasks(
    files: PromptFile[],
    priorityFilter: PriorityFilter = {},
    runnerFilter?: RunnerFilter,
): UpcomingTask[] {
    return listRunnablePrompts(files, priorityFilter, runnerFilter).map(({ file, section }) => ({
        label: buildPromptLabelForDisplay(file, section),
        summary: buildPromptSummary(file, section),
        priority: section.priority,
    }));
}
