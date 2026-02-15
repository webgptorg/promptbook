import type { PromptSection } from './types/PromptSection';

/**
 * Checks whether a prompt section meets the minimum priority threshold.
 */
export function hasSufficientPriority(section: PromptSection, minimumPriority: number): boolean {
    return section.priority >= minimumPriority;
}
