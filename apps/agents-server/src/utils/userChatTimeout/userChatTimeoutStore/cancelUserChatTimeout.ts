import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { getUserChatTimeoutById } from './getUserChatTimeoutById';
import { isTerminalUserChatTimeoutStatus } from './isTerminalUserChatTimeoutStatus';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Cancels one timeout. Queued rows become cancelled immediately; running rows get a cancellation request.
 *
 * @private function of userChatTimeoutStore
 */
export async function cancelUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (isTerminalUserChatTimeoutStatus(existingTimeout.status)) {
        return existingTimeout;
    }

    const nowIso = new Date().toISOString();
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const updatePayload =
        existingTimeout.status === 'QUEUED'
            ? {
                  status: 'CANCELLED',
                  updatedAt: nowIso,
                  cancelRequestedAt: nowIso,
                  completedAt: nowIso,
                  pausedAt: null,
                  leaseExpiresAt: null,
                  failureReason: existingTimeout.failureReason || 'Timeout was cancelled.',
              }
            : {
                  updatedAt: nowIso,
                  cancelRequestedAt: nowIso,
              };

    const { data, error } = await userChatTimeoutTable
        .update(updatePayload)
        .eq('id', timeoutId)
        .eq('status', existingTimeout.status)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to cancel user chat timeout "${timeoutId}": ${error.message}`);
    }

    if (!data) {
        return getUserChatTimeoutById(timeoutId);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}
