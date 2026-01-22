import { COMMITMENT_REGISTRY } from '..';
import type { BookCommitment } from '../_base/BookCommitment';

/**
 * Checks if a commitment type is supported
 * @param type The commitment type to check
 * @returns True if the commitment type is supported
 *
 * @public exported from `@promptbook/core`
 */

export function isCommitmentSupported(type: BookCommitment): boolean {
    return COMMITMENT_REGISTRY.some((commitmentDefinition) => commitmentDefinition.type === type);
}
