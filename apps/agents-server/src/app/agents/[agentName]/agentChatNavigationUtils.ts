import { appendFreshChatQuery } from '../../../utils/agentRouting/agentRouteHrefs';

export { normalizeDestinationForLocationComparison } from '../../../components/_utils/clientNavigationFallback';
export { FORCE_NEW_CHAT_QUERY_VALUE } from '../../../utils/agentRouting/agentRouteHrefs';

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
    if (options.shouldForceNewChat && options.isHistoryEnabled) {
        return appendFreshChatQuery(chatRoute);
    }

    return chatRoute;
}
