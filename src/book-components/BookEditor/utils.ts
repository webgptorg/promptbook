// Debounce utility for BookEditor and related components
// [🧠] Use this for debouncing highlight and other expensive operations

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
