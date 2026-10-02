import { AuthenticationError } from '../../../src/errors/AuthenticationError';

/**
 * Formats one unknown error-like value into readable text for logs and feedback.
 *
 * An `AuthenticationError` is reported without its stack, because its message is written for the user - it
 * says which harness has to be signed in again and how - and the frames of a failure nobody can debug would
 * only push those instructions out of sight.
 */
export function formatUnknownErrorDetails(error: unknown): string {
    if (error instanceof AuthenticationError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.stack || error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    const serializedError = JSON.stringify(error, null, 2);
    return serializedError ?? String(error);
}
