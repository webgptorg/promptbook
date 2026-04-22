/**
 * Query parameter used by durable chat routes to choose the active chat session.
 */
const AGENT_CHAT_QUERY_PARAM = 'chat';

/**
 * Sentinel value that instructs the chat route to start a fresh conversation.
 */
export const FORCE_NEW_CHAT_QUERY_VALUE = 'new';

/**
 * Stable base URL used for parsing relative app hrefs.
 */
const RELATIVE_HREF_BASE_URL = 'https://promptbook.local';

/**
 * Detects whether the provided href is absolute.
 *
 * @param href - Href to inspect.
 * @returns `true` when the href already includes a URL scheme.
 */
function isAbsoluteHref(href: string): boolean {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
}

/**
 * Converts a parsed URL back to either a relative app href or an absolute URL.
 *
 * @param href - Original href passed to the helper.
 * @param url - Parsed URL object to serialize.
 * @returns Serialized href that matches the original absolute/relative style.
 */
function formatParsedHref(href: string, url: URL): string {
    if (isAbsoluteHref(href)) {
        return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Builds the canonical profile href for one local agent.
 *
 * @param agentIdentifier - Permanent id or route-safe agent name.
 * @returns Canonical profile href.
 */
export function buildAgentProfileHref(agentIdentifier: string): string {
    return `/agents/${encodeURIComponent(agentIdentifier)}`;
}

/**
 * Builds the canonical standalone chat href for one local agent.
 *
 * @param agentIdentifier - Permanent id or route-safe agent name.
 * @returns Canonical chat href.
 */
export function buildAgentChatHref(agentIdentifier: string): string {
    return `${buildAgentProfileHref(agentIdentifier)}/chat`;
}

/**
 * Forces one chat href to start a fresh conversation.
 *
 * @param href - Relative or absolute chat href.
 * @returns Href with the shared new-chat query applied.
 */
export function appendFreshChatQuery(href: string): string {
    const parsedHref = new URL(href, RELATIVE_HREF_BASE_URL);
    parsedHref.searchParams.set(AGENT_CHAT_QUERY_PARAM, FORCE_NEW_CHAT_QUERY_VALUE);
    return formatParsedHref(href, parsedHref);
}

/**
 * Builds the local href that opens a fresh new chat with one agent.
 *
 * @param agentIdentifier - Permanent id or route-safe agent name.
 * @returns Canonical fresh-chat href.
 */
export function buildFreshAgentChatHref(agentIdentifier: string): string {
    return appendFreshChatQuery(buildAgentChatHref(agentIdentifier));
}

/**
 * Converts an agent profile or chat URL into a fresh-chat URL.
 *
 * @param agentUrl - Relative or absolute agent profile/chat URL.
 * @returns Matching URL that opens a fresh chat with the same agent.
 */
export function buildFreshAgentChatHrefFromAgentUrl(agentUrl: string): string {
    const parsedHref = new URL(agentUrl, RELATIVE_HREF_BASE_URL);

    if (!parsedHref.pathname.endsWith('/chat')) {
        parsedHref.pathname = `${parsedHref.pathname.replace(/\/$/, '')}/chat`;
    }

    parsedHref.searchParams.set(AGENT_CHAT_QUERY_PARAM, FORCE_NEW_CHAT_QUERY_VALUE);
    return formatParsedHref(agentUrl, parsedHref);
}
