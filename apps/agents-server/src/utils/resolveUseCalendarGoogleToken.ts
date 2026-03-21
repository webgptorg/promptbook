import {
    loadGoogleCalendarOAuthConfiguration,
    refreshGoogleCalendarOAuthAccessToken,
} from './googleCalendarOAuth';
import {
    resolveUseCalendarGoogleOAuthTokenPayloadFromWallet,
    resolveUseCalendarGoogleTokenFromWallet,
    storeUseCalendarGoogleOAuthTokenInWallet,
    type ResolveUseCalendarGoogleTokenOptions,
} from './userWallet';

/**
 * Safety buffer before token expiration when deciding if refresh is required.
 */
const USE_CALENDAR_GOOGLE_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Resolves Google Calendar token for USE CALENDAR.
 *
 * Resolution order:
 * 1. Manual wallet token (`service=google_calendar`, `key=use-calendar-google-token`)
 * 2. OAuth wallet token payload (auto-refreshed with refresh token when stale)
 */
export async function resolveUseCalendarGoogleToken(
    options: ResolveUseCalendarGoogleTokenOptions,
): Promise<string | undefined> {
    const manualWalletToken = await resolveUseCalendarGoogleTokenFromWallet(options);
    if (manualWalletToken) {
        return manualWalletToken;
    }

    if (!options.userId) {
        return undefined;
    }

    const oauthTokenPayload = await resolveUseCalendarGoogleOAuthTokenPayloadFromWallet(options);
    if (!oauthTokenPayload) {
        return undefined;
    }

    const isAccessTokenUsable = hasUsableAccessToken(oauthTokenPayload.expiresAt);
    if (isAccessTokenUsable) {
        return oauthTokenPayload.accessToken;
    }

    if (!oauthTokenPayload.refreshToken) {
        return oauthTokenPayload.accessToken || undefined;
    }

    const configuration = await loadGoogleCalendarOAuthConfiguration();
    if (!configuration) {
        return oauthTokenPayload.accessToken || undefined;
    }

    const refreshedToken = await refreshGoogleCalendarOAuthAccessToken(
        oauthTokenPayload.refreshToken,
        configuration,
    );

    await storeUseCalendarGoogleOAuthTokenInWallet({
        userId: options.userId,
        tokenPayload: {
            accessToken: refreshedToken.accessToken,
            refreshToken: refreshedToken.refreshToken || oauthTokenPayload.refreshToken,
            expiresAt: refreshedToken.expiresAt,
            scope: refreshedToken.scope || oauthTokenPayload.scope,
            tokenType: refreshedToken.tokenType || oauthTokenPayload.tokenType,
        },
        isUserScoped: false,
        isGlobal: !options.agentPermanentId,
        agentPermanentId: options.agentPermanentId || null,
    });

    return refreshedToken.accessToken;
}

/**
 * Returns true when access token expiration allows continued usage without refresh.
 *
 * @private function of resolveUseCalendarGoogleToken
 */
function hasUsableAccessToken(expiresAt?: string): boolean {
    if (!expiresAt) {
        return true;
    }

    const expiresAtMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
        return true;
    }

    return expiresAtMs - Date.now() > USE_CALENDAR_GOOGLE_TOKEN_REFRESH_BUFFER_MS;
}
