import { COMMITMENT_REGISTRY } from '..';
import { $deepFreeze } from '../../_packages/utils.index';
import { CommitmentDefinition } from '../_base/CommitmentDefinition';
import { NotYetImplementedCommitmentDefinition } from '../_base/NotYetImplementedCommitmentDefinition';
import { sortCommitmentDefinitions } from './sortCommitmentDefinitions';

/**
 * Grouped commitment definition
 */
type GroupedCommitmentDefinition = {
    primary: CommitmentDefinition;
    aliases: string[];
};
/**
 * Gets all commitment definitions grouped by their aliases
 *
 * @returns Array of grouped commitment definitions
 *
 * @public exported from `@promptbook/core`
 */
export function getGroupedCommitmentDefinitions(): ReadonlyArray<GroupedCommitmentDefinition> {
    const groupedCommitments: GroupedCommitmentDefinition[] = [];

    for (const commitment of sortCommitmentDefinitions(COMMITMENT_REGISTRY, {
        isDeprecatedLast: true,
        isUnfinishedLast: true,
        isLowLevelLast: true,
    })) {
        const existingGroup = findExistingCommitmentGroup(groupedCommitments, commitment);
        if (existingGroup) {
            existingGroup.aliases.push(commitment.type);
            continue;
        }

        const lastGroup = groupedCommitments[groupedCommitments.length - 1];

        // Check if we should group with the previous item
        let shouldGroup = false;

        if (lastGroup) {
            const lastPrimary = lastGroup.primary;

            // OPEN and CLOSED are one documentation family even though they are
            // separate runtime commitments, so they should stay grouped together.
            if (lastPrimary.type === 'OPEN' && commitment.type === 'CLOSED') {
                shouldGroup = true;
            }

            // Case 1: Same class constructor (except NotYetImplemented)
            else if (
                !(commitment instanceof NotYetImplementedCommitmentDefinition) &&
                commitment.constructor === lastPrimary.constructor
            ) {
                shouldGroup = true;
            }

            // Case 2: NotYetImplemented with prefix matching (e.g. BEHAVIOUR -> BEHAVIOURS)
            else if (
                commitment instanceof NotYetImplementedCommitmentDefinition &&
                lastPrimary instanceof NotYetImplementedCommitmentDefinition &&
                commitment.type.startsWith(lastPrimary.type)
            ) {
                shouldGroup = true;
            }
        }

        if (shouldGroup && lastGroup) {
            lastGroup.aliases.push(commitment.type);
        } else {
            groupedCommitments.push({
                primary: commitment,
                aliases: [],
            });
        }
    }

    return $deepFreeze(groupedCommitments);
}

/**
 * Finds an existing group for aliases that were separated from their primary commitment by priority sorting.
 *
 * @param groupedCommitments - Groups collected so far.
 * @param commitment - Commitment definition that may be an alias of an earlier group.
 * @returns Existing alias group or `null` when a new group should be created.
 *
 * @private internal utility of `getGroupedCommitmentDefinitions`
 */
function findExistingCommitmentGroup(
    groupedCommitments: ReadonlyArray<GroupedCommitmentDefinition>,
    commitment: CommitmentDefinition,
): GroupedCommitmentDefinition | null {
    if (commitment instanceof NotYetImplementedCommitmentDefinition) {
        return null;
    }

    return (
        groupedCommitments.find(
            (group) =>
                !(group.primary instanceof NotYetImplementedCommitmentDefinition) &&
                group.primary.constructor === commitment.constructor,
        ) || null
    );
}
