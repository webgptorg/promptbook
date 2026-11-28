import {
    exchangeGoogleCalendarOAuthCode,
    loadGoogleCalendarOAuthConfiguration,
    normalizeGoogleCalendarOAuthReturnToPath,
    parseGoogleCalendarOAuthConnectionState,
} from '@/src/utils/googleCalendarOAuth';
import { createCalendarActivity, upsertCalendarConnection } from '@/src/utils/calendars';
import { USE_CALENDAR_GOOGLE_OAUTH_TOKEN_REF } from '@/src/utils/useCalendarGoogleWalletConstants';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { storeUseCalendarGoogleOAuthTokenInWallet } from '@/src/utils/userWallet';
import { NextResponse } from 'next/server';

/**
 * Handles Google Calendar OAuth callback and stores generated OAuth tokens in wallet.
 */
export async function GET(request: Request) {
    const configuration = await loadGoogleCalendarOAuthConfiguration();
    if (!configuration) {
        return NextResponse.json({ error: 'Google Calendar OAuth is not configured on this server.' }, { status: 503 });
    }

    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state') || '';
    const defaultReturnTo = normalizeGoogleCalendarOAuthReturnToPath(undefined);

    if (!state) {
        return redirectWithCalendarOAuthStatus({
            requestUrl,
            returnTo: defaultReturnTo,
            status: 'error',
            error: 'missing_state',
        });
    }

    try {
        const parsedState = await parseGoogleCalendarOAuthConnectionState({ state }, configuration);
        const returnTo = parsedState.returnTo;
        const identity = await resolveCurrentUserMemoryIdentity();
        if (!identity || identity.userId !== parsedState.userId) {
            return redirectWithCalendarOAuthStatus({
                requestUrl,
                returnTo,
                status: 'error',
                error: 'unauthorized_user',
            });
        }

        const oauthError = normalizeOptionalText(requestUrl.searchParams.get('error'));
        if (oauthError) {
            return redirectWithCalendarOAuthStatus({
                requestUrl,
                returnTo,
                status: 'error',
                error: sanitizeCalendarOAuthError(oauthError),
            });
        }

        const authorizationCode = normalizeOptionalText(requestUrl.searchParams.get('code'));
        if (!authorizationCode) {
            return redirectWithCalendarOAuthStatus({
                requestUrl,
                returnTo,
                status: 'error',
                error: 'missing_code',
            });
        }

        const exchangedToken = await exchangeGoogleCalendarOAuthCode(authorizationCode, configuration);

        await storeUseCalendarGoogleOAuthTokenInWallet({
            userId: identity.userId,
            tokenPayload: {
                accessToken: exchangedToken.accessToken,
                refreshToken: exchangedToken.refreshToken,
                expiresAt: exchangedToken.expiresAt,
                scope: exchangedToken.scope,
                tokenType: exchangedToken.tokenType,
            },
            isUserScoped: parsedState.isUserScoped,
            isGlobal: parsedState.isGlobal,
            agentPermanentId: parsedState.isGlobal ? null : parsedState.agentPermanentId,
        });

        if (parsedState.agentPermanentId) {
            const connection = await upsertCalendarConnection({
                userId: identity.userId,
                agentPermanentId: parsedState.agentPermanentId,
                provider: 'google',
                calendarUrl: parsedState.calendarUrl,
                calendarId: resolveCalendarIdFromUrl(parsedState.calendarUrl),
                tokenRef: USE_CALENDAR_GOOGLE_OAUTH_TOKEN_REF,
                scopes: parsedState.scopes,
            });

            await createCalendarActivity({
                userId: identity.userId,
                agentPermanentId: parsedState.agentPermanentId,
                connectionId: connection.id,
                provider: 'google',
                operation: 'oauth_connect',
                calendarUrl: parsedState.calendarUrl,
                status: 'success',
                details: {
                    scopes: parsedState.scopes,
                },
            });
        }

        return redirectWithCalendarOAuthStatus({
            requestUrl,
            returnTo,
            status: 'connected',
        });
    } catch (error) {
        return redirectWithCalendarOAuthStatus({
            requestUrl,
            returnTo: defaultReturnTo,
            status: 'error',
            error: sanitizeCalendarOAuthError(error),
        });
    }
}

/**
 * Redirects to return path with compact Calendar OAuth status query parameters.
 */
function redirectWithCalendarOAuthStatus(options: {
    requestUrl: URL;
    returnTo: string;
    status: 'connected' | 'error';
    error?: string;
}): NextResponse {
    const redirectUrl = new URL(options.returnTo, options.requestUrl.origin);
    redirectUrl.searchParams.set('calendarOAuthStatus', options.status);
    if (options.error) {
        redirectUrl.searchParams.set('calendarOAuthError', options.error);
    } else {
        redirectUrl.searchParams.delete('calendarOAuthError');
    }

    return NextResponse.redirect(redirectUrl);
}

/**
 * Derives one concrete calendar id from one Google Calendar URL.
 */
function resolveCalendarIdFromUrl(calendarUrl: string): string {
    try {
        const parsedUrl = new URL(calendarUrl);
        const rawCalendarId =
            parsedUrl.searchParams.get('cid') ||
            parsedUrl.searchParams.get('src') ||
            parsedUrl.searchParams.get('calendarId');
        const decodedCalendarId = rawCalendarId ? decodeURIComponent(rawCalendarId).trim() : '';
        return decodedCalendarId || 'primary';
    } catch {
        return 'primary';
    }
}

/**
 * Converts callback errors to a short, query-safe identifier.
 */
function sanitizeCalendarOAuthError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error || 'calendar_oauth_callback_failed');
    return message
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

/**
 * Normalizes optional textual query parameters.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

