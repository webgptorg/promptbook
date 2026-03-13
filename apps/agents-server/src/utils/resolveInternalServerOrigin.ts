import { createServerPublicUrl } from './serverRegistry';

/**
 * Default port used by the Agents Server local development runtime.
 */
const DEFAULT_INTERNAL_SERVER_PORT = 4440;

/**
 * Resolves the absolute public URL of the current Agents Server deployment.
 *
 * This is used by background workers that need to call internal HTTP routes
 * outside of a request-scoped context where `request.url` is unavailable.
 */
function resolveInternalServerUrl(): URL {
    const explicitSiteUrl = parseAbsoluteHttpUrl(process.env.NEXT_PUBLIC_SITE_URL);

    if (explicitSiteUrl) {
        return explicitSiteUrl;
    }

    const configuredVercelDomain = resolveConfiguredVercelDomain();

    if (configuredVercelDomain) {
        return createServerPublicUrl(configuredVercelDomain);
    }

    return createServerPublicUrl(`localhost:${resolveInternalServerPort()}`);
}

/**
 * Resolves the normalized origin string of the current Agents Server deployment.
 */
export function resolveInternalServerOrigin(): string {
    return resolveInternalServerUrl().href.replace(/\/+$/g, '');
}

/**
 * Parses one absolute HTTP(S) URL from environment configuration.
 *
 * @param value - Raw environment value.
 * @returns Parsed URL or `null` when missing/invalid.
 */
function parseAbsoluteHttpUrl(value: string | undefined): URL | null {
    if (!value) {
        return null;
    }

    try {
        const parsedUrl = new URL(value);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }

        return parsedUrl;
    } catch {
        return null;
    }
}

/**
 * Resolves the best Vercel domain candidate available in server-side runtime env vars.
 *
 * @returns One host/domain candidate or `null` when unavailable.
 */
function resolveConfiguredVercelDomain(): string | null {
    const vercelDomainCandidates = [
        process.env.VERCEL_BRANCH_URL,
        process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
        process.env.VERCEL_URL,
        process.env.NEXT_PUBLIC_VERCEL_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    ];

    for (const candidate of vercelDomainCandidates) {
        if (typeof candidate !== 'string') {
            continue;
        }

        const normalizedCandidate = candidate.trim();

        if (normalizedCandidate) {
            return normalizedCandidate;
        }
    }

    return null;
}

/**
 * Resolves the local fallback port used when no deployment URL is configured.
 *
 * @returns Normalized port number used for localhost self-calls.
 */
function resolveInternalServerPort(): number {
    const rawPort = process.env.PORT;
    const parsedPort = rawPort ? Number(rawPort) : Number.NaN;

    if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
        return DEFAULT_INTERNAL_SERVER_PORT;
    }

    return parsedPort;
}
