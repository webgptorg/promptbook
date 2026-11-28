import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';
import type { PromptStatus } from './types/PromptStatus';

/**
 * Lists prompts in one checklist status across all files.
 */
export function listPromptsByStatus(files: PromptFile[], status: PromptStatus): PromptSelection[] {
    const prompts: PromptSelection[] = [];
    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === status) {
                prompts.push({ file, section });
            }
        }
    }
    return prompts;
}
