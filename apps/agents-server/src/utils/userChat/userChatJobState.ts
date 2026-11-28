import type { ChatMessage, ToolCall } from '../../../../../src/_packages/types.index';
import type { UserChatJobRecord } from './UserChatJobRecord';

/**
 * Terminal durable job statuses mirrored into canonical assistant messages.
 */
export type TerminalUserChatJobStatus = 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Failure reason used when a running worker lease expires before terminal persistence.
 */
export const EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON =
    'Background worker lease expired before the chat turn finished.';

/**
 * Resolves a durable terminal job status from one assistant message snapshot.
 */
export function resolveTerminalUserChatJobStatusFromMessage(
    message: Pick<ChatMessage, 'isComplete' | 'lifecycleState'>,
): TerminalUserChatJobStatus | null {
    if (message.isComplete !== true) {
        return null;
    }

    switch (message.lifecycleState) {
        case 'failed':
            return 'FAILED';
        case 'cancelled':
            return 'CANCELLED';
        case 'completed':
            return 'COMPLETED';
        default:
            return null;
    }
}

/**
 * Extracts the best available tool-call snapshot persisted on one assistant message.
 */
export function resolveUserChatMessageToolCalls(
    message: Pick<ChatMessage, 'toolCalls' | 'completedToolCalls' | 'ongoingToolCalls'>,
): ReadonlyArray<ToolCall> | undefined {
    return message.toolCalls || message.completedToolCalls || message.ongoingToolCalls;
}

/**
 * Returns true when a running durable job lease is already stale.
 */
export function isUserChatJobLeaseExpired(
    job: Pick<UserChatJobRecord, 'status' | 'leaseExpiresAt'>,
    now: Date = new Date(),
): boolean {
    if (job.status !== 'RUNNING' || !job.leaseExpiresAt) {
        return false;
    }

    const leaseExpiryTime = Date.parse(job.leaseExpiresAt);
    if (Number.isNaN(leaseExpiryTime)) {
        return false;
    }

    return leaseExpiryTime <= now.getTime();
}
