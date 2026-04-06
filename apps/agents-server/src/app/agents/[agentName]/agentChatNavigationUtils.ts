/**
 * Query flag used to force creating a fresh history chat on full chat page entry.
 */
const FORCE_NEW_CHAT_QUERY_PARAM = 'newChat';

/**
 * Builds the destination URL for navigating from the agent profile page to the chat page.
 *
 * @param chatRoute - Absolute path to the agent's chat page (e.g. `/agents/<agentName>/chat`).
 * @param options.shouldForceNewChat - When `true` and history is enabled a `newChat=1` query
 *     parameter is added so the chat page opens a fresh conversation instead of resuming the
 *     most recent one.
 * @param options.isHistoryEnabled - Whether per-user chat history is enabled for this agent.
 *     The `newChat` flag is only meaningful (and therefore only appended) when history is on.
 * @returns Full destination URL string ready to be passed to `router.push`.
 */
export function buildAgentChatDestinationUrl(
    chatRoute: string,
    options: { shouldForceNewChat: boolean; isHistoryEnabled: boolean },
): string {
    const queryParams = new URLSearchParams();
    if (options.shouldForceNewChat && options.isHistoryEnabled) {
        queryParams.set(FORCE_NEW_CHAT_QUERY_PARAM, '1');
    }
    const query = queryParams.toString();
    return query ? `${chatRoute}?${query}` : chatRoute;
}

/**
 * Normalizes one destination URL into a comparable location suffix.
 *
 * Used by the SPA-navigation stall detector: after `router.push` fires the
 * component reads `window.location` and compares the current path against the
 * normalised destination to decide whether to fall back to a hard navigation.
 *
 * @param destination - Destination URL passed to navigation helpers.
 * @returns Path + query + hash used for current-location comparison.
 */
export function normalizeDestinationForLocationComparison(destination: string): string {
    try {
        const parsedDestination = new URL(destination, window.location.href);
        return `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
    } catch {
        return destination;
    }
}
