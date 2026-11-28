import type { PromptFile } from './types/PromptFile';
import type { UpcomingTask } from './types/UpcomingTask';
import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import type { PromptRunnerIdentity } from './isPromptCompatibleWithRunner';
import { listRunnablePrompts } from './listRunnablePrompts';
import type { PriorityFilter } from './priorityFilter';

/**
 * Lists upcoming tasks that are ready to run (no authoring placeholders).
 */
export function listUpcomingTasks(
    files: PromptFile[],
    priorityFilter: PriorityFilter = {},
    promptRunnerIdentity?: PromptRunnerIdentity,
    projectPath?: string,
): UpcomingTask[] {
    return listRunnablePrompts(files, priorityFilter, promptRunnerIdentity).map(({ file, section }) => ({
        label: buildPromptLabelForDisplay(file, section, projectPath),
        summary: buildPromptSummary(file, section),
        priority: section.priority,
    }));
}
