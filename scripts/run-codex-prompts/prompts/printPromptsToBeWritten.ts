import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import { listPromptsToBeWritten } from './listPromptsToBeWritten';
import type { PromptFile } from './types/PromptFile';

/**
 * Prints the list of prompts that still need to be written.
 */
export function printPromptsToBeWritten(files: PromptFile[]): void {
    const promptsToWrite = listPromptsToBeWritten(files);

    let i = 0;
    for (const { file, section } of promptsToWrite) {
        const label = buildPromptLabelForDisplay(file, section);
        const summary = buildPromptSummary(file, section);
        console.info(`  ${++i}) ${label}: ${summary}`);
    }
}
