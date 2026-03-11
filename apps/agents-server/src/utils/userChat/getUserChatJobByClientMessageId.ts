import type { GetUserChatJobByClientMessageIdOptions, UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Loads one scoped chat job by deduplication key.
 */
export async function getUserChatJobByClientMessageId(
    options: GetUserChatJobByClientMessageIdOptions,
): Promise<UserChatJobRecord | null> {
    const { userId, agentPermanentId, chatId, clientMessageId } = options;
    const userChatJobTable = await provideUserChatJobTable();

    const { data, error } = await userChatJobTable
        .select('*')
        .eq('chatId', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .eq('clientMessageId', clientMessageId)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Failed to load user chat job for client message "${clientMessageId}": ${error.message}`,
        );
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
