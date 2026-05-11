import type { BookCommitment } from '../../../commitments/_base/BookCommitment';
import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';
import { parseParameters } from '../parseParameters';

/**
 * DELETE-like commitment types that invalidate earlier tagged commitments.
 *
 * @private internal constant of `filterCommitmentsForAgentModelRequirements`
 */
const DELETE_COMMITMENT_TYPES = new Set<BookCommitment>(['DELETE', 'CANCEL', 'DISCARD', 'REMOVE']);

/**
 * Commitments whose earlier occurrences are overwritten by the last occurrence in source order.
 *
 * @private internal constant of `filterCommitmentsForAgentModelRequirements`
 */
const OVERWRITTEN_COMMITMENT_GROUP_BY_TYPE = new Map<BookCommitment, 'GOAL'>([
    ['GOAL', 'GOAL'],
    ['GOALS', 'GOAL'],
]);

/**
 * Legacy commitments that should be parsed for compatibility but ignored by the model-requirements pipeline.
 *
 * @private internal constant of `filterCommitmentsForAgentModelRequirements`
 */
const IGNORED_COMMITMENT_TYPES = new Set<BookCommitment>(['WALLET', 'WALLETS']);

/**
 * Applies the commitment filtering rules used before commitment definitions are executed.
 *
 * @param commitments - Parsed commitments in original source order.
 * @returns Commitments after DELETE-like invalidation and overwritten-goal filtering.
 *
 * @private function of `createAgentModelRequirementsWithCommitments`
 */
export function filterCommitmentsForAgentModelRequirements(
    commitments: ReadonlyArray<ParsedCommitment>,
): ParsedCommitment[] {
    return filterOverwrittenCommitments(filterDeletedCommitments(commitments));
}

/**
 * Removes earlier commitments that are overwritten by later commitments of the same semantic group.
 *
 * @param commitments - Parsed commitments after DELETE-like filtering.
 * @returns Commitments with overwritten entries removed while preserving source order.
 *
 * @private internal utility of `filterCommitmentsForAgentModelRequirements`
 */
function filterOverwrittenCommitments(commitments: ReadonlyArray<ParsedCommitment>): ParsedCommitment[] {
    const seenOverwriteGroups = new Set<string>();
    const keptCommitments: ParsedCommitment[] = [];

    for (let index = commitments.length - 1; index >= 0; index--) {
        const commitment = commitments[index]!;
        const overwriteGroup = OVERWRITTEN_COMMITMENT_GROUP_BY_TYPE.get(commitment.type);

        if (!overwriteGroup) {
            keptCommitments.push(commitment);
            continue;
        }

        if (seenOverwriteGroups.has(overwriteGroup)) {
            continue;
        }

        seenOverwriteGroups.add(overwriteGroup);
        keptCommitments.push(commitment);
    }

    return keptCommitments.reverse();
}

/**
 * Applies DELETE-like invalidation commitments and returns only commitments that should continue through the pipeline.
 *
 * @param commitments - Parsed commitments in original source order.
 * @returns Filtered commitments with earlier deleted items removed.
 *
 * @private internal utility of `filterCommitmentsForAgentModelRequirements`
 */
function filterDeletedCommitments(commitments: ReadonlyArray<ParsedCommitment>): ParsedCommitment[] {
    const filteredCommitments: ParsedCommitment[] = [];

    for (const commitment of commitments) {
        if (isIgnoredCommitmentType(commitment.type)) {
            continue;
        }

        if (!isDeleteCommitmentType(commitment.type)) {
            filteredCommitments.push(commitment);
            continue;
        }

        const targetParameterNames = getCommitmentParameterNames(commitment.content);
        if (targetParameterNames.length === 0) {
            continue;
        }

        for (let index = filteredCommitments.length - 1; index >= 0; index--) {
            const previousCommitment = filteredCommitments[index]!;
            const previousParameterNames = getCommitmentParameterNames(previousCommitment.content);
            const isTargeted = previousParameterNames.some((parameterName) =>
                targetParameterNames.includes(parameterName),
            );

            if (isTargeted) {
                filteredCommitments.splice(index, 1);
            }
        }
    }

    return filteredCommitments;
}

/**
 * Checks whether a commitment type behaves like DELETE and therefore invalidates earlier tagged commitments.
 *
 * @param commitmentType - Commitment type to check.
 * @returns `true` when the commitment removes prior tagged commitments.
 *
 * @private internal utility of `filterDeletedCommitments`
 */
function isDeleteCommitmentType(commitmentType: ParsedCommitment['type']): boolean {
    return DELETE_COMMITMENT_TYPES.has(commitmentType);
}

/**
 * Checks whether a parsed commitment is intentionally ignored by the current model compiler.
 *
 * @param commitmentType - Commitment type to check.
 * @returns `true` when the commitment should not affect model requirements.
 *
 * @private internal utility of `filterDeletedCommitments`
 */
function isIgnoredCommitmentType(commitmentType: ParsedCommitment['type']): boolean {
    return IGNORED_COMMITMENT_TYPES.has(commitmentType);
}

/**
 * Extracts normalized parameter names used for DELETE-like invalidation matching.
 *
 * @param content - Commitment content to parse.
 * @returns Lower-cased non-empty parameter names.
 *
 * @private internal utility of `filterDeletedCommitments`
 */
function getCommitmentParameterNames(content: string): string[] {
    return parseParameters(content)
        .map((parameter) => parameter.name.trim().toLowerCase())
        .filter(Boolean);
}
