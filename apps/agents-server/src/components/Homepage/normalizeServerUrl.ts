/**
 * Normalize a server URL by removing any trailing slash.
 *
 * @private function of buildGraphData
 */
export const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');
