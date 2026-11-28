import type { TODO_any } from '../organization/TODO_any';

/**
 * Creates a debounced function that runs after calls have been quiet for the given delay.
 *
 * @public exported from `@promptbook/utils`
 */
export function debounce<T extends (...args: TODO_any[]) => void>(
    fn: T,
    delay: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cancel = () => {
        if (timeout === null) {
            return;
        }

        clearTimeout(timeout);
        timeout = null;
    };

    const debounced = (...args: Parameters<T>) => {
        cancel();

        timeout = setTimeout(() => {
            timeout = null;
            fn(...args);
        }, delay);
    };

    debounced.cancel = cancel;

    return debounced;
}
