import { randomBytes } from 'crypto';
import {
    SAML,
    ValidateInResponseTo,
    generateServiceProviderMetadata,
    type CacheItem,
    type CacheProvider,
    type Profile,
} from '@node-saml/node-saml';
import { XMLParser } from 'fast-xml-parser';
import { spaceTrim } from 'spacetrim';
import { AUTHENTICATION_METHODS_METADATA_KEY, isAuthenticationMethodEnabled } from '../constants/authenticationMethods';
import {
    DEFAULT_SHIBBOLETH_PROVIDER_LABEL,
    DEFAULT_SHIBBOLETH_USERNAME_ATTRIBUTE,
    SHIBBOLETH_AUTHENTICATION_METADATA_KEYS,
    SHIBBOLETH_AUTO_CREATE_USERS_METADATA_KEY,
    SHIBBOLETH_CALLBACK_PATH,
    SHIBBOLETH_CALLBACK_URL_METADATA_KEY,
    SHIBBOLETH_ENTITY_ID_METADATA_KEY,
    SHIBBOLETH_IDP_CERTIFICATE_METADATA_KEY,
    SHIBBOLETH_IDP_ENTRYPOINT_METADATA_KEY,
    SHIBBOLETH_IDP_ISSUER_METADATA_KEY,
    SHIBBOLETH_IDP_METADATA_URL_METADATA_KEY,
    SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY,
    SHIBBOLETH_SP_METADATA_PATH,
    SHIBBOLETH_USERNAME_ATTRIBUTE_METADATA_KEY,
} from '../constants/shibbolethAuthentication';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { getMetadataMap } from '../database/getMetadata';
import type { AgentsServerDatabase } from '../database/schema';
import { hashPassword } from './auth';

/**
 * Maximum time SAML request identifiers are retained for InResponseTo validation.
 */
const SHIBBOLETH_REQUEST_ID_EXPIRATION_PERIOD_MS = 8 * 60 * 60 * 1000;

/**
 * Clock skew accepted while validating Shibboleth assertion validity timestamps.
 */
const SHIBBOLETH_ACCEPTED_CLOCK_SKEW_MS = 60 * 1000;

/**
 * SAML NameID format requested from Shibboleth.
 */
const SHIBBOLETH_IDENTIFIER_FORMAT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';

/**
 * Metadata fetch timeout used when loading Shibboleth IdP metadata.
 */
const SHIBBOLETH_METADATA_FETCH_TIMEOUT_MS = 10 * 1000;

/**
 * XML parser used for Shibboleth IdP metadata.
 */
const SHIBBOLETH_METADATA_XML_PARSER = new XMLParser({
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
});

/**
 * Process-local cache used by node-saml for InResponseTo validation.
 */
const SHIBBOLETH_REQUEST_ID_CACHE = new Map<string, CacheItem>();

/**
 * Cache provider shared across SAML instances so the login route and ACS route
 * can validate the same AuthnRequest IDs.
 */
const SHIBBOLETH_REQUEST_ID_CACHE_PROVIDER: CacheProvider = {
    async saveAsync(key, value) {
        pruneExpiredShibbolethRequestIds();
        const cacheItem = { value, createdAt: Date.now() };
        SHIBBOLETH_REQUEST_ID_CACHE.set(key, cacheItem);
        return cacheItem;
    },
    async getAsync(key) {
        pruneExpiredShibbolethRequestIds();
        return SHIBBOLETH_REQUEST_ID_CACHE.get(key)?.value ?? null;
    },
    async removeAsync(key) {
        if (!key) {
            return null;
        }

        const value = SHIBBOLETH_REQUEST_ID_CACHE.get(key)?.value ?? null;
        SHIBBOLETH_REQUEST_ID_CACHE.delete(key);
        return value;
    },
};

/**
 * Parsed Shibboleth IdP metadata fields used by SAML configuration.
 *
 * @public exported from `apps/agents-server`
 */
