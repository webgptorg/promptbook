/**
 * Reloads the current browser document so stale build assets can be fetched again.
 */
export function refreshApplicationDocument(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.location.reload();
}
