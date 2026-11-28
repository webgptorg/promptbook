/**
 * Prefix of every goal-chat id.
 *
 * Goal-chat ids are derived deterministically from the agent permanent id so that exactly one
 * goal chat can ever exist per agent, and so that any layer holding only a `chatId`
 * (SQL task queries, admin task rows, UI rows) can recognize a goal chat without extra lookups.
 */
export const AGENT_GOAL_CHAT_ID_PREFIX = 'goal-';

/**
 * Builds the deterministic singleton goal-chat id of one agent.
 *
 * @param agentPermanentId - Permanent id of the agent owning the goal chat.
 * @returns Stable goal-chat id.
 */
export function buildAgentGoalChatId(agentPermanentId: string): string {
    return `${AGENT_GOAL_CHAT_ID_PREFIX}${agentPermanentId}`;
}

/**
 * Returns `true` when one chat id belongs to an agent goal chat.
 *
 * @param chatId - Chat id to inspect.
 * @returns `true` for goal chats.
 */
export function isAgentGoalChatId(chatId: string | null | undefined): boolean {
    return typeof chatId === 'string' && chatId.startsWith(AGENT_GOAL_CHAT_ID_PREFIX);
}
