/**
 * Resolves the currently visible viewport height, preferring `VisualViewport`
 * when the browser exposes it.
 *
 * @param windowLike - Window-like object that exposes viewport dimensions.
 * @returns Rounded visible viewport height in pixels, or `0` when unavailable.
 */
export function resolveVisibleViewportHeight(windowLike: {
    readonly innerHeight: number;
    readonly visualViewport?: { readonly height: number } | null;
}): number {
    const visualViewportHeight = windowLike.visualViewport?.height;

    if (typeof visualViewportHeight === 'number' && Number.isFinite(visualViewportHeight) && visualViewportHeight > 0) {
        return Math.round(visualViewportHeight);
    }

    if (Number.isFinite(windowLike.innerHeight) && windowLike.innerHeight > 0) {
        return Math.round(windowLike.innerHeight);
    }

    return 0;
}
