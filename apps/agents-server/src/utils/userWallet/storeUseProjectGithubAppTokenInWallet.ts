import { USE_PROJECT_GITHUB_APP_WALLET_KEY, USE_PROJECT_GITHUB_WALLET_SERVICE } from '../useProjectGithubWalletConstants';
import type { UserWalletRecord } from './UserWalletRecord';
import { createUserWalletRecord } from './createUserWalletRecord';

/**
 * Stores a GitHub App-generated USE PROJECT token in wallet with configurable scopes.
 */
export async function storeUseProjectGithubAppTokenInWallet(options: {
    userId: number;
    token: string;
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
        service: USE_PROJECT_GITHUB_WALLET_SERVICE,
        key: USE_PROJECT_GITHUB_APP_WALLET_KEY,
        secret: options.token,
    });
}
