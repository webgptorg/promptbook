/**
 * Persistent NameID format recommended for Shibboleth integrations.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SHIBBOLETH_PERSISTENT_NAME_ID_FORMAT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';

/**
 * SAML HTTP Redirect binding URL.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SAML_HTTP_REDIRECT_BINDING = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';

/**
 * Timeout for loading remote Identity Provider metadata.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SHIBBOLETH_IDENTITY_PROVIDER_METADATA_TIMEOUT_MS = 10_000;

/**
 * Clock skew accepted when validating SAML assertion timestamps.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SHIBBOLETH_ACCEPTED_CLOCK_SKEW_MS = 120_000;

/**
 * Placeholder password hash for database users that can only sign in via Shibboleth.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SHIBBOLETH_PASSWORDLESS_USER_PASSWORD_HASH = 'shibboleth-passwordless-user';

/**
 * Marker stored on database users that authenticate with username/password only.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const LOCAL_AUTHENTICATION_PROVIDER = 'LOCAL';

/**
 * Marker stored on database users that authenticate with Shibboleth only.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SHIBBOLETH_AUTHENTICATION_PROVIDER = 'SHIBBOLETH';

/**
 * Marker stored on database users that authenticate with username/password and Shibboleth.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const LOCAL_AND_SHIBBOLETH_AUTHENTICATION_PROVIDER = 'LOCAL_AND_SHIBBOLETH';

/**
 * Supabase projection for user fields needed while linking Shibboleth identities.
 *
 * @private constant of `shibbolethAuthentication`
 */
export const SHIBBOLETH_USER_SELECT_COLUMNS: string = 'id, username, isAdmin, email, displayName, authenticationProvider';
