import type {
    ListAllUserChatTimeoutsOptions,
    UserChatTimeoutRecord,
    UserChatTimeoutRow,
} from '../UserChatTimeoutRecord';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Lists the timeouts of every agent and every user on this server, newest first.
 *
 * This is the server-wide counterpart of `listAgentUserChatTimeouts`, used by the admin
 * planned-message manager which spans all agents instead of one.
 *
 * @private function of userChatTimeoutStore
 */
export async function listAllUserChatTimeouts(
    options: ListAllUserChatTimeoutsOptions,
): Promise<Array<UserChatTimeoutRecord>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .select('*')
        .order('updatedAt', { ascending: false })
        .order('createdAt', { ascending: false })
        .range(0, Math.max(0, options.limit - 1));

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return [];
        }

        throw new Error(`Failed to list user chat timeouts of every agent: ${error.message}`);
    }

    return ((data || []) as Array<UserChatTimeoutRow>).map(mapUserChatTimeoutRow);
}
