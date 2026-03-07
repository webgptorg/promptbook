/**
 * Extracts host name for federated result labels.
 *
 * @param serverUrl Server URL.
 * @returns Hostname if URL is valid, otherwise original input.
 * @private function of createDefaultServerSearchProviders
 */
export function getServerHostname(serverUrl: string): string {
    try {
        return new URL(serverUrl).hostname;
    } catch {
        return serverUrl;
    }
}
