import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';

/**
 * Lists todo prompts across all files.
 */
export function listTodoPrompts(files: PromptFile[]): PromptSelection[] {
    const prompts: PromptSelection[] = [];
    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'todo') {
                prompts.push({ file, section });
            }
        }
    }
    return prompts;
}
