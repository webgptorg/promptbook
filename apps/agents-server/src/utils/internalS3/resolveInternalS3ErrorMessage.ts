/**
 * Options for resolving a user-facing internal S3 error message.
 *
 * @private internal S3 helper type
 */
type ResolveInternalS3ErrorMessageOptions = {
    /**
     * Timeout that may have aborted the operation, in milliseconds.
     */
    readonly timeoutMs?: number;
};

/**
 * Resolves a user-facing message from an internal S3 operation error.
 *
 * @param error - Thrown value.
 * @param options - Optional operation context.
 * @returns Human-readable failure message.
 * @private internal S3 helper
 */
export function resolveInternalS3ErrorMessage(
    error: unknown,
    options: ResolveInternalS3ErrorMessageOptions = {},
): string {
    if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return options.timeoutMs
                ? `Internal S3 did not respond within ${options.timeoutMs / 1000} seconds.`
                : 'Internal S3 did not respond before the request timed out.';
        }

        return error.message;
    }

    return 'Unknown error while contacting the internal S3 storage.';
}
