import type { PromptFile } from './types/PromptFile';
import type { UpcomingTask } from './types/UpcomingTask';
import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import { listRunnablePrompts } from './listRunnablePrompts';

/**
 * Lists upcoming tasks that are ready to run (no authoring placeholders).
 */
export function listUpcomingTasks(files: PromptFile[]): UpcomingTask[] {
    return listRunnablePrompts(files).map(({ file, section }) => ({
        label: buildPromptLabelForDisplay(file, section),
        summary: buildPromptSummary(file, section),
        priority: section.priority,
    }));
}
