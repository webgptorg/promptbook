import { SAML, ValidateInResponseTo } from '@node-saml/node-saml';
import {
    SHIBBOLETH_ACCEPTED_CLOCK_SKEW_MS,
    SHIBBOLETH_PERSISTENT_NAME_ID_FORMAT,
} from './shibbolethAuthenticationConstants';
import type { ShibbolethAuthenticationConfiguration } from './shibbolethAuthenticationTypes';

/**
 * Creates a Node-SAML client for the resolved Shibboleth configuration.
 *
 * @param configuration - Resolved Shibboleth configuration with parsed IdP metadata.
 * @returns Configured Node-SAML client.
 *
 * @private function of `shibbolethAuthentication`
 */
export function createShibbolethSamlClient(configuration: ShibbolethAuthenticationConfiguration): SAML {
    if (!configuration.identityProviderMetadata) {
        throw new Error('Shibboleth Identity Provider metadata is not loaded.');
    }

    return new SAML({
        callbackUrl: configuration.serviceProviderUrls.assertionConsumerServiceUrl,
        entryPoint: configuration.identityProviderMetadata.singleSignOnServiceUrl,
        issuer: configuration.serviceProviderUrls.entityId,
        audience: configuration.serviceProviderUrls.entityId,
        idpCert: [...configuration.identityProviderMetadata.signingCertificates],
        identifierFormat: SHIBBOLETH_PERSISTENT_NAME_ID_FORMAT,
        wantAssertionsSigned: true,
        wantAuthnResponseSigned: false,
        acceptedClockSkewMs: SHIBBOLETH_ACCEPTED_CLOCK_SKEW_MS,
        validateInResponseTo: ValidateInResponseTo.never,
        disableRequestedAuthnContext: true,
        signatureAlgorithm: 'sha256',
    });
}
