import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';
import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';

/**
 * Updates one timeout into a terminal state.
 *
 * @private function of userChatTimeoutStore
 */
export async function updateUserChatTimeoutTerminalState(
    timeoutId: string,
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED',
    failureReason: string | null,
): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await userChatTimeoutTable
        .update({
            status,
            updatedAt: nowIso,
            completedAt: nowIso,
            leaseExpiresAt: null,
            pausedAt: null,
            failureReason,
        })
        .eq('id', timeoutId)
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to update user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}
