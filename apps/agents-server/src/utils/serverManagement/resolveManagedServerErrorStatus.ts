import { AuthenticationError } from '../../../../../src/errors/AuthenticationError';
import { ConflictError } from '../../../../../src/errors/ConflictError';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { getPasswordValidationMessage } from '../auth';

/**
 * Maps branded server-management errors to API-friendly status codes.
 *
 * @param error - Unknown domain error.
 * @returns HTTP-style status code.
 */
export function resolveManagedServerErrorStatus(error: unknown): number {
    if (getPasswordValidationMessage(error)) {
        return 400;
    }
    if (error instanceof AuthenticationError) {
        return 401;
    }
    if (error instanceof NotFoundError) {
        return 404;
    }
    if (error instanceof NotAllowed) {
        return 403;
    }
    if (error instanceof ConflictError) {
        return 409;
    }
    if (error instanceof DatabaseError) {
        return 400;
    }
    return 500;
}
