/**
 * Detects if the code is running in a Node.js environment
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export function $isRunningInNode(): boolean {
    try {
        return (
            typeof process !== 'undefined' &&
            process.versions != null &&
            process.versions.node != null &&
            // Note: In Vercel Edge Runtime, process.versions.node might exist but be an empty string or something else
            //       We want to ensure we are in a real Node.js environment
            typeof process.stdout !== 'undefined'
        );
    } catch (e) {
        return false;
    }
}

/**
 * TODO: [🎺]
 */
