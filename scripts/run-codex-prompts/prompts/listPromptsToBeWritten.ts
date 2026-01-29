import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';
import { isPromptToBeWritten } from './isPromptToBeWritten';
import { listTodoPrompts } from './listTodoPrompts';

/**
 * Lists todo prompts that still contain authoring placeholders.
 */
export function listPromptsToBeWritten(files: PromptFile[]): PromptSelection[] {
    return listTodoPrompts(files).filter((prompt) => isPromptToBeWritten(prompt.file, prompt.section));
}
