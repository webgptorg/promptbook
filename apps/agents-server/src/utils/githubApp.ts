import { createHmac, createSign, randomBytes, timingSafeEqual } from 'crypto';
import { getUserDataValue, upsertUserDataValue } from './userData';

/**
 * GitHub API base URL used for GitHub App requests.
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * GitHub API version header used for GitHub App requests.
 */
const GITHUB_API_VERSION = '2022-11-28';

/**
 * UserData key that stores one user's GitHub App installation linkage.
 */
const GITHUB_APP_USER_DATA_KEY = 'github-app-connection';

/**
 * Maximum allowed age of signed GitHub App connect-state payloads.
 */
const GITHUB_APP_STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Safety buffer before token expiration when deciding if refresh is required.
 */
const GITHUB_APP_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Default return path used when the requested callback target is invalid.
 */
const DEFAULT_GITHUB_APP_RETURN_TO_PATH = '/system/user-wallet';

/**
 * Parsed GitHub App environment configuration.
 */
type GithubAppConfiguration = {
    appId: string;
    appSlug: string;
    privateKey: string;
    stateSecret: string;
};

/**
 * Signed state payload passed through GitHub App installation redirects.
 */
export type GithubAppConnectionStatePayload = {
    userId: number;
    returnTo: string;
    isGlobal: boolean;
    agentPermanentId: string | null;
    issuedAtMs: number;
    nonce: string;
};

/**
 * Persisted user-level GitHub App installation details.
 */
type GithubAppUserConnectionRecord = {
    installationId: number;
    token?: string;
    tokenExpiresAt?: string;
    connectedAt: string;
    updatedAt: string;
};

/**
 * Token payload returned by GitHub App installation access token exchange.
 */
export type GithubAppInstallationAccessToken = {
    token: string;
    expiresAt: string;
    installationId: number;
};

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
 * Input payload for creating one signed GitHub App connect-state token.
 */
export type CreateGithubAppConnectionStateOptions = {
    userId: number;
    returnTo?: string;
    isGlobal?: boolean;
    agentPermanentId?: string | null;
};

/**
 * Input payload for validating one signed GitHub App connect-state token.
 */
