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
            if (options.isDeprecatedLast) {
                const leftIsDeprecated = Boolean(left.definition.deprecation);
                const rightIsDeprecated = Boolean(right.definition.deprecation);

                if (leftIsDeprecated !== rightIsDeprecated) {
                    return leftIsDeprecated ? 1 : -1;
                }
            }

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

            return left.index - right.index;
        })
        .map(({ definition }) => definition);
}
