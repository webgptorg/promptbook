import { spaceTrim } from 'spacetrim';
import { AuthenticationError } from '../../../../../src/errors/AuthenticationError';

/**
 * Ensures the given request is performed by the environment-backed super-admin.
 *
 * @param isGlobalAdmin - Resolved super-admin flag.
 */
export function assertGlobalAdminAccess(isGlobalAdmin: boolean): void {
    if (!isGlobalAdmin) {
        throw new AuthenticationError(
            spaceTrim(`
                This action is restricted to the environment-backed global admin.
            `),
        );
    }
}