export type ShibbolethIdentityProviderMetadata = {
    /**
     * Identity Provider entity ID.
     */
    readonly entityId: string | null;
    /**
     * Preferred HTTP-Redirect SSO endpoint.
     */
    readonly entryPoint: string | null;
    /**
     * Signing certificates exposed by the Identity Provider metadata.
     */
    readonly certificates: ReadonlyArray<string>;
};

/**
 * Enabled and fully configured Shibboleth authentication settings.
 *
 * @public exported from `apps/agents-server`
 */
export type EnabledShibbolethConfiguration = {
    /**
     * Whether Shibboleth is enabled by metadata.
     */
    readonly isEnabled: true;
    /**
     * Whether the enabled method has all required IdP settings.
     */
    readonly isConfigured: true;
    /**
     * User-facing provider label.
     */
    readonly providerLabel: string;
    /**
     * SAML Service Provider entity ID.
     */
    readonly issuer: string;
    /**
     * SAML Assertion Consumer Service URL.
     */
    readonly callbackUrl: string;
    /**
     * Shibboleth IdP SSO URL.
     */
    readonly entryPoint: string;
    /**
     * Shibboleth IdP signing certificates.
     */
    readonly idpCertificates: ReadonlyArray<string>;
    /**
     * Expected Shibboleth IdP entity ID, when known.
     */
    readonly idpIssuer: string | null;
    /**
     * SAML profile attribute used as Agents Server username.
     */
    readonly usernameAttribute: string;
    /**
     * Whether unknown Shibboleth users are created automatically.
     */
    readonly isAutoCreateUsers: boolean;
};

/**
 * Disabled or incomplete Shibboleth authentication settings.
 *
 * @public exported from `apps/agents-server`
 */
export type InactiveShibbolethConfiguration = {
    /**
     * Whether Shibboleth is enabled by metadata.
     */
    readonly isEnabled: boolean;
    /**
     * Whether the enabled method has all required IdP settings.
     */
    readonly isConfigured: false;
    /**
     * User-facing provider label.
     */
    readonly providerLabel: string;
    /**
     * SAML Service Provider entity ID, if resolvable.
     */
    readonly issuer: string | null;
    /**
     * SAML Assertion Consumer Service URL, if resolvable.
     */
    readonly callbackUrl: string | null;
    /**
     * Missing metadata keys or derived settings.
     */
    readonly missingConfiguration: ReadonlyArray<string>;
};

/**
 * Resolved Shibboleth authentication settings.
 *
 * @public exported from `apps/agents-server`
 */
export type ShibbolethConfiguration = EnabledShibbolethConfiguration | InactiveShibbolethConfiguration;

/**
 * Result of resolving a Shibboleth profile into a local Agents Server user.
 *
 * @public exported from `apps/agents-server`
 */
export type ShibbolethUserResolution = {
    /**
     * Local Agents Server username.
     */
    readonly username: string;
    /**
     * Whether the local user has admin privileges.
     */
    readonly isAdmin: boolean;
    /**
     * Whether a new local user row was created for this Shibboleth login.
     */
    readonly isNewUser: boolean;
};

/**
 * Error thrown when Shibboleth metadata is enabled but incomplete.
 *
 * @public exported from `apps/agents-server`
 */
export class ShibbolethConfigurationError extends Error {
    /**
     * Missing metadata keys or derived settings.
     */
    public readonly missingConfiguration: ReadonlyArray<string>;

    /**
     * Creates a Shibboleth configuration error.
     *
     * @param missingConfiguration - Missing metadata keys or derived settings.
     */
    public constructor(missingConfiguration: ReadonlyArray<string>) {
        super(
            spaceTrim(`
                Shibboleth authentication is enabled, but its configuration is incomplete.

                Missing configuration: \`${missingConfiguration.join('`, `')}\`
            `),
        );
        this.name = 'ShibbolethConfigurationError';
        this.missingConfiguration = missingConfiguration;
    }
}

