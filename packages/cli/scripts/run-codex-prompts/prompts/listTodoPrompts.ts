import { listPromptsByStatus } from './listPromptsByStatus';
import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';

/**
 * Lists todo prompts across all files.
 */
export function listTodoPrompts(files: PromptFile[]): PromptSelection[] {
    return listPromptsByStatus(files, 'todo');
}
