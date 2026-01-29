import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Builds the script path for a prompt section.
 */
export function buildScriptPath(file: PromptFile, section: PromptSection): string {
    const basePath = file.path.replace(/\.md$/i, '');
    const suffix = file.sections.length > 1 ? `-${section.index + 1}` : '';
    return `${basePath}${suffix}.sh`;
}
