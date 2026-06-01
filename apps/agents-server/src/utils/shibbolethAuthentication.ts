import { SAML, ValidateInResponseTo, generateServiceProviderMetadata, type Profile } from '@node-saml/node-saml';
import { DOMParser } from '@xmldom/xmldom';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import type { AgentsServerDatabase, Json } from '../database/schema';
import { getMetadataMap } from '../database/getMetadata';
import { $provideServer } from '../tools/$provideServer';
import {
    DEFAULT_SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES,
    DEFAULT_SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES,
    DEFAULT_SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES,
    IS_SHIBBOLETH_AUTH_ACTIVE_METADATA_KEY,
    SHIBBOLETH_AUTHENTICATION_METADATA_KEYS,
    SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES_METADATA_KEY,
    SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES_METADATA_KEY,
    SHIBBOLETH_IDENTITY_PROVIDER_METADATA_URL_METADATA_KEY,
    SHIBBOLETH_IDENTITY_PROVIDER_METADATA_XML_METADATA_KEY,
    SHIBBOLETH_SERVICE_PROVIDER_ENTITY_ID_METADATA_KEY,
    SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES_METADATA_KEY,
    parseShibbolethBooleanMetadata,
} from '../constants/shibbolethAuth';

/**
 * Persistent NameID format recommended for Shibboleth integrations.
 */
const SHIBBOLETH_PERSISTENT_NAME_ID_FORMAT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';

/**
 * SAML HTTP Redirect binding URL.
 */
const SAML_HTTP_REDIRECT_BINDING = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';

/**
 * Timeout for loading remote Identity Provider metadata.
 */
const SHIBBOLETH_IDENTITY_PROVIDER_METADATA_TIMEOUT_MS = 10_000;

/**
 * Clock skew accepted when validating SAML assertion timestamps.
 */
const SHIBBOLETH_ACCEPTED_CLOCK_SKEW_MS = 120_000;

/**
 * Placeholder password hash for database users that can only sign in via Shibboleth.
 */
const SHIBBOLETH_PASSWORDLESS_USER_PASSWORD_HASH = 'shibboleth-passwordless-user';

/**
 * Marker stored on database users that authenticate with username/password only.
 */
const LOCAL_AUTHENTICATION_PROVIDER = 'LOCAL';

/**
 * Marker stored on database users that authenticate with Shibboleth only.
 */
const SHIBBOLETH_AUTHENTICATION_PROVIDER = 'SHIBBOLETH';

/**
 * Marker stored on database users that authenticate with username/password and Shibboleth.
 */
const LOCAL_AND_SHIBBOLETH_AUTHENTICATION_PROVIDER = 'LOCAL_AND_SHIBBOLETH';

/**
 * User table row with Shibboleth profile columns added by migration.
 */
type UserRowWithShibbolethColumns = AgentsServerDatabase['public']['Tables']['User']['Row'] & {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
};

/**
 * User insert shape with Shibboleth profile columns added by migration.
 */
type UserInsertWithShibbolethColumns = AgentsServerDatabase['public']['Tables']['User']['Insert'] & {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
};

/**
 * User update shape with Shibboleth profile columns added by migration.
 */
type UserUpdateWithShibbolethColumns = AgentsServerDatabase['public']['Tables']['User']['Update'] & {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
};

/**
 * Prefixed Shibboleth identity row.
 *
 * @private internal Shibboleth authentication record
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
 * @private internal Shibboleth authentication record
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
 * @private internal Shibboleth authentication record
 */
export type ShibbolethRequestDetails = {
    readonly ip: string | null;
    readonly userAgent: string | null;
};

/**
 * Parsed Shibboleth user attributes extracted from SAML profile data.
 *
 * @private internal Shibboleth authentication record
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
 * @private internal Shibboleth authentication configuration
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
 * @private internal Shibboleth authentication configuration
 */
export type ShibbolethIdentityProviderMetadata = {
    readonly singleSignOnServiceUrl: string;
    readonly signingCertificates: ReadonlyArray<string>;
};

/**
 * Resolved Shibboleth authentication configuration status.
 *
 * @private internal Shibboleth authentication configuration
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

/**
 * Options for resolving Shibboleth authentication configuration.
 */
type ResolveShibbolethAuthenticationConfigurationOptions = {
    readonly requestUrl: string;
    readonly isIdentityProviderMetadataValidationEnabled?: boolean;
};

/**
 * Options for recording a Shibboleth authentication attempt.
 */
