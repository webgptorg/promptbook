/**
 * Checks whether a path-like value is already an absolute URL.
 *
 * @private function of resolveRunBrowserArtifactUrl
 */
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

/**
 * Resolves a browser artifact path from tool payload into a browser-viewable URL.
 *
 * @param pathOrUrl - Artifact path or URL.
 * @returns Resolved URL path for browser display.
 * @private function of toolCallParsing
 */
export function resolveRunBrowserArtifactUrl(pathOrUrl: string): string {
    const normalizedPath = pathOrUrl.replace(/\\/g, '/').trim();
    if (!normalizedPath) {
        return '';
    }

    if (ABSOLUTE_URL_PATTERN.test(normalizedPath) || normalizedPath.startsWith('/')) {
        return normalizedPath;
    }

    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const filename = pathSegments[pathSegments.length - 1];
    if (!filename) {
        return normalizedPath;
    }

    if (normalizedPath.includes('.playwright-cli/')) {
        return `/api/browser-artifacts/${encodeURIComponent(filename)}`;
    }

    return normalizedPath;
}
