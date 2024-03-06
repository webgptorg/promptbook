/**
 * Detects if the code is running in a browser environment in main thread (Not in a web worker)
 */
export const isRunningInBrowser = new Function(`
    try {
        return this === window;
    } catch (e) {
        return false;
    }
`);

/**
 * Detects if the code is running in a Node.js environment
 */
export const isRunningInNode = new Function(`
    try {
        return this === global;
    } catch (e) {
        return false;
    }
`);

/**
 * Detects if the code is running in a web worker
 */
export const isRunningInWebWorker = new Function(`
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
