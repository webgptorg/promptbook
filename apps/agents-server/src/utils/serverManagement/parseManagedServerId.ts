import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';

/**
 * Parses one route-level managed-server identifier.
 *
 * @param rawServerId - Raw dynamic route segment.
 * @returns Numeric server identifier.
 */
export function parseManagedServerId(rawServerId: string): number {
    const parsedServerId = Number(rawServerId);

    if (!Number.isFinite(parsedServerId)) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`serverId\` must be a valid number.
            `),
        );
    }

    return parsedServerId;
}
