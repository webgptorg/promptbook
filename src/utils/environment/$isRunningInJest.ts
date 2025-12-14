/**
 * Detects if the code is running in jest environment
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export function $isRunningInJest(): boolean {
    try {
        return typeof process !== 'undefined' && process.env?.JEST_WORKER_ID !== undefined;
    } catch (e) {
        return false;
    }
}

/**
 * TODO: [🎺]
 */
