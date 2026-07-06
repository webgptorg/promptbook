import { SHIBBOLETH_IDENTITY_PROVIDER_METADATA_TIMEOUT_MS } from './shibbolethAuthenticationConstants';

/**
 * Loads remote IdP metadata XML.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function fetchIdentityProviderMetadataXml(identityProviderMetadataUrl: string): Promise<string> {
    const response = await fetch(identityProviderMetadataUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(SHIBBOLETH_IDENTITY_PROVIDER_METADATA_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(
            `Failed to load Shibboleth Identity Provider metadata: ${response.status} ${response.statusText}.`,
        );
    }

    return response.text();
}
