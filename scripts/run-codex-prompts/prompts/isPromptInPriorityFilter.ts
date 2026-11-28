import { isPriorityInFilter, type PriorityFilter } from './priorityFilter';
import type { PromptSection } from './types/PromptSection';

/**
 * Checks whether a prompt section matches the configured priority filter.
 */
export function isPromptInPriorityFilter(section: PromptSection, priorityFilter: PriorityFilter = {}): boolean {
    return isPriorityInFilter(section.priority, priorityFilter);
}

// Note: [🟡] Code for priority filtering [isPromptInPriorityFilter](scripts/run-codex-prompts/prompts/isPromptInPriorityFilter.ts) should never be published outside of `@promptbook/cli`
