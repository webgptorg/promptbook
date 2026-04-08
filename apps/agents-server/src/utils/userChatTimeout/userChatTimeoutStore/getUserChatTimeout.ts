import type { GetUserChatTimeoutOptions, UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Loads one timeout scoped to user, agent, and chat.
 *
 * @private function of userChatTimeoutStore
 */
export async function getUserChatTimeout(options: GetUserChatTimeoutOptions): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .select('*')
        .eq('id', options.timeoutId)
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}
