import { SHIBBOLETH_SERVICE_PROVIDER_ENTITY_ID_METADATA_KEY } from '@/src/constants/shibbolethAuth';
import type { ShibbolethServiceProviderUrls } from './shibbolethAuthenticationTypes';

/**
 * Resolves SP URLs from request URL, environment, and metadata.
 *
 * @private function of `shibbolethAuthentication`
 */
export function resolveShibbolethServiceProviderUrls(
    requestUrl: string,
    metadata: Readonly<Record<string, string | null>>,
): ShibbolethServiceProviderUrls {
    const requestOrigin = new URL(requestUrl).origin;
    const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const origin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : requestOrigin;
    const assertionConsumerServiceUrl = new URL('/api/auth/shibboleth/acs', origin).toString();
    const metadataUrl = new URL('/api/auth/shibboleth/metadata', origin).toString();
    const configuredEntityId = (metadata[SHIBBOLETH_SERVICE_PROVIDER_ENTITY_ID_METADATA_KEY] || '').trim();

    return {
        origin,
        entityId: configuredEntityId || metadataUrl,
        assertionConsumerServiceUrl,
        metadataUrl,
    };
}
