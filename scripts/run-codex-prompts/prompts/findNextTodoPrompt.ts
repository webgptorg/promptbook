import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';
import { listRunnablePrompts } from './listRunnablePrompts';

/**
 * Selects the next runnable prompt based on priority.
 */
export function findNextTodoPrompt(files: PromptFile[]): PromptSelection | undefined {
    let nextPrompt: PromptSelection | undefined;

    for (const prompt of listRunnablePrompts(files)) {
        if (!nextPrompt || prompt.section.priority > nextPrompt.section.priority) {
            nextPrompt = prompt;
        }
    }

    return nextPrompt;
}