/**
 * Loads Shibboleth configuration from Agents Server metadata.
 *
 * @param request - Incoming request used to derive default public URLs.
 * @returns Resolved Shibboleth configuration.
 *
 * @public exported from `apps/agents-server`
 */
export async function loadShibbolethConfiguration(request?: Request): Promise<ShibbolethConfiguration> {
    const metadata = await getMetadataMap([
        AUTHENTICATION_METHODS_METADATA_KEY,
        ...SHIBBOLETH_AUTHENTICATION_METADATA_KEYS,
    ]);
    const providerLabel = metadata[SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY]?.trim() || DEFAULT_SHIBBOLETH_PROVIDER_LABEL;
    const publicBaseUrl = resolveShibbolethPublicBaseUrl(request);
    const issuer =
        metadata[SHIBBOLETH_ENTITY_ID_METADATA_KEY]?.trim() ||
        (publicBaseUrl ? `${publicBaseUrl}${SHIBBOLETH_SP_METADATA_PATH}` : null);
    const callbackUrl =
        metadata[SHIBBOLETH_CALLBACK_URL_METADATA_KEY]?.trim() ||
        (publicBaseUrl ? `${publicBaseUrl}${SHIBBOLETH_CALLBACK_PATH}` : null);
    const isEnabled = isAuthenticationMethodEnabled(metadata[AUTHENTICATION_METHODS_METADATA_KEY], 'SHIBBOLETH');

    if (!isEnabled) {
        return {
            isEnabled: false,
            isConfigured: false,
            providerLabel,
            issuer,
            callbackUrl,
            missingConfiguration: [],
        };
    }

    const identityProviderMetadata = await loadShibbolethIdentityProviderMetadata(
        metadata[SHIBBOLETH_IDP_METADATA_URL_METADATA_KEY],
    );
    const entryPoint =
        metadata[SHIBBOLETH_IDP_ENTRYPOINT_METADATA_KEY]?.trim() || identityProviderMetadata.entryPoint || null;
    const idpCertificates = parseShibbolethCertificates(metadata[SHIBBOLETH_IDP_CERTIFICATE_METADATA_KEY]);
    const resolvedIdpCertificates =
        idpCertificates.length > 0 ? idpCertificates : identityProviderMetadata.certificates;
    const idpIssuer = metadata[SHIBBOLETH_IDP_ISSUER_METADATA_KEY]?.trim() || identityProviderMetadata.entityId || null;
    const usernameAttribute =
        metadata[SHIBBOLETH_USERNAME_ATTRIBUTE_METADATA_KEY]?.trim() || DEFAULT_SHIBBOLETH_USERNAME_ATTRIBUTE;
    const isAutoCreateUsers = (metadata[SHIBBOLETH_AUTO_CREATE_USERS_METADATA_KEY] ?? 'true') !== 'false';
    const missingConfiguration = [
        issuer ? null : SHIBBOLETH_ENTITY_ID_METADATA_KEY,
        callbackUrl ? null : SHIBBOLETH_CALLBACK_URL_METADATA_KEY,
        entryPoint ? null : SHIBBOLETH_IDP_ENTRYPOINT_METADATA_KEY,
        resolvedIdpCertificates.length > 0 ? null : SHIBBOLETH_IDP_CERTIFICATE_METADATA_KEY,
    ].filter((value): value is string => value !== null);

    if (
        missingConfiguration.length > 0 ||
        !issuer ||
        !callbackUrl ||
        !entryPoint ||
        resolvedIdpCertificates.length === 0
    ) {
        return {
            isEnabled: true,
            isConfigured: false,
            providerLabel,
            issuer,
            callbackUrl,
            missingConfiguration,
        };
    }

    return {
        isEnabled: true,
        isConfigured: true,
        providerLabel,
        issuer,
        callbackUrl,
        entryPoint,
        idpCertificates: resolvedIdpCertificates,
        idpIssuer,
        usernameAttribute,
        isAutoCreateUsers,
    };
}

