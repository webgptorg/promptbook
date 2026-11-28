import { getUserDataValue, upsertUserDataValue } from '../userData';

/**
 * UserData key that stores one user's GitHub App installation linkage.
 */
const GITHUB_APP_USER_DATA_KEY = 'github-app-connection';

/**
 * Safety buffer before token expiration when deciding if refresh is required.
 */
const GITHUB_APP_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Persisted user-level GitHub App installation details.
 *
 * @private function of githubApp
 */
export type GithubAppUserConnectionRecord = {
    installationId: number;
    token?: string;
    tokenExpiresAt?: string;
    connectedAt: string;
    updatedAt: string;
};

/**
 * Parses and validates persisted GitHub App connection record from UserData.
 *
 * @private function of githubApp
 */
export async function getGithubAppUserConnectionRecord(
    userId: number,
): Promise<GithubAppUserConnectionRecord | null> {
    const rawValue = await getUserDataValue({
        userId,
        key: GITHUB_APP_USER_DATA_KEY,
    });

    return parseGithubAppUserConnectionRecord(rawValue);
}

/**
 * Stores one normalized GitHub App connection record in UserData.
 *
 * @private function of githubApp
 */
export async function upsertGithubAppUserConnectionRecord(
    userId: number,
    record: GithubAppUserConnectionRecord,
): Promise<void> {
    await upsertUserDataValue({
        userId,
        key: GITHUB_APP_USER_DATA_KEY,
        value: record,
    });
}

/**
 * Returns true when cached connection token exists and is not close to expiration.
 *
 * @private function of githubApp
 */
export function hasUsableGithubAppToken(record: GithubAppUserConnectionRecord): boolean {
    if (!record.token || !record.tokenExpiresAt) {
        return false;
    }

    const expiresAtMs = new Date(record.tokenExpiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
        return false;
    }

    return expiresAtMs - Date.now() > GITHUB_APP_TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Parses `Json` payload from UserData into a normalized connection record.
 */
function parseGithubAppUserConnectionRecord(rawValue: unknown): GithubAppUserConnectionRecord | null {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        return null;
    }

    const value = rawValue as Record<string, unknown>;
    const installationId =
        typeof value.installationId === 'number'
            ? value.installationId
            : Number.parseInt(typeof value.installationId === 'string' ? value.installationId : '', 10);
    if (!Number.isFinite(installationId) || installationId <= 0) {
        return null;
    }

    const connectedAt =
        typeof value.connectedAt === 'string' && value.connectedAt.trim().length > 0
            ? value.connectedAt
            : new Date().toISOString();
    const updatedAt =
        typeof value.updatedAt === 'string' && value.updatedAt.trim().length > 0
            ? value.updatedAt
            : connectedAt;

    return {
        installationId,
        token: typeof value.token === 'string' && value.token.trim().length > 0 ? value.token : undefined,
        tokenExpiresAt:
            typeof value.tokenExpiresAt === 'string' && value.tokenExpiresAt.trim().length > 0
                ? value.tokenExpiresAt
                : undefined,
        connectedAt,
        updatedAt,
    };
}