export type ParseGithubAppConnectionStateOptions = {
    state: string;
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
 * Returns true when required GitHub App environment variables are present.
 */
export function isGithubAppConfigured(): boolean {
    return getGithubAppConfiguration() !== null;
}

/**
 * Normalizes a user-provided return path and blocks external redirects.
 */
export function normalizeGithubAppReturnToPath(rawPath?: string): string {
    if (!rawPath) {
        return DEFAULT_GITHUB_APP_RETURN_TO_PATH;
    }

    const trimmedPath = rawPath.trim();
    if (!trimmedPath.startsWith('/')) {
        return DEFAULT_GITHUB_APP_RETURN_TO_PATH;
    }

    if (trimmedPath.startsWith('//')) {
        return DEFAULT_GITHUB_APP_RETURN_TO_PATH;
    }

    return trimmedPath;
}

/**
 * Creates one signed GitHub App connect-state token.
 */
export function createGithubAppConnectionState(options: CreateGithubAppConnectionStateOptions): string {
    const configuration = getGithubAppConfiguration();
    if (!configuration) {
        throw new Error('GitHub App is not configured.');
    }

    const payload: GithubAppConnectionStatePayload = {
        userId: options.userId,
        returnTo: normalizeGithubAppReturnToPath(options.returnTo),
        isGlobal: options.isGlobal !== false,
        agentPermanentId: options.agentPermanentId?.trim() || null,
        issuedAtMs: Date.now(),
        nonce: randomBytes(16).toString('hex'),
    };
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = signGithubAppState(encodedPayload, configuration.stateSecret);

    return `${encodedPayload}.${signature}`;
}

/**
 * Validates and decodes one signed GitHub App connect-state token.
 */
export function parseGithubAppConnectionState(options: ParseGithubAppConnectionStateOptions): GithubAppConnectionStatePayload {
    const configuration = getGithubAppConfiguration();
    if (!configuration) {
        throw new Error('GitHub App is not configured.');
    }

    const [encodedPayload, providedSignature] = options.state.split('.');
    if (!encodedPayload || !providedSignature) {
        throw new Error('GitHub App state is malformed.');
    }

    const expectedSignature = signGithubAppState(encodedPayload, configuration.stateSecret);
    assertSecureStringEquals(expectedSignature, providedSignature, 'GitHub App state signature is invalid.');

    const parsedPayload = parseGithubAppStatePayload(decodeBase64Url(encodedPayload));
    if (Date.now() - parsedPayload.issuedAtMs > GITHUB_APP_STATE_MAX_AGE_MS) {
        throw new Error('GitHub App state has expired.');
    }

    return parsedPayload;
}

/**
 * Builds GitHub App installation URL that starts connect/install flow.
 */
export function buildGithubAppInstallationConnectUrl(state: string): string {
    const configuration = getGithubAppConfiguration();
    if (!configuration) {
        throw new Error('GitHub App is not configured.');
    }

    const url = new URL(`https://github.com/apps/${configuration.appSlug}/installations/new`);
    url.searchParams.set('state', state);

    return url.toString();
}

/**
 * Resolves current GitHub App connection state for one user.
 */
export async function getGithubAppConnectionStatusForUser(userId: number): Promise<GithubAppConnectionStatus> {
    const configuration = getGithubAppConfiguration();
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
): Promise<GithubAppInstallationAccessToken> {
    const accessToken = await requestGithubAppInstallationAccessToken(options.installationId);
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
    if (!isGithubAppConfigured()) {
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

    const refreshedToken = await requestGithubAppInstallationAccessToken(connection.installationId);
    await upsertGithubAppUserConnectionRecord(options.userId, {
        installationId: connection.installationId,
        token: refreshedToken.token,
        tokenExpiresAt: refreshedToken.expiresAt,
        connectedAt: connection.connectedAt,
        updatedAt: new Date().toISOString(),
    });

    return refreshedToken;
}

/**
 * Reads normalized GitHub App configuration from environment variables.
 */
function getGithubAppConfiguration(): GithubAppConfiguration | null {
    const appId = process.env.GITHUB_APP_ID?.trim() || '';
    const appSlug = process.env.GITHUB_APP_SLUG?.trim() || '';
    const privateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY?.trim() || '';
    const stateSecret = (process.env.GITHUB_APP_STATE_SECRET || process.env.ADMIN_PASSWORD || '').trim();

    if (!appId || !appSlug || !privateKeyRaw || !stateSecret) {
        return null;
    }

    return {
        appId,
        appSlug,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        stateSecret,
    };
}

/**
 * Parses and validates persisted GitHub App connection record from UserData.
 */
async function getGithubAppUserConnectionRecord(userId: number): Promise<GithubAppUserConnectionRecord | null> {
    const rawValue = await getUserDataValue({
        userId,
        key: GITHUB_APP_USER_DATA_KEY,
    });

    return parseGithubAppUserConnectionRecord(rawValue);
}

/**
 * Stores one normalized GitHub App connection record in UserData.
 */
async function upsertGithubAppUserConnectionRecord(
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
 * Exchanges one GitHub App JWT for an installation access token.
 */
async function requestGithubAppInstallationAccessToken(
    installationId: number,
): Promise<GithubAppInstallationAccessToken> {
    const configuration = getGithubAppConfiguration();
    if (!configuration) {
        throw new Error('GitHub App is not configured.');
    }

    const appJwt = createGithubAppJwt(configuration);
    const response = await fetch(`${GITHUB_API_BASE_URL}/app/installations/${installationId}/access_tokens`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
            'Content-Type': 'application/json',
            'User-Agent': 'Promptbook-Agents-Server-GitHub-App',
        },
        body: JSON.stringify({}),
    });

    const responseText = await response.text();
    const payload = parseJsonRecord(responseText);
    if (!response.ok) {
        const errorMessage = typeof payload.message === 'string' ? payload.message : responseText || response.statusText;
        throw new Error(
            `GitHub App token request failed (${response.status} ${response.statusText}): ${errorMessage}`,
        );
    }

    const token = typeof payload.token === 'string' ? payload.token.trim() : '';
    const expiresAt = typeof payload.expires_at === 'string' ? payload.expires_at : '';
    if (!token || !expiresAt) {
        throw new Error('GitHub App token response is missing token or expires_at.');
    }

    return {
        token,
        expiresAt,
        installationId,
    };
}

/**
 * Creates one JWT signed by GitHub App private key.
 */
function createGithubAppJwt(configuration: GithubAppConfiguration): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = encodeBase64Url(
        JSON.stringify({
            iat: nowSeconds - 60,
            exp: nowSeconds + 9 * 60,
            iss: configuration.appId,
        }),
    );
    const signingInput = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(configuration.privateKey).toString('base64url');

    return `${signingInput}.${signature}`;
}

