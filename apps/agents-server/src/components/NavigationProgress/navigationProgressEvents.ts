/**
 * Custom browser event emitted whenever a client-side route transition starts.
 */
export const NAVIGATION_PROGRESS_START_EVENT_NAME = 'agents-server:navigation-progress-start';

/**
 * Optional payload describing one client-side navigation transition.
 */
export type NavigationProgressStartDetail = {
    /**
     * Navigation destination href when available.
     */
    readonly href?: string;
    /**
     * Trigger source used for diagnostics/debugging.
     */
    readonly source?: 'router' | 'link' | 'unknown';
};

/**
 * Emits one global navigation-start signal used by the top loading bar.
 *
 * @param detail - Optional navigation metadata payload.
 */
export function dispatchNavigationProgressStart(detail: NavigationProgressStartDetail = {}): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<NavigationProgressStartDetail>(NAVIGATION_PROGRESS_START_EVENT_NAME, {
            detail,
        }),
    );
}
