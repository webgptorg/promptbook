/**
 * Detects if the code is running in a Node.js environment
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export function $isRunningInNode(): boolean {
    try {
        return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
    } catch (e) {
        return false;
    }
}

/**
 * TODO: [🎺]
 */
