import {
    IS_SHIBBOLETH_AUTH_ACTIVE_METADATA_KEY,
    SHIBBOLETH_AUTHENTICATION_METADATA_KEYS,
    SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY,
    SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY,
    parseShibbolethBooleanMetadata,
} from '@/src/constants/shibbolethAuth';
import { getMetadataMap } from '@/src/database/getMetadata';
import { fetchIdentityProviderMetadataXml } from './fetchIdentityProviderMetadataXml';
import { parseIdentityProviderMetadataXml } from './parseIdentityProviderMetadataXml';
import { resolveShibbolethServiceProviderUrls } from './resolveShibbolethServiceProviderUrls';
import type {
    ShibbolethAuthenticationConfiguration,
    ShibbolethIdentityProviderMetadata,
} from './shibbolethAuthenticationTypes';

/**
 * Options for resolving Shibboleth authentication configuration.
 *
 * @private type of `shibbolethAuthentication`
 */
type ResolveShibbolethAuthenticationConfigurationOptions = {
    readonly requestUrl: string;
    readonly isIdentityProviderMetadataValidationEnabled?: boolean;
};

/**
 * Resolves Shibboleth configuration from metadata for a route-handler request.
 *
 * @param options - Request URL and validation options.
 * @returns Shibboleth configuration status and parsed IdP metadata when validation is enabled.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function resolveShibbolethAuthenticationConfiguration(
    options: ResolveShibbolethAuthenticationConfigurationOptions,
): Promise<ShibbolethAuthenticationConfiguration> {
    const metadata = await getMetadataMap(SHIBBOLETH_AUTHENTICATION_METADATA_KEYS);
    const isActive = parseShibbolethBooleanMetadata(metadata[IS_SHIBBOLETH_AUTH_ACTIVE_METADATA_KEY]);
    const identityProviderMetadataUrl =
        (metadata[SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY] || '').trim() || null;
    const identityProviderMetadataXml =
        (metadata[SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY] || '').trim() || null;
    const serviceProviderUrls = resolveShibbolethServiceProviderUrls(options.requestUrl, metadata);
    const errors: string[] = [];
    let identityProviderMetadata: ShibbolethIdentityProviderMetadata | null = null;

    if (!identityProviderMetadataUrl && !identityProviderMetadataXml) {
        errors.push(
            `Set ${SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY} or ${SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY}.`,
        );
    }

    if (
        options.isIdentityProviderMetadataValidationEnabled === true &&
        (identityProviderMetadataUrl || identityProviderMetadataXml)
    ) {
        try {
            const metadataXml =
                identityProviderMetadataXml || (await fetchIdentityProviderMetadataXml(identityProviderMetadataUrl!));
            identityProviderMetadata = parseIdentityProviderMetadataXml(metadataXml);
        } catch (error) {
            errors.push(
                error instanceof Error ? error.message : 'Failed to load Shibboleth Identity Provider metadata.',
            );
        }
    }

    return {
        isActive,
        isConfigured: errors.length === 0,
        errors,
        identityProviderMetadataUrl,
        isIdentityProviderMetadataXmlConfigured: Boolean(identityProviderMetadataXml),
        serviceProviderUrls,
        identityProviderMetadata,
    };
}
