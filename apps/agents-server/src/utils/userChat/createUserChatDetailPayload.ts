import type { UserChatRecord } from './UserChatRecord';
import { createUserChatSummary } from './createUserChatSummary';
import { listUserChatJobs } from './listUserChatJobs';

/**
 * Builds the API payload used for one canonical scoped chat detail.
 */
export async function createUserChatDetailPayload(chat: UserChatRecord): Promise<{
    chat: ReturnType<typeof createUserChatSummary>;
    messages: UserChatRecord['messages'];
    draftMessage: string | null;
    activeJobs: Awaited<ReturnType<typeof listUserChatJobs>>;
}> {
    const activeJobs = await listUserChatJobs({
        userId: chat.userId,
        agentPermanentId: chat.agentPermanentId,
        chatId: chat.id,
        onlyActive: true,
    });

    return {
        chat: createUserChatSummary(chat),
        messages: chat.messages,
        draftMessage: chat.draftMessage,
        activeJobs,
    };
}