type RecordShibbolethAuthenticationAttemptOptions = {
    readonly stage: string;
    readonly status: string;
    readonly requestDetails?: ShibbolethRequestDetails;
    readonly userId?: number | null;
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly nameId?: string | null;
    readonly relayState?: string | null;
    readonly errorMessage?: string | null;
    readonly rawAttributes?: Json | null;
};

/**
 * Result of linking a SAML profile to an Agents Server user.
 */
type LinkedShibbolethUser = {
    readonly user: UserRowWithShibbolethColumns;
    readonly profileAttributes: ShibbolethProfileAttributes;
};

/**
 * Minimal XML node shape used to avoid mixing browser DOM and xmldom typings.
 */
type XmlNodeWithElements = {
    readonly getElementsByTagName: (tagName: string) => ArrayLike<XmlElementWithAttributes>;
};

/**
 * Minimal XML element shape used by the Shibboleth metadata parser.
 */
type XmlElementWithAttributes = XmlNodeWithElements & {
    readonly localName?: string | null;
    readonly nodeName: string;
    readonly textContent?: string | null;
    readonly getAttribute: (attributeName: string) => string | null;
};

/**
 * Returns a safe relative URL to redirect to after Shibboleth finishes.
 *
 * @param relayState - Raw RelayState value from the request or SAML response.
 * @returns Safe relative URL.
 *
 * @private internal Shibboleth authentication helper
 */
export function sanitizeShibbolethRelayState(relayState: string | null | undefined): string {
    const trimmedRelayState = (relayState || '').trim();

    if (!trimmedRelayState || !trimmedRelayState.startsWith('/') || trimmedRelayState.startsWith('//')) {
        return '/';
    }

    return trimmedRelayState;
}

/**
 * Extracts audit metadata from an incoming request.
 *
 * @param request - Incoming route-handler request.
 * @returns Request details safe to store in the Shibboleth audit log.
 *
 * @private internal Shibboleth authentication helper
 */
export function getShibbolethRequestDetails(request: Request): ShibbolethRequestDetails {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;

    return {
        ip,
        userAgent: request.headers.get('user-agent'),
    };
}

/**
 * Resolves Shibboleth configuration from metadata for a route-handler request.
 *
 * @param options - Request URL and validation options.
 * @returns Shibboleth configuration status and parsed IdP metadata when validation is enabled.
 *
 * @private internal Shibboleth authentication helper
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

/**
 * Creates a Node-SAML client for the resolved Shibboleth configuration.
 *
 * @param configuration - Resolved Shibboleth configuration with parsed IdP metadata.
 * @returns Configured Node-SAML client.
 *
 * @private internal Shibboleth authentication helper
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

/**
 * Creates Service Provider metadata XML for the current Agents Server deployment.
 *
 * @param requestUrl - URL of the current metadata route request.
 * @returns Service Provider metadata XML suitable for the Shibboleth IdP admin.
 *
 * @private internal Shibboleth authentication helper
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

/**
 * Records one Shibboleth authentication attempt.
 *
 * @param options - Attempt details.
 *
 * @private internal Shibboleth authentication audit helper
 */
export async function recordShibbolethAuthenticationAttempt(
    options: RecordShibbolethAuthenticationAttemptOptions,
): Promise<void> {
    try {
        const supabase = $provideSupabaseForServer();
        const tableName = await getShibbolethAuthenticationAttemptTableName();
        const { error } = await supabase.from(tableName).insert({
            stage: options.stage,
            status: options.status,
            userId: options.userId ?? null,
            email: options.email ?? null,
            displayName: options.displayName ?? null,
            nameId: options.nameId ?? null,
            relayState: options.relayState ?? null,
            ip: options.requestDetails?.ip ?? null,
            userAgent: options.requestDetails?.userAgent ?? null,
            errorMessage: options.errorMessage ?? null,
            rawAttributes: options.rawAttributes ?? null,
        } as never);

        if (error) {
            console.error('Failed to record Shibboleth authentication attempt:', error);
        }
    } catch (error) {
        console.error('Failed to record Shibboleth authentication attempt:', error);
    }
}

/**
 * Links a validated SAML profile to an Agents Server user, creating a passwordless user when needed.
 *
 * @param profile - Validated SAML profile from Node-SAML.
 * @returns Linked database user and extracted Shibboleth attributes.
 *
 * @private internal Shibboleth authentication user helper
 */
