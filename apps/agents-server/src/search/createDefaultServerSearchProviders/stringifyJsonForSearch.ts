import { normalizeServerSearchText } from '../createServerSearchMatcher';

/**
 * Converts unknown JSON values into a compact searchable string.
 *
 * @param value Value to stringify.
 * @returns Normalized text suitable for search matching.
 * @private function of createDefaultServerSearchProviders
 */
export function stringifyJsonForSearch(value: unknown): string {
    try {
        return normalizeServerSearchText(JSON.stringify(value ?? {}));
    } catch {
        return '';
    }
}
