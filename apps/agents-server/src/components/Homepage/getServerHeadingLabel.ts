/**
 * Returns a short hostname label for one local or federated server heading.
 *
 * @param serverUrl - Raw server URL.
 * @returns Human-readable hostname fallback.
 *
 * @private internal helper for homepage-like federated server headings.
 */
export function getServerHeadingLabel(serverUrl: string): string {
    try {
        return new URL(serverUrl).hostname;
    } catch {
        return serverUrl;
    }
}
