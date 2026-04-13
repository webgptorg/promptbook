/**
 * Formats one unknown error-like value into readable text for logs and feedback.
 */
export function formatUnknownErrorDetails(error: unknown): string {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    const serializedError = JSON.stringify(error, null, 2);
    return serializedError ?? String(error);
}
