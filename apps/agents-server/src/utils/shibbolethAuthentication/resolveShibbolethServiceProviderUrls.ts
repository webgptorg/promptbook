import { SHIBBOLETH_SERVICE_PROVIDER_ENTITY_ID_METADATA_KEY } from '@/src/constants/shibbolethAuth';
import type { ShibbolethServiceProviderUrls } from './shibbolethAuthenticationTypes';

/**
 * Local hostnames that should not override a configured public site URL.
 */
const LOCAL_DEVELOPMENT_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

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
    const configuredOrigin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : null;
    const origin = resolveShibbolethPublicOrigin(requestOrigin, configuredOrigin);
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

/**
 * Chooses the public origin used in Shibboleth metadata, ACS validation, and redirects.
 *
 * @param requestOrigin - Origin reconstructed from the current request and proxy headers.
 * @param configuredOrigin - Optional origin from `NEXT_PUBLIC_SITE_URL`.
 * @returns Origin that should be visible to the Identity Provider and browser.
 */
function resolveShibbolethPublicOrigin(requestOrigin: string, configuredOrigin: string | null): string {
    if (!isLocalDevelopmentOrigin(requestOrigin)) {
        return requestOrigin;
    }

    if (configuredOrigin && !isLocalDevelopmentOrigin(configuredOrigin)) {
        return configuredOrigin;
    }

    return configuredOrigin || requestOrigin;
}

/**
 * Checks whether one origin points to a local development host.
 *
 * @param origin - Origin to inspect.
 * @returns `true` when the origin is localhost or loopback.
 */
function isLocalDevelopmentOrigin(origin: string): boolean {
    const hostname = new URL(origin).hostname.toLowerCase();

    return LOCAL_DEVELOPMENT_HOSTNAMES.has(hostname);
}
