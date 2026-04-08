/**
 * Query parameter name used to convey the chat selection intent on the chat page.
 * When this parameter equals `FORCE_NEW_CHAT_QUERY_VALUE` the chat page opens a
 * fresh conversation instead of resuming the most recent one.
 */
const FORCE_NEW_CHAT_QUERY_PARAM = 'chat';

/**
 * Sentinel value for the `chat` query parameter that signals "open a new chat".
 *
 * Using a dedicated value inside the existing `chat` parameter (rather than a
 * separate flag) means the link is a plain navigable URL — browsers will show
 * the native context-menu options ("Open in new tab / window") for it.
 */
export const FORCE_NEW_CHAT_QUERY_VALUE = 'new';

/**
 * Builds the destination URL for navigating from the agent profile page to the chat page.
 *
 * parameter is added so the chat page opens a fresh conversation instead of resuming the
 * most recent one.
 * The `chat=new` flag is only meaningful (and therefore only appended) when history is on.
 *
 * @param chatRoute - Absolute path to the agent's chat page (e.g. `/agents/<agentName>/chat`).
 * @param options.shouldForceNewChat - When `true` and history is enabled a `chat=new` query
 * @param options.isHistoryEnabled - Whether per-user chat history is enabled for this agent.
 * @returns Full destination URL string ready to be passed to `router.push`.
 */
export function buildAgentChatDestinationUrl(
    chatRoute: string,
    options: { shouldForceNewChat: boolean; isHistoryEnabled: boolean },
): string {
    const queryParams = new URLSearchParams();
    if (options.shouldForceNewChat && options.isHistoryEnabled) {
        queryParams.set(FORCE_NEW_CHAT_QUERY_PARAM, FORCE_NEW_CHAT_QUERY_VALUE);
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
