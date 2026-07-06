import type { Profile } from '@node-saml/node-saml';
import {
    DEFAULT_SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES,
    DEFAULT_SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES,
    DEFAULT_SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES,
    SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES_METADATA_KEY,
    SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES_METADATA_KEY,
    SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES_METADATA_KEY,
} from '@/src/constants/shibbolethAuth';
import type { Json } from '@/src/database/schema';
import type { ShibbolethProfileAttributes } from './shibbolethAuthenticationTypes';

/**
 * Extracts required Shibboleth profile attributes from a validated SAML profile.
 *
 * @private function of `shibbolethAuthentication`
 */
export function extractShibbolethProfileAttributes(
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
 * Finds the first non-empty profile attribute from a list of accepted names.
 *
 * @private function of `shibbolethAuthentication`
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
 *
 * @private function of `shibbolethAuthentication`
 */
function parseAttributeNames(value: string | null | undefined, fallback: string): string[] {
    return (value || fallback)
        .split(/[\s,]+/u)
        .map((attributeName) => attributeName.trim())
        .filter(Boolean);
}

/**
 * Converts a profile value into one string.
 *
 * @private function of `shibbolethAuthentication`
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
 *
 * @private function of `shibbolethAuthentication`
 */
function getStringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Builds a JSON-safe SAML profile snapshot for audit records.
 *
 * @private function of `shibbolethAuthentication`
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
 *
 * @private function of `shibbolethAuthentication`
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
