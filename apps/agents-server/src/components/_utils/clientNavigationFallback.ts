'use client';

/**
 * Wait duration before falling back to hard navigation when SPA push stalls.
 */
const CLIENT_NAVIGATION_FALLBACK_DELAY_MS = 1_200;

/**
 * Returns the current browser location as one comparable relative URL.
 *
 * @returns Path + query + hash of the current browser location.
 */
function getCurrentRelativeLocation(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Normalizes one destination URL into a comparable location suffix.
 *
 * @param destination - Destination URL passed to navigation helpers.
 * @returns Path + query + hash used for current-location comparison.
 */
export function normalizeDestinationForLocationComparison(destination: string): string {
    if (typeof window === 'undefined') {
        return destination;
    }

    try {
        const parsedDestination = new URL(destination, window.location.href);
        return `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
    } catch {
        return destination;
    }
}

/**
 * Schedules a hard-navigation fallback for one client-side route transition.
 *
 * This keeps header links and other shared navigation affordances responsive even
 * when one `router.push(...)` transition stalls on slow or stateful pages.
 *
 * @param destination - Href passed to the Next.js router.
 * @param logLabel - Short diagnostic prefix used in the fallback warning.
 * @returns Timeout handle that callers may cancel when needed.
 */
export function scheduleClientNavigationFallback(
    destination: string,
    logLabel: string,
): ReturnType<typeof setTimeout> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const locationBeforePush = getCurrentRelativeLocation();
    const normalizedDestination = normalizeDestinationForLocationComparison(destination);

    if (locationBeforePush === normalizedDestination) {
        return null;
    }

    return setTimeout(() => {
        const locationAfterPush = getCurrentRelativeLocation();
        if (locationAfterPush === locationBeforePush && locationAfterPush !== normalizedDestination) {
            console.warn(`[${logLabel}] SPA navigation stalled — falling back to hard navigation`, {
                destination,
            });
            window.location.assign(destination);
        }
    }, CLIENT_NAVIGATION_FALLBACK_DELAY_MS);
}