/**
 * Builds a node-saml client from resolved Shibboleth configuration.
 *
 * @param configuration - Enabled Shibboleth configuration.
 * @returns Configured SAML client.
 *
 * @public exported from `apps/agents-server`
 */
export function createShibbolethSamlClient(configuration: EnabledShibbolethConfiguration): SAML {
    return new SAML({
        acceptedClockSkewMs: SHIBBOLETH_ACCEPTED_CLOCK_SKEW_MS,
        callbackUrl: configuration.callbackUrl,
        digestAlgorithm: 'sha256',
        disableRequestedAuthnContext: true,
        entryPoint: configuration.entryPoint,
        identifierFormat: SHIBBOLETH_IDENTIFIER_FORMAT,
        idpCert: [...configuration.idpCertificates],
        idpIssuer: configuration.idpIssuer ?? undefined,
        issuer: configuration.issuer,
        requestIdExpirationPeriodMs: SHIBBOLETH_REQUEST_ID_EXPIRATION_PERIOD_MS,
        signatureAlgorithm: 'sha256',
        validateInResponseTo: ValidateInResponseTo.always,
        wantAssertionsSigned: true,
        wantAuthnResponseSigned: false,
        cacheProvider: SHIBBOLETH_REQUEST_ID_CACHE_PROVIDER,
    });
}

/**
 * Creates SAML Service Provider metadata XML for the configured server.
 *
 * @param configuration - Shibboleth configuration with issuer and callback URL.
 * @returns SAML SP metadata XML.
 *
 * @public exported from `apps/agents-server`
 */
export function createShibbolethServiceProviderMetadata(
    configuration: Pick<EnabledShibbolethConfiguration, 'issuer' | 'callbackUrl'>,
): string {
    return generateServiceProviderMetadata({
        callbackUrl: configuration.callbackUrl,
        identifierFormat: SHIBBOLETH_IDENTIFIER_FORMAT,
        issuer: configuration.issuer,
        wantAssertionsSigned: true,
    });
}

/**
 * Resolves a valid local redirect path from SAML RelayState.
 *
 * @param relayState - Raw RelayState value.
 * @returns Safe local redirect path.
 *
 * @public exported from `apps/agents-server`
 */
export function resolveSafeShibbolethRelayState(relayState: string | null | undefined): string {
    const trimmedRelayState = relayState?.trim() || '';

    if (!trimmedRelayState || !trimmedRelayState.startsWith('/') || trimmedRelayState.startsWith('//')) {
        return '/';
    }

    try {
        const parsedUrl = new URL(trimmedRelayState, 'https://promptbook.local');
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
        return '/';
    }
}

/**
 * Resolves the local Agents Server user represented by a validated Shibboleth profile.
 *
 * @param profile - Validated SAML profile.
 * @param configuration - Enabled Shibboleth configuration.
 * @returns Local user resolution.
 *
 * @public exported from `apps/agents-server`
 */
