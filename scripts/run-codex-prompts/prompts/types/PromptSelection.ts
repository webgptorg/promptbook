import type { PromptFile } from './PromptFile';
import type { PromptSection } from './PromptSection';

/**
 * Pairing of a prompt file and section.
 */
export type PromptSelection = {
    file: PromptFile;
    section: PromptSection;
};
