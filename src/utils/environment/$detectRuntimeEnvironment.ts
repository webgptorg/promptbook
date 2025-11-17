import { $isRunningInBrowser } from './$isRunningInBrowser';
import { $isRunningInJest } from './$isRunningInJest';
import { $isRunningInNode } from './$isRunningInNode';
import { $isRunningInWebWorker } from './$isRunningInWebWorker';

/**
 * Returns information about the current runtime environment
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environments
 *
 * @public exported from `@promptbook/utils`
 */
export function $detectRuntimeEnvironment() {
    return {
        isRunningInBrowser: $isRunningInBrowser(),
        isRunningInJest: $isRunningInJest(),
        isRunningInNode: $isRunningInNode(),
        isRunningInWebWorker: $isRunningInWebWorker(),
    };
}

/**
 * TODO: [🎺] Also detect and report node version here
 */
