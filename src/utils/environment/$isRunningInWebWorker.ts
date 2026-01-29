/**
 * Detects if the code is running in a web worker
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export function $isRunningInWebWorker(): boolean {
    try {
        // Note: Check for importScripts which is specific to workers
        //       and not available in the main browser thread
        return (
            typeof self !== 'undefined' &&
            typeof (self as unknown as Record<string, unknown>).importScripts === 'function'
        );
    } catch (e) {
        return false;
    }
}

/**
 * TODO: [🎺]
 */
