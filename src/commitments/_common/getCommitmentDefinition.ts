import { COMMITMENT_REGISTRY } from '..';
import type { BookCommitment } from '../_base/BookCommitment';
import type { CommitmentDefinition } from '../_base/CommitmentDefinition';

/**
 * Gets a commitment definition by its type
 * @param type The commitment type to look up
 * @returns The commitment definition or null if not found
 *
 * @public exported from `@promptbook/core`
 */
export function getCommitmentDefinition(type: BookCommitment): CommitmentDefinition | null {
    return COMMITMENT_REGISTRY.find((commitmentDefinition) => commitmentDefinition.type === type) || null;
}
