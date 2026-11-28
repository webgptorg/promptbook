import type { UserChatTimeoutActivity } from '../../userChat/UserChatRecord';
import { createUserChatTimeoutActivity } from '../createUserChatTimeoutActivity';
import type { UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { ACTIVE_USER_CHAT_TIMEOUT_STATUSES } from './ACTIVE_USER_CHAT_TIMEOUT_STATUSES';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Row fragment used when grouping active timeouts by chat without hydrating full timeout records.
 *
 * @private function of listUserChatTimeoutActivities
 */
type UserChatTimeoutActivityRow = Pick<UserChatTimeoutRow, 'chatId' | 'dueAt'>;

/**
 * Lists lightweight active-timeout metadata keyed by chat id for chat-history sidebars.
 *
 * @private function of userChatTimeoutStore
 */
export async function listUserChatTimeoutActivities(options: {
    userId?: number;
    agentPermanentId: string;
    chatIds: ReadonlyArray<string>;
}): Promise<Record<string, UserChatTimeoutActivity>> {
    if (options.chatIds.length === 0) {
        return {};
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const uniqueChatIds = [...new Set(options.chatIds)];
    let query = userChatTimeoutTable
        .select('chatId, dueAt')
        .in('chatId', uniqueChatIds)
        .eq('agentPermanentId', options.agentPermanentId)
        .in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES)
        .is('pausedAt', null)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    const { data, error } = await query;

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return {};
        }

        throw new Error(`Failed to list timeout activity for user chats: ${error.message}`);
    }

    const groupedTimeoutsByChatId: Record<string, Array<Pick<UserChatTimeoutActivityRow, 'dueAt'>>> = {};

    for (const row of (data || []) as Array<UserChatTimeoutActivityRow>) {
        groupedTimeoutsByChatId[row.chatId] = [...(groupedTimeoutsByChatId[row.chatId] || []), { dueAt: row.dueAt }];
    }

    return Object.fromEntries(
        uniqueChatIds.map((chatId) => [chatId, createUserChatTimeoutActivity(groupedTimeoutsByChatId[chatId] || [])]),
    );
}
