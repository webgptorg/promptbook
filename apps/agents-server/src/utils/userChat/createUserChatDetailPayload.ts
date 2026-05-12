import type { UserChatRecord } from './UserChatRecord';
import { synchronizeExternalUserChatJobsForChat } from '../externalChatRunner/synchronizeExternalUserChatJobs';
import { createUserChatTimeoutActivity } from '../userChatTimeout/createUserChatTimeoutActivity';
import { listUserChatTimeouts } from '../userChatTimeout/userChatTimeoutStore';
import { createUserChatSummary } from './createUserChatSummary';
import { getUserChat } from './getUserChat';
import { listUserChatJobs } from './listUserChatJobs';
import { reconcileUserChatActiveJobs } from './reconcileUserChatActiveJobs';

/**
 * Builds the API payload used for one canonical scoped chat detail.
 */
export async function createUserChatDetailPayload(chat: UserChatRecord): Promise<{
    chat: ReturnType<typeof createUserChatSummary>;
    messages: UserChatRecord['messages'];
    draftMessage: string | null;
    activeJobs: Awaited<ReturnType<typeof listUserChatJobs>>;
    activeTimeouts: Awaited<ReturnType<typeof listUserChatTimeouts>>;
}> {
    let currentChat = chat;
    const hasSynchronizedExternalJobs = await synchronizeExternalUserChatJobsForChat(currentChat);

    if (hasSynchronizedExternalJobs) {
        const refreshedChat = await getUserChat({
            userId: currentChat.userId,
            agentPermanentId: currentChat.agentPermanentId,
            chatId: currentChat.id,
        });

        if (refreshedChat) {
            currentChat = refreshedChat;
        }
    }

    let activeJobs = await listUserChatJobs({
        userId: currentChat.userId,
        agentPermanentId: currentChat.agentPermanentId,
        chatId: currentChat.id,
        onlyActive: true,
    });

    const hasReconciledJobs = await reconcileUserChatActiveJobs({
        chat: currentChat,
        activeJobs,
    });

    if (hasReconciledJobs) {
        const refreshedChat = await getUserChat({
            userId: currentChat.userId,
            agentPermanentId: currentChat.agentPermanentId,
            chatId: currentChat.id,
        });

        if (refreshedChat) {
            currentChat = refreshedChat;
        }

        activeJobs = await listUserChatJobs({
            userId: currentChat.userId,
            agentPermanentId: currentChat.agentPermanentId,
            chatId: currentChat.id,
            onlyActive: true,
        });
    }

    const activeTimeouts = await listUserChatTimeouts({
        userId: currentChat.userId,
        agentPermanentId: currentChat.agentPermanentId,
        chatId: currentChat.id,
        onlyActive: true,
    });

    return {
        chat: createUserChatSummary(currentChat, {
            timeoutActivity: createUserChatTimeoutActivity(activeTimeouts),
            activeJobCount: activeJobs.length,
        }),
        messages: currentChat.messages,
        draftMessage: currentChat.draftMessage,
        activeJobs,
        activeTimeouts,
    };
}
