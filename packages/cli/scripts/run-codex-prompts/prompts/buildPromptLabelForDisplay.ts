import { relative } from 'path';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Builds a display label using the prompt line number for easier navigation.
 */
export function buildPromptLabelForDisplay(file: PromptFile, section: PromptSection): string {
    return `${relative(process.cwd(), file.path).replace(/\\/g, '/')}#${section.startLine + 1}`;
}
