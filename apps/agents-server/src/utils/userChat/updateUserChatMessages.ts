import { Json } from '@/src/database/schema';
import type { UpdateUserChatMessagesOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { normalizeMessagesInput, resolveLastMessageAt } from './resolveLastMessageAt';

/**
 * Replaces stored chat messages and updates activity timestamps.
 */
export async function updateUserChatMessages(
    options: UpdateUserChatMessagesOptions,
): Promise<UserChatRecord> {
    const { userId, agentPermanentId, chatId } = options;
    const messages = normalizeMessagesInput(options.messages);
    const now = new Date().toISOString();
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .update({
            updatedAt: now,
            lastMessageAt: resolveLastMessageAt(messages, now),
            messages: messages as unknown as Json,
        })
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to update user chat "${chatId}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`User chat "${chatId}" was not found.`);
    }

    return mapUserChatRow(data as UserChatRow);
}