export async function findOrCreateShibbolethUser(profile: Profile): Promise<LinkedShibbolethUser> {
    const metadata = await getMetadataMap(SHIBBOLETH_AUTHENTICATION_METADATA_KEYS);
    const profileAttributes = extractShibbolethProfileAttributes(profile, metadata);
    const now = new Date().toISOString();
    const existingIdentity =
        (await findShibbolethIdentityByNameId(profileAttributes.nameId)) ||
        (await findShibbolethIdentityByEmail(profileAttributes.email));
    let user = existingIdentity ? await findUserRowById(existingIdentity.userId) : null;

    if (!user) {
        user = await findUserRowByEmail(profileAttributes.email);
    }

    if (!user) {
        user = await findUserRowByUsername(profileAttributes.email);
    }

    if (!user) {
        user = await insertShibbolethUser(profileAttributes, now);
    } else {
        user = await updateLinkedShibbolethUser(user, profileAttributes, now);
    }

    await upsertShibbolethIdentity(user, profileAttributes, existingIdentity, now);

    return {
        user,
        profileAttributes,
    };
}

/**
 * Resolves the prefixed Shibboleth identity table name without relying on generated schema typings.
 *
 * @returns Prefixed table name.
 *
 * @private internal Shibboleth authentication table helper
 */
export async function getShibbolethUserIdentityTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}ShibbolethUserIdentity`;
}

/**
 * Resolves the prefixed Shibboleth authentication attempt table name without relying on generated schema typings.
 *
 * @returns Prefixed table name.
 *
 * @private internal Shibboleth authentication table helper
 */
export async function getShibbolethAuthenticationAttemptTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}ShibbolethAuthenticationAttempt`;
}

/**
 * Extracts required Shibboleth profile attributes from a validated SAML profile.
 */
function extractShibbolethProfileAttributes(
    profile: Profile,
    metadata: Readonly<Record<string, string | null>>,
): ShibbolethProfileAttributes {
    const rawAttributes = sanitizeShibbolethRawAttributes(profile);
    const email = getFirstProfileAttribute(
        profile,
        parseAttributeNames(
            metadata[SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES_METADATA_KEY],
            DEFAULT_SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES,
        ),
    )?.toLowerCase();

    if (!email) {
        throw new Error('Shibboleth login did not provide an email attribute.');
    }

    const displayName =
        getFirstProfileAttribute(
            profile,
            parseAttributeNames(
                metadata[SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES_METADATA_KEY],
                DEFAULT_SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES,
            ),
        ) || null;
    const unstructuredName =
        getFirstProfileAttribute(
            profile,
            parseAttributeNames(
                metadata[SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES_METADATA_KEY],
                DEFAULT_SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES,
            ),
        ) || null;
    const eduPersonPrincipalName =
        getFirstProfileAttribute(profile, ['eduPersonPrincipalName', 'urn:oid:1.3.6.1.4.1.5923.1.1.1.6']) || null;

    return {
        email,
        displayName,
        nameId: getStringOrNull(profile.nameID),
        nameIdFormat: getStringOrNull(profile.nameIDFormat),
        unstructuredName,
        eduPersonPrincipalName,
        rawAttributes,
    };
}

/**
 * Resolves SP URLs from request URL, environment, and metadata.
 */
