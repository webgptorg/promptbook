import type { ListAgentUserChatTimeoutsOptions, UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Lists all timeouts owned by one user+agent across all chats.
 *
 * @private function of userChatTimeoutStore
 */
export async function listAgentUserChatTimeouts(
    options: ListAgentUserChatTimeoutsOptions,
): Promise<Array<UserChatTimeoutRecord>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    let query = userChatTimeoutTable
        .select('*')
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .order('updatedAt', { ascending: false })
        .order('createdAt', { ascending: false });

    if (options.statuses && options.statuses.length > 0) {
        query = query.in('status', options.statuses);
    }

    if (typeof options.paused === 'boolean') {
        query = options.paused ? query.not('pausedAt', 'is', null) : query.is('pausedAt', null);
    } else if (options.includePaused === false) {
        query = query.is('pausedAt', null);
    }

    if (typeof options.limit === 'number' && options.limit > 0) {
        const offset = typeof options.offset === 'number' && options.offset > 0 ? options.offset : 0;
        query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return [];
        }

        throw new Error(`Failed to list scoped user chat timeouts for agent "${options.agentPermanentId}": ${error.message}`);
    }

    return ((data || []) as Array<UserChatTimeoutRow>).map(mapUserChatTimeoutRow);
}
