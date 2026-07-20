import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';
import { isPromptInPriorityFilter } from './isPromptInPriorityFilter';
import { isPromptInRunnerFilter, type RunnerFilter } from './runnerFilter';
import { isPromptToBeWritten } from './isPromptToBeWritten';
import { listTodoPrompts } from './listTodoPrompts';
import type { PriorityFilter } from './priorityFilter';

/**
 * Lists todo prompts that are ready to run (no authoring placeholders, within the priority range and
 * runnable by the current model and harness).
 */
export function listRunnablePrompts(
    files: PromptFile[],
    priorityFilter: PriorityFilter = {},
    runnerFilter?: RunnerFilter,
): PromptSelection[] {
    return listTodoPrompts(files).filter(
        (prompt) =>
            !isPromptToBeWritten(prompt.file, prompt.section) &&
            isPromptInPriorityFilter(prompt.section, priorityFilter) &&
            isPromptInRunnerFilter(prompt.section, runnerFilter),
    );
}
