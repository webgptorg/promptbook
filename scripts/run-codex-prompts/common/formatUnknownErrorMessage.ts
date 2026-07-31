/**
 * Formats one unknown error-like value into its readable message without the stack trace.
 *
 * Use this instead of `formatUnknownErrorDetails` whenever the text is shown to the user, for example
 * inside a branded error, where the stack of the wrapped error would only bury the actual cause.
 */
export function formatUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    const serializedError = JSON.stringify(error, null, 2);
    return serializedError ?? String(error);
}