export async function resolveShibbolethUser(
    profile: Profile,
    configuration: Pick<EnabledShibbolethConfiguration, 'usernameAttribute' | 'isAutoCreateUsers'>,
): Promise<ShibbolethUserResolution> {
    const username = resolveShibbolethUsername(profile, configuration.usernameAttribute);

    if (!username) {
        throw new Error(
            spaceTrim(`
                Shibboleth profile does not contain a usable username.

                Checked configured attribute \`${configuration.usernameAttribute}\` and common fallback attributes.
            `),
        );
    }

    const supabase = $provideSupabaseForServer();
    const userTable = await $getTableName('User');
    const { data: existingUser, error: existingUserError } = await supabase
        .from(userTable)
        .select('username, isAdmin')
        .eq('username', username)
        .maybeSingle<Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'username' | 'isAdmin'>>();

    if (existingUserError) {
        throw new Error(`Failed to load Shibboleth user \`${username}\`: ${existingUserError.message}`);
    }

    if (existingUser) {
        return {
            username: existingUser.username,
            isAdmin: existingUser.isAdmin,
            isNewUser: false,
        };
    }

    if (!configuration.isAutoCreateUsers) {
        throw new Error(`Shibboleth user \`${username}\` does not exist and automatic user creation is disabled.`);
    }

    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    const { data: createdUser, error: createdUserError } = await supabase
        .from(userTable)
        .insert({
            username,
            passwordHash,
            isAdmin: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
        .select('username, isAdmin')
        .single<Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'username' | 'isAdmin'>>();

    if (createdUserError) {
        throw new Error(`Failed to create Shibboleth user \`${username}\`: ${createdUserError.message}`);
    }

    return {
        username: createdUser.username,
        isAdmin: createdUser.isAdmin,
        isNewUser: true,
    };
}

/**
 * Logs one Shibboleth authentication event with consistent metadata.
 *
 * @param event - Event identifier.
 * @param details - Safe structured details.
 *
 * @public exported from `apps/agents-server`
 */
export function logShibbolethAuthenticationEvent(event: string, details: Record<string, unknown> = {}): void {
    console.info('[agents-server:shibboleth]', {
        event,
        ...details,
    });
}

/**
 * Extracts safe profile diagnostics for Shibboleth logging.
 *
 * @param profile - Validated SAML profile.
 * @param usernameAttribute - Configured username attribute.
 * @returns Safe diagnostic payload.
 *
 * @public exported from `apps/agents-server`
 */
export function createShibbolethProfileLogDetails(
    profile: Profile,
    usernameAttribute: string,
): Record<string, unknown> {
    return {
        issuer: profile.issuer,
        nameIDFormat: profile.nameIDFormat,
        configuredUsernameAttribute: usernameAttribute,
        availableAttributes: Object.keys(profile)
            .filter((key) => !['getAssertion', 'getAssertionXml', 'getSamlResponseXml'].includes(key))
            .sort(),
    };
}

/**
 * Parses Shibboleth IdP metadata XML.
 *
 * @param xml - Raw IdP metadata XML.
 * @returns Parsed metadata fields.
 *
 * @public exported from `apps/agents-server`
 */
export function parseShibbolethIdentityProviderMetadata(xml: string): ShibbolethIdentityProviderMetadata {
    const parsedXml = SHIBBOLETH_METADATA_XML_PARSER.parse(xml) as unknown;

    return {
        entityId: findFirstAttribute(parsedXml, 'entityID'),
        entryPoint: findPreferredSingleSignOnServiceLocation(parsedXml),
        certificates: findAllValuesByKey(parsedXml, 'X509Certificate').map(formatShibbolethCertificate),
    };
}

/**
 * Resolves the public base URL used for Shibboleth defaults.
 *
 * @param request - Incoming request.
 * @returns Public base URL without a trailing slash.
 *
 * @public exported from `apps/agents-server`
 */
export function resolveShibbolethPublicBaseUrl(request?: Request): string | null {
    const configuredSiteUrl = normalizeShibbolethUrl(process.env.NEXT_PUBLIC_SITE_URL);
    if (configuredSiteUrl) {
        return configuredSiteUrl;
    }

    if (!request) {
        return null;
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (!host) {
        return null;
    }

    const protocol = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
    return normalizeShibbolethUrl(`${protocol}://${host}`);
}

/**
 * Loads and parses remote Shibboleth IdP metadata.
 *
 * @param metadataUrl - Raw metadata URL.
 * @returns Parsed metadata or an empty fallback.
 */
async function loadShibbolethIdentityProviderMetadata(
    metadataUrl: string | null | undefined,
): Promise<ShibbolethIdentityProviderMetadata> {
    const normalizedMetadataUrl = normalizeShibbolethUrl(metadataUrl);
    if (!normalizedMetadataUrl) {
        return {
            entityId: null,
            entryPoint: null,
            certificates: [],
        };
    }

    try {
        const response = await fetch(normalizedMetadataUrl, {
            signal: AbortSignal.timeout(SHIBBOLETH_METADATA_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            logShibbolethAuthenticationEvent('idp_metadata_fetch_failed', {
                metadataUrl: normalizedMetadataUrl,
                status: response.status,
            });
            return {
                entityId: null,
                entryPoint: null,
                certificates: [],
            };
        }

        return parseShibbolethIdentityProviderMetadata(await response.text());
    } catch (error) {
        logShibbolethAuthenticationEvent('idp_metadata_fetch_error', {
            metadataUrl: normalizedMetadataUrl,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            entityId: null,
            entryPoint: null,
            certificates: [],
        };
    }
}

/**
 * Parses one metadata field containing one or more certificates.
 *
 * @param value - Raw certificate metadata.
 * @returns Normalized certificates.
 */
function parseShibbolethCertificates(value: string | null | undefined): ReadonlyArray<string> {
    const trimmedValue = value?.trim() || '';
    if (!trimmedValue) {
        return [];
    }

    const pemMatches = trimmedValue.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/gu);
    if (pemMatches && pemMatches.length > 0) {
        return pemMatches.map(formatShibbolethCertificate);
    }

    return trimmedValue
        .split(/\n\s*\n/u)
        .map(formatShibbolethCertificate)
        .filter(Boolean);
}

/**
 * Normalizes a certificate to PEM form.
 *
 * @param certificate - Raw certificate value.
 * @returns PEM certificate.
 */
function formatShibbolethCertificate(certificate: string): string {
    const trimmedCertificate = certificate.trim().replace(/\\n/gu, '\n');
    if (trimmedCertificate.includes('-----BEGIN CERTIFICATE-----')) {
        return trimmedCertificate;
    }

    const compactCertificate = trimmedCertificate.replace(/[\s\r\n]+/gu, '');
    const lines = compactCertificate.match(/.{1,64}/gu) || [];

    return ['-----BEGIN CERTIFICATE-----', ...lines, '-----END CERTIFICATE-----'].join('\n');
}

/**
 * Resolves the local username from a validated SAML profile.
 *
 * @param profile - Validated SAML profile.
 * @param usernameAttribute - Configured username attribute.
 * @returns Local username or `null`.
 */
function resolveShibbolethUsername(profile: Profile, usernameAttribute: string): string | null {
    const rawUsername =
        pickProfileAttribute(profile, usernameAttribute) ||
        pickProfileAttribute(profile, 'mail') ||
        pickProfileAttribute(profile, 'email') ||
        pickProfileAttribute(profile, 'urn:oid:0.9.2342.19200300.100.1.3') ||
        pickProfileAttribute(profile, 'eduPersonPrincipalName') ||
        pickProfileAttribute(profile, 'unstructuredName') ||
        profile.nameID;

    const normalizedUsername = rawUsername.trim();
    if (!normalizedUsername) {
        return null;
    }

    return normalizedUsername.includes('@') ? normalizedUsername.toLowerCase() : normalizedUsername;
}

/**
 * Reads the first string-like value of one SAML profile attribute.
 *
 * @param profile - Validated SAML profile.
 * @param attributeName - Attribute name.
 * @returns Attribute value or empty string.
 */
function pickProfileAttribute(profile: Profile, attributeName: string): string {
    const value = profile[attributeName];

    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        const firstString = value.find((item): item is string => typeof item === 'string');
        return firstString || '';
    }

    return '';
}

/**
 * Finds the first XML attribute value with the given local name.
 *
 * @param value - Parsed XML subtree.
 * @param attributeName - Local attribute name.
 * @returns Attribute value or `null`.
 */
function findFirstAttribute(value: unknown, attributeName: string): string | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const record = value as Record<string, unknown>;
    const directValue = record[`@_${attributeName}`];
    if (typeof directValue === 'string' && directValue.trim()) {
        return directValue.trim();
    }

    for (const childValue of Object.values(record)) {
        const nestedValue = Array.isArray(childValue)
            ? childValue.map((item) => findFirstAttribute(item, attributeName)).find(Boolean)
            : findFirstAttribute(childValue, attributeName);

        if (nestedValue) {
            return nestedValue;
        }
    }

    return null;
}

/**
 * Finds all parsed XML text values for a key name.
 *
 * @param value - Parsed XML subtree.
 * @param key - Local XML key name.
 * @returns Matching text values.
 */
function findAllValuesByKey(value: unknown, key: string): string[] {
    if (!value || typeof value !== 'object') {
        return [];
    }

    const record = value as Record<string, unknown>;
    const directValue = record[key];
    const directValues =
        typeof directValue === 'string'
            ? [directValue]
            : Array.isArray(directValue)
            ? directValue.filter((item): item is string => typeof item === 'string')
            : [];

    return [
        ...directValues,
        ...Object.entries(record)
            .filter(([childKey]) => childKey !== key)
            .flatMap(([, childValue]) =>
                Array.isArray(childValue)
                    ? childValue.flatMap((item) => findAllValuesByKey(item, key))
                    : findAllValuesByKey(childValue, key),
            ),
    ];
}

/**
 * Finds the preferred SAML SingleSignOnService location.
 *
 * @param value - Parsed XML subtree.
 * @returns Preferred SSO location.
 */
function findPreferredSingleSignOnServiceLocation(value: unknown): string | null {
    const services = findAllObjectsByKey(value, 'SingleSignOnService');
    const preferredService =
        services.find((service) => String(service['@_Binding'] || '').includes('HTTP-Redirect')) || services[0];
    const location = preferredService?.['@_Location'];

    return typeof location === 'string' && location.trim() ? location.trim() : null;
}

/**
 * Finds all parsed XML objects for a key name.
 *
 * @param value - Parsed XML subtree.
 * @param key - Local XML key name.
 * @returns Matching objects.
 */
function findAllObjectsByKey(value: unknown, key: string): Array<Record<string, unknown>> {
    if (!value || typeof value !== 'object') {
        return [];
    }

    const record = value as Record<string, unknown>;
    const directValue = record[key];
    const directObjects = Array.isArray(directValue)
        ? directValue.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        : directValue && typeof directValue === 'object'
        ? [directValue as Record<string, unknown>]
        : [];

    return [
        ...directObjects,
        ...Object.entries(record)
            .filter(([childKey]) => childKey !== key)
            .flatMap(([, childValue]) =>
                Array.isArray(childValue)
                    ? childValue.flatMap((item) => findAllObjectsByKey(item, key))
                    : findAllObjectsByKey(childValue, key),
            ),
    ];
}

/**
 * Normalizes a URL-like metadata value.
 *
 * @param value - Raw URL value.
 * @returns URL without trailing slash, or `null`.
 */
function normalizeShibbolethUrl(value: string | null | undefined): string | null {
    const trimmedValue = value?.trim() || '';
    if (!trimmedValue) {
        return null;
    }

    try {
        const url = new URL(trimmedValue);
        return url.toString().replace(/\/$/u, '');
    } catch {
        return null;
    }
}

/**
 * Removes expired SAML request IDs from the process-local cache.
 */
function pruneExpiredShibbolethRequestIds(): void {
    const now = Date.now();

    for (const [key, item] of SHIBBOLETH_REQUEST_ID_CACHE.entries()) {
        if (now - item.createdAt > SHIBBOLETH_REQUEST_ID_EXPIRATION_PERIOD_MS) {
            SHIBBOLETH_REQUEST_ID_CACHE.delete(key);
        }
    }
}
