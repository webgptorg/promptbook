import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import { COMMITMENT_REGISTRY } from '../index';
import type { CommitmentDefinition } from '../_base/CommitmentDefinition';
import { sortCommitmentDefinitions } from './sortCommitmentDefinitions';

/**
 * Gets all available commitment definitions
 *
 * @returns Array of all commitment definitions
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentDefinitions(): ReadonlyArray<CommitmentDefinition> {
    return $deepFreeze(
        sortCommitmentDefinitions(COMMITMENT_REGISTRY, { isUnfinishedLast: true, isLowLevelLast: true }),
    );
}
