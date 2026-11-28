import type { UpdateUserChatDraftOptions, UserChatRecord } from './UserChatRecord';
import { mutateUserChat } from './mutateUserChat';

/**
 * Updates the draft message for a user chat without modifying messages or activity timestamps.
 *
 * @private internal utility of <AgentProfileChat/>
 */
export async function updateUserChatDraft(options: UpdateUserChatDraftOptions): Promise<UserChatRecord> {
    const { userId, agentPermanentId, chatId, draftMessage } = options;
    return mutateUserChat({
        userId,
        agentPermanentId,
        chatId,
        touchUpdatedAt: false,
        mutate: () => ({
            draftMessage,
        }),
    });
}
