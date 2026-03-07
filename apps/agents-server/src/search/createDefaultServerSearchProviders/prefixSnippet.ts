/**
 * Adds path prefix to snippets when available.
 *
 * @param prefix Folder path prefix.
 * @param snippet Search snippet.
 * @returns Snippet with optional path marker.
 * @private function of createDefaultServerSearchProviders
 */
export function prefixSnippet(prefix: string, snippet: string): string {
    if (!prefix) {
        return snippet;
    }

    if (!snippet) {
        return `Path: ${prefix}`;
    }

    return `Path: ${prefix} | ${snippet}`;
}
