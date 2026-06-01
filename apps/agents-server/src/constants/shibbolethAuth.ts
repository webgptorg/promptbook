/**
 * Metadata key that enables Shibboleth authentication in Agents Server.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const IS_SHIBBOLETH_AUTH_ACTIVE_METADATA_KEY = 'IS_SHIBBOLETH_AUTH_ACTIVE' as const;

/**
 * Metadata key containing a URL with the Identity Provider SAML metadata XML.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY = 'SHIBBOLETH_IDP_METADATA_URL' as const;

/**
 * Metadata key containing pasted Identity Provider SAML metadata XML.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY = 'SHIBBOLETH_IDP_METADATA_XML' as const;

/**
 * Metadata key overriding the Service Provider entity ID sent to the Shibboleth Identity Provider.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const SHIBBOLETH_SERVICE_PROVIDER_ENTITY_ID_METADATA_KEY = 'SHIBBOLETH_SP_ENTITY_ID' as const;

/**
 * Metadata key defining accepted email attribute names.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES_METADATA_KEY = 'SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES' as const;

/**
 * Metadata key defining accepted display-name attribute names.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES_METADATA_KEY = 'SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES' as const;

/**
 * Metadata key defining accepted institutional identifier attribute names.
 *
 * @private internal Shibboleth authentication metadata key
 */
export const SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES_METADATA_KEY =
    'SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES' as const;

/**
 * Default Shibboleth email attribute names accepted from SAML assertions.
 *
 * @private internal Shibboleth authentication metadata default
 */
export const DEFAULT_SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES = 'mail email urn:oid:0.9.2342.19200300.100.1.3' as const;

/**
 * Default Shibboleth display-name attribute names accepted from SAML assertions.
 *
 * @private internal Shibboleth authentication metadata default
 */
export const DEFAULT_SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES = 'displayName urn:oid:2.16.840.1.113730.3.1.241' as const;

/**
 * Default Shibboleth institutional identifier attribute names accepted from SAML assertions.
 *
 * @private internal Shibboleth authentication metadata default
 */
export const DEFAULT_SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES =
    'unstructuredName eduPersonPrincipalName urn:oid:1.3.6.1.4.1.5923.1.1.1.6 uid' as const;

/**
 * Metadata keys required by the Shibboleth authentication integration.
 *
 * @private internal Shibboleth authentication metadata key list
 */
export const SHIBBOLETH_AUTHENTICATION_METADATA_KEYS = [
    IS_SHIBBOLETH_AUTH_ACTIVE_METADATA_KEY,
    SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY,
    SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY,
    SHIBBOLETH_SERVICE_PROVIDER_ENTITY_ID_METADATA_KEY,
    SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES_METADATA_KEY,
    SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES_METADATA_KEY,
    SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES_METADATA_KEY,
] as const;

/**
 * Shape used by the header/menu layer to decide whether the Shibboleth menu item should appear.
 *
 * @private internal Shibboleth menu state
 */
export type ShibbolethAuthenticationMenuStatus = {
    /**
     * True when Shibboleth login is enabled by metadata.
     */
    readonly isActive: boolean;
    /**
     * True when the minimum metadata required to contact the Identity Provider is present.
     */
    readonly isConfigured: boolean;
};

/**
 * Parses a metadata boolean value.
 *
 * @param value - Raw metadata value.
 * @returns Boolean interpretation of the metadata value.
 *
 * @private internal Shibboleth metadata parser
 */
export function parseShibbolethBooleanMetadata(value: string | null | undefined): boolean {
    return (value || '').trim().toLowerCase() === 'true';
}

/**
 * Resolves the Shibboleth menu status from a metadata map.
 *
 * @param metadata - Metadata values keyed by metadata name.
 * @returns Shibboleth activation/configuration status.
 *
 * @private internal Shibboleth menu helper
 */
export function resolveShibbolethAuthenticationMenuStatus(
    metadata: Readonly<Record<string, string | null | undefined>>,
): ShibbolethAuthenticationMenuStatus {
    const isActive = parseShibbolethBooleanMetadata(metadata[IS_SHIBBOLETH_AUTH_ACTIVE_METADATA_KEY]);
    const isIdentityProviderMetadataUrlConfigured = Boolean(
        (metadata[SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY] || '').trim(),
    );
    const isIdentityProviderMetadataXmlConfigured = Boolean(
        (metadata[SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY] || '').trim(),
    );

    return {
        isActive,
        isConfigured: isActive && (isIdentityProviderMetadataUrlConfigured || isIdentityProviderMetadataXmlConfigured),
    };
}
