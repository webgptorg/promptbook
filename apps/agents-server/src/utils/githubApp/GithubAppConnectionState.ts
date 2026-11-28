import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ensureGithubAppConfiguration, type GithubAppConfiguration } from './GithubAppConfiguration';

/**
 * Maximum allowed age of signed GitHub App connect-state payloads.
 */
const GITHUB_APP_STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Default return path used when the requested callback target is invalid.
 */
const DEFAULT_GITHUB_APP_RETURN_TO_PATH = '/system/user-wallet';

/**
 * Signed state payload passed through GitHub App installation redirects.
 */
export type GithubAppConnectionStatePayload = {
    userId: number;
    returnTo: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    agentPermanentId: string | null;
    issuedAtMs: number;
    nonce: string;
};

/**
 * Input payload for creating one signed GitHub App connect-state token.
 */
export type CreateGithubAppConnectionStateOptions = {
    userId: number;
    returnTo?: string;
    isUserScoped?: boolean;
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
export async function createGithubAppConnectionState(
    options: CreateGithubAppConnectionStateOptions,
    configuration?: GithubAppConfiguration,
): Promise<string> {
    const resolvedConfiguration = configuration ?? (await ensureGithubAppConfiguration());

    const payload: GithubAppConnectionStatePayload = {
        userId: options.userId,
        returnTo: normalizeGithubAppReturnToPath(options.returnTo),
        isUserScoped: options.isUserScoped === true,
        isGlobal: options.isGlobal !== false,
        agentPermanentId: options.agentPermanentId?.trim() || null,
        issuedAtMs: Date.now(),
        nonce: randomBytes(16).toString('hex'),
    };
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = signGithubAppState(encodedPayload, resolvedConfiguration.stateSecret);

    return `${encodedPayload}.${signature}`;
}

/**
 * Validates and decodes one signed GitHub App connect-state token.
 */
export async function parseGithubAppConnectionState(
    options: ParseGithubAppConnectionStateOptions,
    configuration?: GithubAppConfiguration,
): Promise<GithubAppConnectionStatePayload> {
    const resolvedConfiguration = configuration ?? (await ensureGithubAppConfiguration());

    const [encodedPayload, providedSignature] = options.state.split('.');
    if (!encodedPayload || !providedSignature) {
        throw new Error('GitHub App state is malformed.');
    }

    const expectedSignature = signGithubAppState(encodedPayload, resolvedConfiguration.stateSecret);
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
export async function buildGithubAppInstallationConnectUrl(
    state: string,
    configuration?: GithubAppConfiguration,
): Promise<string> {
    const resolvedConfiguration = configuration ?? (await ensureGithubAppConfiguration());

    const url = new URL(`https://github.com/apps/${resolvedConfiguration.appSlug}/installations/new`);
    url.searchParams.set('state', state);

    return url.toString();
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
        isUserScoped: payload.isUserScoped === true,
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

