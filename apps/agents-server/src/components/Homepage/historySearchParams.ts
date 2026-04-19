/**
 * History update modes supported by the homepage query-state helper.
 *
 * @private function of AgentsList
 */
export type HistorySearchParamsUpdateMode = 'push' | 'replace';

/**
 * Shared options for homepage query-string updates.
 *
 * @private function of AgentsList
 */
type HistorySearchParamsUpdateOptions = {
    /**
     * Browser pathname that should receive the updated query string.
     */
    readonly pathname: string;

    /**
     * Current query-string snapshot used as the mutation baseline.
     */
    readonly searchParamsSnapshot: string;

    /**
     * Whether the mutation should push or replace the current history entry.
     */
    readonly mode: HistorySearchParamsUpdateMode;

    /**
     * Applies the desired query-string mutations.
     */
    readonly updateSearchParams: (searchParams: URLSearchParams) => void;
};

/**
 * Pure options for resolving the next homepage href.
 *
 * @private function of AgentsList
 */
type BuildHistorySearchParamsHrefOptions = Omit<HistorySearchParamsUpdateOptions, 'mode'>;

/**
 * Builds the next pathname+query href for one homepage query-state mutation.
 *
 * @param options - Current pathname, query snapshot, and mutation callback.
 * @returns Relative href ready for `window.history`.
 *
 * @private function of AgentsList
 */
export function buildHistorySearchParamsHref({
    pathname,
    searchParamsSnapshot,
    updateSearchParams,
}: BuildHistorySearchParamsHrefOptions): string {
    const nextSearchParams = new URLSearchParams(searchParamsSnapshot);
    updateSearchParams(nextSearchParams);
    const nextQuery = nextSearchParams.toString();

    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

/**
 * Applies one homepage query-state mutation directly through the browser history API.
 *
 * Next.js integrates native history calls with `useSearchParams`, which lets the
 * homepage swap folder/view state immediately without waiting for a server round-trip.
 *
 * @param options - Current pathname, query snapshot, mode, and mutation callback.
 *
 * @private function of AgentsList
 */
export function updateHistorySearchParams({
    mode,
    pathname,
    searchParamsSnapshot,
    updateSearchParams,
}: HistorySearchParamsUpdateOptions): void {
    if (typeof window === 'undefined') {
        return;
    }

    const nextHref = buildHistorySearchParamsHref({
        pathname,
        searchParamsSnapshot,
        updateSearchParams,
    });

    if (mode === 'push') {
        window.history.pushState(window.history.state, '', nextHref);
        return;
    }

    window.history.replaceState(window.history.state, '', nextHref);
}
