import type { ListUserChatJobsOptions, UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Lists scoped chat jobs, optionally restricted to active rows only.
 */
export async function listUserChatJobs(options: ListUserChatJobsOptions): Promise<Array<UserChatJobRecord>> {
    const { userId, agentPermanentId, chatId, onlyActive = false } = options;
    const userChatJobTable = await provideUserChatJobTable();

    let query = userChatJobTable
        .select('*')
        .eq('chatId', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .order('createdAt', { ascending: true });

    if (onlyActive) {
        query = query.in('status', ['QUEUED', 'RUNNING']);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to list user chat jobs for chat "${chatId}": ${error.message}`);
    }

    return ((data || []) as Array<UserChatJobRow>).map(mapUserChatJobRow);
}

/**
 * Lists lightweight active-job counts keyed by chat id for chat-history sidebars.
 */
export async function listUserChatJobActivityCounts(options: {
    userId?: number;
    agentPermanentId: string;
    chatIds: ReadonlyArray<string>;
}): Promise<Record<string, number>> {
    if (options.chatIds.length === 0) {
        return {};
    }

    const userChatJobTable = await provideUserChatJobTable();
    const uniqueChatIds = [...new Set(options.chatIds)];
    let query = userChatJobTable
        .select('chatId')
        .in('chatId', uniqueChatIds)
        .eq('agentPermanentId', options.agentPermanentId)
        .in('status', ['QUEUED', 'RUNNING']);

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to list job activity for user chats: ${error.message}`);
    }

    const activityCountsByChatId: Record<string, number> = {};

    for (const row of (data || []) as Array<Pick<UserChatJobRow, 'chatId'>>) {
        activityCountsByChatId[row.chatId] = (activityCountsByChatId[row.chatId] || 0) + 1;
    }

    return Object.fromEntries(uniqueChatIds.map((chatId) => [chatId, activityCountsByChatId[chatId] || 0]));
}
