import { $provideServer } from '@/src/tools/$provideServer';
import { $provideAgentReferenceResolver } from '../agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '../agentReferenceResolver/AgentReferenceResolutionIssue';

/**
 * Prefix used by canonical agent URLs in the application.
 */
const AGENT_PATH_PREFIX = '/agents/';

/**
 * Strips trailing punctuation that may be attached to pasted references.
 */
const TRAILING_REFERENCE_PUNCTUATION_REGEX = /[),.;!?]+$/;

/**
 * Extracts content from braced references such as `{Agent Name}`.
 */
const BRACED_REFERENCE_REGEX = /^\{([\s\S]+)\}$/;

/**
 * Resolution result for local agents.
 */
type LocalAgentRouteTarget = {
    kind: 'local';
    canonicalAgentId: string;
    canonicalUrl: string;
};

/**
 * Resolution result for federated agents.
 */
type RemoteAgentRouteTarget = {
    kind: 'remote';
    url: string;
};

/**
 * Target returned for an incoming `/agents/:agentId` route value.
 */
export type AgentRouteTarget = LocalAgentRouteTarget | RemoteAgentRouteTarget;

/**
 * Resolves any incoming `/agents/:agentId` token into a canonical target URL.
 *
 * Supported inputs include plain IDs/names, `@name`, `{name}`, `{id}`, and absolute `/agents/...` URLs.
 *
 * @param rawReference - Raw decoded route parameter value.
 * @returns Canonical local/remote route target or `null` when the reference cannot be resolved.
 */
export async function resolveAgentRouteTarget(rawReference: string): Promise<AgentRouteTarget | null> {
    const normalizedReference = normalizeReference(rawReference);
    if (normalizedReference === null) {
        return null;
    }

    const resolver = await $provideAgentReferenceResolver();
    let resolvedUrlValue: string;

    try {
        resolvedUrlValue = await resolver.resolveCommitmentContent('TEAM', `{${normalizedReference}}`);
    } catch {
        consumeAgentReferenceResolutionIssues(resolver);
        return null;
    }

    const resolutionIssues = consumeAgentReferenceResolutionIssues(resolver).filter(
        (issue) => issue.commitmentType === 'TEAM',
    );
    if (resolutionIssues.length > 0) {
        return null;
    }

    const resolvedAgentUrl = parseAgentUrl(resolvedUrlValue);
    if (resolvedAgentUrl === null) {
        return null;
    }

    const canonicalAgentId = extractAgentIdentifier(resolvedAgentUrl);
    if (canonicalAgentId === null) {
        return null;
    }

    const { publicUrl } = await $provideServer();
    const localServerUrl = normalizeServerUrl(publicUrl.href);
    const resolvedServerUrl = normalizeServerUrl(resolvedAgentUrl.origin);

    if (resolvedServerUrl !== localServerUrl) {
        return {
            kind: 'remote',
            url: resolvedAgentUrl.toString(),
        };
    }

    return {
        kind: 'local',
        canonicalAgentId,
        canonicalUrl: `${localServerUrl}${AGENT_PATH_PREFIX}${encodeURIComponent(canonicalAgentId)}`,
    };
}

/**
 * Normalizes route input into the value used by the shared reference resolver.
 *
 * @param rawReference - Raw reference from route parameter.
 * @returns Normalized token value or `null` when empty.
 */
function normalizeReference(rawReference: string): string | null {
    const trimmed = rawReference.trim().replace(TRAILING_REFERENCE_PUNCTUATION_REGEX, '');
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('@')) {
        const withoutAt = trimmed.slice(1).trim();
        return withoutAt || null;
    }

    const braced = trimmed.match(BRACED_REFERENCE_REGEX);
    if (braced?.[1] !== undefined) {
        const withoutBraces = braced[1].trim();
        return withoutBraces || null;
    }

    return trimmed;
}

/**
 * Parses an absolute HTTP(S) URL and validates that it targets `/agents/...`.
 *
 * @param value - Raw URL candidate.
 * @returns Parsed URL or `null` when the value is not a valid agent URL.
 */
function parseAgentUrl(value: string): URL | null {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }

    if (extractAgentIdentifier(url) === null) {
        return null;
    }

    return url;
}

/**
 * Extracts the canonical agent identifier from an `/agents/:id` URL.
 *
 * @param url - Parsed URL to inspect.
 * @returns Agent identifier or `null` when no identifier is present.
 */
function extractAgentIdentifier(url: URL): string | null {
    const path = url.pathname;
    const pathPrefixIndex = path.indexOf(AGENT_PATH_PREFIX);
    if (pathPrefixIndex < 0) {
        return null;
    }

    const suffix = path.slice(pathPrefixIndex + AGENT_PATH_PREFIX.length);
    const firstSegment = suffix.split('/')[0]?.trim() || '';
    if (!firstSegment) {
        return null;
    }

    try {
        return decodeURIComponent(firstSegment);
    } catch {
        return null;
    }
}

/**
 * Normalizes server URL into a stable comparable form without a trailing slash.
 *
 * @param value - Raw server URL.
 * @returns Normalized URL string.
 */
function normalizeServerUrl(value: string): string {
    return value.replace(/\/+$/, '');
}
