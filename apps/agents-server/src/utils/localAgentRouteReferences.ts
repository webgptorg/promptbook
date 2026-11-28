import type { string_agent_url } from '../../../../src/types/typeAliases';

/**
 * Parsed local agent route reference.
 */
export type LocalAgentRouteReference = {
    /**
     * Matched same-instance server origin.
     */
    readonly localServerUrl: string;

    /**
     * Decoded route identifier after `/agents/`.
     */
    readonly agentIdentifier: string;
};

/**
 * Exact local route alias for one agent URL.
 */
export type LocalAgentUrlReference = LocalAgentRouteReference & {
    /**
     * Normalized exact local agent URL.
     */
    readonly agentUrl: string;
};

/**
 * Normalizes same-instance server URLs for route matching.
 *
 * @param localServerUrls - Raw server URLs.
 * @returns Unique normalized origins without trailing slash.
 */
export function normalizeLocalServerUrls(localServerUrls: ReadonlyArray<string>): ReadonlyArray<string> {
    return [
        ...new Set(
            localServerUrls
                .map((localServerUrl) => normalizeServerUrl(localServerUrl))
                .filter((localServerUrl) => localServerUrl.length > 0),
        ),
    ];
}

/**
 * Normalizes exact local agent URL aliases for route matching.
 *
 * @param localAgentUrls - Raw local agent URLs.
 * @returns Unique normalized route references.
 */
export function normalizeLocalAgentUrlReferences(
    localAgentUrls: ReadonlyArray<string_agent_url>,
): ReadonlyArray<LocalAgentUrlReference> {
    const localAgentUrlReferences: Array<LocalAgentUrlReference> = [];
    const seenAgentUrls = new Set<string>();

    for (const localAgentUrl of localAgentUrls) {
        const localAgentRouteReference = parseLocalAgentRouteReference(localAgentUrl);

        if (!localAgentRouteReference) {
            continue;
        }

        const normalizedAgentUrl = createLocalAgentUrl(
            localAgentRouteReference.localServerUrl,
            localAgentRouteReference.agentIdentifier,
        );

        if (seenAgentUrls.has(normalizedAgentUrl)) {
            continue;
        }

        seenAgentUrls.add(normalizedAgentUrl);
        localAgentUrlReferences.push({
            ...localAgentRouteReference,
            agentUrl: normalizedAgentUrl,
        });
    }

    return localAgentUrlReferences;
}

/**
 * Extracts a local agent identifier from a same-instance agent URL.
 *
 * @param agentUrl - Referenced agent URL.
 * @param localServerUrls - Normalized same-instance server origins.
 * @param localAgentUrlReferences - Exact agent URL aliases that should resolve locally.
 * @returns Route reference or `null` when the URL belongs to another server.
 */
export function resolveLocalAgentRouteReference(
    agentUrl: string_agent_url,
    localServerUrls: ReadonlyArray<string>,
    localAgentUrlReferences: ReadonlyArray<LocalAgentUrlReference>,
): LocalAgentRouteReference | null {
    const localAgentRouteReference = parseLocalAgentRouteReference(agentUrl);

    if (!localAgentRouteReference) {
        return null;
    }

    if (localServerUrls.includes(localAgentRouteReference.localServerUrl)) {
        return localAgentRouteReference;
    }

    const normalizedAgentUrl = createLocalAgentUrl(
        localAgentRouteReference.localServerUrl,
        localAgentRouteReference.agentIdentifier,
    );
    return (
        localAgentUrlReferences.find((localAgentUrlReference) => localAgentUrlReference.agentUrl === normalizedAgentUrl) ||
        null
    );
}

/**
 * Builds one local agent profile URL.
 *
 * @param localServerUrl - Same-instance server origin.
 * @param agentIdentifier - Route agent identifier.
 * @returns Local agent URL.
 */
export function createLocalAgentUrl(localServerUrl: string, agentIdentifier: string): string_agent_url {
    return `${localServerUrl.replace(/\/+$/g, '')}/agents/${encodeURIComponent(agentIdentifier)}` as string_agent_url;
}

/**
 * Normalizes one server URL to its origin.
 *
 * @param serverUrl - Raw server URL.
 * @returns Normalized origin or an empty string when invalid.
 */
function normalizeServerUrl(serverUrl: string): string {
    try {
        return new URL(serverUrl).origin.replace(/\/+$/g, '');
    } catch {
        return serverUrl.replace(/\/+$/g, '');
    }
}

/**
 * Extracts a local route reference from an agent profile URL.
 *
 * @param agentUrl - Referenced agent URL.
 * @returns Route reference or `null` when the URL is not an agent profile route.
 */
function parseLocalAgentRouteReference(agentUrl: string_agent_url): LocalAgentRouteReference | null {
    let parsedAgentUrl: URL;

    try {
        parsedAgentUrl = new URL(agentUrl);
    } catch {
        return null;
    }

    const localServerUrl = normalizeServerUrl(parsedAgentUrl.origin);
    const pathSegments = parsedAgentUrl.pathname.split('/').filter(Boolean);
    const agentIdentifier = pathSegments[0] === 'agents' ? pathSegments[1] : null;

    if (!agentIdentifier) {
        return null;
    }

    return {
        localServerUrl,
        agentIdentifier: decodeURIComponent(agentIdentifier),
    };
}
