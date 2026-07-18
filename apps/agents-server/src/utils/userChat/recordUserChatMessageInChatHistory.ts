import type { ChatMessage } from '@promptbook-local/types';
import {
    createChatHistoryRecorder,
    type ChatHistoryActorType,
} from '@/src/utils/chat/createChatHistoryRecorder';
import { resolveAgentHash } from '@/src/utils/resolveAgentHash';

/**
 * Fallback hash stored when the agent row cannot be resolved (for example after agent deletion).
 *
 * @private constant of `recordUserChatMessageInChatHistory`
 */
const UNKNOWN_AGENT_HASH = 'unknown';

/**
 * One canonical durable-chat message to append into the `ChatHistory` audit table.
 */
export type RecordUserChatMessageInChatHistoryOptions = {
    /**
     * Permanent id of the agent owning the chat.
     */
    agentPermanentId: string;
    /**
     * Id of the canonical `UserChat` the message belongs to.
     */
    chatId: string;
    /**
     * Id of the durable chat-completion task (`UserChatJob`) linked to the message.
     */
    taskId?: string | null;
    /**
     * Database user id owning the chat.
     */
    userId: number | null;
    /**
     * Recorded message payload (role, sender, content, attachments,...).
     */
    message: {
        role: 'USER' | 'MODEL';
        sender: 'USER' | 'MODEL';
        content: string;
        attachments?: ChatMessage['attachments'];
    };
    /**
     * Optional HTTP request carrying telemetry headers; worker contexts have none.
     */
    request?: Request | null;
    /**
     * Actor type stored with the record; durable chats always belong to logged-in users.
     */
    actorType?: ChatHistoryActorType;
};

/**
 * Records one durable user-chat message into the `ChatHistory` audit table.
 *
 * This is the single shared recording point for the durable chat pipeline
 * (web chat turns, timeout wake-up turns, and completed worker answers),
 * so every chat ends up visible in `/admin/chat-history`.
 *
 * The write is best-effort telemetry: any failure is logged and never breaks the chat flow.
 */
export async function recordUserChatMessageInChatHistory(
    options: RecordUserChatMessageInChatHistoryOptions,
): Promise<void> {
    const {
        agentPermanentId,
        chatId,
        taskId = null,
        userId,
        message,
        request = null,
        actorType = 'TEAM_MEMBER',
    } = options;

    try {
        const agentHash = await resolveAgentHash(agentPermanentId);
        const recordChatHistoryMessage = await createChatHistoryRecorder({
            request,
            agentIdentifier: agentPermanentId,
            agentHash: agentHash || UNKNOWN_AGENT_HASH,
            source: 'AGENT_PAGE_CHAT',
            actorType,
            userId,
            chatId,
        });

        await recordChatHistoryMessage({
            message,
            taskId,
        });
    } catch (error) {
        console.error('[ChatHistory] Failed to record durable user-chat message.', {
            agentPermanentId,
            chatId,
            taskId,
            userId,
            error,
        });
    }
}
