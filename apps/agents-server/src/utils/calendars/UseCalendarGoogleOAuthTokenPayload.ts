/**
 * Google Calendar OAuth token payload persisted in wallet secret.
 */
export type UseCalendarGoogleOAuthTokenPayload = {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    scope?: string;
    tokenType?: string;
};

/**
 * Parses one wallet-secret payload into a normalized Google Calendar OAuth token object.
 */
export function parseUseCalendarGoogleOAuthTokenPayload(
    rawSecret: string,
): UseCalendarGoogleOAuthTokenPayload {
    let parsedValue: unknown;
    try {
        parsedValue = JSON.parse(rawSecret);
    } catch (error) {
        throw new Error('Calendar OAuth wallet secret must be valid JSON.');
    }

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        throw new Error('Calendar OAuth wallet secret must be a JSON object.');
    }

    const value = parsedValue as Record<string, unknown>;
    const accessToken = normalizeRequiredString(value.accessToken, 'accessToken');
    const refreshToken = normalizeOptionalString(value.refreshToken);
    const expiresAt = normalizeOptionalString(value.expiresAt);
    const scope = normalizeOptionalString(value.scope);
    const tokenType = normalizeOptionalString(value.tokenType);

    return {
        accessToken,
        ...(refreshToken ? { refreshToken } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(scope ? { scope } : {}),
        ...(tokenType ? { tokenType } : {}),
    };
}

/**
 * Serializes one normalized Google Calendar OAuth token payload for wallet storage.
 */
export function stringifyUseCalendarGoogleOAuthTokenPayload(
    payload: UseCalendarGoogleOAuthTokenPayload,
): string {
    return JSON.stringify(payload);
}

/**
 * Normalizes unknown required string field.
 *
 * @private function of parseUseCalendarGoogleOAuthTokenPayload
 */
function normalizeRequiredString(value: unknown, fieldName: string): string {
    const normalizedValue = normalizeOptionalString(value);
    if (!normalizedValue) {
        throw new Error(`Calendar OAuth payload is missing "${fieldName}".`);
    }

    return normalizedValue;
}

/**
 * Normalizes unknown optional string field.
 *
 * @private function of parseUseCalendarGoogleOAuthTokenPayload
 */
function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}