function resolveShibbolethServiceProviderUrls(
    requestUrl: string,
    metadata: Readonly<Record<string, string | null>>,
): ShibbolethServiceProviderUrls {
    const requestOrigin = new URL(requestUrl).origin;
    const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const origin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : requestOrigin;
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
 * Loads remote IdP metadata XML.
 */
async function fetchIdentityProviderMetadataXml(identityProviderMetadataUrl: string): Promise<string> {
    const response = await fetch(identityProviderMetadataUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(SHIBBOLETH_IDENTITY_PROVIDER_METADATA_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(
            `Failed to load Shibboleth Identity Provider metadata: ${response.status} ${response.statusText}.`,
        );
    }

    return response.text();
}

/**
 * Parses IdP metadata XML into the fields needed for SAML login.
 */
function parseIdentityProviderMetadataXml(metadataXml: string): ShibbolethIdentityProviderMetadata {
    const document = new DOMParser().parseFromString(metadataXml, 'application/xml') as unknown as XmlNodeWithElements;
    const singleSignOnServices = getElementsByLocalName(document, 'SingleSignOnService');
    const redirectSingleSignOnService =
        singleSignOnServices.find((element) => element.getAttribute('Binding') === SAML_HTTP_REDIRECT_BINDING) ||
        singleSignOnServices[0];
    const singleSignOnServiceUrl = redirectSingleSignOnService?.getAttribute('Location') || '';
    const signingCertificates = getSigningCertificates(document);

    if (!singleSignOnServiceUrl) {
        throw new Error('Shibboleth Identity Provider metadata is missing SingleSignOnService Location.');
    }

    if (signingCertificates.length === 0) {
        throw new Error('Shibboleth Identity Provider metadata is missing a signing certificate.');
    }

    return {
        singleSignOnServiceUrl,
        signingCertificates,
    };
}

/**
 * Finds all XML elements with the given local name.
 */
function getElementsByLocalName(root: XmlNodeWithElements, localName: string): Array<XmlElementWithAttributes> {
    return Array.from(root.getElementsByTagName('*')).filter(
        (element) =>
            element.localName === localName ||
            element.nodeName === localName ||
            element.nodeName.endsWith(`:${localName}`),
    );
}

/**
 * Extracts signing certificates from IdP metadata XML.
 */
function getSigningCertificates(document: XmlNodeWithElements): string[] {
    const signingKeyDescriptors = getElementsByLocalName(document, 'KeyDescriptor').filter((element) => {
        const use = element.getAttribute('use');
        return !use || use === 'signing';
    });
    const certificateElements = signingKeyDescriptors.flatMap((element) =>
        getElementsByLocalName(element, 'X509Certificate'),
    );
    const fallbackCertificateElements =
        certificateElements.length > 0 ? certificateElements : getElementsByLocalName(document, 'X509Certificate');

    return Array.from(
        new Set(
            fallbackCertificateElements
                .map((element) => formatPemCertificate(element.textContent || ''))
                .filter(Boolean),
        ),
    );
}

/**
 * Formats an XML X.509 certificate value as PEM.
 */
function formatPemCertificate(certificate: string): string {
    const base64Certificate = certificate
        .replace(/-----BEGIN CERTIFICATE-----/gu, '')
        .replace(/-----END CERTIFICATE-----/gu, '')
        .replace(/\s+/gu, '');

    if (!base64Certificate) {
        return '';
    }

    const wrappedCertificate = base64Certificate.match(/.{1,64}/gu)?.join('\n') || base64Certificate;
    return `-----BEGIN CERTIFICATE-----\n${wrappedCertificate}\n-----END CERTIFICATE-----`;
}

/**
 * Finds the first non-empty profile attribute from a list of accepted names.
 */
function getFirstProfileAttribute(profile: Profile, attributeNames: ReadonlyArray<string>): string | null {
    for (const attributeName of attributeNames) {
        const value = profile[attributeName];
        const stringValue = getFirstStringValue(value);
        if (stringValue) {
            return stringValue;
        }
    }

    return null;
}

/**
 * Parses metadata-defined attribute names.
 */
function parseAttributeNames(value: string | null | undefined, fallback: string): string[] {
    return (value || fallback)
        .split(/[\s,]+/u)
        .map((attributeName) => attributeName.trim())
        .filter(Boolean);
}

/**
 * Converts a profile value into one string.
 */
function getFirstStringValue(value: unknown): string | null {
    if (typeof value === 'string') {
        return value.trim() || null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const stringValue = getFirstStringValue(item);
            if (stringValue) {
                return stringValue;
            }
        }
    }

    return null;
}

/**
 * Converts an unknown value into a string or null.
 */
function getStringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Builds a JSON-safe SAML profile snapshot for audit records.
 */
function sanitizeShibbolethRawAttributes(profile: Profile): Json {
    const sanitizedAttributes: Record<string, Json> = {};

    for (const [key, value] of Object.entries(profile)) {
        if (typeof value === 'function') {
            continue;
        }

        const sanitizedValue = sanitizeJsonValue(value);
        if (sanitizedValue !== undefined) {
            sanitizedAttributes[key] = sanitizedValue;
        }
    }

    return sanitizedAttributes;
}

/**
 * Converts unknown profile values into JSON-safe values.
 */
function sanitizeJsonValue(value: unknown): Json | undefined {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeJsonValue(item)).filter((item): item is Json => item !== undefined);
    }

    if (typeof value === 'object') {
        const result: Record<string, Json> = {};
        for (const [key, nestedValue] of Object.entries(value)) {
            const sanitizedValue = sanitizeJsonValue(nestedValue);
            if (sanitizedValue !== undefined) {
                result[key] = sanitizedValue;
            }
        }
        return result;
    }

    return undefined;
}

/**
 * Finds one Shibboleth identity by persistent NameID.
 */
async function findShibbolethIdentityByNameId(nameId: string | null): Promise<ShibbolethUserIdentityRow | null> {
    if (!nameId) {
        return null;
    }

    const supabase = $provideSupabaseForServer();
    const tableName = await getShibbolethUserIdentityTableName();
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('nameId' as never, nameId as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth identity by NameID: ${error.message}`);
    }

    return (data as ShibbolethUserIdentityRow | null) || null;
}

/**
 * Finds one Shibboleth identity by email.
 */
async function findShibbolethIdentityByEmail(email: string): Promise<ShibbolethUserIdentityRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await getShibbolethUserIdentityTableName();
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('email' as never, email as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth identity by email: ${error.message}`);
    }

    return (data as ShibbolethUserIdentityRow | null) || null;
}

