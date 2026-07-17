/**
 * Returns true when one filesystem error indicates a missing path.
 *
 * Used by the agent projects utilities to treat not-yet-created folders as empty
 * instead of failing.
 */
export function isMissingPathError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
