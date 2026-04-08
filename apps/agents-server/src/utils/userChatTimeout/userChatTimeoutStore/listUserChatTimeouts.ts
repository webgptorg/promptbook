import type { ListUserChatTimeoutsOptions, UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { ACTIVE_USER_CHAT_TIMEOUT_STATUSES } from './ACTIVE_USER_CHAT_TIMEOUT_STATUSES';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Lists scoped chat timeouts, optionally restricted to active rows only.
 *
 * @private function of userChatTimeoutStore
 */
export async function listUserChatTimeouts(
    options: ListUserChatTimeoutsOptions,
): Promise<Array<UserChatTimeoutRecord>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();

    let query = userChatTimeoutTable
        .select('*')
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (options.onlyActive) {
        query = query.in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES).is('pausedAt', null);
    }

    const { data, error } = await query;

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return [];
        }

        throw new Error(`Failed to list user chat timeouts for chat "${options.chatId}": ${error.message}`);
    }

    return ((data || []) as Array<UserChatTimeoutRow>).map(mapUserChatTimeoutRow);
}
