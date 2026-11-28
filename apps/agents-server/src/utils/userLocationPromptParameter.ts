import type { UserLocationRuntimeContext } from '../../../../src/commitments/_common/toolRuntimeContext';

/**
 * Prompt parameter key used by Agents Server client to pass browser geolocation to server runtime context.
 */
export const USER_LOCATION_PROMPT_PARAMETER = 'promptbookUserLocation';

/**
 * Normalized browser geolocation payload transported via prompt parameters.
 */
export type UserLocationPromptParameter = UserLocationRuntimeContext;

/**
 * Allowed permission states for user location payload.
 */
const USER_LOCATION_PERMISSION_VALUES = new Set<UserLocationRuntimeContext['permission']>([
    'granted',
    'denied',
    'unavailable',
]);

/**
 * Normalizes finite numeric values.
 */
function normalizeFiniteNumber(value: unknown): number | undefined {
    if (typeof value !== 'number') {
        return undefined;
    }

    return Number.isFinite(value) ? value : undefined;
}

/**
 * Normalizes finite numeric values while preserving explicit `null`.
 */
function normalizeNullableFiniteNumber(value: unknown): number | null | undefined {
    if (value === null) {
        return null;
    }

    return normalizeFiniteNumber(value);
}

/**
 * Normalizes unknown location payload into runtime-context location shape.
 */
function normalizeUserLocationPayload(rawValue: unknown): UserLocationRuntimeContext | undefined {
    if (!rawValue || typeof rawValue !== 'object') {
        return undefined;
    }

    const value = rawValue as Record<string, unknown>;
    const permissionCandidate = value.permission;
    const permission =
        typeof permissionCandidate === 'string' &&
        USER_LOCATION_PERMISSION_VALUES.has(permissionCandidate as UserLocationRuntimeContext['permission'])
            ? (permissionCandidate as UserLocationRuntimeContext['permission'])
            : undefined;

    const normalized: UserLocationRuntimeContext = {
        permission,
        latitude: normalizeFiniteNumber(value.latitude),
        longitude: normalizeFiniteNumber(value.longitude),
        accuracyMeters: normalizeFiniteNumber(value.accuracyMeters),
        altitudeMeters: normalizeNullableFiniteNumber(value.altitudeMeters),
        headingDegrees: normalizeNullableFiniteNumber(value.headingDegrees),
        speedMetersPerSecond: normalizeNullableFiniteNumber(value.speedMetersPerSecond),
        timestamp: typeof value.timestamp === 'string' ? value.timestamp : undefined,
    };

    const hasData = Object.values(normalized).some((entry) => entry !== undefined);
    return hasData ? normalized : undefined;
}

/**
 * Parses `promptbookUserLocation` prompt parameter into normalized runtime-context payload.
 */
export function parseUserLocationPromptParameter(rawValue: unknown): UserLocationRuntimeContext | undefined {
    if (rawValue === undefined || rawValue === null) {
        return undefined;
    }

    let parsedValue: unknown = rawValue;

    if (typeof rawValue === 'string') {
        try {
            parsedValue = JSON.parse(rawValue);
        } catch {
            return undefined;
        }
    }

    return normalizeUserLocationPayload(parsedValue);
}

/**
 * Serializes normalized location payload for prompt parameters sent by browser clients.
 */
export function serializeUserLocationPromptParameter(location: UserLocationRuntimeContext): string {
    const normalizedLocation = normalizeUserLocationPayload(location);
    return JSON.stringify(normalizedLocation || {});
}
