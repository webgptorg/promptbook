import type { TODO_any } from '@promptbook-local/types';
import type { NextRequest, NextResponse } from 'next/server';
import { buildAgentNameOrIdFilter } from '../utils/agentIdentifier';
import { isAgentVisibility, isPublicAgentVisibility, type AgentVisibility } from '../utils/agentVisibility';
import { isPublicServerVisibility, type ServerVisibility } from '../utils/serverVisibility';

/**
 * Pattern that matches canonical agent profile routes.
 *
 * @private function of applyVisibilityHeaders
 */
const AGENT_PROFILE_PATHNAME_PATTERN = /^\/agents\/([^/]+)\/?$/;

/**
 * Pattern that matches any non-profile subpage under one agent.
 *
 * @private function of applyVisibilityHeaders
 */
const AGENT_SUBPAGE_PATHNAME_PATTERN = /^\/agents\/[^/]+\/.+$/;

/**
 * Parameters required to apply visibility-aware robots headers.
 *
 * @private function of applyVisibilityHeaders
 */
type ApplyVisibilityHeadersOptions = {
    readonly request: NextRequest;
    readonly response: NextResponse;
    readonly supabase: TODO_any | null;
    readonly tablePrefixForRequest: string;
    readonly canQueryServerTables: boolean;
    readonly serverVisibility: ServerVisibility;
};

/**
 * Classified agent-route shape used by robots header logic.
 *
 * @private function of applyVisibilityHeaders
 */
type AgentRouteMatch = { kind: 'none' } | { kind: 'subpage' } | { kind: 'profile'; agentIdentifier: string };

/**
 * Applies visibility-aware `X-Robots-Tag` headers to HTML responses.
 *
 * @param options - Response and visibility context.
 *
 * @private function of middleware
 */
export async function applyVisibilityHeaders(options: ApplyVisibilityHeadersOptions): Promise<void> {
    if (!isHtmlRequest(options.request)) {
        return;
    }

    if (!isPublicServerVisibility(options.serverVisibility)) {
        options.response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return;
    }

    const routeMatch = resolveAgentRouteMatch(options.request.nextUrl.pathname);
    if (routeMatch.kind === 'none') {
        return;
    }

    if (routeMatch.kind === 'subpage') {
        options.response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return;
    }

    const agentVisibility = await resolveAgentVisibilityForIndexing({
        agentIdentifier: routeMatch.agentIdentifier,
        canQueryServerTables: options.canQueryServerTables,
        supabase: options.supabase,
        tablePrefixForRequest: options.tablePrefixForRequest,
    });

    options.response.headers.set(
        'X-Robots-Tag',
        isPublicAgentVisibility(agentVisibility) ? 'index, follow' : 'noindex, nofollow',
    );
}

/**
 * Checks whether the request is likely targeting an HTML page response.
 *
 * @param request - Incoming middleware request.
 * @returns `true` when response robots headers should be evaluated.
 *
 * @private function of applyVisibilityHeaders
 */
function isHtmlRequest(request: NextRequest): boolean {
    return request.headers.get('accept')?.includes('text/html') === true;
}

/**
 * Classifies one pathname into agent profile/subpage buckets for indexing policy.
 *
 * @param pathname - Request pathname.
 * @returns Agent route classification.
 *
 * @private function of applyVisibilityHeaders
 */
function resolveAgentRouteMatch(pathname: string): AgentRouteMatch {
    const profileMatch = pathname.match(AGENT_PROFILE_PATHNAME_PATTERN);
    if (profileMatch && profileMatch[1]) {
        return {
            kind: 'profile',
            agentIdentifier: profileMatch[1],
        };
    }

    if (AGENT_SUBPAGE_PATHNAME_PATTERN.test(pathname)) {
        return { kind: 'subpage' };
    }

    return { kind: 'none' };
}

/**
 * Loads one agent visibility value for profile indexing decisions.
 *
 * @param options - Agent lookup options.
 * @returns Agent visibility, or `null` when unavailable.
 *
 * @private function of applyVisibilityHeaders
 */
async function resolveAgentVisibilityForIndexing(options: {
    readonly supabase: TODO_any | null;
    readonly tablePrefixForRequest: string;
    readonly canQueryServerTables: boolean;
    readonly agentIdentifier: string;
}): Promise<AgentVisibility | null> {
    if (!options.supabase || !options.canQueryServerTables) {
        return null;
    }

    const decodedAgentIdentifier = decodeURIComponentSafe(options.agentIdentifier);

    try {
        const { data, error } = await options.supabase
            .from(`${options.tablePrefixForRequest}Agent`)
            .select('visibility')
            .or(buildAgentNameOrIdFilter(decodedAgentIdentifier))
            .is('deletedAt', null)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        const visibility = (data as { visibility?: unknown }).visibility;
        return isAgentVisibility(visibility) ? visibility : null;
    } catch (error) {
        console.error('Failed to resolve agent visibility for robots header:', error);
        return null;
    }
}

/**
 * Decodes one URL-encoded path segment without throwing.
 *
 * @param value - Encoded path segment.
 * @returns Decoded value or original text when decoding fails.
 *
 * @private function of applyVisibilityHeaders
 */
function decodeURIComponentSafe(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
