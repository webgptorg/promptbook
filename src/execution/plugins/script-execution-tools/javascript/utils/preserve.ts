import { forTime } from 'waitasecond';

/**
 * Does nothing, but preserves the function in the bundle
 * Compiler is tricked into thinking the function is used
 *
 * @param value any function to preserve
 * @returns nothing
 */
export function preserve(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    func: (...params: Array<any>) => unknown,
): void {
    // Note: NOT calling the function

    (async () => {
        // TODO: Change to `await forEver` or something better
        await forTime(100000000);

        // [1]
        try {
            await func();
        } finally {
            // do nothing
        }
    })();
}

/**
 * TODO: !! [1] This maybe does memory leak
 */
