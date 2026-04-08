import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { getUserChatTimeoutById } from './getUserChatTimeoutById';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Marks one timeout as completed after its wake-up message was enqueued.
 *
 * @private function of userChatTimeoutStore
 */
export async function markUserChatTimeoutCompleted(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (existingTimeout.status === 'COMPLETED') {
        return existingTimeout;
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await userChatTimeoutTable
        .update({
            status: 'COMPLETED',
            updatedAt: nowIso,
            completedAt: nowIso,
            leaseExpiresAt: null,
            pausedAt: null,
            failureReason: null,
            runCount: existingTimeout.runCount + 1,
            lastFiredAt: nowIso,
        })
        .eq('id', timeoutId)
        .eq('status', existingTimeout.status)
        .eq('runCount', existingTimeout.runCount)
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to mark user chat timeout "${timeoutId}" as completed: ${error.message}`);
    }

    if (!data) {
        return getUserChatTimeoutById(timeoutId);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}
