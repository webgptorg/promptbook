import {
    USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
} from '../useCalendarGoogleWalletConstants';
import {
    parseUseCalendarGoogleOAuthTokenPayload,
    type UseCalendarGoogleOAuthTokenPayload,
} from '../calendars/UseCalendarGoogleOAuthTokenPayload';
import { resolveWalletAccessTokenFromScopes } from './resolveWalletAccessTokenFromScopes';
import type { ResolveUseCalendarGoogleTokenOptions } from './UserWalletRecord';

/**
 * Resolves Google Calendar OAuth token payload from wallet using scope priority:
 * user+agent -> agent-only -> user-only -> server-global.
 */
export async function resolveUseCalendarGoogleOAuthTokenPayloadFromWallet(
    options: ResolveUseCalendarGoogleTokenOptions,
): Promise<UseCalendarGoogleOAuthTokenPayload | undefined> {
    const serializedTokenPayload = await resolveWalletAccessTokenFromScopes({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        service: USE_CALENDAR_GOOGLE_WALLET_SERVICE,
        key: USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
        errorContext: 'calendar OAuth',
    });
    if (!serializedTokenPayload) {
        return undefined;
    }

    return parseUseCalendarGoogleOAuthTokenPayload(serializedTokenPayload);
}