/**
 * Finds one user row by database id.
 */
async function findUserRowById(userId: number): Promise<UserRowWithShibbolethColumns | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth user by id: ${error.message}`);
    }

    return (data as UserRowWithShibbolethColumns | null) || null;
}

/**
 * Finds one user row by email.
 */
async function findUserRowByEmail(email: string): Promise<UserRowWithShibbolethColumns | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .select('*')
        .eq('email' as never, email as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth user by email: ${error.message}`);
    }

    return (data as UserRowWithShibbolethColumns | null) || null;
}

/**
 * Finds one user row by username.
 */
async function findUserRowByUsername(username: string): Promise<UserRowWithShibbolethColumns | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .select('*')
        .eq('username', username)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth user by username: ${error.message}`);
    }

    return (data as UserRowWithShibbolethColumns | null) || null;
}

/**
 * Inserts a new passwordless Shibboleth user.
 */
async function insertShibbolethUser(
    profileAttributes: ShibbolethProfileAttributes,
    now: string,
): Promise<UserRowWithShibbolethColumns> {
    const supabase = $provideSupabaseForServer();
    const userInsert: UserInsertWithShibbolethColumns = {
        username: profileAttributes.email,
        passwordHash: SHIBBOLETH_PASSWORDLESS_USER_PASSWORD_HASH,
        isAdmin: false,
        email: profileAttributes.email,
        displayName: profileAttributes.displayName,
        authenticationProvider: SHIBBOLETH_AUTHENTICATION_PROVIDER,
        createdAt: now,
        updatedAt: now,
    };
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .insert(userInsert)
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to create Shibboleth user: ${error.message}`);
    }

    return data as UserRowWithShibbolethColumns;
}

/**
 * Updates Shibboleth profile columns on an existing user row.
 */
async function updateLinkedShibbolethUser(
    user: UserRowWithShibbolethColumns,
    profileAttributes: ShibbolethProfileAttributes,
    now: string,
): Promise<UserRowWithShibbolethColumns> {
    const supabase = $provideSupabaseForServer();
    const nextAuthenticationProvider =
        user.authenticationProvider === LOCAL_AUTHENTICATION_PROVIDER || !user.authenticationProvider
            ? LOCAL_AND_SHIBBOLETH_AUTHENTICATION_PROVIDER
            : user.authenticationProvider;
    const userUpdate: UserUpdateWithShibbolethColumns = {
        email: profileAttributes.email,
        displayName: profileAttributes.displayName,
        authenticationProvider: nextAuthenticationProvider,
        updatedAt: now,
    };
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .update(userUpdate)
        .eq('id', user.id)
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to update Shibboleth user: ${error.message}`);
    }

    return data as UserRowWithShibbolethColumns;
}

/**
 * Creates or updates the Shibboleth identity link.
 */
async function upsertShibbolethIdentity(
    user: UserRowWithShibbolethColumns,
    profileAttributes: ShibbolethProfileAttributes,
    existingIdentity: ShibbolethUserIdentityRow | null,
    now: string,
): Promise<void> {
    const supabase = $provideSupabaseForServer();
    const tableName = await getShibbolethUserIdentityTableName();
    const identityPayload = {
        userId: user.id,
        email: profileAttributes.email,
        displayName: profileAttributes.displayName,
        nameId: profileAttributes.nameId,
        nameIdFormat: profileAttributes.nameIdFormat,
        unstructuredName: profileAttributes.unstructuredName,
        eduPersonPrincipalName: profileAttributes.eduPersonPrincipalName,
        rawAttributes: profileAttributes.rawAttributes,
        lastLoggedInAt: now,
        loginCount: Number(existingIdentity?.loginCount || 0) + 1,
        updatedAt: now,
    };

    if (existingIdentity) {
        const { error } = await supabase
            .from(tableName)
            .update(identityPayload as never)
            .eq('id' as never, existingIdentity.id as never);
        if (error) {
            throw new Error(`Failed to update Shibboleth identity: ${error.message}`);
        }
        return;
    }

    const { error } = await supabase.from(tableName).insert({
        ...identityPayload,
        createdAt: now,
    } as never);

    if (error) {
        throw new Error(`Failed to create Shibboleth identity: ${error.message}`);
    }
}
