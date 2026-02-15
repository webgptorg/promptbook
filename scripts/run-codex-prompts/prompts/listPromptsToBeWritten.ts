import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';
import { hasSufficientPriority } from './hasSufficientPriority';
import { isPromptToBeWritten } from './isPromptToBeWritten';
import { listTodoPrompts } from './listTodoPrompts';

/**
 * Lists todo prompts that still contain authoring placeholders.
 */
export function listPromptsToBeWritten(files: PromptFile[], minimumPriority = 0): PromptSelection[] {
    return listTodoPrompts(files).filter(
        (prompt) => isPromptToBeWritten(prompt.file, prompt.section) && hasSufficientPriority(prompt.section, minimumPriority),
    );
}
