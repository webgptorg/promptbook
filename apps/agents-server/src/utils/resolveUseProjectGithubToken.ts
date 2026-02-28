import {
    resolveGithubAppInstallationAccessTokenForUser,
    type GithubAppInstallationAccessToken,
} from './githubApp';
import {
    resolveUseProjectGithubTokenFromWallet,
    storeUseProjectGithubAppTokenInWallet,
    type ResolveUseProjectGithubTokenOptions,
} from './userWallet';

/**
 * Resolved USE PROJECT GitHub token source.
 */
type ResolvedUseProjectGithubTokenSource = 'manual-wallet' | 'github-app';

/**
 * Result payload for resolving a USE PROJECT GitHub token.
 */
type ResolvedUseProjectGithubToken = {
    token: string;
    source: ResolvedUseProjectGithubTokenSource;
};

/**
 * Resolves GitHub token for USE PROJECT.
 *
 * Resolution order:
 * 1. Manual wallet token (`service=github`, `key=use-project-github-token`)
 * 2. Connected GitHub App installation token (cached/refreshed and mirrored to wallet)
 */
export async function resolveUseProjectGithubToken(
    options: ResolveUseProjectGithubTokenOptions,
): Promise<string | undefined> {
    const resolved = await resolveUseProjectGithubTokenWithSource(options);
    return resolved?.token;
}

/**
 * Resolves GitHub token for USE PROJECT with explicit source diagnostics.
 */
async function resolveUseProjectGithubTokenWithSource(
    options: ResolveUseProjectGithubTokenOptions,
): Promise<ResolvedUseProjectGithubToken | undefined> {
    const manualWalletToken = await resolveUseProjectGithubTokenFromWallet(options);
    if (manualWalletToken) {
        return {
            token: manualWalletToken,
            source: 'manual-wallet',
        };
    }

    const githubAppToken = await resolveGithubAppToken(options.userId);
    if (!githubAppToken) {
        return undefined;
    }

    await storeUseProjectGithubAppTokenInWallet({
        userId: options.userId,
        token: githubAppToken.token,
    });

    return {
        token: githubAppToken.token,
        source: 'github-app',
    };
}

/**
 * Resolves GitHub App installation token for one user.
 */
async function resolveGithubAppToken(userId: number): Promise<GithubAppInstallationAccessToken | null> {
    return resolveGithubAppInstallationAccessTokenForUser({ userId });
}
