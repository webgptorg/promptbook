import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { buildPromptLinesWithoutStatus } from './buildPromptLinesWithoutStatus';

/**
 * Builds the commit message from the prompt content.
 */
export function buildCommitMessage(file: PromptFile, section: PromptSection): string {
    const lines = buildPromptLinesWithoutStatus(file, section);
    return lines.join(file.eol);
}
