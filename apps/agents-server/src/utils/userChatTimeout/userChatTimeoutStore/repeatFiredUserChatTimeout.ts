import { markTaskTerminalLogFinished } from '../../taskTerminal/taskTerminalLog';
import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { resolvePlannedMessageDueAt } from '../plannedMessageSchedule';
import { getUserChatTimeoutById } from './getUserChatTimeoutById';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Re-arms one fired repeating timeout for its next wake-up.
 *
 * A repeating timeout keeps its own row and identity across every firing, exactly like one
 * `setInterval` handle: the agent that planned it can still cancel it by the very same `timeoutId`
 * it saw before, and no firing can leave a duplicated schedule behind.
 *
 * @param timeoutId - Identifier of the timeout that has just fired.
 * @returns The re-armed timeout, or `null` when the row must be completed instead because its schedule
 *          is over — it does not repeat, it ran as many times as it was planned to run, its ending date
 *          passed, or its repetitions were cancelled while it was firing.
 *
 * @private function of userChatTimeoutStore
 */
export async function repeatFiredUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (existingTimeout.cancelRequestedAt) {
        return null;
    }

    const nowDate = new Date();
    // Note: The firing which is being closed already counts as one run of the planned message
    const nextDueAtDate = resolvePlannedMessageDueAt({
        schedule: existingTimeout,
        completedRunCount: existingTimeout.runCount + 1,
        afterDate: nowDate,
    });

    if (nextDueAtDate === null) {
        return null;
    }

    const nowIso = nowDate.toISOString();
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .update({
            status: 'QUEUED',
            updatedAt: nowIso,
            queuedAt: nowIso,
            dueAt: nextDueAtDate.toISOString(),
            startedAt: null,
            completedAt: null,
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

        throw new Error(`Failed to repeat user chat timeout "${timeoutId}": ${error.message}`);
    }

    // Note: One firing of a repeating timeout is one finished task, even though its row stays armed
    markTaskTerminalLogFinished(timeoutId, { isSuccessful: true });

    if (!data) {
        return getUserChatTimeoutById(timeoutId);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}
