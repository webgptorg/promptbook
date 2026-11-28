import { createSign } from 'crypto';
import { ensureGithubAppConfiguration, type GithubAppConfiguration } from './GithubAppConfiguration';

/**
 * GitHub API base URL used for GitHub App requests.
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * GitHub API version header used for GitHub App requests.
 */
const GITHUB_API_VERSION = '2022-11-28';

/**
 * Token payload returned by GitHub App installation access token exchange.
 */
export type GithubAppInstallationAccessToken = {
    token: string;
    expiresAt: string;
    installationId: number;
};

/**
 * Exchanges one GitHub App JWT for an installation access token.
 *
 * @private function of githubApp
 */
export async function requestGithubAppInstallationAccessToken(
    installationId: number,
    configuration?: GithubAppConfiguration,
): Promise<GithubAppInstallationAccessToken> {
    const resolvedConfiguration = configuration ?? (await ensureGithubAppConfiguration());

    const appJwt = createGithubAppJwt(resolvedConfiguration);
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
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' }), 'utf8').toString('base64url');
    const payload = Buffer.from(
        JSON.stringify({
            iat: nowSeconds - 60,
            exp: nowSeconds + 9 * 60,
            iss: configuration.appId,
        }),
        'utf8',
    ).toString('base64url');
    const signingInput = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(configuration.privateKey).toString('base64url');

    return `${signingInput}.${signature}`;
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

