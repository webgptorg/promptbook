/**
 * Returns a safe relative URL to redirect to after Shibboleth finishes.
 *
 * @param relayState - Raw RelayState value from the request or SAML response.
 * @returns Safe relative URL.
 *
 * @private function of `shibbolethAuthentication`
 */
export function sanitizeShibbolethRelayState(relayState: string | null | undefined): string {
    const trimmedRelayState = (relayState || '').trim();

    if (!trimmedRelayState || !trimmedRelayState.startsWith('/') || trimmedRelayState.startsWith('//')) {
        return '/';
    }

    return trimmedRelayState;
}
