import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
    ensureGoogleCalendarOAuthConfiguration,
    type GoogleCalendarOAuthConfiguration,
} from './GoogleCalendarOAuthConfiguration';

/**
 * Maximum allowed age of signed Google Calendar OAuth state payloads.
 */
const GOOGLE_CALENDAR_OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Default return path used when the requested callback target is invalid.
 */
const DEFAULT_GOOGLE_CALENDAR_OAUTH_RETURN_TO_PATH = '/system/user-wallet';

/**
 * Signed state payload passed through Google Calendar OAuth redirects.
 */
export type GoogleCalendarOAuthConnectionStatePayload = {
    userId: number;
    returnTo: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    agentPermanentId: string | null;
    calendarUrl: string;
    scopes: string[];
    issuedAtMs: number;
    nonce: string;
};

/**
 * Input payload for creating one signed Google Calendar OAuth state token.
 */
export type CreateGoogleCalendarOAuthConnectionStateOptions = {
    userId: number;
    returnTo?: string;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    agentPermanentId?: string | null;
    calendarUrl: string;
    scopes: string[];
};

/**
 * Input payload for validating one signed Google Calendar OAuth state token.
 */
export type ParseGoogleCalendarOAuthConnectionStateOptions = {
    state: string;
};

/**
 * Normalizes a user-provided return path and blocks external redirects.
 */
export function normalizeGoogleCalendarOAuthReturnToPath(rawPath?: string): string {
    if (!rawPath) {
        return DEFAULT_GOOGLE_CALENDAR_OAUTH_RETURN_TO_PATH;
    }

    const trimmedPath = rawPath.trim();
    if (!trimmedPath.startsWith('/')) {
        return DEFAULT_GOOGLE_CALENDAR_OAUTH_RETURN_TO_PATH;
    }

    if (trimmedPath.startsWith('//')) {
        return DEFAULT_GOOGLE_CALENDAR_OAUTH_RETURN_TO_PATH;
    }

    return trimmedPath;
}

/**
 * Creates one signed Google Calendar OAuth state token.
 */
export async function createGoogleCalendarOAuthConnectionState(
    options: CreateGoogleCalendarOAuthConnectionStateOptions,
    configuration?: GoogleCalendarOAuthConfiguration,
): Promise<string> {
    const resolvedConfiguration = configuration ?? (await ensureGoogleCalendarOAuthConfiguration());

    const payload: GoogleCalendarOAuthConnectionStatePayload = {
        userId: options.userId,
        returnTo: normalizeGoogleCalendarOAuthReturnToPath(options.returnTo),
        isUserScoped: options.isUserScoped === true,
        isGlobal: options.isGlobal !== false,
        agentPermanentId: options.agentPermanentId?.trim() || null,
        calendarUrl: normalizeCalendarUrlForState(options.calendarUrl),
        scopes: normalizeScopes(options.scopes),
        issuedAtMs: Date.now(),
        nonce: randomBytes(16).toString('hex'),
    };
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = signGoogleCalendarOAuthState(encodedPayload, resolvedConfiguration.stateSecret);

    return `${encodedPayload}.${signature}`;
}

/**
 * Validates and decodes one signed Google Calendar OAuth state token.
 */
export async function parseGoogleCalendarOAuthConnectionState(
    options: ParseGoogleCalendarOAuthConnectionStateOptions,
    configuration?: GoogleCalendarOAuthConfiguration,
): Promise<GoogleCalendarOAuthConnectionStatePayload> {
    const resolvedConfiguration = configuration ?? (await ensureGoogleCalendarOAuthConfiguration());

    const [encodedPayload, providedSignature] = options.state.split('.');
    if (!encodedPayload || !providedSignature) {
        throw new Error('Google Calendar OAuth state is malformed.');
    }

    const expectedSignature = signGoogleCalendarOAuthState(encodedPayload, resolvedConfiguration.stateSecret);
    assertSecureStringEquals(expectedSignature, providedSignature, 'Google Calendar OAuth state signature is invalid.');

    const parsedPayload = parseGoogleCalendarOAuthStatePayload(decodeBase64Url(encodedPayload));
    if (Date.now() - parsedPayload.issuedAtMs > GOOGLE_CALENDAR_OAUTH_STATE_MAX_AGE_MS) {
        throw new Error('Google Calendar OAuth state has expired.');
    }

    return parsedPayload;
}

