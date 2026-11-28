import type { UserChatRecord } from '../userChat/UserChatRecord';
import { USER_CHAT_SOURCES } from '../userChat/UserChatSource';
import { createUserChat } from '../userChat/createUserChat';
import { getUserChat } from '../userChat/getUserChat';
import { AGENT_GOAL_CHAT_TITLE } from './agentGoalChatConstants';
import { buildAgentGoalChatId } from './agentGoalChatIdentity';
import { resolveAgentGoalChatOwnerUserId } from './resolveAgentGoalChatOwnerUserId';

/**
 * Loads the singleton goal chat of one agent, creating it on first use.
 *
 * The chat id is derived from the agent permanent id, so concurrent callers converge on the very
 * same row and an agent can never end up with two goal chats.
 *
 * @param agentPermanentId - Permanent id of the agent owning the goal chat.
 * @returns Persisted goal-chat record.
 */
export async function ensureAgentGoalChat(agentPermanentId: string): Promise<UserChatRecord> {
    const chatId = buildAgentGoalChatId(agentPermanentId);
    const existingGoalChat = await loadAgentGoalChat(agentPermanentId, chatId);

    if (existingGoalChat) {
        return existingGoalChat;
    }

    try {
        return await createUserChat({
            chatId,
            userId: await resolveAgentGoalChatOwnerUserId(agentPermanentId),
            agentPermanentId,
            source: USER_CHAT_SOURCES.AGENT_GOAL,
            title: AGENT_GOAL_CHAT_TITLE,
        });
    } catch (error) {
        // Note: Another request may have created the very same singleton row in the meantime
        const racedGoalChat = await loadAgentGoalChat(agentPermanentId, chatId);

        if (racedGoalChat) {
            return racedGoalChat;
        }

        throw error;
    }
}

/**
 * Loads the stored goal chat of one agent by its deterministic id.
 *
 * The stored owner is deliberately not part of the lookup: agent ownership can change after the
 * goal chat was created, while the goal chat itself must stay the very same singleton row.
 *
 * @param agentPermanentId - Permanent id of the agent owning the goal chat.
 * @param chatId - Deterministic goal-chat id.
 * @returns Stored goal chat, or `null` when it does not exist yet.
 *
 * @private function of `ensureAgentGoalChat`
 */
async function loadAgentGoalChat(agentPermanentId: string, chatId: string): Promise<UserChatRecord | null> {
    return getUserChat({
        // Note: The access decision belongs to the callers of `ensureAgentGoalChat`
        userId: 0,
        viewerCanAccessAgentGoalChat: true,
        agentPermanentId,
        chatId,
    });
}
