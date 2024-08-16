/**
 * Detects if the code is running in a web worker
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
 *
 * @public exported from `@promptbook/utils`
 */
export const $isRunningInWebWorker = new Function(`
    try {
        if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
`);
