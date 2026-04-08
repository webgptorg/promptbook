import type { TODO_any } from '../organization/TODO_any';

/**
 * Handles debounce.
 *
 * @public exported from `@promptbook/utils`
 */
export function debounce<T extends (...args: TODO_any[]) => void>(fn: T, delay: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
