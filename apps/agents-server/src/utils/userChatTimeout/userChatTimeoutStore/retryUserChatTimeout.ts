import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { getUserChatTimeoutById } from './getUserChatTimeoutById';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Requeues one failed timeout and makes it due immediately.
 *
 * @private function of userChatTimeoutStore
 */
export async function retryUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (existingTimeout.status !== 'FAILED') {
        throw new Error(
            `Only failed user chat timeouts can be retried. Timeout "${timeoutId}" is "${existingTimeout.status}".`,
        );
    }

    const nowIso = new Date().toISOString();
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .update({
            status: 'QUEUED',
            updatedAt: nowIso,
            dueAt: nowIso,
            queuedAt: nowIso,
            startedAt: null,
            completedAt: null,
            cancelRequestedAt: null,
            pausedAt: null,
            leaseExpiresAt: null,
            failureReason: null,
        })
        .eq('id', timeoutId)
        .eq('status', 'FAILED')
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to retry user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}
