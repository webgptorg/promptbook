/**
 * Metadata key storing the Shibboleth IdP metadata URL.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_IDP_METADATA_URL_METADATA_KEY = 'SHIBBOLETH_IDP_METADATA_URL';

/**
 * Metadata key storing the Shibboleth IdP SSO URL.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_IDP_ENTRYPOINT_METADATA_KEY = 'SHIBBOLETH_IDP_ENTRYPOINT';

/**
 * Metadata key storing one or more Shibboleth IdP signing certificates.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_IDP_CERTIFICATE_METADATA_KEY = 'SHIBBOLETH_IDP_CERTIFICATE';

/**
 * Metadata key storing the expected Shibboleth IdP entity ID.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_IDP_ISSUER_METADATA_KEY = 'SHIBBOLETH_IDP_ISSUER';

/**
 * Metadata key storing the Agents Server SAML Service Provider entity ID.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_ENTITY_ID_METADATA_KEY = 'SHIBBOLETH_ENTITY_ID';

/**
 * Metadata key storing the Agents Server SAML Assertion Consumer Service URL.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_CALLBACK_URL_METADATA_KEY = 'SHIBBOLETH_CALLBACK_URL';

/**
 * Metadata key storing the SAML attribute used as the Agents Server username.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_USERNAME_ATTRIBUTE_METADATA_KEY = 'SHIBBOLETH_USERNAME_ATTRIBUTE';

/**
 * Metadata key controlling whether unknown Shibboleth users are created automatically.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_AUTO_CREATE_USERS_METADATA_KEY = 'SHIBBOLETH_AUTO_CREATE_USERS';

/**
 * Metadata key storing the user-facing Shibboleth provider label.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY = 'SHIBBOLETH_PROVIDER_LABEL';

/**
 * Default SAML attribute used as the Agents Server username.
 *
 * @public exported from `apps/agents-server`
 */
export const DEFAULT_SHIBBOLETH_USERNAME_ATTRIBUTE = 'mail';

/**
 * Default user-facing Shibboleth provider label.
 *
 * @public exported from `apps/agents-server`
 */
export const DEFAULT_SHIBBOLETH_PROVIDER_LABEL = 'Shibboleth';

/**
 * Default relative route used as the SAML Assertion Consumer Service endpoint.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_CALLBACK_PATH = '/api/auth/shibboleth/acs';

/**
 * Default relative route that serves Agents Server SAML SP metadata.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_SP_METADATA_PATH = '/api/auth/shibboleth/metadata';

/**
 * Metadata keys needed to resolve Shibboleth authentication settings.
 *
 * @public exported from `apps/agents-server`
 */
export const SHIBBOLETH_AUTHENTICATION_METADATA_KEYS = [
    SHIBBOLETH_IDP_METADATA_URL_METADATA_KEY,
    SHIBBOLETH_IDP_ENTRYPOINT_METADATA_KEY,
    SHIBBOLETH_IDP_CERTIFICATE_METADATA_KEY,
    SHIBBOLETH_IDP_ISSUER_METADATA_KEY,
    SHIBBOLETH_ENTITY_ID_METADATA_KEY,
    SHIBBOLETH_CALLBACK_URL_METADATA_KEY,
    SHIBBOLETH_USERNAME_ATTRIBUTE_METADATA_KEY,
    SHIBBOLETH_AUTO_CREATE_USERS_METADATA_KEY,
    SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY,
] as const;
