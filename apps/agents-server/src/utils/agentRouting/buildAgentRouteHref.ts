/**
 * Named agent pages that can be addressed through the shared route helper.
 */
export type AgentRoutePage =
    | 'profile'
    | 'chat'
    | 'book'
    | 'integration'
    | 'website-integration';

/**
 * Maps one logical agent page to its pathname suffix.
 *
 * @param page - Logical page variant to build.
 * @returns Route suffix appended after `/agents/:identifier`.
 */
function resolveAgentRouteSuffix(page: AgentRoutePage): string {
    if (page === 'chat') {
        return '/chat';
    }

    if (page === 'book') {
        return '/book';
    }

    if (page === 'integration') {
        return '/integration';
    }

    if (page === 'website-integration') {
        return '/website-integration';
    }

    return '';
}

/**
 * Builds one relative Agents Server route for the provided agent page.
 *
 * @param agentIdentifier - Canonical agent identifier used in routing.
 * @param page - Logical page variant to build.
 * @returns Relative application pathname.
 */
export function buildAgentRoutePath(agentIdentifier: string, page: AgentRoutePage = 'profile'): string {
    const encodedAgentIdentifier = encodeURIComponent(agentIdentifier);
    return `/agents/${encodedAgentIdentifier}${resolveAgentRouteSuffix(page)}`;
}

/**
 * Builds one absolute Agents Server route for the provided agent page.
 *
 * @param baseUrl - Absolute server base URL.
 * @param agentIdentifier - Canonical agent identifier used in routing.
 * @param page - Logical page variant to build.
 * @returns Absolute URL string.
 */
export function buildAgentRouteUrl(
    baseUrl: string | URL,
    agentIdentifier: string,
    page: AgentRoutePage = 'profile',
): string {
    return new URL(buildAgentRoutePath(agentIdentifier, page), baseUrl).href;
}

/**
 * Builds the default in-app destination used when opening one agent from lists and graphs.
 *
 * The profile page still exists, but the default destination is now the standalone chat page.
 *
 * @param agentIdentifier - Canonical agent identifier used in routing.
 * @returns Relative standalone-chat pathname.
 */
export function buildDefaultAgentRoutePath(agentIdentifier: string): string {
    return buildAgentRoutePath(agentIdentifier, 'chat');
}

/**
 * Builds the default absolute destination used when opening one agent from lists and graphs.
 *
 * @param baseUrl - Absolute server base URL.
 * @param agentIdentifier - Canonical agent identifier used in routing.
 * @returns Absolute standalone-chat URL.
 */
export function buildDefaultAgentRouteUrl(baseUrl: string | URL, agentIdentifier: string): string {
    return buildAgentRouteUrl(baseUrl, agentIdentifier, 'chat');
}
