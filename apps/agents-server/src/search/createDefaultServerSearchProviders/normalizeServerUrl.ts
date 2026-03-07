import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';

/**
 * Normalizes server URL strings to origin without trailing slash.
 *
 * @param serverUrl Raw URL.
 * @returns Normalized origin or empty string for invalid URLs.
 * @private function of createDefaultServerSearchProviders
 */
export function normalizeServerUrl(serverUrl: string): string {
    try {
        return new URL(serverUrl).origin.replace(defaultServerSearchProviderConfig.trailingSlashPattern, '');
    } catch {
        return '';
    }
}
