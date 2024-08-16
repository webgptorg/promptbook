/**
 * Detects if the code is running in a Node.js environment
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export const $isRunningInNode = new Function(`
    try {
        return this === global;
    } catch (e) {
        return false;
    }
`);
