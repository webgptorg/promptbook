import type { UserChatTimeoutStatus, UserChatTimeoutRecord } from './UserChatTimeoutRecord';
import { listAgentUserChatTimeouts, updateAgentScopedUserChatTimeout } from './userChatTimeoutStore';
import { cancelScheduledUserChatTimeout, notifyUserChatTimeoutScheduleChanged } from './userChatTimeoutWorker';

/**
 * Number of timeout rows loaded per page while collecting bulk-mutation targets.
 */
const BULK_TIMEOUT_PAGE_SIZE = 200;

/**
 * Hard cap for one bulk timeout mutation run.
 *
 * The cap protects runtime latency and prevents one tool call from scanning unbounded history.
 */
const MAX_BULK_TIMEOUT_MUTATION_TARGETS = 2_000;

/**
 * Shared summary returned by agent-scoped bulk timeout mutations.
 */
export type AgentScopedTimeoutBulkMutationSummary = {
    matchedCount: number;
    updatedCount: number;
    timeoutIds: Array<string>;
    hasMore: boolean;
};

/**
 * Cancels all active (queued or running) timeouts for one user+agent scope.
 */
export async function cancelAllActiveAgentScopedUserChatTimeouts(options: {
    userId: number;
    agentPermanentId: string;
}): Promise<AgentScopedTimeoutBulkMutationSummary> {
    const collectedTimeouts = await collectAgentScopedTimeouts({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        statuses: ['QUEUED', 'RUNNING'],
    });
    const cancellableTimeouts = collectedTimeouts.timeouts.filter((timeout) => timeout.cancelRequestedAt === null);
    const cancelledTimeoutIds: Array<string> = [];

    for (const timeout of cancellableTimeouts) {
        const cancelledTimeout = await cancelScheduledUserChatTimeout(timeout.timeoutId);

        if (cancelledTimeout) {
            cancelledTimeoutIds.push(cancelledTimeout.timeoutId);
        }
    }

    return {
        matchedCount: cancellableTimeouts.length,
        updatedCount: cancelledTimeoutIds.length,
        timeoutIds: cancelledTimeoutIds,
        hasMore: collectedTimeouts.hasMore,
    };
}

/**
 * Pauses all active queued timeouts for one user+agent scope.
 */
export async function pauseAllActiveAgentScopedUserChatTimeouts(options: {
    userId: number;
    agentPermanentId: string;
}): Promise<AgentScopedTimeoutBulkMutationSummary> {
    const collectedTimeouts = await collectAgentScopedTimeouts({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        statuses: ['QUEUED'],
        paused: false,
    });
    const pausedAtIso = new Date().toISOString();
    const pausedTimeoutIds: Array<string> = [];

    for (const timeout of collectedTimeouts.timeouts) {
        const updatedTimeout = await updateAgentScopedUserChatTimeout({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            timeoutId: timeout.timeoutId,
            patch: {
                pausedAt: pausedAtIso,
            },
        });

        if (updatedTimeout && updatedTimeout.pausedAt) {
            notifyUserChatTimeoutScheduleChanged(updatedTimeout);
            pausedTimeoutIds.push(updatedTimeout.timeoutId);
        }
    }

    return {
        matchedCount: collectedTimeouts.timeouts.length,
        updatedCount: pausedTimeoutIds.length,
        timeoutIds: pausedTimeoutIds,
        hasMore: collectedTimeouts.hasMore,
    };
}

/**
 * Resumes all paused queued timeouts for one user+agent scope.
 */
export async function resumeAllPausedAgentScopedUserChatTimeouts(options: {
    userId: number;
    agentPermanentId: string;
}): Promise<AgentScopedTimeoutBulkMutationSummary> {
    const collectedTimeouts = await collectAgentScopedTimeouts({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        statuses: ['QUEUED'],
        paused: true,
    });
    const resumedTimeoutIds: Array<string> = [];

    for (const timeout of collectedTimeouts.timeouts) {
        const updatedTimeout = await updateAgentScopedUserChatTimeout({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            timeoutId: timeout.timeoutId,
            patch: {
                pausedAt: null,
            },
        });

        if (updatedTimeout && !updatedTimeout.pausedAt) {
            notifyUserChatTimeoutScheduleChanged(updatedTimeout);
            resumedTimeoutIds.push(updatedTimeout.timeoutId);
        }
    }

    return {
        matchedCount: collectedTimeouts.timeouts.length,
        updatedCount: resumedTimeoutIds.length,
        timeoutIds: resumedTimeoutIds,
        hasMore: collectedTimeouts.hasMore,
    };
}

/**
 * Collects one bounded set of timeout rows for bulk operations.
 */
async function collectAgentScopedTimeouts(options: {
    userId: number;
    agentPermanentId: string;
    statuses: ReadonlyArray<UserChatTimeoutStatus>;
    paused?: boolean;
}): Promise<{
    timeouts: Array<UserChatTimeoutRecord>;
    hasMore: boolean;
}> {
    const collectedTimeouts: Array<UserChatTimeoutRecord> = [];
    let offset = 0;

    while (collectedTimeouts.length < MAX_BULK_TIMEOUT_MUTATION_TARGETS) {
        const remainingCapacity = MAX_BULK_TIMEOUT_MUTATION_TARGETS - collectedTimeouts.length;
        const pageLimit = Math.min(BULK_TIMEOUT_PAGE_SIZE, remainingCapacity);
        const timeoutPage = await listAgentUserChatTimeouts({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            statuses: options.statuses,
            paused: options.paused,
            limit: pageLimit,
            offset,
        });

        if (timeoutPage.length === 0) {
            return {
                timeouts: collectedTimeouts,
                hasMore: false,
            };
        }

        collectedTimeouts.push(...timeoutPage);
        offset += timeoutPage.length;

        if (timeoutPage.length < pageLimit) {
            return {
                timeouts: collectedTimeouts,
                hasMore: false,
            };
        }
    }

    const probeRows = await listAgentUserChatTimeouts({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        statuses: options.statuses,
        paused: options.paused,
        limit: 1,
        offset,
    });

    return {
        timeouts: collectedTimeouts,
        hasMore: probeRows.length > 0,
    };
}
