import type { CommitmentDefinition } from '../_base/CommitmentDefinition';

/**
 * Sorting options for commitment definitions.
 *
 * @private internal helper of commitment catalog sorting
 */
type CommitmentDefinitionSortOptions = {
    /**
     * When enabled, deprecated commitments are moved behind all non-deprecated commitments.
     */
    readonly isDeprecatedLast?: boolean;

    /**
     * When enabled, unfinished commitments are moved behind all other commitments.
     */
    readonly isUnfinishedLast?: boolean;

    /**
     * When enabled, low-level commitments are moved behind all other commitments.
     */
    readonly isLowLevelLast?: boolean;
};

/**
 * Priority order for the important commitments shown first in catalogues and intellisense.
 *
 * Canonical singular names stay ahead of their plural aliases so the most important
 * commitments remain easy to scan.
 *
 * @private internal constant of commitment catalog sorting
 */
const IMPORTANT_COMMITMENT_TYPE_SORT_ORDER = new Map<string, number>([
    ['GOAL', 0],
    ['GOALS', 1],
    ['RULE', 2],
    ['RULES', 3],
    ['KNOWLEDGE', 4],
    ['TEAM', 5],
]);

/**
 * Sort rank used when unfinished, low-level, and deprecated commitments should be grouped last.
 *
 * @private internal constant of commitment catalog sorting
 */
const COMMITMENT_STATUS_SORT_ORDER = {
    normal: 0,
    deprecated: 1,
    unfinished: 2,
    lowLevel: 3,
} as const;

/**
 * Resolves the relative sort rank of one commitment status.
 *
 * @param definition - Commitment definition to rank.
 * @param options - Sorting options.
 * @returns Relative sort rank for the definition.
 *
 * @private internal helper of commitment catalog sorting
 */
function resolveCommitmentStatusSortRank(
    definition: CommitmentDefinition,
    options: CommitmentDefinitionSortOptions,
): number {
    let statusSortRank: number = COMMITMENT_STATUS_SORT_ORDER.normal;

    if (options.isDeprecatedLast && definition.deprecation) {
        statusSortRank = Math.max(statusSortRank, COMMITMENT_STATUS_SORT_ORDER.deprecated);
    }

    if (options.isUnfinishedLast && definition.isUnfinished) {
        statusSortRank = Math.max(statusSortRank, COMMITMENT_STATUS_SORT_ORDER.unfinished);
    }

    if (options.isLowLevelLast && definition.isLowLevel) {
        statusSortRank = Math.max(statusSortRank, COMMITMENT_STATUS_SORT_ORDER.lowLevel);
    }

    return statusSortRank;
}

/**
 * Sorts commitment definitions so the important ones stay at the top.
 *
 * @param commitmentDefinitions - Definitions to sort.
 * @param options - Sorting options.
 * @returns Sorted commitment definitions.
 *
 * @private internal helper of commitment catalog sorting
 */
export function sortCommitmentDefinitions<TCommitmentDefinition extends CommitmentDefinition>(
    commitmentDefinitions: ReadonlyArray<TCommitmentDefinition>,
    options: CommitmentDefinitionSortOptions = {},
): ReadonlyArray<TCommitmentDefinition> {
    return [...commitmentDefinitions]
        .map((definition, index) => ({
            definition,
            index,
        }))
        .sort((left, right) => {
            if (left.definition.isImportant !== right.definition.isImportant) {
                return left.definition.isImportant ? -1 : 1;
            }

            if (left.definition.isImportant && right.definition.isImportant) {
                const leftPriority = IMPORTANT_COMMITMENT_TYPE_SORT_ORDER.get(left.definition.type) ?? Number.MAX_SAFE_INTEGER;
                const rightPriority =
                    IMPORTANT_COMMITMENT_TYPE_SORT_ORDER.get(right.definition.type) ?? Number.MAX_SAFE_INTEGER;

                if (leftPriority !== rightPriority) {
                    return leftPriority - rightPriority;
                }
            }

            const leftStatusSortRank = resolveCommitmentStatusSortRank(left.definition, options);
            const rightStatusSortRank = resolveCommitmentStatusSortRank(right.definition, options);

            if (leftStatusSortRank !== rightStatusSortRank) {
                return leftStatusSortRank - rightStatusSortRank;
            }

            return left.index - right.index;
        })
        .map(({ definition }) => definition);
}
