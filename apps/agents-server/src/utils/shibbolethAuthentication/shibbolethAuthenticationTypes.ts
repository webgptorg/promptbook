import type { Json } from '@/src/database/schema';

/**
 * Prefixed Shibboleth identity row.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethUserIdentityRow = {
    readonly id: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly userId: number;
    readonly email: string;
    readonly displayName: string | null;
    readonly nameId: string | null;
    readonly nameIdFormat: string | null;
    readonly unstructuredName: string | null;
    readonly eduPersonPrincipalName: string | null;
    readonly rawAttributes: Json | null;
    readonly lastLoggedInAt: string | null;
    readonly loginCount: number;
};

/**
 * Prefixed Shibboleth authentication attempt row.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethAuthenticationAttemptRow = {
    readonly id: number;
    readonly createdAt: string;
    readonly stage: string;
    readonly status: string;
    readonly userId: number | null;
    readonly email: string | null;
    readonly displayName: string | null;
    readonly nameId: string | null;
    readonly relayState: string | null;
    readonly ip: string | null;
    readonly userAgent: string | null;
    readonly errorMessage: string | null;
    readonly rawAttributes: Json | null;
};

/**
 * Request metadata recorded with Shibboleth authentication attempts.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethRequestDetails = {
    readonly ip: string | null;
    readonly userAgent: string | null;
};

/**
 * Parsed Shibboleth user attributes extracted from SAML profile data.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethProfileAttributes = {
    readonly email: string;
    readonly displayName: string | null;
    readonly nameId: string | null;
    readonly nameIdFormat: string | null;
    readonly unstructuredName: string | null;
    readonly eduPersonPrincipalName: string | null;
    readonly rawAttributes: Json;
};

/**
 * Service Provider URLs derived for the current request.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethServiceProviderUrls = {
    readonly origin: string;
    readonly entityId: string;
    readonly assertionConsumerServiceUrl: string;
    readonly metadataUrl: string;
};

/**
 * Parsed Identity Provider metadata needed by Node-SAML.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethIdentityProviderMetadata = {
    readonly singleSignOnServiceUrl: string;
    readonly signingCertificates: ReadonlyArray<string>;
};

/**
 * Resolved Shibboleth authentication configuration status.
 *
 * @private type of `shibbolethAuthentication`
 */
export type ShibbolethAuthenticationConfiguration = {
    readonly isActive: boolean;
    readonly isConfigured: boolean;
    readonly errors: ReadonlyArray<string>;
    readonly identityProviderMetadataUrl: string | null;
    readonly isIdentityProviderMetadataXmlConfigured: boolean;
    readonly serviceProviderUrls: ShibbolethServiceProviderUrls;
    readonly identityProviderMetadata: ShibbolethIdentityProviderMetadata | null;
};
