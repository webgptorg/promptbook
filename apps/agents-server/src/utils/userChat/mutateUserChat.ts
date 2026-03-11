import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { createMissingUserChatScopeError } from './createMissingUserChatScopeError';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { resolveLastMessageAt } from './resolveLastMessageAt';

/**
 * Maximum optimistic retries when chat mutations race.
 *
 * @private function of `userChat`
 */
const MUTATE_USER_CHAT_MAX_ATTEMPTS = 5;

/**
 * Patch returned by one user-chat mutation callback.
 */
type MutateUserChatPatch = {
    messages?: ReadonlyArray<ChatMessage>;
    draftMessage?: string | null;
    lastMessageAt?: string | null;
    updatedAt?: string;
};

/**
 * Input options for optimistic scoped chat mutations.
 */
export type MutateUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    touchUpdatedAt?: boolean;
    mutate: (chat: UserChatRecord) => MutateUserChatPatch;
};

/**
 * Applies one optimistic mutation to a scoped chat row and returns the updated record.
 */
export async function mutateUserChat(options: MutateUserChatOptions): Promise<UserChatRecord> {
    const { userId, agentPermanentId, chatId, mutate, touchUpdatedAt = true } = options;
    const userChatTable = await provideUserChatTable();

    for (let attempt = 0; attempt < MUTATE_USER_CHAT_MAX_ATTEMPTS; attempt++) {
        const { data: currentData, error: currentError } = await userChatTable
            .select('*')
            .eq('id', chatId)
            .eq('userId', userId)
            .eq('agentPermanentId', agentPermanentId)
            .maybeSingle();

        if (currentError) {
            throw new Error(`Failed to load user chat "${chatId}" before mutation: ${currentError.message}`);
        }

        if (!currentData) {
            throw await createMissingUserChatScopeError(userChatTable, {
                operation: 'mutate_chat',
                userId,
                agentPermanentId,
                chatId,
            });
        }

        const currentChat = mapUserChatRow(currentData as UserChatRow);
        const patch = mutate(currentChat);
        const nowIso = new Date().toISOString();
        const nextMessages = patch.messages ? [...patch.messages] : currentChat.messages;
        const updatePayload: Partial<UserChatRow> = {
            ...(patch.messages ? { messages: nextMessages as unknown as UserChatRow['messages'] } : {}),
            ...(patch.draftMessage !== undefined ? { draftMessage: patch.draftMessage } : {}),
            ...(patch.lastMessageAt !== undefined
                ? { lastMessageAt: patch.lastMessageAt }
                : patch.messages
                ? { lastMessageAt: resolveLastMessageAt(nextMessages, nowIso) }
                : {}),
            ...(touchUpdatedAt ? { updatedAt: patch.updatedAt || nowIso } : {}),
        };

        const { data: updatedData, error: updateError } = await userChatTable
            .update(updatePayload)
            .eq('id', chatId)
            .eq('userId', userId)
            .eq('agentPermanentId', agentPermanentId)
            .eq('updatedAt', currentChat.updatedAt)
            .select('*')
            .maybeSingle();

        if (updateError) {
            throw new Error(`Failed to mutate user chat "${chatId}": ${updateError.message}`);
        }

        if (updatedData) {
            return mapUserChatRow(updatedData as UserChatRow);
        }
    }

    throw new Error(`Failed to mutate user chat "${chatId}" due to concurrent updates.`);
}
