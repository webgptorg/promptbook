import {
    USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
} from '../useCalendarGoogleWalletConstants';
import {
    stringifyUseCalendarGoogleOAuthTokenPayload,
    type UseCalendarGoogleOAuthTokenPayload,
} from '../calendars/UseCalendarGoogleOAuthTokenPayload';
import type { UserWalletRecord } from './UserWalletRecord';
import { createUserWalletRecord } from './createUserWalletRecord';

/**
 * Stores one Google Calendar OAuth token payload in wallet with configurable scopes.
 */
export async function storeUseCalendarGoogleOAuthTokenInWallet(options: {
    userId: number;
    tokenPayload: UseCalendarGoogleOAuthTokenPayload;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    agentPermanentId?: string | null;
}): Promise<UserWalletRecord> {
    const normalizedAgentPermanentId = options.agentPermanentId?.trim() || null;
    const isGlobal = options.isGlobal === true || (!normalizedAgentPermanentId && options.isGlobal !== false);

    return createUserWalletRecord({
        userId: options.userId,
        isUserScoped: options.isUserScoped === true,
        isGlobal,
        agentPermanentId: isGlobal ? null : normalizedAgentPermanentId,
        recordType: 'ACCESS_TOKEN',
        service: USE_CALENDAR_GOOGLE_WALLET_SERVICE,
        key: USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
        secret: stringifyUseCalendarGoogleOAuthTokenPayload(options.tokenPayload),
    });
}
