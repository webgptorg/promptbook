import { USE_EMAIL_SMTP_WALLET_KEY, USE_EMAIL_SMTP_WALLET_SERVICE } from '../useEmailSmtpWalletConstants';
import type { ResolveUseEmailSmtpCredentialOptions } from './UserWalletRecord';
import { resolveWalletAccessTokenFromScopes } from './resolveWalletAccessTokenFromScopes';

/**
 * Resolves SMTP credential payload for USE EMAIL from wallet using scope priority:
 * user+agent -> agent-only -> user-only -> server-global.
 */
export async function resolveUseEmailSmtpCredentialFromWallet(
    options: ResolveUseEmailSmtpCredentialOptions,
): Promise<string | undefined> {
    return resolveWalletAccessTokenFromScopes({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        service: USE_EMAIL_SMTP_WALLET_SERVICE,
        key: USE_EMAIL_SMTP_WALLET_KEY,
        errorContext: 'email SMTP',
    });
}
