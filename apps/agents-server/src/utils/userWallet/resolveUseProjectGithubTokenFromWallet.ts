import { USE_PROJECT_GITHUB_WALLET_KEY, USE_PROJECT_GITHUB_WALLET_SERVICE } from '../useProjectGithubWalletConstants';
import type { ResolveUseProjectGithubTokenOptions } from './UserWalletRecord';
import { resolveWalletAccessTokenFromScopes } from './resolveWalletAccessTokenFromScopes';

/**
 * Resolves GitHub token for USE PROJECT from wallet using scope priority:
 * user+agent -> agent-only -> user-only -> server-global.
 */
export async function resolveUseProjectGithubTokenFromWallet(
    options: ResolveUseProjectGithubTokenOptions,
): Promise<string | undefined> {
    return resolveWalletAccessTokenFromScopes({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        service: USE_PROJECT_GITHUB_WALLET_SERVICE,
        key: USE_PROJECT_GITHUB_WALLET_KEY,
        errorContext: 'project',
    });
}
