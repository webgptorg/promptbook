// Note: This file is a thin facade over the focused modules under `./shibbolethAuthentication/`.
//       It re-exports only the entities consumed by the Shibboleth route handlers and admin dashboard,
//       keeping the Shibboleth authentication concerns (configuration, SAML client, profile extraction,
//       audit logging, and user/identity linking) split across small, single-responsibility modules.

export { createShibbolethSamlClient } from './shibbolethAuthentication/createShibbolethSamlClient';
export { createShibbolethServiceProviderMetadataXml } from './shibbolethAuthentication/createShibbolethServiceProviderMetadataXml';
export { findOrCreateShibbolethUser } from './shibbolethAuthentication/findOrCreateShibbolethUser';
export { getShibbolethAuthenticationAttemptTableName } from './shibbolethAuthentication/getShibbolethAuthenticationAttemptTableName';
export { getShibbolethRequestDetails } from './shibbolethAuthentication/getShibbolethRequestDetails';
export { getShibbolethUserIdentityTableName } from './shibbolethAuthentication/getShibbolethUserIdentityTableName';
export { recordShibbolethAuthenticationAttempt } from './shibbolethAuthentication/recordShibbolethAuthenticationAttempt';
export { resolveShibbolethAuthenticationConfiguration } from './shibbolethAuthentication/resolveShibbolethAuthenticationConfiguration';
export { sanitizeShibbolethRelayState } from './shibbolethAuthentication/sanitizeShibbolethRelayState';

export type {
    ShibbolethAuthenticationAttemptRow,
    ShibbolethAuthenticationConfiguration,
    ShibbolethIdentityProviderMetadata,
    ShibbolethProfileAttributes,
    ShibbolethRequestDetails,
    ShibbolethServiceProviderUrls,
    ShibbolethUserIdentityRow,
} from './shibbolethAuthentication/shibbolethAuthenticationTypes';
