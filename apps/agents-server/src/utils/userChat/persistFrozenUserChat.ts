import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatRecord } from './UserChatRecord';
import { createUserChat } from './createUserChat';
import { updateUserChatMessages } from './updateUserChatMessages';
import { isFrozenUserChatSource, type UserChatSource } from './UserChatSource';

/**
 * Input payload for persisting one frozen external chat snapshot.
 */
export type PersistFrozenUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    source: UserChatSource;
    messages: ReadonlyArray<ChatMessage>;
    chatId?: string;
};

/**
 * Creates or refreshes one frozen chat snapshot used by external channels.
 */
export async function persistFrozenUserChat(options: PersistFrozenUserChatOptions): Promise<UserChatRecord> {
    if (!isFrozenUserChatSource(options.source)) {
        throw new Error('Frozen user chats must use an external source.');
    }

    if (options.chatId) {
        return updateUserChatMessages({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
            messages: options.messages,
        });
    }

    return createUserChat({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        source: options.source,
        messages: options.messages,
    });
}
