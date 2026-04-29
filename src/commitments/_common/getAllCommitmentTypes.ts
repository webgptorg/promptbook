import { $deepFreeze } from '../../_packages/utils.index';
import type { BookCommitment } from '../_base/BookCommitment';
import { getAllCommitmentDefinitions } from './getAllCommitmentDefinitions';

/**
 * Gets all available commitment types
 *
 * @returns Array of all commitment types
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentTypes(): ReadonlyArray<BookCommitment> {
    return $deepFreeze(getAllCommitmentDefinitions().map((commitmentDefinition) => commitmentDefinition.type));
}
