// Debounce utility for BookEditor and related components
// [🧠] Use this for debouncing highlight and other expensive operations

import { TODO_any } from '../../_packages/types.index';

/**
 * @private
 */
export function debounce<T extends (...args: TODO_any[]) => void>(fn: T, delay: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * TODO: !!! remove this file */
