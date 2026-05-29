/**
 * Minimal read-only header accessor shared by middleware, route handlers, and server utilities.
 *
 * @private Internal helper of the Shibboleth authentication diagnostics.
 */
export type ReadonlyHeadersLike = Pick<Headers, 'get'>;

/**
 * One resolved Shibboleth-related attribute included in the diagnostic payload.
 *
 * @private Internal helper of the Shibboleth authentication diagnostics.
 */
export type ShibbolethAuthenticationLogAttribute = {
    readonly fieldName: string;
    readonly headerName: string;
    readonly fingerprint: string;
    readonly valueLength: number;
};

/**
 * Structured, privacy-preserving diagnostic payload for one Shibboleth-related request event.
 *
 * @private Internal helper of the Agents Server authentication diagnostics.
 */
export type ShibbolethAuthenticationLogPayload = {
    readonly event: string;
    readonly pathname?: string;
    readonly method?: string;
    readonly hasSessionCookie?: boolean;
    readonly isSecureSessionCookie?: boolean;
    readonly headerNames: ReadonlyArray<string>;
    readonly attributeFields: ReadonlyArray<string>;
    readonly attributes: ReadonlyArray<ShibbolethAuthenticationLogAttribute>;
};

/**
 * Context describing where the Shibboleth diagnostic event happened.
 *
 * @private Internal helper of the Shibboleth authentication diagnostics.
 */
export type CreateShibbolethAuthenticationLogPayloadOptions = {
    readonly event: string;
    readonly pathname?: string;
    readonly method?: string;
    readonly hasSessionCookie?: boolean;
    readonly isSecureSessionCookie?: boolean;
};

type ShibbolethHeaderDefinition = {
    readonly fieldName: string;
    readonly headerNames: ReadonlyArray<string>;
};

const SHIBBOLETH_HEADER_DEFINITIONS: ReadonlyArray<ShibbolethHeaderDefinition> = [
    { fieldName: 'sessionId', headerNames: ['shib-session-id', 'x-shib-session-id'] },
    { fieldName: 'sessionIndex', headerNames: ['shib-session-index', 'x-shib-session-index'] },
    { fieldName: 'sessionExpires', headerNames: ['shib-session-expires', 'x-shib-session-expires'] },
    { fieldName: 'applicationId', headerNames: ['shib-application-id', 'x-shib-application-id'] },
    { fieldName: 'remoteUser', headerNames: ['remote-user', 'x-remote-user'] },
    { fieldName: 'displayName', headerNames: ['displayname', 'x-displayname'] },
    { fieldName: 'mail', headerNames: ['mail', 'x-mail'] },
    { fieldName: 'unstructuredName', headerNames: ['unstructuredname', 'x-unstructuredname'] },
    {
        fieldName: 'eduPersonPrincipalName',
        headerNames: ['edupersonprincipalname', 'eppn', 'x-edupersonprincipalname', 'x-eppn'],
    },
    { fieldName: 'persistentId', headerNames: ['persistent-id', 'x-persistent-id'] },
    { fieldName: 'nameId', headerNames: ['name-id', 'x-name-id'] },
];

/**
 * Builds a privacy-preserving Shibboleth diagnostic payload from incoming request headers.
 *
 * Only the presence of relevant headers plus short fingerprints of their values are logged,
 * never the raw personally identifiable header contents.
 *
 * @param headers - Request headers or another read-only header accessor.
 * @param options - Event metadata describing where the diagnostic event originated.
 * @returns Structured log payload, or `null` when the request does not look Shibboleth-related.
 *
 * @private Internal helper of the Agents Server authentication diagnostics.
 */
export function createShibbolethAuthenticationLogPayload(
    headers: ReadonlyHeadersLike,
    options: CreateShibbolethAuthenticationLogPayloadOptions,
): ShibbolethAuthenticationLogPayload | null {
    const attributes = SHIBBOLETH_HEADER_DEFINITIONS.map((definition) => resolveShibbolethHeader(headers, definition)).filter(
        (attribute): attribute is ShibbolethAuthenticationLogAttribute => attribute !== null,
    );

    if (attributes.length === 0) {
        return null;
    }

    return {
        event: options.event,
        pathname: options.pathname,
        method: options.method,
        hasSessionCookie: options.hasSessionCookie,
        isSecureSessionCookie: options.isSecureSessionCookie,
        headerNames: attributes.map(({ headerName }) => headerName),
        attributeFields: attributes.map(({ fieldName }) => fieldName),
        attributes,
    };
}

/**
 * Resolves one Shibboleth attribute from any of its expected header aliases.
 *
 * @param headers - Request header accessor.
 * @param definition - Logical Shibboleth field with supported header aliases.
 * @returns Sanitized attribute snapshot or `null` when absent.
 */
function resolveShibbolethHeader(
    headers: ReadonlyHeadersLike,
    definition: ShibbolethHeaderDefinition,
): ShibbolethAuthenticationLogAttribute | null {
    for (const headerName of definition.headerNames) {
        const rawValue = headers.get(headerName);
        const value = normalizeHeaderValue(rawValue);

        if (!value) {
            continue;
        }

        return {
            fieldName: definition.fieldName,
            headerName,
            fingerprint: createHeaderValueFingerprint(value),
            valueLength: value.length,
        };
    }

    return null;
}

/**
 * Normalizes one header value before diagnostic processing.
 *
 * @param value - Raw header value.
 * @returns Trimmed non-empty value or `null`.
 */
function normalizeHeaderValue(value: string | null): string | null {
    const normalizedValue = value?.trim() || '';
    return normalizedValue === '' ? null : normalizedValue;
}

/**
 * Creates a short stable fingerprint so logs can correlate the same identity/session
 * without storing the raw Shibboleth attribute value.
 *
 * @param value - Raw Shibboleth header value.
 * @returns Short deterministic fingerprint.
 */
function createHeaderValueFingerprint(value: string): string {
    let hashPrimary = 0xdeadbeef ^ value.length;
    let hashSecondary = 0x41c6ce57 ^ value.length;

    for (const character of value) {
        const codePoint = character.codePointAt(0) || 0;
        hashPrimary = Math.imul(hashPrimary ^ codePoint, 2654435761);
        hashSecondary = Math.imul(hashSecondary ^ codePoint, 1597334677);
    }

    hashPrimary =
        Math.imul(hashPrimary ^ (hashPrimary >>> 16), 2246822507) ^ Math.imul(hashSecondary ^ (hashSecondary >>> 13), 3266489909);
    hashSecondary =
        Math.imul(hashSecondary ^ (hashSecondary >>> 16), 2246822507) ^
        Math.imul(hashPrimary ^ (hashPrimary >>> 13), 3266489909);

    const combinedHash = 4294967296 * (2097151 & hashSecondary) + (hashPrimary >>> 0);
    return combinedHash.toString(16).padStart(14, '0').slice(0, 12);
}
