import { TODO_any } from '../../_packages/types.index';

/**
 * @public exported from `@promptbook/utils`
 */
export function debounce<T extends (...args: TODO_any[]) => void>(fn: T, delay: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
