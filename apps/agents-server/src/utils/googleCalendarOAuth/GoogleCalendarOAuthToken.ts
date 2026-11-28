import { spaceTrim } from 'spacetrim';
import type { GoogleCalendarOAuthConfiguration } from './GoogleCalendarOAuthConfiguration';

/**
 * Token payload returned by Google OAuth token endpoint.
 */
export type GoogleCalendarOAuthToken = {
    accessToken: string;
    expiresAt: string;
    refreshToken?: string;
    scope?: string;
    tokenType?: string;
};

/**
 * Exchanges one OAuth authorization code for Google Calendar access token.
 */
export async function exchangeGoogleCalendarOAuthCode(
    authorizationCode: string,
    configuration: GoogleCalendarOAuthConfiguration,
): Promise<GoogleCalendarOAuthToken> {
    return requestGoogleCalendarOAuthToken(
        new URLSearchParams({
            grant_type: 'authorization_code',
            code: authorizationCode,
            client_id: configuration.clientId,
            client_secret: configuration.clientSecret,
            redirect_uri: configuration.redirectUri,
        }),
    );
}

/**
 * Refreshes Google Calendar access token using one refresh token.
 */
export async function refreshGoogleCalendarOAuthAccessToken(
    refreshToken: string,
    configuration: GoogleCalendarOAuthConfiguration,
): Promise<GoogleCalendarOAuthToken> {
    return requestGoogleCalendarOAuthToken(
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: configuration.clientId,
            client_secret: configuration.clientSecret,
        }),
    );
}

/**
 * Revokes one Google OAuth token (access or refresh).
 */
export async function revokeGoogleCalendarOAuthToken(token: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            token,
        }).toString(),
    });

    if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(
            spaceTrim(`
                Google OAuth token revoke failed (${response.status} ${response.statusText}):
                ${errorPayload}
            `),
        );
    }
}

/**
 * Executes one Google OAuth token request and maps payload into normalized structure.
 *
 * @private function of GoogleCalendarOAuthToken
 */
async function requestGoogleCalendarOAuthToken(params: URLSearchParams): Promise<GoogleCalendarOAuthToken> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    const rawPayload = await response.text();
    const parsedPayload = tryParseJson(rawPayload);

    if (!response.ok) {
        throw new Error(
            spaceTrim(`
                Google OAuth token request failed (${response.status} ${response.statusText}):
                ${extractGoogleOAuthErrorMessage(parsedPayload, rawPayload)}
            `),
        );
    }

    if (!parsedPayload || typeof parsedPayload !== 'object') {
        throw new Error('Google OAuth token response is malformed.');
    }

    const payload = parsedPayload as Record<string, unknown>;
    const accessToken = normalizeRequiredString(payload.access_token, 'access_token');
    const expiresIn = normalizeExpiresIn(payload.expires_in);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
        accessToken,
        expiresAt,
        ...(normalizeOptionalString(payload.refresh_token) ? { refreshToken: normalizeOptionalString(payload.refresh_token) } : {}),
        ...(normalizeOptionalString(payload.scope) ? { scope: normalizeOptionalString(payload.scope) } : {}),
        ...(normalizeOptionalString(payload.token_type) ? { tokenType: normalizeOptionalString(payload.token_type) } : {}),
    };
}

/**
 * Parses raw text into JSON when possible.
 *
 * @private function of GoogleCalendarOAuthToken
 */
function tryParseJson(rawText: string): unknown {
    if (!rawText.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

/**
 * Extracts user-friendly message from Google OAuth error payload.
 *
 * @private function of GoogleCalendarOAuthToken
 */
function extractGoogleOAuthErrorMessage(parsedPayload: unknown, fallbackText: string): string {
    if (parsedPayload && typeof parsedPayload === 'object') {
        const payload = parsedPayload as {
            error?: unknown;
            error_description?: unknown;
        };
        const errorCode = normalizeOptionalString(payload.error);
        const errorDescription = normalizeOptionalString(payload.error_description);
        if (errorCode || errorDescription) {
            return [errorCode, errorDescription].filter(Boolean).join(' | ');
        }
    }

    return fallbackText || 'Unknown Google OAuth error';
}

/**
 * Normalizes unknown required string field.
 *
 * @private function of GoogleCalendarOAuthToken
 */
function normalizeRequiredString(value: unknown, fieldName: string): string {
    const normalizedValue = normalizeOptionalString(value);
    if (!normalizedValue) {
        throw new Error(`Google OAuth response is missing "${fieldName}".`);
    }

    return normalizedValue;
}

/**
 * Normalizes unknown optional string field.
 *
 * @private function of GoogleCalendarOAuthToken
 */
function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}

/**
 * Normalizes Google OAuth `expires_in` into safe positive integer seconds.
 *
 * @private function of GoogleCalendarOAuthToken
 */
function normalizeExpiresIn(value: unknown): number {
    const parsedValue =
        typeof value === 'number'
            ? value
            : Number.parseInt(typeof value === 'string' ? value : '', 10);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return 3600;
    }

    return Math.floor(parsedValue);
}