/**
 * Returns true when cached connection token exists and is not close to expiration.
 */
function hasUsableGithubAppToken(record: GithubAppUserConnectionRecord): boolean {
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
 * Signs one GitHub App state payload.
 */
function signGithubAppState(encodedPayload: string, secret: string): string {
    return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

/**
 * Parses decoded GitHub App state payload JSON.
 */
function parseGithubAppStatePayload(rawPayload: string): GithubAppConnectionStatePayload {
    let parsedPayload: unknown;
    try {
        parsedPayload = JSON.parse(rawPayload);
    } catch {
        throw new Error('GitHub App state payload is not valid JSON.');
    }

    if (!parsedPayload || typeof parsedPayload !== 'object') {
        throw new Error('GitHub App state payload is invalid.');
    }

    const payload = parsedPayload as Record<string, unknown>;
    const userId =
        typeof payload.userId === 'number'
            ? payload.userId
            : Number.parseInt(typeof payload.userId === 'string' ? payload.userId : '', 10);
    if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('GitHub App state user id is invalid.');
    }

    const issuedAtMs =
        typeof payload.issuedAtMs === 'number'
            ? payload.issuedAtMs
            : Number.parseInt(typeof payload.issuedAtMs === 'string' ? payload.issuedAtMs : '', 10);
    if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) {
        throw new Error('GitHub App state issue time is invalid.');
    }

    return {
        userId,
        returnTo: normalizeGithubAppReturnToPath(
            typeof payload.returnTo === 'string' ? payload.returnTo : DEFAULT_GITHUB_APP_RETURN_TO_PATH,
        ),
        isGlobal: payload.isGlobal !== false,
        agentPermanentId:
            typeof payload.agentPermanentId === 'string' && payload.agentPermanentId.trim().length > 0
                ? payload.agentPermanentId.trim()
                : null,
        issuedAtMs,
        nonce: typeof payload.nonce === 'string' ? payload.nonce : '',
    };
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

/**
 * Safely parses JSON text into a plain object-like record.
 */
function parseJsonRecord(rawText: string): Record<string, unknown> {
    if (!rawText.trim()) {
        return {};
    }

    try {
        const parsed = JSON.parse(rawText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed as Record<string, unknown>;
    } catch {
        return {};
    }
}

/**
 * Ensures two signatures are equal using constant-time comparison.
 */
function assertSecureStringEquals(expected: string, received: string, errorMessage: string): void {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (expectedBuffer.length !== receivedBuffer.length) {
        throw new Error(errorMessage);
    }

    if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
        throw new Error(errorMessage);
    }
}

/**
 * Encodes UTF-8 string into base64url format.
 */
function encodeBase64Url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * Decodes base64url string into UTF-8 text.
 */
function decodeBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}
