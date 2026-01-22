import { COMMITMENT_REGISTRY } from '..';
import { $deepFreeze } from '../../_packages/utils.index';
import type { BookCommitment } from '../_base/BookCommitment';

/**
 * Gets all available commitment types
 * @returns Array of all commitment types
 *
 * @public exported from `@promptbook/core`
 */

export function getAllCommitmentTypes(): ReadonlyArray<BookCommitment> {
    return $deepFreeze(COMMITMENT_REGISTRY.map((commitmentDefinition) => commitmentDefinition.type));
}
