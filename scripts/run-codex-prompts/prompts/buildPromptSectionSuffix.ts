import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Builds the suffix which disambiguates one prompt section inside its prompt file.
 *
 * Prompt files holding exactly one section produce an empty suffix so that generated artifact
 * names (temporary scripts, isolation worktrees, ...) stay identical to the prompt file name.
 */
export function buildPromptSectionSuffix(file: PromptFile, section: PromptSection): string {
    return file.sections.length > 1 ? `-${section.index + 1}` : '';
}
