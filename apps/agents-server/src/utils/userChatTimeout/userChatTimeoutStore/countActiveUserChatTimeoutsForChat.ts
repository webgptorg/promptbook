import { ACTIVE_USER_CHAT_TIMEOUT_STATUSES } from './ACTIVE_USER_CHAT_TIMEOUT_STATUSES';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Counts active timeouts for one chat thread.
 *
 * @private function of userChatTimeoutStore
 */
export async function countActiveUserChatTimeoutsForChat(chatId: string): Promise<number> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { count, error } = await userChatTimeoutTable
        .select('*', { count: 'exact', head: true })
        .eq('chatId', chatId)
        .in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES);

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return 0;
        }

        throw new Error(`Failed to count active user chat timeouts for chat "${chatId}": ${error.message}`);
    }

    return count || 0;
}
