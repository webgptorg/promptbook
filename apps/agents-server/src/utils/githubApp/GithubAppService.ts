import {
    getGithubAppUserConnectionRecord,
    hasUsableGithubAppToken,
    upsertGithubAppUserConnectionRecord,
} from './GithubAppConnectionRecord';
import { ensureGithubAppConfiguration, loadGithubAppConfiguration, type GithubAppConfiguration } from './GithubAppConfiguration';
import {
    requestGithubAppInstallationAccessToken,
    type GithubAppInstallationAccessToken,
} from './GithubAppInstallationAccessToken';

/**
 * Result returned by GitHub App status checks for UI and API layers.
 */
export type GithubAppConnectionStatus = {
    isConfigured: boolean;
    isConnected: boolean;
    installationId: number | null;
    hasUsableToken: boolean;
};

/**
 * Input payload for binding one GitHub App installation to a user.
 */
export type ConnectGithubAppInstallationForUserOptions = {
    userId: number;
    installationId: number;
};

/**
 * Input payload for resolving one user's GitHub App installation token.
 */
export type ResolveGithubAppInstallationAccessTokenForUserOptions = {
    userId: number;
};

/**
 * Returns true when GitHub App configuration metadata (or legacy env values) are present.
 */
export async function isGithubAppConfigured(): Promise<boolean> {
    return (await loadGithubAppConfiguration()) !== null;
}

/**
 * Resolves current GitHub App connection state for one user.
 */
export async function getGithubAppConnectionStatusForUser(userId: number): Promise<GithubAppConnectionStatus> {
    const configuration = await loadGithubAppConfiguration();
    if (!configuration) {
        return {
            isConfigured: false,
            isConnected: false,
            installationId: null,
            hasUsableToken: false,
        };
    }

    const connection = await getGithubAppUserConnectionRecord(userId);
    if (!connection) {
        return {
            isConfigured: true,
            isConnected: false,
            installationId: null,
            hasUsableToken: false,
        };
    }

    const hasUsableToken = hasUsableGithubAppToken(connection);
    return {
        isConfigured: true,
        isConnected: true,
        installationId: connection.installationId,
        hasUsableToken,
    };
}

/**
 * Connects one user to a GitHub App installation and stores initial token cache.
 */
export async function connectGithubAppInstallationForUser(
    options: ConnectGithubAppInstallationForUserOptions,
    configuration?: GithubAppConfiguration,
): Promise<GithubAppInstallationAccessToken> {
    const resolvedConfiguration = configuration ?? (await ensureGithubAppConfiguration());
    const accessToken = await requestGithubAppInstallationAccessToken(
        options.installationId,
        resolvedConfiguration,
    );
    const now = new Date().toISOString();

    await upsertGithubAppUserConnectionRecord(options.userId, {
        installationId: options.installationId,
        token: accessToken.token,
        tokenExpiresAt: accessToken.expiresAt,
        connectedAt: now,
        updatedAt: now,
    });

    return accessToken;
}

/**
 * Resolves one user's GitHub App token and refreshes it when cache is stale.
 */
export async function resolveGithubAppInstallationAccessTokenForUser(
    options: ResolveGithubAppInstallationAccessTokenForUserOptions,
): Promise<GithubAppInstallationAccessToken | null> {
    const configuration = await loadGithubAppConfiguration();
    if (!configuration) {
        return null;
    }

    const connection = await getGithubAppUserConnectionRecord(options.userId);
    if (!connection) {
        return null;
    }

    if (hasUsableGithubAppToken(connection) && connection.token && connection.tokenExpiresAt) {
        return {
            token: connection.token,
            expiresAt: connection.tokenExpiresAt,
            installationId: connection.installationId,
        };
    }

    const refreshedToken = await requestGithubAppInstallationAccessToken(
        connection.installationId,
        configuration,
    );
    await upsertGithubAppUserConnectionRecord(options.userId, {
        installationId: connection.installationId,
        token: refreshedToken.token,
        tokenExpiresAt: refreshedToken.expiresAt,
        connectedAt: connection.connectedAt,
        updatedAt: new Date().toISOString(),
    });

    return refreshedToken;
}

