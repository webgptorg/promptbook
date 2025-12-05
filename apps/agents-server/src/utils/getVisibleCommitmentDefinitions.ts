import { getGroupedCommitmentDefinitions } from '../../../../src/commitments';
import { NotYetImplementedCommitmentDefinition } from '../../../../src/commitments/_base/NotYetImplementedCommitmentDefinition';

/**
 * Gets visible commitment definitions for documentation
 * Excluding those that are not yet implemented
 */
export function getVisibleCommitmentDefinitions() {
    return getGroupedCommitmentDefinitions().filter(
        (group) => !(group.primary instanceof NotYetImplementedCommitmentDefinition),
    );
}
