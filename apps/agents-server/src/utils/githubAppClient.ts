/**
 * GitHub App status payload returned by `/api/github-app/status`.
 */
export type GithubAppStatusResponse = {
    isConfigured: boolean;
    isConnected: boolean;
    installationId: number | null;
    hasUsableToken: boolean;
};

/**
 * Loads GitHub App status for current user.
 */
export async function fetchGithubAppStatus(): Promise<GithubAppStatusResponse> {
    const response = await fetch('/api/github-app/status', {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        return {
            isConfigured: false,
            isConnected: false,
            installationId: null,
            hasUsableToken: false,
        };
    }

    const payload = (await response.json().catch(() => null)) as Partial<GithubAppStatusResponse> | null;
    return {
        isConfigured: payload?.isConfigured === true,
        isConnected: payload?.isConnected === true,
        installationId: typeof payload?.installationId === 'number' ? payload.installationId : null,
        hasUsableToken: payload?.hasUsableToken === true,
    };
}

/**
 * Builds `/api/github-app/connect` URL for redirecting the browser.
 */
export function buildGithubAppConnectUrl(options: {
    returnTo: string;
    isGlobal: boolean;
    agentPermanentId?: string | null;
}): string {
    const query = new URLSearchParams();
    query.set('returnTo', options.returnTo);
    query.set('scope', options.isGlobal ? 'global' : 'agent');

    if (!options.isGlobal && options.agentPermanentId) {
        query.set('agentPermanentId', options.agentPermanentId);
    }

    return `/api/github-app/connect?${query.toString()}`;
}
