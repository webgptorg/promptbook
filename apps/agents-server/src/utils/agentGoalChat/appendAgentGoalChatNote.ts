import type { ChatMessage } from '@promptbook-local/types';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import type { UserChatRecord } from '../userChat/UserChatRecord';
import { mutateUserChat } from '../userChat/mutateUserChat';
import { AGENT_GOAL_CHAT_MESSAGE_ID_LENGTH } from './agentGoalChatConstants';
import { ensureAgentGoalChat } from './ensureAgentGoalChat';

/**
 * Appends one agent-authored note to the singleton goal chat of an agent.
 *
 * Goal chats are written only by the agent and by the server acting on its behalf, so every note is
 * stored as a completed `AGENT` message.
 *
 * @param options - Target agent and note content.
 * @returns Updated goal-chat record.
 */
export async function appendAgentGoalChatNote(options: {
    readonly agentPermanentId: string;
    readonly content: string;
}): Promise<UserChatRecord> {
    const goalChat = await ensureAgentGoalChat(options.agentPermanentId);
    const nowIso = new Date().toISOString() as NonNullable<ChatMessage['createdAt']>;

    return mutateUserChat({
        userId: goalChat.userId,
        agentPermanentId: goalChat.agentPermanentId,
        chatId: goalChat.id,
        mutate: (currentChat) => ({
            messages: [
                ...currentChat.messages,
                {
                    id: $randomBase58(AGENT_GOAL_CHAT_MESSAGE_ID_LENGTH),
                    sender: 'AGENT',
                    content: options.content,
                    createdAt: nowIso,
                    isComplete: true,
                    lifecycleState: 'completed',
                },
            ],
            lastMessageAt: nowIso,
        }),
    });
}
