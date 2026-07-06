import { generateServiceProviderMetadata } from '@node-saml/node-saml';
import { SHIBBOLETH_AUTHENTICATION_METADATA_KEYS } from '@/src/constants/shibbolethAuth';
import { getMetadataMap } from '@/src/database/getMetadata';
import { SHIBBOLETH_PERSISTENT_NAME_ID_FORMAT } from './shibbolethAuthenticationConstants';
import { resolveShibbolethServiceProviderUrls } from './resolveShibbolethServiceProviderUrls';

/**
 * Creates Service Provider metadata XML for the current Agents Server deployment.
 *
 * @param requestUrl - URL of the current metadata route request.
 * @returns Service Provider metadata XML suitable for the Shibboleth IdP admin.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function createShibbolethServiceProviderMetadataXml(requestUrl: string): Promise<string> {
    const metadata = await getMetadataMap(SHIBBOLETH_AUTHENTICATION_METADATA_KEYS);
    const serviceProviderUrls = resolveShibbolethServiceProviderUrls(requestUrl, metadata);

    return generateServiceProviderMetadata({
        issuer: serviceProviderUrls.entityId,
        callbackUrl: serviceProviderUrls.assertionConsumerServiceUrl,
        identifierFormat: SHIBBOLETH_PERSISTENT_NAME_ID_FORMAT,
        wantAssertionsSigned: true,
    });
}
