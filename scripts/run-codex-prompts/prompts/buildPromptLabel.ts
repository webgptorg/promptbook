import { relative } from 'path';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Builds a label that identifies the prompt section by index.
 */
export function buildPromptLabel(file: PromptFile, section: PromptSection, projectPath = process.cwd()): string {
    return `${relative(projectPath, file.path).replace(/\\/g, '/')}#${section.index + 1}`;
}