/**
 * Signs one Google Calendar OAuth state payload.
 *
 * @private function of createGoogleCalendarOAuthConnectionState
 */
function signGoogleCalendarOAuthState(encodedPayload: string, secret: string): string {
    return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

/**
 * Parses decoded Google Calendar OAuth state payload JSON.
 *
 * @private function of parseGoogleCalendarOAuthConnectionState
 */
function parseGoogleCalendarOAuthStatePayload(rawPayload: string): GoogleCalendarOAuthConnectionStatePayload {
    let parsedPayload: unknown;
    try {
        parsedPayload = JSON.parse(rawPayload);
    } catch {
        throw new Error('Google Calendar OAuth state payload is not valid JSON.');
    }

    if (!parsedPayload || typeof parsedPayload !== 'object') {
        throw new Error('Google Calendar OAuth state payload is invalid.');
    }

    const payload = parsedPayload as Record<string, unknown>;
    const userId =
        typeof payload.userId === 'number'
            ? payload.userId
            : Number.parseInt(typeof payload.userId === 'string' ? payload.userId : '', 10);
    if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('Google Calendar OAuth state user id is invalid.');
    }

    const issuedAtMs =
        typeof payload.issuedAtMs === 'number'
            ? payload.issuedAtMs
            : Number.parseInt(typeof payload.issuedAtMs === 'string' ? payload.issuedAtMs : '', 10);
    if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) {
        throw new Error('Google Calendar OAuth state issue time is invalid.');
    }

    return {
        userId,
        returnTo: normalizeGoogleCalendarOAuthReturnToPath(
            typeof payload.returnTo === 'string'
                ? payload.returnTo
                : DEFAULT_GOOGLE_CALENDAR_OAUTH_RETURN_TO_PATH,
        ),
        isUserScoped: payload.isUserScoped === true,
        isGlobal: payload.isGlobal !== false,
        agentPermanentId:
            typeof payload.agentPermanentId === 'string' && payload.agentPermanentId.trim().length > 0
                ? payload.agentPermanentId.trim()
                : null,
        calendarUrl: normalizeCalendarUrlForState(
            typeof payload.calendarUrl === 'string' ? payload.calendarUrl : 'https://calendar.google.com/calendar/u/0/r',
        ),
        scopes: normalizeScopes(Array.isArray(payload.scopes) ? payload.scopes : []),
        issuedAtMs,
        nonce: typeof payload.nonce === 'string' ? payload.nonce : '',
    };
}

/**
 * Ensures two signatures are equal using constant-time comparison.
 *
 * @private function of parseGoogleCalendarOAuthConnectionState
 */
function assertSecureStringEquals(expected: string, received: string, errorMessage: string): void {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (expectedBuffer.length !== receivedBuffer.length) {
        throw new Error(errorMessage);
    }

    if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
        throw new Error(errorMessage);
    }
}

/**
 * Encodes UTF-8 string into base64url format.
 *
 * @private function of createGoogleCalendarOAuthConnectionState
 */
function encodeBase64Url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * Decodes base64url string into UTF-8 text.
 *
 * @private function of parseGoogleCalendarOAuthConnectionState
 */
function decodeBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

/**
 * Normalizes calendar URL saved in OAuth state payload.
 *
 * @private function of createGoogleCalendarOAuthConnectionState
 */
function normalizeCalendarUrlForState(rawUrl: string): string {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
        return 'https://calendar.google.com/calendar/u/0/r';
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        parsedUrl.protocol = 'https:';
        parsedUrl.hash = '';
        return parsedUrl.toString();
    } catch {
        return 'https://calendar.google.com/calendar/u/0/r';
    }
}

/**
 * Normalizes optional OAuth scopes payload.
 *
 * @private function of createGoogleCalendarOAuthConnectionState
 */
function normalizeScopes(rawScopes: unknown[]): string[] {
    const scopes = rawScopes
        .filter((scope): scope is string => typeof scope === 'string')
        .map((scope) => scope.trim())
        .filter(Boolean);

    return scopes.length > 0 ? [...new Set(scopes)] : ['https://www.googleapis.com/auth/calendar'];
}
