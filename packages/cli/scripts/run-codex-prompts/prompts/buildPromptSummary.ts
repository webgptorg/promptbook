import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { buildCodexPrompt } from './buildCodexPrompt';

/**
 * Extracts a short summary line from a prompt section.
 */
export function buildPromptSummary(file: PromptFile, section: PromptSection): string {
    const lines = buildCodexPrompt(file, section).split(/\r?\n/);
    const firstLine = lines.find((line) => line.trim() !== '');
    return firstLine?.trim() || '(empty prompt)';
}
