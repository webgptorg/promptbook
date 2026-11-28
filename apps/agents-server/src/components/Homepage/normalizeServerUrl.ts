/**
 * Normalize a server URL by removing its trailing slash.
 *
 * @private function of the Agents Server homepage federation helpers
 */
export const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');
