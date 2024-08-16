/**
 * Detects if the code is running in a browser environment in main thread (Not in a web worker)
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export const $isRunningInBrowser = new Function(`
    try {
        return this === window;
    } catch (e) {
        return false;
    }
`);
