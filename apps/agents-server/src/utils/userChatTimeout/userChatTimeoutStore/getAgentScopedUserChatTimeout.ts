import type {
    GetAgentScopedUserChatTimeoutOptions,
    UserChatTimeoutRecord,
    UserChatTimeoutRow,
} from '../UserChatTimeoutRecord';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Loads one timeout scoped to user and agent regardless of chat.
 *
 * @private function of userChatTimeoutStore
 */
export async function getAgentScopedUserChatTimeout(
    options: GetAgentScopedUserChatTimeoutOptions,
): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .select('*')
        .eq('id', options.timeoutId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load scoped user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}
