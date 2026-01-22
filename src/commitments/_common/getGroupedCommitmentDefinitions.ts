import { COMMITMENT_REGISTRY } from '..';
import { $deepFreeze } from '../../_packages/utils.index';
import { CommitmentDefinition } from '../_base/CommitmentDefinition';
import { NotYetImplementedCommitmentDefinition } from '../_base/NotYetImplementedCommitmentDefinition';

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

    for (const commitment of COMMITMENT_REGISTRY) {
        const lastGroup = groupedCommitments[groupedCommitments.length - 1];

        // Check if we should group with the previous item
        let shouldGroup = false;

        if (lastGroup) {
            const lastPrimary = lastGroup.primary;

            // Case 1: Same class constructor (except NotYetImplemented)
            if (
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
