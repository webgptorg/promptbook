import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Loads one timeout row by id regardless of scope.
 *
 * @private function of userChatTimeoutStore
 */
export async function getUserChatTimeoutById(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable.select('*').eq('id', timeoutId).maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}
