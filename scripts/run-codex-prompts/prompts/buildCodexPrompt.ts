import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { buildPromptLinesWithoutStatus } from './buildPromptLinesWithoutStatus';

/**
 * Builds the prompt text sent to the agent runner.
 */
export function buildCodexPrompt(file: PromptFile, section: PromptSection): string {
    const lines = buildPromptLinesWithoutStatus(file, section);

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') {
            continue;
        }
        lines[i] = lines[i].replace(/^\[[^\]]+\]\s*/, '');
        break;
    }

    return lines.join(file.eol);
}
