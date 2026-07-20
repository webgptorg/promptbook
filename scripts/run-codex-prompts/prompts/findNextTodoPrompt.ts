import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';
import { listRunnablePrompts } from './listRunnablePrompts';
import type { PriorityFilter } from './priorityFilter';
import type { RunnerFilter } from './runnerFilter';

/**
 * Selects the next runnable prompt based on priority, honoring the current model and harness.
 */
export function findNextTodoPrompt(
    files: PromptFile[],
    priorityFilter: PriorityFilter = {},
    runnerFilter?: RunnerFilter,
): PromptSelection | undefined {
    let nextPrompt: PromptSelection | undefined;

    for (const prompt of listRunnablePrompts(files, priorityFilter, runnerFilter)) {
        if (!nextPrompt || prompt.section.priority > nextPrompt.section.priority) {
            nextPrompt = prompt;
        }
    }

    return nextPrompt;
}
