import colors from 'colors';
import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Prints a summary of the prompt that will run next.
 */
export function printPromptStartSummary(file: PromptFile, section: PromptSection): void {
    const label = buildPromptLabelForDisplay(file, section);
    const summary = buildPromptSummary(file, section);
    console.info(colors.cyan('Next prompt:'));
    console.info(` ${label}: ${summary}`);
}
