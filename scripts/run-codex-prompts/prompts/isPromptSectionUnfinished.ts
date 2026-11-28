import type { PromptSection } from './types/PromptSection';

/**
 * Checks whether one prompt section still has open coding work.
 *
 * A `[ ]` prompt has not been started at all and a `[^]` prompt was left in the middle of its
 * implementation, so a file containing either of them is not finished yet.
 */
export function isPromptSectionUnfinished(section: PromptSection): boolean {
    return section.status === 'todo' || section.status === 'in-progress';
}
