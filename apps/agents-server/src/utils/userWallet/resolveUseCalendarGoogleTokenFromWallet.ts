import {
    USE_CALENDAR_GOOGLE_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
} from '../useCalendarGoogleWalletConstants';
import type { ResolveUseCalendarGoogleTokenOptions } from './UserWalletRecord';
import { resolveWalletAccessTokenFromScopes } from './resolveWalletAccessTokenFromScopes';

/**
 * Resolves Google Calendar token for USE CALENDAR from wallet using scope priority:
 * user+agent -> agent-only -> user-only -> server-global.
 */
export async function resolveUseCalendarGoogleTokenFromWallet(
    options: ResolveUseCalendarGoogleTokenOptions,
): Promise<string | undefined> {
    return resolveWalletAccessTokenFromScopes({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        service: USE_CALENDAR_GOOGLE_WALLET_SERVICE,
        key: USE_CALENDAR_GOOGLE_WALLET_KEY,
        errorContext: 'calendar',
    });
}
