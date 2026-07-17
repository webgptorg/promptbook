import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';

/**
 * Priority range used when selecting prompt sections for `ptbk coder`.
 */
export type PriorityFilter = {
    /**
     * Optional inclusive lower priority bound.
     */
    readonly minimumPriority?: number;

    /**
     * Optional inclusive upper priority bound.
     */
    readonly maximumPriority?: number;
};

/**
 * Priority range input accepted from current and legacy option shapes.
 */
export type PriorityFilterInput = PriorityFilter & {
    /**
     * Legacy alias for `minimumPriority`.
     */
    readonly priority?: number;
};

/**
 * Human-readable label for a priority scope without any bounds.
 */
const ALL_PRIORITIES_LABEL = 'All priorities';

/**
 * Normalizes the current `minimumPriority` / `maximumPriority` options and the legacy
 * `priority` alias into one validated priority filter.
 */
export function normalizePriorityFilter(priorityFilterInput: PriorityFilterInput = {}): PriorityFilter {
    const legacyMinimumPriority = normalizeMinimumPriorityBoundary('--priority', priorityFilterInput.priority);
    const explicitMinimumPriority = normalizeMinimumPriorityBoundary(
        '--min-priority',
        priorityFilterInput.minimumPriority,
    );
    const maximumPriority = normalizeMaximumPriorityBoundary('--max-priority', priorityFilterInput.maximumPriority);

    if (
        legacyMinimumPriority !== undefined &&
        explicitMinimumPriority !== undefined &&
        legacyMinimumPriority !== explicitMinimumPriority
    ) {
        throw new NotAllowed(
            spaceTrim(`
                Conflicting priority range options.

                \`--priority\` is an alias for \`--min-priority\`, so both values must match when used together.
                Received \`--priority ${legacyMinimumPriority}\` and \`--min-priority ${explicitMinimumPriority}\`.
            `),
        );
    }

    const minimumPriority = explicitMinimumPriority ?? legacyMinimumPriority;

    if (minimumPriority !== undefined && maximumPriority !== undefined && minimumPriority > maximumPriority) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid priority range.

                \`--min-priority\` must be less than or equal to \`--max-priority\`.
                Received \`--min-priority ${minimumPriority}\` and \`--max-priority ${maximumPriority}\`.
            `),
        );
    }

    return {
        ...(minimumPriority !== undefined ? { minimumPriority } : {}),
        ...(maximumPriority !== undefined ? { maximumPriority } : {}),
    };
}

/**
 * Checks whether the provided priority is inside the inclusive priority filter.
 */
export function isPriorityInFilter(priority: number, priorityFilter: PriorityFilter = {}): boolean {
    const { minimumPriority, maximumPriority } = priorityFilter;

    if (minimumPriority !== undefined && priority < minimumPriority) {
        return false;
    }

    if (maximumPriority !== undefined && priority > maximumPriority) {
        return false;
    }

    return true;
}

/**
 * Formats the priority filter as the scope shown in runner status output.
 */
export function formatPriorityFilter(priorityFilter: PriorityFilter): string {
    const { minimumPriority, maximumPriority } = priorityFilter;

    if (minimumPriority !== undefined && maximumPriority !== undefined) {
        if (minimumPriority === maximumPriority) {
            return `Priority ${minimumPriority}`;
        }

        return `Priority ${minimumPriority}-${maximumPriority}`;
    }

    if (minimumPriority !== undefined) {
        return `Priority ≥${minimumPriority}`;
    }

    if (maximumPriority !== undefined) {
        return `Priority ≤${maximumPriority}`;
    }

    return ALL_PRIORITIES_LABEL;
}

/**
 * Formats the excluded priority range label used in summary counts.
 */
export function formatExcludedPriorityFilter(priorityFilter: PriorityFilter): string | undefined {
    const { minimumPriority, maximumPriority } = priorityFilter;

    if (minimumPriority !== undefined && maximumPriority !== undefined) {
        if (minimumPriority === maximumPriority) {
            return `Priority ≠${minimumPriority}`;
        }

        return `Priority outside ${minimumPriority}-${maximumPriority}`;
    }

    if (minimumPriority !== undefined) {
        return `Priority <${minimumPriority}`;
    }

    if (maximumPriority !== undefined) {
        return `Priority >${maximumPriority}`;
    }

    return undefined;
}

/**
 * Validates and normalizes one priority boundary value.
 *
 * Zero is normalized away because prompt priorities are non-negative, so `0` is equivalent
 * to an absent lower bound for minimum priority.
 */
function normalizeMinimumPriorityBoundary(optionName: string, priority: number | undefined): number | undefined {
    assertPriorityBoundary(optionName, priority);
    return priority === 0 ? undefined : priority;
}

/**
 * Validates one maximum-priority boundary value.
 */
function normalizeMaximumPriorityBoundary(optionName: string, priority: number | undefined): number | undefined {
    assertPriorityBoundary(optionName, priority);
    return priority;
}

/**
 * Validates one priority boundary value.
 */
function assertPriorityBoundary(optionName: string, priority: number | undefined): void {
    if (priority === undefined) {
        return;
    }

    if (Number.isInteger(priority) && priority >= 0) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Invalid value for \`${optionName}\`: \`${priority}\`.

            Use a non-negative integer.
        `),
    );
}

// Note: [🟡] Code for priority filtering [priorityFilter](scripts/run-codex-prompts/prompts/priorityFilter.ts) should never be published outside of `@promptbook/cli`
